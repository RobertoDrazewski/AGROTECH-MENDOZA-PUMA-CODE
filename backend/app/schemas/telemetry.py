from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class TelemetrySource(str, Enum):
    """De donde viene la lectura. Permite que el simulador (demo) y el
    hardware real (nodo Heltec) convivan en el mismo sistema sin mezclarse."""
    simulator = "simulator"          # datos sinteticos de demo
    hardware = "hardware"            # nodo Heltec real en campo/patio
    historical = "historical_nasa"   # serie historica NASA POWER (entrenamiento)


class TelemetryBase(BaseModel):
    vinedo_id: str = Field(..., examples=["Cuartel_Malbec_1"])
    temp_aire: float = Field(..., description="Temperatura del aire en C")
    humedad_aire: float = Field(..., description="Humedad relativa %")
    presion_atm: float = Field(..., description="Presion atmosferica hPa")
    humedad_suelo: float = Field(..., description="Humedad de suelo %")
    # Brix y pH son OPCIONALES: el hardware no los mide (son de laboratorio).
    # El simulador si los genera. Si el nodo real no los manda, quedan en None
    # y el dashboard los muestra como "estimado / lab pendiente".
    uva_brix: Optional[float] = Field(default=None, description="Grados Brix (lab)")
    uva_ph: Optional[float] = Field(default=None, description="pH de la uva (lab)")
    temp_suelo: Optional[float] = Field(default=None, description="Temp suelo C (DS18B20)")


class TelemetryCreate(TelemetryBase):
    """Payload que envia el nodo Heltec Wireless Tracker por WiFi directo
    (o via gateway LoRa mas adelante). Incluye GPS y origen."""
    timestamp: Optional[datetime] = None
    source: TelemetrySource = TelemetrySource.hardware
    lat: Optional[float] = Field(default=None, description="Latitud GPS del nodo")
    lon: Optional[float] = Field(default=None, description="Longitud GPS del nodo")
    node_id: Optional[str] = Field(default=None, description="ID fisico del nodo Heltec")
    bateria_v: Optional[float] = Field(default=None, description="Tension de bateria V")
    rssi: Optional[int] = Field(default=None, description="RSSI WiFi/LoRa dBm")


class TelemetryResponse(TelemetryBase):
    id: int
    timestamp: datetime
    source: str
    alerta_helada: bool

    class Config:
        from_attributes = True