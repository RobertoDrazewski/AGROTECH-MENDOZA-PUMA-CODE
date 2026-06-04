from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TelemetryBase(BaseModel):
    vinedo_id: str = Field(..., examples=["Cuartel_Malbec_1"])
    temp_aire: float = Field(..., description="Temperatura del aire en °C")
    humedad_aire: float = Field(..., description="Humedad relativa %")
    presion_atm: float = Field(..., description="Presión atmosférica hPa")
    humedad_suelo: float = Field(..., description="Humedad de suelo %")
    uva_brix: float = Field(..., description="Grados Brix")
    uva_ph: float = Field(..., description="pH de la uva")


class TelemetryCreate(TelemetryBase):
    """Payload que enviará el nodo ESP32/LoRaWAN cuando se conecte el hardware real."""
    timestamp: Optional[datetime] = None


class TelemetryResponse(TelemetryBase):
    id: int
    timestamp: datetime
    alerta_helada: bool

    class Config:
        from_attributes = True
