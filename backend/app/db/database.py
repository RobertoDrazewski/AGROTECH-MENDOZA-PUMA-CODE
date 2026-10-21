"""Conexión a la base de datos (SQLAlchemy + PyMySQL).
Lee settings.DATABASE_URL del .env. Diseñado para no romper el arranque del
backend si falta la URL o las librerías: los errores se manejan donde se usan."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

Base = declarative_base()

_engine = None
_SessionLocal = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        if not settings.DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL no está configurada en el .env. "
                "Agregá: DATABASE_URL=mysql+pymysql://root:PASS@HOST.proxy.rlwy.net:PUERTO/railway"
            )
        url = settings.DATABASE_URL
        # Acepta 'mysql://' y lo corrige al driver pymysql automáticamente
        if url.startswith("mysql://"):
            url = url.replace("mysql://", "mysql+pymysql://", 1)
        _engine = create_engine(url, pool_pre_ping=True, pool_recycle=300, future=True)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    return _engine


def get_session():
    if _SessionLocal is None:
        get_engine()
    return _SessionLocal()


def save_telemetry_db(records):
    """Inserta una lista de lecturas del simulador/hardware en la tabla telemetria."""
    if not records:
        return
    from app.db import models
    s = get_session()
    try:
        for r in records:
            s.add(models.Telemetria(
                vinedo_id=r["vinedo_id"],
                source=r.get("source", "simulator"),
                leido_en=r.get("timestamp"),
                temp_aire=r.get("temp_aire"),
                humedad_aire=r.get("humedad_aire"),
                presion_atm=r.get("presion_atm"),
                humedad_suelo=r.get("humedad_suelo"),
                temp_suelo=r.get("temp_suelo"),
                uva_brix=r.get("uva_brix"),
                uva_ph=r.get("uva_ph"),
                bateria=r.get("bateria"),
                bateria_v=r.get("bateria_v"),
                lat=r.get("lat"),
                lon=r.get("lon"),
                rssi=r.get("rssi"),
                alerta_helada=bool((r.get("temp_aire") or 99) <= 2.0),
                observacion=r.get("observacion"),
            ))
        s.commit()
    finally:
        s.close()

def guardar_geocerca_db(vinedo_id: str, puntos: list):
    """Persiste el polígono real de un cuartel (marcado a mano sobre el
    satélite) en MySQL. Antes esto vivía solo en RAM (VinedoStorage.meta) y
    se perdía en cada redeploy de Railway — con esto sobrevive reinicios."""
    from sqlalchemy import text
    import json
    try:
        eng = get_engine()
        with eng.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS geocercas (
                    vinedo_id VARCHAR(64) PRIMARY KEY,
                    puntos_json TEXT NOT NULL,
                    actualizado_en DATETIME NOT NULL
                );
            """))
            conn.execute(text("""
                INSERT INTO geocercas (vinedo_id, puntos_json, actualizado_en)
                VALUES (:v, :p, NOW())
                ON DUPLICATE KEY UPDATE puntos_json = :p, actualizado_en = NOW();
            """), {"v": vinedo_id, "p": json.dumps(puntos)})
    except Exception as e:
        print(f"--> [DB] No se pudo persistir la geocerca de {vinedo_id} (queda solo en memoria): {e}")


def cargar_geocercas_db() -> dict:
    """Devuelve {vinedo_id: puntos} con todas las geocercas guardadas en
    MySQL, para restaurarlas en RAM al arrancar el servidor."""
    from sqlalchemy import text
    import json
    try:
        eng = get_engine()
        with eng.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS geocercas (
                    vinedo_id VARCHAR(64) PRIMARY KEY,
                    puntos_json TEXT NOT NULL,
                    actualizado_en DATETIME NOT NULL
                );
            """))
            rows = conn.execute(text("SELECT vinedo_id, puntos_json FROM geocercas")).fetchall()
        salida = {}
        for vid, puntos_json in rows:
            try:
                salida[vid] = json.loads(puntos_json)
            except Exception:
                pass
        return salida
    except Exception as e:
        print(f"--> [DB] No se pudieron cargar las geocercas guardadas: {e}")
        return {}


def ya_hay_datos_nasa():
    """True si la tabla telemetria ya tiene lecturas con source='historical_nasa'.
    Se usa para sembrar el historico real UNA sola vez (idempotente): en cada
    reinicio de Railway no se vuelve a sembrar ni se duplican filas."""
    from sqlalchemy import text
    try:
        eng = get_engine()
        with eng.connect() as conn:
            n = conn.execute(text(
                "SELECT COUNT(*) FROM telemetria WHERE source = 'historical_nasa'"
            )).scalar()
        return (n or 0) > 0
    except Exception as e:
        print(f"--> [DB] No se pudo verificar datos NASA: {e}")
        # Ante la duda, decimos que SI hay (no sembramos) para no arriesgar duplicados
        return True


def cuarteles_con_datos_nasa():
    """Devuelve el set de vinedo_id que YA tienen lecturas historical_nasa.
    Permite sembrar SOLO los cuarteles que faltan (idempotencia por cuartel):
    si agregas un nodo nuevo, se le siembra su historico sin tocar los demas."""
    from sqlalchemy import text
    try:
        eng = get_engine()
        with eng.connect() as conn:
            rows = conn.execute(text(
                "SELECT DISTINCT vinedo_id FROM telemetria WHERE source = 'historical_nasa'"
            )).fetchall()
        return {r[0] for r in rows}
    except Exception as e:
        print(f"--> [DB] No se pudo listar cuarteles con datos NASA: {e}")
        return set()


def ya_hay_brix_2026_seed():
    """True si ya se sembraron las lecturas manuales simuladas de Brix 2026
    (retrocarga de 1 lectura por mes). Evita duplicar filas en cada reinicio."""
    from sqlalchemy import text
    try:
        eng = get_engine()
        with eng.connect() as conn:
            n = conn.execute(text(
                "SELECT COUNT(*) FROM telemetria WHERE source = 'manual_2026_seed'"
            )).scalar()
        return (n or 0) > 0
    except Exception as e:
        print(f"--> [DB] No se pudo verificar semilla de Brix 2026: {e}")
        return True