"""Alarmas del sistema: escanea heladas, viento Zonda y granizo sobre todos
los cuarteles y guarda un histórico persistente en MySQL (tabla `alarmas`,
creada sola la primera vez que se usa, sin necesidad de migraciones).

La campanita del panel (`AlarmBell.jsx`) llama a GET /alarmas/scan cada
cierto tiempo: ese endpoint hace el trabajo pesado en el servidor (recorre
TODOS los cuarteles, no solo el seleccionado en el dashboard) y devuelve las
alarmas activas AHORA MISMO. GET /alarmas (sin /scan) devuelve el histórico
guardado, para la pestaña de "histórico de alarmas" del side panel."""
from datetime import datetime, timedelta
from fastapi import APIRouter
from app.core.config import settings
from app.models.vinedo import db_vinedos
from app.ml_models.frost_predictor import FrostPredictor
from app.ml_models.zonda_detector import ZondaDetector
from app.api.endpoints.clima import pronostico as _pronostico_clima

router = APIRouter(prefix="/alarmas", tags=["Alarmas"])
frost = FrostPredictor()
zonda = ZondaDetector()

# No repetir la misma alarma (mismo cuartel + tipo) antes de este tiempo,
# para no llenar el histórico con la misma condición repetida cada poll.
_DEDUP_MINUTOS = 30


def _tabla_lista() -> bool:
    """Crea la tabla `alarmas` si no existe. Idempotente (sin Alembic, igual
    que el resto del schema de este proyecto)."""
    if not settings.DATABASE_URL:
        return False
    try:
        from app.db.database import get_engine
        from sqlalchemy import text
        with get_engine().begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alarmas (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    vinedo_id VARCHAR(64) NOT NULL,
                    tipo VARCHAR(20) NOT NULL,
                    nivel VARCHAR(20) NOT NULL,
                    mensaje TEXT,
                    creado_en DATETIME NOT NULL,
                    INDEX idx_alarmas_vinedo (vinedo_id),
                    INDEX idx_alarmas_fecha (creado_en)
                );
            """))
        return True
    except Exception as e:
        print(f"--> [ALARMAS] No se pudo crear/verificar la tabla: {e}")
        return False


def _guardar(vinedo_id: str, tipo: str, nivel: str, mensaje: str):
    if not settings.DATABASE_URL:
        return
    try:
        from app.db.database import get_engine
        from sqlalchemy import text
        with get_engine().begin() as conn:
            reciente = conn.execute(text("""
                SELECT COUNT(*) FROM alarmas
                WHERE vinedo_id = :v AND tipo = :t AND creado_en >= :desde
            """), {"v": vinedo_id, "t": tipo,
                   "desde": datetime.utcnow() - timedelta(minutes=_DEDUP_MINUTOS)}).scalar()
            if reciente:
                return  # ya se registró esta misma condición hace poco
            conn.execute(text("""
                INSERT INTO alarmas (vinedo_id, tipo, nivel, mensaje, creado_en)
                VALUES (:v, :t, :n, :m, :c)
            """), {"v": vinedo_id, "t": tipo, "n": nivel, "m": mensaje,
                   "c": datetime.utcnow()})
    except Exception as e:
        print(f"--> [ALARMAS] No se pudo guardar la alarma: {e}")


@router.get("/scan")
def escanear_alarmas():
    """Recorre TODOS los cuarteles (no solo el que está viendo el usuario) y
    detecta condiciones de alarma activas: helada, viento Zonda y granizo.
    Persiste las nuevas (con deduplicación de 30 min) y devuelve la lista de
    alarmas activas en este momento, para la campanita del panel."""
    _tabla_lista()
    activas = []
    for vinedo_id in db_vinedos.get_all_vinedos_ids():
        historial = db_vinedos.get_history(vinedo_id, limit=180)

        if historial:
            try:
                f = frost.predict_frost_risk(historial)
                if f.get("risk_level") in ("CRITICAL", "MEDIUM"):
                    msg = f.get("message") or "Riesgo de helada detectado."
                    _guardar(vinedo_id, "HELADA", f["risk_level"], msg)
                    activas.append({"vinedo_id": vinedo_id, "tipo": "HELADA",
                                    "nivel": f["risk_level"], "mensaje": msg})
            except Exception:
                pass

            try:
                z = zonda.detect_zonda_risk(historial)
                if z.get("risk_level") in ("CRITICAL", "MEDIUM"):
                    msg = z.get("message") or "Viento Zonda en curso."
                    _guardar(vinedo_id, "ZONDA", z["risk_level"], msg)
                    activas.append({"vinedo_id": vinedo_id, "tipo": "ZONDA",
                                    "nivel": z["risk_level"], "mensaje": msg})
            except Exception:
                pass

        try:
            pron = _pronostico_clima(vinedo_id)
            dia0 = (pron.get("forecast") or [None])[0]
            if dia0:
                for r in dia0.get("riesgos", []):
                    if r.get("tipo") == "GRANIZO":
                        msg = r.get("detalle") or "Riesgo de granizo detectado."
                        nivel = "CRITICAL" if r.get("nivel") == "ALTO" else "MEDIUM"
                        _guardar(vinedo_id, "GRANIZO", nivel, msg)
                        activas.append({"vinedo_id": vinedo_id, "tipo": "GRANIZO",
                                        "nivel": nivel, "mensaje": msg})
        except Exception:
            pass

    # Alertas oficiales vigentes del SMN (feed CAP), cruzadas contra la
    # geocerca real (o el punto GPS) de cada cuartel. Solo alarmamos por
    # severidades relevantes (Moderate/Severe/Extreme) para no llenar la
    # campanita con alertas "Minor" que el SMN también emite seguido.
    try:
        from app.integrations import smn_alertas
        cuarteles_meta = [db_vinedos.get_meta(v) for v in db_vinedos.get_all_vinedos_ids()]
        for m in smn_alertas.cuarteles_en_alerta(cuarteles_meta):
            vinedo_id = m["vinedo_id"]
            alerta = m["alerta"]
            severidad = (alerta.get("severidad") or "").lower()
            if severidad not in ("moderate", "severe", "extreme"):
                continue
            nivel = "CRITICAL" if severidad in ("severe", "extreme") else "MEDIUM"
            msg = f"{alerta.get('evento') or 'Alerta SMN'}: {(alerta.get('descripcion') or '')[:180]}"
            _guardar(vinedo_id, "ALERTA_SMN", nivel, msg)
            activas.append({"vinedo_id": vinedo_id, "tipo": "ALERTA_SMN",
                            "nivel": nivel, "mensaje": msg})
    except Exception as e:
        print(f"--> [ALARMAS] No se pudo chequear alertas del SMN: {e}")

    return {"activas": activas, "total": len(activas)}


@router.get("")
def listar_alarmas(limit: int = 50):
    """Histórico de alarmas ya registradas, más recientes primero."""
    if not settings.DATABASE_URL:
        return []
    _tabla_lista()
    try:
        from app.db.database import get_engine
        from sqlalchemy import text
        with get_engine().connect() as conn:
            rows = conn.execute(text("""
                SELECT id, vinedo_id, tipo, nivel, mensaje, creado_en
                FROM alarmas ORDER BY creado_en DESC LIMIT :lim
            """), {"lim": limit}).fetchall()
        return [{"id": r[0], "vinedo_id": r[1], "tipo": r[2], "nivel": r[3],
                 "mensaje": r[4], "creado_en": r[5].isoformat() if r[5] else None}
                for r in rows]
    except Exception as e:
        print(f"--> [ALARMAS] No se pudo listar el histórico: {e}")
        return []
