"""Detector de condiciones de Viento Zonda basado en termodinámica local.
Evalúa tasas de cambio en humedad, temperatura y presión sobre tiempo real
para identificar la firma física del Zonda en la superficie."""
from datetime import datetime

def _temp(reg):
    for k in ("temp_aire", "Temp_Aire_C", "temp_aire_c", "temperatura"):
        if reg.get(k) is not None:
            return float(reg[k])
    return 15.0

def _hum(reg):
    for k in ("humedad_aire", "Humedad_Aire_Porc", "humedad_relativa", "humedad"):
        if reg.get(k) is not None:
            return float(reg[k])
    return 50.0

def _press(reg):
    for k in ("presion_atm", "presion", "pressure", "presion_hpa"):
        if reg.get(k) is not None:
            return float(reg[k])
    return 1013.25

def _ts(reg):
    """Timestamp como datetime, tolerante a None o string ISO."""
    t = reg.get("timestamp") or reg.get("leido_en")
    if isinstance(t, datetime):
        return t
    if isinstance(t, str):
        try:
            return datetime.fromisoformat(t.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


class ZondaDetector:
    def _calculate_rates_per_hour(self, history: list) -> dict:
        """Calcula las derivadas de Temp, Humedad y Presión por hora."""
        # Tomamos hasta las últimas ~30 lecturas para tener una ventana de ~1 hora a 20s/lectura
        muestras = history[-30:] if len(history) >= 2 else history
        
        t_ini, t_fin = _temp(muestras[0]), _temp(muestras[-1])
        h_ini, h_fin = _hum(muestras[0]), _hum(muestras[-1])
        p_ini, p_fin = _press(muestras[0]), _press(muestras[-1])
        
        ts_ini, ts_fin = _ts(muestras[0]), _ts(muestras[-1])

        temp_rate = hum_rate = press_rate = 0.0

        if ts_ini and ts_fin:
            horas = (ts_fin - ts_ini).total_seconds() / 3600.0
            if horas >= 0.05:  # Al menos ~3 min de ventana
                temp_rate = (t_fin - t_ini) / horas   # Positivo = calentamiento
                hum_rate = (h_fin - h_ini) / horas    # Negativo = secándose
                press_rate = (p_fin - p_ini) / horas  # Negativo = cayendo
                return {"temp": temp_rate, "hum": hum_rate, "press": press_rate}

        # Respaldo sin timestamps
        if len(muestras) >= 3:
            temp_rate = (t_fin - _temp(muestras[-3])) / 2.0
            hum_rate = (h_fin - _hum(muestras[-3])) / 2.0
            press_rate = (p_fin - _press(muestras[-3])) / 2.0
            
        return {"temp": temp_rate, "hum": hum_rate, "press": press_rate}

    def detect_zonda_risk(self, history: list) -> dict:
        if not history or len(history) < 3:
            return {
                "risk_level": "LOW", "probability": 0.0,
                "current_temp": round(_temp(history[-1]), 2) if history else 15.0,
                "current_hum": round(_hum(history[-1]), 1) if history else 50.0,
                "message": "Datos históricos insuficientes para calcular tendencia.",
            }

        t_current = _temp(history[-1])
        h_current = _hum(history[-1])
        p_current = _press(history[-1])

        rates = self._calculate_rates_per_hour(history)
        t_rate = rates["temp"]
        h_rate = rates["hum"]
        p_rate = rates["press"]

        probability = 0.0
        risk = "LOW"
        msg = "Condiciones atmosféricas estables."

        # Puntuación basada en la firma termodinámica del Zonda
        score = 0
        if h_current <= 25.0: score += 1
        if h_current <= 15.0: score += 2 # Fuerte indicador de masa de aire seca
        if h_rate < -5.0: score += 2     # Cayendo más de 5% por hora
        if t_rate > 2.0: score += 2      # Subiendo más de 2°C por hora
        if p_rate < -1.0: score += 1     # Presión en descenso

        if score >= 6:
            risk = "CRITICAL"
            probability = min(0.15 * score, 0.95)
            msg = f"¡ALERTA! Firma de Zonda detectada en viñedo. Humedad crítica ({h_current:.1f}%), calentamiento de +{t_rate:.1f}°C/h y presión en descenso."
        elif score >= 4:
            risk = "MEDIUM"
            probability = min(0.15 * score, 0.60)
            msg = f"Precaución: Condiciones compatibles con Zonda en curso. Humedad bajando ({h_rate:.1f}%/h)."

        return {
            "current_temp": round(t_current, 2),
            "current_hum": round(h_current, 1),
            "current_press": round(p_current, 1),
            "temp_rate_c_per_hour": round(t_rate, 2),
            "hum_rate_porc_per_hour": round(h_rate, 2),
            "press_rate_hpa_per_hour": round(p_rate, 2),
            "risk_level": risk,
            "probability": round(probability, 2),
            "message": msg,
        }