"""Control de riego inteligente. Estado en memoria por cuartel.
Decide si regar según la humedad de suelo más reciente y permite enviar
comandos manuales/automáticos (que en producción viajarían por LoRaWAN al
actuador de la electroválvula)."""
from fastapi import APIRouter
from pydantic import BaseModel
from app.models.vinedo import db_vinedos
from app.core.config import settings

router = APIRouter(prefix="/riego", tags=["Riego Inteligente"])

# Estado en memoria: {vinedo_id: {"modo": "auto"|"manual", "valvula": bool}}
_estado = {}


class ComandoRiego(BaseModel):
    accion: str  # "abrir" | "cerrar" | "auto"


def _decidir(vinedo_id):
    hist = db_vinedos.get_history(vinedo_id, limit=1)
    if not hist:
        return None, "Sin datos de humedad."
    hs = hist[-1]["humedad_suelo"]
    umbral = settings.THRESHOLD_LOW_SOIL_MOISTURE
    if hs < umbral:
        return True, f"Humedad de suelo {hs:.1f}% < {umbral}%. SE RECOMIENDA REGAR."
    return False, f"Humedad de suelo {hs:.1f}% adecuada. NO es necesario regar."


@router.get("/{vinedo_id}")
def estado_riego(vinedo_id: str):
    st = _estado.setdefault(vinedo_id, {"modo": "auto", "valvula": False})
    recomendar, msg = _decidir(vinedo_id)
    if st["modo"] == "auto" and recomendar is not None:
        st["valvula"] = recomendar
    hist = db_vinedos.get_history(vinedo_id, limit=1)
    return {
        "vinedo_id": vinedo_id,
        "modo": st["modo"],
        "valvula_abierta": st["valvula"],
        "humedad_suelo": hist[-1]["humedad_suelo"] if hist else None,
        "recomendacion": msg,
    }


@router.post("/{vinedo_id}/comando")
def comando_riego(vinedo_id: str, cmd: ComandoRiego):
    st = _estado.setdefault(vinedo_id, {"modo": "auto", "valvula": False})
    if cmd.accion == "abrir":
        st["modo"], st["valvula"] = "manual", True
    elif cmd.accion == "cerrar":
        st["modo"], st["valvula"] = "manual", False
    elif cmd.accion == "auto":
        st["modo"] = "auto"
    # En producción: aquí se publica el downlink LoRaWAN hacia el actuador.
    return {"status": "ok", "vinedo_id": vinedo_id, "estado": st,
            "nota": "Comando registrado. Con hardware conectado se envía downlink LoRaWAN."}
