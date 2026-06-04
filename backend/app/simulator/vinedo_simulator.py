"""
Simulador Dinámico de Ecosistemas Vitícolas — AgroTech Mendoza.
Genera telemetría sintética realista mientras no esté conectado el hardware
ESP32 / LoRaWAN. Cuando los nodos físicos publiquen datos vía
POST /api/v1/telemetria/ingest, este simulador puede apagarse desde config.
"""
import math
import random
from datetime import datetime, timedelta
from app.models.vinedo import db_vinedos


class VinedoSimulator:
    def __init__(self):
        # Cuarteles alineados con el mapa del dashboard
        self.cuarteles = {
            "Cuartel_Malbec_1":     {"brix": 21.2, "ph": 3.15, "humedad_suelo": 32.0},
            "Cuartel_Cabernet_2":   {"brix": 20.5, "ph": 3.10, "humedad_suelo": 28.5},
            "Cuartel_Chardonnay_3": {"brix": 19.8, "ph": 3.05, "humedad_suelo": 35.0},
            "Cuartel_Syrah_4":      {"brix": 20.9, "ph": 3.12, "humedad_suelo": 26.0},
        }
        # Registrar metadatos geográficos (coordenadas Luján de Cuyo)
        meta = {
            "Cuartel_Malbec_1":     ("Malbec", 4.2, -33.0386, -68.8920),
            "Cuartel_Cabernet_2":   ("Cabernet Sauvignon", 3.1, -33.0401, -68.8895),
            "Cuartel_Chardonnay_3": ("Chardonnay", 2.4, -33.0372, -68.8951),
            "Cuartel_Syrah_4":      ("Syrah", 3.8, -33.0418, -68.8872),
        }
        for vid, (var, ha, lat, lon) in meta.items():
            db_vinedos.register_cuartel(vid, var, ha, lat, lon)

        self.current_simulated_time = datetime.now()

    def _simular_clima(self, hora: int) -> tuple:
        temp_base, amplitud = 16.0, 9.0
        efecto_hora = math.sin((hora - 9) * math.pi / 12)
        temp_aire = temp_base + amplitud * efecto_hora + random.uniform(-1.0, 1.0)
        # Inversión térmica nocturna: simula riesgo de helada de madrugada
        if 2 <= hora <= 6:
            temp_aire = max(-2.5, temp_aire - 10.0)
        humedad_aire = max(15.0, min(95.0, 65.0 - (efecto_hora * 25.0) + random.uniform(-3.0, 3.0)))
        presion_atm = 1013.2 + random.uniform(-1.5, 1.5)
        return round(temp_aire, 2), round(humedad_aire, 2), round(presion_atm, 1)

    def avanzar_un_ciclo(self):
        self.current_simulated_time += timedelta(hours=1)
        hora = self.current_simulated_time.hour
        temp_aire, humedad_aire, presion_atm = self._simular_clima(hora)

        ciclo = []
        for vinedo_id, estado in self.cuarteles.items():
            evaporacion = max(0.05, temp_aire * 0.015) if temp_aire > 0 else 0.01
            estado["humedad_suelo"] = max(12.0, estado["humedad_suelo"] - evaporacion + random.uniform(-0.1, 0.1))
            # Pulso de riego automático
            if estado["humedad_suelo"] < 18.0:
                estado["humedad_suelo"] += 12.0
            # Maduración biológica de la uva
            if temp_aire > 10.0:
                factor = (temp_aire - 10.0) * 0.001
                estado["brix"] += factor + random.uniform(0.001, 0.005)
                estado["ph"] += (factor * 0.15) + random.uniform(0.0001, 0.001)

            rec = {
                "vinedo_id": vinedo_id,
                "timestamp": self.current_simulated_time,
                "temp_aire": round(temp_aire, 2),
                "humedad_aire": round(humedad_aire, 2),
                "presion_atm": round(presion_atm, 2),
                "humedad_suelo": round(estado["humedad_suelo"], 2),
                "uva_brix": round(estado["brix"], 2),
                "uva_ph": round(estado["ph"], 3),
            }
            db_vinedos.save_telemetry(rec)
            ciclo.append(rec)
        return ciclo

    def inicializar_con_historial(self, horas_atras: int = 48):
        self.current_simulated_time = datetime.now() - timedelta(hours=horas_atras)
        for _ in range(horas_atras):
            self.avanzar_un_ciclo()
        print(f"--> [SIMULADOR] Inicializado con {horas_atras} horas de datos históricos.")


vinedo_sim = VinedoSimulator()