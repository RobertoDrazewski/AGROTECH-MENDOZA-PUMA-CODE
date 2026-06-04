"""Predictor de heladas: punto de rocío (Magnus-Tetens) + tendencia de enfriamiento."""
import math
from app.core.config import settings


def _temp(reg):
    """Lectura robusta de temperatura cubriendo nombres del simulador y del hardware."""
    for k in ("temp_aire", "Temp_Aire_C", "temp_aire_c", "temperatura"):
        if reg.get(k) is not None:
            return float(reg[k])
    return 12.0


def _hum(reg):
    for k in ("humedad_aire", "Humedad_Aire_Porc", "humedad_relativa", "humedad"):
        if reg.get(k) is not None:
            return float(reg[k])
    return 60.0


class FrostPredictor:
    @staticmethod
    def calculate_dew_point(temp_c: float, humidity_porc: float) -> float:
        a, b = 17.27, 237.7
        humidity_porc = max(0.1, min(100.0, humidity_porc))
        alpha = ((a * temp_c) / (b + temp_c)) + math.log(humidity_porc / 100.0)
        return float((b * alpha) / (a - alpha))

    def predict_frost_risk(self, history: list) -> dict:
        if not history or len(history) < 3:
            return {
                "risk_level": "LOW", "probability": 0.0,
                "current_temp": round(_temp(history[-1]), 2) if history else 14.0,
                "cooling_rate_c_per_hour": 0.0,
                "message": "Datos históricos insuficientes para calcular tendencia.",
            }

        t_current = _temp(history[-1])
        h_current = _hum(history[-1])
        dew_point = self.calculate_dew_point(t_current, h_current)

        t1, t2 = _temp(history[-2]), _temp(history[-3])
        avg_cooling = ((t2 - t1) + (t1 - t_current)) / 2.0
        projected_3h = t_current - (avg_cooling * 3)

        probability, risk, msg = 0.0, "LOW", "Condiciones estables en el viñedo."

        if projected_3h <= settings.THRESHOLD_FROST_ALERT_C:
            if dew_point <= 1.0:
                risk = "CRITICAL"
                probability = 0.90 if projected_3h < 0 else 0.75
                msg = (f"¡ALERTA MÁXIMA! Enfriamiento severo (-{avg_cooling:.1f}°C/h). "
                       f"Punto de rocío peligroso ({dew_point:.1f}°C).")
            else:
                risk, probability = "MEDIUM", 0.50
                msg = "Riesgo moderado. Descenso térmico detectado. Monitoree defensa pasiva."

        if t_current <= settings.THRESHOLD_FROST_ALERT_C:
            risk, probability = "CRITICAL", 0.95
            msg = f"¡HELADA EN CURSO! Temperatura actual {t_current}°C bajo el umbral de seguridad."

        return {
            "current_temp": round(t_current, 2),
            "dew_point": round(dew_point, 2),
            "cooling_rate_c_per_hour": round(avg_cooling, 2),
            "projected_temp_3h": round(projected_3h, 2),
            "risk_level": risk,
            "probability": probability,
            "message": msg,
        }
