"""AgroTech Mendoza by puma-code.com — API (FastAPI)."""
import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.simulator.vinedo_simulator import vinedo_sim
from app.models.vinedo import db_vinedos
from app.api import telemetry, predictions, clima, riego, chat, auth, fitosanitario, db_admin, comercial


def run_simulator():
    print("--> [BACKGROUND] Hilo del simulador iniciado.")
    persist = bool(settings.DATABASE_URL)
    if persist:
        print("--> [BACKGROUND] Persistencia de telemetria en MySQL: ACTIVADA.")
    while True:
        try:
            ciclo = vinedo_sim.avanzar_un_ciclo()
            if persist:
                try:
                    from app.db.database import save_telemetry_db
                    save_telemetry_db(ciclo)
                except Exception as e:
                    # Filtramos el spam masivo de SQLAlchemy si es un error de llave foránea
                    if "1452" in str(e):
                        print("--> [DB WARN] Error 1452: Llave foránea rechazada. Revisa el schema de 'cuarteles' en MySQL. Persistencia omitida este ciclo.")
                    else:
                        print(f"--> [DB ERROR] No se pudo guardar telemetria: {e}")
            time.sleep(settings.SIMULATION_SPEED_SECONDS)
        except Exception as e:
            print(f"--> [ERROR SIMULADOR]: {e}")
            time.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Asegurar integridad en MySQL ANTES de iniciar la simulación
    if bool(settings.DATABASE_URL):
        try:
            from app.db.database import engine
            from sqlalchemy import text
            with engine.begin() as conn:
                # Inserción segura ignorando duplicados para no chocar si ya existen
                conn.execute(text("""
                    INSERT IGNORE INTO cuarteles (vinedo_id, variedad, hectareas, zona) VALUES
                    ('Cuartel_Malbec_1', 'Malbec', 4.2, 'Maipú'),
                    ('Cuartel_Cabernet_2', 'Cabernet Sauvignon', 3.1, 'Luján de Cuyo'),
                    ('Cuartel_Chardonnay_3', 'Chardonnay', 2.4, 'Agrelo'),
                    ('Cuartel_Syrah_4', 'Syrah', 3.8, 'Tunuyán'),
                    ('Cuartel_Bonarda_5', 'Bonarda', 3.5, 'Tupungato');
                """))
            print("--> [DB] Sincronización de cuarteles ejecutada en MySQL.")
        except Exception as e:
            print(f"--> [DB] Error al sincronizar cuarteles: {e}")

    # 2. Inicializar simulador en memoria
    vinedo_sim.inicializar_con_historial(horas_atras=48)
    
    # 3. Iniciar el hilo del simulador
    threading.Thread(target=run_simulator, daemon=True).start()
    
    yield
    print("--> Deteniendo AgroTech Mendoza.")


app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

P = settings.API_V1_STR
app.include_router(telemetry.router, prefix=P)
app.include_router(predictions.router, prefix=P)
app.include_router(clima.router, prefix=P)
app.include_router(riego.router, prefix=P)
app.include_router(chat.router, prefix=P)
app.include_router(auth.router, prefix=P)
app.include_router(fitosanitario.router, prefix=P)
app.include_router(db_admin.router, prefix=P)
app.include_router(comercial.router, prefix=P)


@app.get(f"{P}/vinedos", tags=["Telemetría"])
def vinedos_directo():
    return db_vinedos.get_all_vinedos_ids()


@app.get("/", tags=["General"])
def root():
    return {"status": "ONLINE", "proyecto": settings.PROJECT_NAME,
            "version": settings.VERSION, "entorno": settings.ENV}