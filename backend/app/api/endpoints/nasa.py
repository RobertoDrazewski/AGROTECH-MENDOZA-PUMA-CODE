"""
Endpoint de comparacion NASA POWER vs sensores.

Reutiliza el cliente de NASA que ya existe en app/db/nasa_loader.py (_fetch_point)
para traer el ULTIMO dato satelital disponible (NASA va ~2-3 dias atras) de las
coordenadas reales del nodo. El frontend lo cruza contra la lectura del sensor.

NASA POWER es gratis y sin API key. No rompe nada si NASA no responde:
en ese caso devuelve disponible=False y el front muestra "sin dato satelital".
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from app.models.vinedo import db_vinedos
from app.core.config import settings
from app.db.nasa_loader import _fetch_point

router = APIRouter(prefix="/nasa", tags=["NASA POWER"])


@router.get("/{vinedo_id}")
def nasa_punto(vinedo_id: str):
    """Devuelve el ultimo registro horario de NASA POWER para las coordenadas
    del vinedo/nodo. Pensado para comparar contra la telemetria del sensor."""
    meta = db_vinedos.get_meta(vinedo_id)
    lat = meta.get("lat", settings.LAT)
    lon = meta.get("lon", settings.LON)

    # NASA va ~2-3 dias atras; pedimos una ventana corta y tomamos el ultimo.
    fin = datetime.utcnow() - timedelta(days=2)
    inicio = fin - timedelta(days=4)

    try:
        filas = _fetch_point(lat, lon, inicio, fin)
    except Exception as e:
        print(f"[NASA] {vinedo_id} fallo: {e}")
        return {
            "vinedo_id": vinedo_id, "disponible": False,
            "fuente": "NASA POWER",
            "detalle": "NASA POWER no respondio en este momento.",
        }

    if not filas:
        return {
            "vinedo_id": vinedo_id, "disponible": False,
            "fuente": "NASA POWER",
            "detalle": "Sin datos satelitales para estas coordenadas.",
        }

    ultimo = filas[-1]  # _fetch_point ya viene ordenado por timestamp
    atraso_h = round((datetime.utcnow() - ultimo["timestamp"]).total_seconds() / 3600)

    return {
        "vinedo_id": vinedo_id,
        "disponible": True,
        "fuente": "NASA POWER (satelital)",
        "lat": lat,
        "lon": lon,
        "timestamp": ultimo["timestamp"].isoformat(),
        "atraso_horas": atraso_h,            # cuantas horas atras es el dato
        "temp_aire": ultimo["temp_aire"],
        "humedad_aire": ultimo["humedad_aire"],
        "presion_atm": ultimo["presion_atm"],
        "punto_rocio": ultimo.get("punto_rocio"),
    }