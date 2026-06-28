"""Pronóstico climático: usa OpenWeather si hay API key, si no genera un
pronóstico simulado coherente. Calcula riesgos de helada, granizo, golpe de
calor y viento Zonda (característico de Mendoza)."""
from fastapi import APIRouter
from app.core.config import settings
from app.models.vinedo import db_vinedos
import math
import random

router = APIRouter(prefix="/clima", tags=["Clima"])


def _riesgos(temp_min, temp_max, hum, viento, prob_lluvia):
    riesgos = []
    if temp_min <= settings.THRESHOLD_FROST_ALERT_C:
        riesgos.append({"tipo": "HELADA", "nivel": "ALTO" if temp_min <= 0 else "MEDIO",
                        "detalle": f"Mínima proyectada {temp_min:.1f}°C."})
    if temp_max >= settings.THRESHOLD_HEAT_STRESS_C:
        riesgos.append({"tipo": "GOLPE_DE_CALOR", "nivel": "ALTO" if temp_max >= 38 else "MEDIO",
                        "detalle": f"Máxima {temp_max:.1f}°C: posible estrés térmico/quemado de hoja."})
    # Granizo: convección con alta humedad + calor + lluvia
    if prob_lluvia > 55 and temp_max > 28 and hum > 55:
        riesgos.append({"tipo": "GRANIZO", "nivel": "MEDIO",
                        "detalle": "Condiciones convectivas favorables a tormentas de granizo."})
    if viento > 40 and hum < 25:
        riesgos.append({"tipo": "ZONDA", "nivel": "MEDIO",
                        "detalle": f"Viento {viento:.0f} km/h con baja humedad: viento Zonda."})
    return riesgos


@router.get("/{vinedo_id}")
def pronostico(vinedo_id: str):
    meta = db_vinedos.get_meta(vinedo_id)
    lat = meta.get("lat", settings.LAT)
    lon = meta.get("lon", settings.LON)

    # Intento de pronóstico real (OpenWeather)
    if settings.OPENWEATHER_API_KEY:
        try:
            import requests
            url = ("https://api.openweathermap.org/data/2.5/forecast"
                   f"?lat={lat}&lon={lon}&units=metric&lang=es"
                   f"&appid={settings.OPENWEATHER_API_KEY}")
            data = requests.get(url, timeout=8).json()
            dias = {}
            for it in data.get("list", []):
                d = it["dt_txt"][:10]
                dias.setdefault(d, []).append(it)
            forecast = []
            for d, items in list(dias.items())[:5]:
                temps = [i["main"]["temp"] for i in items]
                hums = [i["main"]["humidity"] for i in items]
                vientos = [i["wind"]["speed"] * 3.6 for i in items]
                lluvia = max((i.get("pop", 0) * 100 for i in items), default=0)
                tmin, tmax = min(temps), max(temps)
                hum, viento = sum(hums) / len(hums), max(vientos)
                forecast.append({
                    "fecha": d, "temp_min": round(tmin, 1), "temp_max": round(tmax, 1),
                    "humedad": round(hum), "viento_kmh": round(viento),
                    "prob_lluvia": round(lluvia),
                    "riesgos": _riesgos(tmin, tmax, hum, viento, lluvia),
                })
            return {"vinedo_id": vinedo_id, "fuente": "OpenWeather", "forecast": forecast}
        except Exception as e:
            print(f"[CLIMA] Falló OpenWeather, usando simulado: {e}")

    # Pronóstico simulado de 5 días
    forecast = []
    for d in range(5):
        base = 22 + random.uniform(-4, 6)
        tmax = round(base + random.uniform(2, 8), 1)
        tmin = round(base - random.uniform(8, 16), 1)
        hum = round(random.uniform(30, 80))
        viento = round(random.uniform(8, 55))
        lluvia = round(random.uniform(0, 80))
        forecast.append({
            "fecha": f"D+{d}", "temp_min": tmin, "temp_max": tmax,
            "humedad": hum, "viento_kmh": viento, "prob_lluvia": lluvia,
            "riesgos": _riesgos(tmin, tmax, hum, viento, lluvia),
        })
    return {"vinedo_id": vinedo_id, "fuente": "Simulado", "forecast": forecast}