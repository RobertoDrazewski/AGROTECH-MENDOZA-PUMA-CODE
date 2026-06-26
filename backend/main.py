"""AgroTech Mendoza by puma-code.com — API (FastAPI)."""
import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.simulator.vinedo_simulator import vinedo_sim
from app.models.vinedo import db_vinedos
from app.api import telemetry, predictions, clima, riego, chat, auth, fitosanitario, db_admin, comercial, nasa

def run_simulator():
    print("--> [BACKGROUND] Hilo del simulador iniciado.")
    persist = bool(settings.DATABASE_URL)
    while True:
        try:
            ciclo = vinedo_sim.avanzar_un_ciclo()
            if persist:
                try:
                    from app.db.database import save_telemetry_db
                    save_telemetry_db(ciclo)
                except Exception as e:
                    print(f"--> [DB ERROR] No se pudo guardar telemetria: {e}")
            time.sleep(settings.SIMULATION_SPEED_SECONDS)
        except Exception as e:
            print(f"--> [ERROR SIMULADOR]: {e}")
            time.sleep(5)

def sembrar_nasa_en_segundo_plano():
    persist = bool(settings.DATABASE_URL)
    ya_sembrados = set()
    persist_fn = None
    if persist:
        try:
            from app.db.database import cuarteles_con_datos_nasa, save_telemetry_db
            ya_sembrados = cuarteles_con_datos_nasa()
            persist_fn = save_telemetry_db
        except Exception as e:
            print(f"--> [NASA] No se pudo verificar estado en DB: {e}")

    try:
        ok = vinedo_sim.sembrar_desde_nasa(dias=60, persist_fn=persist_fn, saltear=ya_sembrados)
        if not ok:
            vinedo_sim.inicializar_con_historial(horas_atras=48)
    except Exception as e:
        print(f"--> [NASA] Falló la siembra ({e}); uso historial sintético.")
        vinedo_sim.inicializar_con_historial(horas_atras=48)

    threading.Thread(target=run_simulator, daemon=True).start()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Asegurar integridad en MySQL
    if bool(settings.DATABASE_URL):
        try:
            from app.db.database import get_engine
            from sqlalchemy import text
            with get_engine().begin() as conn:
                conn.execute(text("""
                    INSERT IGNORE INTO cuarteles (vinedo_id, variedad, hectareas, zona) VALUES
                    ('Cuartel_Malbec_1', 'Malbec', 4.2, 'Maipú'),
                    ('Cuartel_Cabernet_2', 'Cabernet Sauvignon', 3.1, 'Luján de Cuyo'),
                    ('Cuartel_Chardonnay_3', 'Chardonnay', 2.4, 'Agrelo'),
                    ('Cuartel_Syrah_4', 'Syrah', 3.8, 'Tunuyán'),
                    ('Cuartel_Bonarda_5', 'Bonarda', 3.5, 'Tupungato'),
                    ('Patio_Casa', 'Hardware Heltec (real)', 0.10, 'Patio - Maipú');
                """))
        except Exception as e:
            print(f"--> [DB] Error al sincronizar cuarteles: {e}")

    # 1b. Pre-registrar Nodo Real
    try:
        db_vinedos.register_node_cuartel(
            "Patio_Casa", lat=-32.9833, lon=-68.7833,
            variedad="Hardware Heltec (real)", hectareas=0.10, zona="Patio - Maipú",
        )
    except Exception as e:
        print(f"--> [HW] No se pudo pre-registrar el nodo de patio: {e}")

    # 2. Iniciar procesos en segundo plano
    threading.Thread(target=sembrar_nasa_en_segundo_plano, daemon=True).start()
    yield

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

# --- CORRECCIÓN CORS ---
origins = [
    "https://agrotech-pumacode.com.ar",
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Lista blanca explícita
    allow_credentials=True,     # NECESARIO para enviar Autorización/Tokens
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(nasa.router, prefix=P)

@app.get(f"{P}/vinedos", tags=["Telemetría"])
def vinedos_directo():
    return db_vinedos.get_all_vinedos_ids()

@app.get("/", tags=["General"])
def root():
    return {"status": "ONLINE", "proyecto": settings.PROJECT_NAME}