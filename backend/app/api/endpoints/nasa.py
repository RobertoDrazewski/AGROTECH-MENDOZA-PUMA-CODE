"""
Endpoint de comparacion NASA POWER vs sensores.

Reutiliza el cliente de NASA que ya existe en app/db/nasa_loader.py (_fetch_point)
para traer el ULTIMO dato satelital disponible (NASA va ~2-3 dias atras, a veces
mas) de las coordenadas reales del nodo. El frontend lo cruza contra la lectura
del sensor.

NASA POWER es gratis y sin API key. No rompe nada si NASA no responde:
en ese caso devuelve disponible=False y el front muestra "sin dato satelital".

IMPORTANTE - por que se veia "sin dato satelital" todo el tiempo:
El dashboard llama a este endpoint en cada poll (useDashboard, cada 3s) para
CADA visitante que tiene la demo o el panel abierto. Sin cache, eso eran
decenas de pedidos por minuto contra la API publica de NASA, que no esta
pensada para ese uso: termina devolviendo error o vaciando la respuesta y
el front se queda mostrando "no disponible" de forma permanente. Ahora:
  1. Se cachea la respuesta por vinedo_id durante CACHE_TTL_SEGUNDOS (1h).
     El dato de NASA es horario y llega con dias de atraso, asi que no hay
     ninguna perdida en no volver a pedirlo mas seguido que eso.
  2. Si el pedido en vivo falla pero hay un dato cacheado previo (aunque
     haya vencido el TTL), se devuelve ese dato marcado como "stale" en vez
     de mostrar "sin dato" de la nada.
  3. La ventana de busqueda se amplia sola (2, luego 5, luego 10 dias mas
     atras) por si el atraso real de NASA en ese momento es mayor a lo
     habitual, en vez de fallar directo si la ventana corta viene vacia.
"""
import time
from datetime import datetime, timedelta

from fastapi import APIRouter

from app.models.vinedo import db_vinedos
from app.core.config import settings
from app.db.nasa_loader import _fetch_point

router = APIRouter(prefix="/nasa", tags=["NASA POWER"])

CACHE_TTL_SEGUNDOS = 60 * 60  # 1 hora: el dato satelital no cambia mas seguido que esto
_cache = {}  # vinedo_id -> {"data": {...}, "ts": epoch_seconds}


def _consultar_nasa_con_ventanas(lat: float, lon: float):
    """Intenta traer el ultimo dato real, ampliando la ventana hacia atras
    si la mas corta viene vacia (el atraso de NASA POWER varia)."""
    ahora = datetime.utcnow()
    ventanas = [
        (2, 5),    # caso normal: entre 2 y 7 dias atras
        (5, 10),   # atraso mayor al habitual
        (10, 15),  # atraso importante / reprocesamiento
    ]
    ultimo_error = None
    for dias_fin, dias_ventana in ventanas:
        fin = ahora - timedelta(days=dias_fin)
        inicio = fin - timedelta(days=dias_ventana)
        try:
            filas = _fetch_point(lat, lon, inicio, fin)
        except Exception as e:
            ultimo_error = e
            continue
        if filas:
            return filas, None
    return [], ultimo_error


@router.get("/{vinedo_id}")
def nasa_punto(vinedo_id: str):
    """Devuelve el ultimo registro horario de NASA POWER para las coordenadas
    del vinedo/nodo, cacheado para no golpear la API en cada poll del front."""
    meta = db_vinedos.get_meta(vinedo_id)
    lat = meta.get("lat", settings.LAT)
    lon = meta.get("lon", settings.LON)

    ahora = time.time()
    cacheado = _cache.get(vinedo_id)
    if cacheado and (ahora - cacheado["ts"]) < CACHE_TTL_SEGUNDOS:
        return cacheado["data"]

    filas, error = _consultar_nasa_con_ventanas(lat, lon)

    if not filas:
        if error:
            print(f"[NASA] {vinedo_id} fallo: {error}")
        # Si hay un dato previo (aunque este vencido), lo devolvemos marcado
        # como stale en vez de mostrar "sin dato" de golpe.
        if cacheado:
            resultado = {**cacheado["data"], "disponible": True, "stale": True}
            _cache[vinedo_id] = {"data": resultado, "ts": cacheado["ts"]}
            return resultado
        resultado = {
            "vinedo_id": vinedo_id, "disponible": False,
            "fuente": "NASA POWER",
            "detalle": "Sin datos satelitales para estas coordenadas en este momento.",
        }
        _cache[vinedo_id] = {"data": resultado, "ts": ahora}
        return resultado

    ultimo = filas[-1]  # ya viene ordenado por timestamp
    atraso_h = round((datetime.utcnow() - ultimo["timestamp"]).total_seconds() / 3600)

    resultado = {
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
    _cache[vinedo_id] = {"data": resultado, "ts": ahora}
    return resultado
