import eval_type_backport; eval_type_backport.install_patch()
"""AgroTech Mendoza by puma-code.com — API (FastAPI)."""
import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.simulator.vinedo_simulator import vinedo_sim
from app.models.vinedo import db_vinedos
from app.api import telemetry, predictions, clima, riego, chat, auth, fitosanitario, db_admin, comercial, nasa, alarmas

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
                    if "1452" in str(e):
                        print("--> [DB WARN] Error 1452: Llave foránea rechazada. Revisa el schema de 'cuarteles' en MySQL. Persistencia omitida este ciclo.")
                    else:
                        print(f"--> [DB ERROR] No se pudo guardar telemetria: {e}")
            time.sleep(settings.SIMULATION_SPEED_SECONDS)
        except Exception as e:
            print(f"--> [ERROR SIMULADOR]: {e}")
            time.sleep(5)


def sembrar_nasa_en_segundo_plano():
    """Siembra el histórico de NASA SIN bloquear el arranque del servidor.
    Idempotente POR CUARTEL: solo persiste en MySQL los cuarteles que todavía
    no tienen datos NASA (incluye nodos nuevos). Si NASA falla, usa sintético."""
    persist = bool(settings.DATABASE_URL)
    ya_sembrados = set()
    persist_fn = None
    if persist:
        try:
            from app.db.database import cuarteles_con_datos_nasa, save_telemetry_db
            ya_sembrados = cuarteles_con_datos_nasa()
            persist_fn = save_telemetry_db
            if ya_sembrados:
                print(f"--> [NASA] Cuarteles ya sembrados (se saltean): {ya_sembrados}")
        except Exception as e:
            print(f"--> [NASA] No se pudo verificar estado en DB: {e}")

    try:
        ok = vinedo_sim.sembrar_desde_nasa(dias=60, persist_fn=persist_fn,
                                           saltear=ya_sembrados)
        if not ok:
            vinedo_sim.inicializar_con_historial(horas_atras=48)
    except Exception as e:
        print(f"--> [NASA] Falló la siembra ({e}); uso historial sintético.")
        vinedo_sim.inicializar_con_historial(horas_atras=48)

    # Ya no se siembra Brix manual simulado ni se arranca el simulador
    # sintético: el proyecto corre con datos 100% reales (hardware Heltec).
    # run_simulator() y simular_brix_2026_manual() quedan definidas pero sin
    # llamarse — reversible por si algún día se quiere volver a una demo con
    # datos de ejemplo, en vez de borrar el código.


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Asegurar integridad en MySQL ANTES de iniciar la simulación
    if bool(settings.DATABASE_URL):
        try:
            from app.db.database import get_engine
            from sqlalchemy import text
            with get_engine().begin() as conn:
                conn.execute(text("""
                    INSERT IGNORE INTO cuarteles (vinedo_id, variedad, hectareas, zona) VALUES
                    ('Patio_Casa', 'Hardware Heltec (real)', 0.10, 'Maipú, Mendoza');
                """))
            print("--> [DB] Sincronización de cuarteles ejecutada en MySQL.")
        except Exception as e:
            print(f"--> [DB] Error al sincronizar cuarteles: {e}")

        # Limpieza de los datos que dejó la simulación vieja (5 cuarteles de
        # demo: Malbec/Cabernet/Chardonnay/Syrah/Bonarda). Ya no se generan
        # desde que el proyecto corre solo con el nodo real, pero las filas
        # viejas seguían en MySQL y aparecían mezcladas en el histórico de
        # alarmas del panel. Se borra automáticamente en cada arranque — es
        # idempotente (después de la primera vez no encuentra nada que
        # borrar), así que no depende de correr ningún script a mano.
        try:
            with get_engine().begin() as conn:
                ids = [
                    "Cuartel_Malbec_1", "Cuartel_Cabernet_2", "Cuartel_Chardonnay_3",
                    "Cuartel_Syrah_4", "Cuartel_Bonarda_5",
                ]
                placeholders = ", ".join(f":v{i}" for i in range(len(ids)))
                params = {f"v{i}": vid for i, vid in enumerate(ids)}
                borrados = 0
                for tabla in ("alarmas", "telemetria", "geocercas", "cuarteles"):
                    try:
                        res = conn.execute(text(
                            f"DELETE FROM {tabla} WHERE vinedo_id IN ({placeholders})"
                        ), params)
                        borrados += res.rowcount or 0
                    except Exception as e_tabla:
                        # La tabla puede no existir todavía (primer arranque) — no es crítico.
                        print(f"--> [LIMPIEZA DEMO] {tabla}: {e_tabla}")
            if borrados:
                print(f"--> [LIMPIEZA DEMO] {borrados} filas de los 5 cuarteles de demo borradas de MySQL.")
        except Exception as e:
            print(f"--> [LIMPIEZA DEMO] No se pudo limpiar los datos de la simulación vieja: {e}")

        # Columna nueva para observaciones de lecturas manuales (Brix a mano).
        # OJO: "ADD COLUMN IF NOT EXISTS" no es soportado (o no corrió bien) en
        # esta instancia de Aiven MySQL, y esto rompió TODOS los inserts de
        # telemetria porque el ORM sí manda la columna 'observacion'. Se
        # reemplaza por el patrón portable: primero se pregunta a
        # information_schema.columns si la columna existe, y si no existe
        # recién ahí se hace el ALTER TABLE liso (sin IF NOT EXISTS). Además
        # el ALTER va con try/except propio que ignora específicamente el
        # error 1060 (Duplicate column name) por si dos instancias arrancan
        # a la vez y ambas ven "no existe" antes de que la primera la cree.
        try:
            with get_engine().begin() as conn:
                existe = conn.execute(text("""
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_schema = DATABASE()
                      AND table_name = 'telemetria'
                      AND column_name = 'observacion';
                """)).scalar()
                if not existe:
                    try:
                        conn.execute(text(
                            "ALTER TABLE telemetria ADD COLUMN observacion VARCHAR(255) NULL;"
                        ))
                        print("--> [DB] Columna 'observacion' agregada a telemetria.")
                    except Exception as e_alter:
                        if "1060" in str(e_alter):
                            print("--> [DB] Columna 'observacion' ya existía (carrera con otra instancia). OK.")
                        else:
                            raise
                else:
                    print("--> [DB] Columna 'observacion' ya existe en telemetria.")
        except Exception as e:
            print(f"--> [DB] No se pudo verificar/agregar columna 'observacion' (no crítico): {e}")

        # Súper admin real (vos): se crea SIN contraseña si no existía. Activás
        # tu acceso yendo a /setup-password con este email — eso solo toca
        # password_hash/activo, nunca el rol. Usamos ON DUPLICATE KEY UPDATE
        # (no INSERT IGNORE) a propósito: si por lo que sea ya existía una fila
        # con este username/email con otro rol (por ejemplo, quedó creada como
        # 'operador' por un camino viejo), este deploy la CORRIGE a
        # 'superadmin' en vez de dejarla como estaba. El login público de demo
        # (ROOT_ADMIN_USER) es una cuenta aparte y nunca es superadmin.
        try:
            with get_engine().begin() as conn:
                conn.execute(text("""
                    INSERT INTO admins (username, nombre, email, rol, activo) VALUES
                    ('drazewski', 'Roberto Drazewski', 'drazewski@gmail.com', 'superadmin', 0)
                    ON DUPLICATE KEY UPDATE rol = 'superadmin', nombre = 'Roberto Drazewski';
                """))
            print("--> [DB] Súper admin (drazewski@gmail.com) verificado/corregido en MySQL.")
        except Exception as e:
            print(f"--> [DB] No se pudo sembrar el súper admin: {e}")

        # Restaurar las geocercas (polígonos reales de cada cuartel, marcados
        # a mano sobre el satélite) que estén guardadas en MySQL. Antes vivían
        # SOLO en RAM y se perdían en cada redeploy de Railway; ahora, si ya
        # se guardó una, se recupera acá antes de que arranque el simulador.
        try:
            from app.db.database import cargar_geocercas_db
            geocercas_guardadas = cargar_geocercas_db()
            for vid, puntos in geocercas_guardadas.items():
                db_vinedos.set_geocerca(vid, puntos)
            if geocercas_guardadas:
                print(f"--> [DB] Geocercas restauradas desde MySQL: {list(geocercas_guardadas.keys())}")
        except Exception as e:
            print(f"--> [DB] No se pudieron restaurar las geocercas: {e}")

    # 1b. Pre-registrar el NODO REAL del patio (hardware) — el único nodo
    # que existe en el proyecto, se muestra en el panel como "Nodo DEMO"
    # (vinedo_id interno sigue siendo 'Patio_Casa' para no romper el
    # firmware, que ya trae ese VINEDO_ID configurado).
    #
    # Arranca con una posición aproximada de respaldo y, si ya hay una
    # lectura real con GPS guardada en MySQL, la pisa enseguida con la
    # posición real — así el mapa no "salta" de vuelta a la aproximada en
    # cada reinicio/redeploy de Railway (antes la posición real solo vivía
    # en RAM y se perdía en cada restart, causando la discrepancia de GPS).
    try:
        db_vinedos.register_node_cuartel(
            "Patio_Casa", lat=-32.9833, lon=-68.7833,
            variedad="Hardware Heltec (real)", hectareas=0.10, zona="Maipú, Mendoza",
            nombre="Nodo DEMO",
        )
        if bool(settings.DATABASE_URL):
            try:
                from app.db.database import cargar_ultima_posicion_db
                ultima = cargar_ultima_posicion_db("Patio_Casa")
                if ultima:
                    lat_real, lon_real = ultima
                    db_vinedos.register_node_cuartel(
                        "Patio_Casa", lat=lat_real, lon=lon_real,
                        variedad="Hardware Heltec (real)", hectareas=0.10, zona="Maipú, Mendoza",
                        nombre="Nodo DEMO",
                    )
                    print(f"--> [HW] Posición real restaurada desde MySQL: {lat_real}, {lon_real}")
            except Exception as e:
                print(f"--> [HW] No se pudo restaurar la última posición real (se usa la aproximada): {e}")
        print("--> [HW] Nodo de patio 'Patio_Casa' pre-registrado (hardware real).")
    except Exception as e:
        print(f"--> [HW] No se pudo pre-registrar el nodo de patio: {e}")

    # 1c. Geocerca por defecto del Nodo DEMO: el límite político real del
    # departamento de Maipú, Mendoza (IGN/CONAE), en vez del cuadradito
    # aproximado que se dibuja alrededor del punto GPS cuando no hay
    # geocerca marcada. Se siembra UNA sola vez — si ya hay una geocerca
    # restaurada desde MySQL (por ejemplo porque la marcaste a mano con
    # "Marcar geocerca" en el panel), esa queda y no se pisa.
    try:
        ya_tiene_geocerca = bool(db_vinedos.get_meta("Patio_Casa").get("geocerca"))
        if not ya_tiene_geocerca:
            from app.data.geocerca_maipu import GEOCERCA_MAIPU_DEPARTAMENTO
            db_vinedos.set_geocerca("Patio_Casa", GEOCERCA_MAIPU_DEPARTAMENTO)
            if bool(settings.DATABASE_URL):
                from app.db.database import guardar_geocerca_db
                guardar_geocerca_db("Patio_Casa", GEOCERCA_MAIPU_DEPARTAMENTO)
            print(f"--> [GEOCERCA] Límite de Maipú cargado como geocerca por defecto "
                  f"de Patio_Casa ({len(GEOCERCA_MAIPU_DEPARTAMENTO)} vértices).")
    except Exception as e:
        print(f"--> [GEOCERCA] No se pudo sembrar el límite de Maipú: {e}")

    # 2. Sembrar NASA + arrancar simulador EN SEGUNDO PLANO
    threading.Thread(target=sembrar_nasa_en_segundo_plano, daemon=True).start()
    print("--> [NASA] Siembra iniciada en segundo plano. El servidor ya está listo.")

    yield
    print("--> Deteniendo AgroTech Mendoza.")


app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

# Configuración estricta de CORS para permitir peticiones con Authorization header
origins = [
    "https://agrotech-pumacode.com.ar",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware, 
    allow_origins=origins, 
    allow_credentials=True,
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
app.include_router(alarmas.router, prefix=P)


@app.get(f"{P}/vinedos", tags=["Telemetría"])
def vinedos_directo():
    return db_vinedos.get_all_vinedos_ids()


@app.get("/", tags=["General"])
def root():
    return {"status": "ONLINE", "proyecto": settings.PROJECT_NAME,
            "version": settings.VERSION, "entorno": settings.ENV}