from fastapi import APIRouter, HTTPException, Request
from app.models.vinedo import db_vinedos
from app.schemas.telemetry import TelemetryCreate

router = APIRouter(prefix="/telemetria", tags=["Telemetria"])


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


@router.get("/{vinedo_id}")
def telemetria_vinedo(vinedo_id: str, limit: int = 24):
    historial = db_vinedos.get_history(vinedo_id, limit=limit)
    if not historial:
        raise HTTPException(404, f"Sin registros para '{vinedo_id}'")
    return historial