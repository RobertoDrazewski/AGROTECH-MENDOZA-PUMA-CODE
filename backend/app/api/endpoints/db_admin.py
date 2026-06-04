"""Diagnóstico y administración de la base de datos MySQL (Railway).
- GET  /db/health  -> prueba la conexión y lista las tablas existentes.
- POST /db/init     -> crea las tablas (si no existen) y siembra datos base.
Las importaciones de SQLAlchemy son perezosas para que el backend arranque
aunque todavía no estén instaladas las librerías o falte DATABASE_URL."""
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/db", tags=["Base de Datos"])


@router.get("/health")
def db_health():
    if not settings.DATABASE_URL:
        return {"conectado": False, "motivo": "DATABASE_URL no está configurada en el .env."}
    try:
        from sqlalchemy import text
        from app.db.database import get_engine
    except ImportError:
        return {"conectado": False,
                "motivo": "Faltan librerías. Ejecutá: pip install sqlalchemy pymysql"}
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            tablas = [row[0] for row in conn.execute(text("SHOW TABLES")).fetchall()]
        # Oculta credenciales en la respuesta
        host = settings.DATABASE_URL.split("@")[-1]
        return {"conectado": True, "servidor": host, "tablas": tablas, "cantidad": len(tablas)}
    except Exception as e:
        return {"conectado": False, "motivo": str(e)}


@router.post("/init")
def db_init():
    if not settings.DATABASE_URL:
        return {"status": "error", "motivo": "DATABASE_URL no está configurada en el .env."}
    try:
        from app.db.database import get_engine, get_session, Base
        from app.db import models
        from app.simulator.vinedo_simulator import vinedo_sim
    except ImportError:
        return {"status": "error",
                "motivo": "Faltan librerías. Ejecutá: pip install sqlalchemy pymysql"}
    try:
        engine = get_engine()
        Base.metadata.create_all(bind=engine)  # crea las tablas que falten

        # Sembrar cuarteles y estado de riego desde la definición del simulador
        session = get_session()
        creados = 0
        for vinedo_id, (variedad, ha, lat, lon) in {
            "Cuartel_Malbec_1":     ("Malbec", 4.2, -33.0386, -68.8920),
            "Cuartel_Cabernet_2":   ("Cabernet Sauvignon", 3.1, -33.0401, -68.8895),
            "Cuartel_Chardonnay_3": ("Chardonnay", 2.4, -33.0372, -68.8951),
            "Cuartel_Syrah_4":      ("Syrah", 3.8, -33.0418, -68.8872),
        }.items():
            if not session.get(models.Cuartel, vinedo_id):
                session.add(models.Cuartel(vinedo_id=vinedo_id, variedad=variedad,
                                            hectareas=ha, lat=lat, lon=lon))
                session.add(models.RiegoEstado(vinedo_id=vinedo_id))
                creados += 1
        # Admin raíz
        if not session.query(models.Admin).filter_by(username="roberto").first():
            session.add(models.Admin(username="roberto", nombre="Roberto",
                                     email="roberto@puma-code.com", rol="admin", activo=True))
        session.commit()

        from sqlalchemy import text
        with engine.connect() as conn:
            tablas = [row[0] for row in conn.execute(text("SHOW TABLES")).fetchall()]
        session.close()
        return {"status": "ok", "mensaje": "Tablas creadas/verificadas.",
                "cuarteles_nuevos": creados, "tablas": tablas}
    except Exception as e:
        return {"status": "error", "motivo": str(e)}
