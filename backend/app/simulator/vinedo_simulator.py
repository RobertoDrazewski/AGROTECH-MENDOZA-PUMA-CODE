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
            "Cuartel_Bonarda_5":    {"brix": 20.2, "ph": 3.08, "humedad_suelo": 30.0},
        }
        
        # Registrar metadatos geográficos originales en memoria
        meta = {
            "Cuartel_Malbec_1":     ("Malbec", 4.2, -32.958598, -68.745336, "Maipú"),
            "Cuartel_Cabernet_2":   ("Cabernet Sauvignon", 3.1, -33.162103, -68.915638, "Luján de Cuyo"),
            "Cuartel_Chardonnay_3": ("Chardonnay", 2.4, -33.160387, -68.915273, "Agrelo"),
            "Cuartel_Syrah_4":      ("Syrah", 3.8, -33.570331, -69.024776, "Tunuyán"),
            "Cuartel_Bonarda_5":    ("Bonarda", 3.5, -33.350075, -69.174682, "Tupungato"),
        }
        
        for vid, (var, ha, lat, lon, zona) in meta.items():
            db_vinedos.register_cuartel(vid, var, ha, lat, lon, zona)

        # Inyectar las geocercas usando el formato nativo exacto esperado por el sistema [{lat, lon}]
        geocercas = {
            "Cuartel_Malbec_1": [
                {"lat": -32.957419, "lon": -68.745316}, {"lat": -32.957729, "lon": -68.744339}, 
                {"lat": -32.959332, "lon": -68.745037}, {"lat": -32.959224, "lon": -68.745385}, 
                {"lat": -32.960020, "lon": -68.745793}, {"lat": -32.959795, "lon": -68.746501}
            ],
            "Cuartel_Cabernet_2": [
                {"lat": -33.160630, "lon": -68.919275}, {"lat": -33.162345, "lon": -68.911314}, 
                {"lat": -33.164124, "lon": -68.911475}, {"lat": -33.162372, "lon": -68.919704}
            ],
            "Cuartel_Chardonnay_3": [
                {"lat": -33.158671, "lon": -68.917977}, {"lat": -33.160127, "lon": -68.911164}, 
                {"lat": -33.162210, "lon": -68.911271}, {"lat": -33.160638, "lon": -68.918556}
            ],
            "Cuartel_Syrah_4": [
                {"lat": -33.568776, "lon": -69.025420}, {"lat": -33.568096, "lon": -69.022727}, 
                {"lat": -33.572816, "lon": -69.024712}, {"lat": -33.572172, "lon": -69.027008}
            ],
            "Cuartel_Bonarda_5": [
                {"lat": -33.349958, "lon": -69.176238}, {"lat": -33.349304, "lon": -69.175809}, 
                {"lat": -33.350156, "lon": -69.173040}, {"lat": -33.351088, "lon": -69.173266}
            ]
        }
        for vid, puntos in geocercas.items():
            db_vinedos.set_geocerca(vid, puntos)

        self.current_simulated_time = datetime.now()

    def _simular_clima(self, hora: int) -> tuple:
        temp_base, amplitud = 16.0, 9.0
        efecto_hora = math.sin((hora - 9) * math.pi / 12)
        temp_aire = temp_base + amplitud * efecto_hora + random.uniform(-1.0, 1.0)
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
            if estado["humedad_suelo"] < 18.0:
                estado["humedad_suelo"] += 12.0
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
        print(f"--> [SIMULADOR] Inicializado con {horas_atras} horas de datos sintéticos.")

    def sembrar_desde_nasa(self, dias: int = 60, persist_fn=None):
        """Siembra cada cuartel con el histórico climático REAL de NASA POWER y
        deja al simulador continuando desde el último punto real (sin saltos).

        - persist_fn: callable opcional para guardar cada lectura en MySQL
          (ej. save_telemetry_db). Si es None, solo carga en memoria.
        - Si NASA no responde, cae a inicializar_con_historial() (comportamiento
          original). Nunca rompe el arranque.

        Marca las lecturas reales con source='historical_nasa' para que el
        dashboard pueda distinguir 'base histórica real' de 'proyección en vivo'.
        """
        from app.db.nasa_loader import cargar_historico
        coords = {vid: (m["lat"], m["lon"])
                  for vid, m in db_vinedos.meta.items()
                  if m.get("lat") is not None}

        historico = cargar_historico(coords, dias=dias)
        if not historico:
            print("--> [NASA] Sin datos reales; uso historial sintético.")
            self.inicializar_con_historial(horas_atras=48)
            return False

        ultimo_estado = {}
        total = 0
        for vinedo_id, filas in historico.items():
            filas.sort(key=lambda x: x["timestamp"])
            for f in filas:
                rec = {
                    "vinedo_id": vinedo_id,
                    "timestamp": f["timestamp"],
                    "source": "historical_nasa",
                    "temp_aire": f["temp_aire"],
                    "humedad_aire": f["humedad_aire"],
                    "presion_atm": f["presion_atm"],
                    # NASA no mide suelo/uva: estos los proyecta el simulador.
                    "humedad_suelo": self.cuarteles.get(vinedo_id, {}).get("humedad_suelo", 30.0),
                    "uva_brix": self.cuarteles.get(vinedo_id, {}).get("brix", 20.0),
                    "uva_ph": self.cuarteles.get(vinedo_id, {}).get("ph", 3.1),
                }
                db_vinedos.save_telemetry(rec)
                total += 1
            # El simulador continúa desde el último valor REAL de este cuartel
            if filas:
                ultimo_estado[vinedo_id] = filas[-1]["timestamp"]

        # El reloj del simulador arranca donde terminó NASA
        if ultimo_estado:
            self.current_simulated_time = max(ultimo_estado.values())

        if persist_fn:
            try:
                for vinedo_id, filas in historico.items():
                    persist_fn([{**f, "vinedo_id": vinedo_id,
                                 "source": "historical_nasa"} for f in filas])
                print("--> [NASA] Histórico real persistido en MySQL.")
            except Exception as e:
                print(f"--> [NASA] No se pudo persistir en MySQL: {e}")

        print(f"--> [NASA] Sembrados {total} registros reales en {len(historico)} "
              f"cuarteles. El simulador continúa en vivo desde el último dato real.")
        return True


vinedo_sim = VinedoSimulator()