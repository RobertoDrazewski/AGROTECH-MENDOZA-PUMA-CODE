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
                    print(f"--> [DB] No se pudo guardar telemetria: {e}")
            time.sleep(settings.SIMULATION_SPEED_SECONDS)
        except Exception as e:
            print(f"--> [ERROR SIMULADOR]: {e}")
            time.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    vinedo_sim.inicializar_con_historial(horas_atras=48)
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