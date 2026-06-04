from fastapi import APIRouter, HTTPException
from app.models.vinedo import db_vinedos
from app.schemas.telemetry import TelemetryCreate

router = APIRouter(prefix="/telemetria", tags=["Telemetría"])


@router.get("", response_model=list)
def lista_vinedos_base():
    return db_vinedos.get_all_vinedos_ids()


@router.get("/vinedos", response_model=list)
def lista_vinedos_legacy():
    return db_vinedos.get_all_vinedos_ids()


@router.get("/cuarteles")
def cuarteles_detallados():
    """Lista de cuarteles con metadatos (variedad, hectáreas, coordenadas)."""
    return [db_vinedos.get_meta(v) for v in db_vinedos.get_all_vinedos_ids()]


@router.post("/ingest")
def ingestar_telemetria_real(payload: TelemetryCreate):
    """Endpoint que usará el hardware ESP32/LoRaWAN cuando se conecte.
    El gateway LoRa decodifica el paquete y hace POST aquí."""
    rec = db_vinedos.save_telemetry(payload.model_dump())
    return {"status": "ok", "id": rec["id"], "vinedo_id": rec["vinedo_id"]}


@router.get("/{vinedo_id}")
def telemetria_vinedo(vinedo_id: str, limit: int = 24):
    historial = db_vinedos.get_history(vinedo_id, limit=limit)
    if not historial:
        raise HTTPException(404, f"Sin registros para '{vinedo_id}'")
    return historial
