"""Almacenamiento en memoria (RAM) de telemetría por cuartel.
En producción se reemplaza por PostgreSQL / TimescaleDB."""
from datetime import datetime
from typing import List, Dict, Any


class VinedoStorage:
    def __init__(self):
        self._db: Dict[str, List[Dict[str, Any]]] = {}
        self._global_id_counter = 1
        # Metadatos geográficos de cada cuartel (Luján de Cuyo, Mendoza)
        self.meta: Dict[str, Dict[str, Any]] = {}

    def register_cuartel(self, vinedo_id: str, variedad: str, hectareas: float,
                         lat: float, lon: float, zona: str = ""):
        # No pisar una geocerca ya guardada si el cuartel se re-registra
        existente = self.meta.get(vinedo_id, {})
        self.meta[vinedo_id] = {
            "vinedo_id": vinedo_id,
            "variedad": variedad,
            "hectareas": hectareas,
            "lat": lat,
            "lon": lon,
            "zona": zona,
            "geocerca": existente.get("geocerca", []),
        }

    def set_geocerca(self, vinedo_id: str, puntos: list):
        """Guarda el polígono real del cuartel: lista de {lat, lon} marcados
        a mano sobre el satélite, o leídos por GPS en el campo."""
        if vinedo_id not in self.meta:
            self.meta[vinedo_id] = {"vinedo_id": vinedo_id}
        self.meta[vinedo_id]["geocerca"] = puntos

    def save_telemetry(self, telemetry_data: Dict[str, Any]) -> Dict[str, Any]:
        vinedo_id = telemetry_data["vinedo_id"]
        if vinedo_id not in self._db:
            self._db[vinedo_id] = []

        # IMPORTANTE: primero el spread de telemetry_data, y DESPUÉS los campos
        # calculados. Así, si el nodo manda timestamp=null en el payload, NO pisa
        # el timestamp bueno que generamos acá. (Antes el **telemetry_data iba
        # último y sobrescribía timestamp con None -> timestamp:null en el front.)
        full_record = {
            "id": self._global_id_counter,
            **telemetry_data,
            "timestamp": telemetry_data.get("timestamp") or datetime.utcnow(),
            "source": telemetry_data.get("source", "simulator"),
            "alerta_helada": telemetry_data["temp_aire"] <= 2.0,
        }
        self._db[vinedo_id].append(full_record)
        self._global_id_counter += 1
        # Limitar el historial en memoria a 1000 lecturas por cuartel
        if len(self._db[vinedo_id]) > 1000:
            self._db[vinedo_id] = self._db[vinedo_id][-1000:]
        return full_record

    def get_history(self, vinedo_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return self._db.get(vinedo_id, [])[-limit:]

    def get_all_vinedos_ids(self) -> List[str]:
        return list(self._db.keys())

    def get_meta(self, vinedo_id: str) -> Dict[str, Any]:
        return self.meta.get(vinedo_id, {})

    def register_node_cuartel(self, vinedo_id: str, lat: float, lon: float,
                              variedad: str = "Nodo de prueba",
                              hectareas: float = 0.1, zona: str = "Patio") -> None:
        """Crea (si no existe) un cuartel asociado a un NODO REAL ubicado por
        GPS. Lo usa el endpoint /ingest la primera vez que un nodo Heltec
        reporta su posicion. Marca el cuartel como is_hardware=True para que el
        dashboard lo muestre como 'sensor real' y no como demo."""
        if vinedo_id not in self.meta:
            self.meta[vinedo_id] = {}
        self.meta[vinedo_id].update({
            "vinedo_id": vinedo_id,
            "variedad": self.meta[vinedo_id].get("variedad", variedad),
            "hectareas": self.meta[vinedo_id].get("hectareas", hectareas),
            "lat": lat,
            "lon": lon,
            "zona": zona,
            "is_hardware": True,
            "geocerca": self.meta[vinedo_id].get("geocerca", []),
        })
        if vinedo_id not in self._db:
            self._db[vinedo_id] = []


db_vinedos = VinedoStorage()