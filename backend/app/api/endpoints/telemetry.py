from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from app.models.vinedo import db_vinedos
from app.schemas.telemetry import TelemetryCreate

router = APIRouter(prefix="/telemetria", tags=["Telemetria"])


def _requiere_sesion(authorization: str | None) -> str:
    """Carga manual de Brix: requiere estar logueado en el panel (cualquier
    rol). No usamos el helper de auth.py para no acoplar los módulos."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token requerido.")
    from app.auth import security
    user = security.verify_token(authorization.split(" ", 1)[1])
    if not user:
        raise HTTPException(401, "Token inválido o expirado.")
    return user


class BrixManualIn(BaseModel):
    brix: float
    ph: float | None = None
    fecha: str | None = None  # ISO (ej: 2026-03-15T10:00), opcional
    observacion: str | None = None


@router.get("", response_model=list)
def lista_vinedos_base():
    return db_vinedos.get_all_vinedos_ids()


@router.get("/vinedos", response_model=list)
def lista_vinedos_legacy():
    return db_vinedos.get_all_vinedos_ids()


@router.get("/cuarteles")
def cuarteles_detallados():
    """Lista de cuarteles con metadatos. Incluye is_hardware para que el
    dashboard distinga nodos reales de cuarteles de demo."""
    return [db_vinedos.get_meta(v) for v in db_vinedos.get_all_vinedos_ids()]


@router.post("/cuarteles/{vinedo_id}/geocerca")
def guardar_geocerca(vinedo_id: str, puntos: list[dict]):
    if len(puntos) < 3:
        raise HTTPException(400, "La geocerca necesita al menos 3 puntos.")
    db_vinedos.set_geocerca(vinedo_id, puntos)
    return {"status": "ok", "vinedo_id": vinedo_id, "puntos": len(puntos)}


@router.post("/ingest")
async def ingestar_telemetria_real(payload: TelemetryCreate, request: Request):
    """Endpoint que usa el nodo Heltec Wireless Tracker.
    El nodo hace POST por WiFi directo (etapa de banco/patio) o via gateway
    LoRa (etapa de finca). Si trae lat/lon GPS y el cuartel no existe todavia,
    se registra automaticamente como nodo real — asi sale solo el 'Patio_Test'
    la primera vez que el nodo de tu casa reporta su posicion."""
    data = payload.model_dump(mode="json")

    # --- DIAG BMP (temporal): leer los campos diag_ del body CRUDO ---
    # No estan en el schema TelemetryCreate, asi que FastAPI los descarta.
    # Los leemos del request crudo y los devolvemos como eco en la respuesta
    # (NO se guardan en la DB). Sirve para diagnosticar el BMP280 por WiFi.
    diag = {}
    try:
        raw = await request.json()
        diag = {k: v for k, v in raw.items() if k.startswith("diag_")}
        if diag:
            # Aparece en los logs de Railway con cada POST del nodo real.
            print(f"--> [DIAG BMP] {data.get('vinedo_id')}: {diag}")
    except Exception:
        pass
    # -----------------------------------------------------------------

    # Auto-registro / refinamiento de posicion a partir del GPS del nodo
    if data.get("lat") is not None and data.get("lon") is not None:
        if data["vinedo_id"] not in db_vinedos.get_all_vinedos_ids():
            # Nodo nuevo: se crea solo la primera vez que reporta con GPS
            db_vinedos.register_node_cuartel(
                data["vinedo_id"], data["lat"], data["lon"],
                zona=data.get("node_id", "Patio"),
            )
        else:
            # Cuartel ya conocido (pre-registrado): mover el marcador a la
            # posicion GPS real sin pisar variedad/hectareas/geocerca.
            meta = db_vinedos.get_meta(data["vinedo_id"])
            if meta:
                meta["lat"] = data["lat"]
                meta["lon"] = data["lon"]

    rec = db_vinedos.save_telemetry(data)

    # Persistir tambien en MySQL para que el dato REAL sobreviva reinicios de
    # Railway y quede junto al historico, igual que el simulador. No es fatal:
    # si la DB falla, el nodo igual queda guardado en memoria y responde OK.
    try:
        from app.core.config import settings
        if bool(settings.DATABASE_URL):
            from app.db.database import save_telemetry_db
            save_telemetry_db([rec])
    except Exception as e:
        print(f"--> [INGEST] No se pudo persistir en MySQL (sigo OK): {e}")

    resp = {
        "status": "ok",
        "id": rec["id"],
        "vinedo_id": rec["vinedo_id"],
        "source": rec.get("source"),
        "alerta_helada": rec.get("alerta_helada"),
    }
    # Eco del diagnostico del BMP, si el nodo lo mando (temporal).
    if diag:
        resp["diag_bmp"] = diag
    return resp


@router.post("/{vinedo_id}/brix-manual")
def registrar_brix_manual(vinedo_id: str, body: BrixManualIn,
                          authorization: str | None = Header(default=None)):
    """Carga manual de una lectura de Brix (y opcionalmente pH) tomada a mano
    por el ingeniero agrónomo con refractómetro de campo, por cuartel. Se
    guarda como una lectura más (source='manual') así alimenta el mismo
    histórico y KPI de maduración (/analisis/cosecha/{id}) que usa el resto
    del dashboard, sin necesitar sensores para ese cuartel."""
    _requiere_sesion(authorization)

    ts = None
    if body.fecha:
        try:
            ts = datetime.fromisoformat(body.fecha)
        except Exception:
            ts = None
    ts = ts or datetime.utcnow()

    rec_in = {
        "vinedo_id": vinedo_id,
        "timestamp": ts,
        "source": "manual",
        "uva_brix": body.brix,
        "uva_ph": body.ph,
        "observacion": body.observacion,
    }
    rec = db_vinedos.save_telemetry(rec_in)

    try:
        from app.core.config import settings
        if bool(settings.DATABASE_URL):
            from app.db.database import save_telemetry_db
            save_telemetry_db([rec])
    except Exception as e:
        print(f"--> [BRIX MANUAL] No se pudo persistir en MySQL (sigo OK): {e}")

    return {"status": "ok", "vinedo_id": vinedo_id, "id": rec["id"],
            "timestamp": rec["timestamp"], "uva_brix": rec["uva_brix"], "uva_ph": rec.get("uva_ph")}


@router.get("/{vinedo_id}")
def telemetria_vinedo(vinedo_id: str, limit: int = 24):
    historial = db_vinedos.get_history(vinedo_id, limit=limit)
    if not historial:
        raise HTTPException(404, f"Sin registros para '{vinedo_id}'")
    return historial