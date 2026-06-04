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
                leido_en=r.get("timestamp"),
                temp_aire=r.get("temp_aire"),
                humedad_aire=r.get("humedad_aire"),
                presion_atm=r.get("presion_atm"),
                humedad_suelo=r.get("humedad_suelo"),
                uva_brix=r.get("uva_brix"),
                uva_ph=r.get("uva_ph"),
                bateria=r.get("bateria"),
                alerta_helada=bool((r.get("temp_aire") or 99) <= 2.0),
            ))
        s.commit()
    finally:
        s.close()
