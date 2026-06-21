"""
Carga del historico climatico REAL de NASA POWER para los cuarteles.

Se usa al arrancar el backend para SEMBRAR cada cuartel con datos reales
(temperatura, humedad, presion, punto de rocio) de las coordenadas exactas
del vinedo. El simulador toma el ultimo punto real como base y sigue
agregando lecturas en vivo encima — la transicion es continua, sin saltos.

Disenado para produccion (Railway):
  - Cachea la descarga en un CSV local para no pegarle a NASA en cada
    reinicio del contenedor (Railway reinicia seguido).
  - Si NASA no responde, NO rompe el arranque: devuelve None y el simulador
    cae a su comportamiento original (historial sintetico).

NASA POWER es gratuito, sin API key. Latencia tipica: la serie va con ~2-3
dias de atraso respecto a hoy (es satelital re-analizado), suficiente como
base historica.
"""
import os
import csv
import math
from datetime import datetime, timedelta

import requests

POWER_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"
PARAMS = "T2M,RH2M,PS,T2MDEW,WS2M"

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
CACHE_FILE = os.path.join(CACHE_DIR, "nasa_cache.csv")
# Si el cache tiene menos de estos dias, no volvemos a descargar
CACHE_MAX_AGE_DAYS = 7


def _fetch_point(lat, lon, start, end):
    params = {
        "parameters": PARAMS, "community": "AG",
        "longitude": lon, "latitude": lat,
        "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"),
        "format": "JSON",
    }
    r = requests.get(POWER_URL, params=params, timeout=90)
    r.raise_for_status()
    p = r.json()["properties"]["parameter"]
    filas = []
    for ts_key in sorted(p["T2M"].keys()):
        t = p["T2M"][ts_key]
        if t <= -900:  # fill value de NASA
            continue
        dt = datetime.strptime(ts_key, "%Y%m%d%H")
        filas.append({
            "timestamp": dt,
            "temp_aire": round(t, 2),
            "humedad_aire": round(p["RH2M"][ts_key], 2),
            "presion_atm": round(p["PS"][ts_key] * 10.0, 2),  # kPa -> hPa
            "punto_rocio": round(p["T2MDEW"][ts_key], 2),
        })
    return filas


def _cache_fresca():
    if not os.path.exists(CACHE_FILE):
        return False
    edad = datetime.now() - datetime.fromtimestamp(os.path.getmtime(CACHE_FILE))
    return edad.days < CACHE_MAX_AGE_DAYS


def _leer_cache():
    por_vinedo = {}
    with open(CACHE_FILE) as fh:
        for r in csv.DictReader(fh):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
            for k in ("temp_aire", "humedad_aire", "presion_atm", "punto_rocio"):
                r[k] = float(r[k])
            por_vinedo.setdefault(r["vinedo_id"], []).append(r)
    return por_vinedo


def _escribir_cache(por_vinedo):
    os.makedirs(CACHE_DIR, exist_ok=True)
    campos = ["vinedo_id", "timestamp", "temp_aire", "humedad_aire",
              "presion_atm", "punto_rocio"]
    with open(CACHE_FILE, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=campos)
        w.writeheader()
        for vid, filas in por_vinedo.items():
            for f in filas:
                row = {"vinedo_id": vid, **f}
                row["timestamp"] = f["timestamp"].isoformat()
                w.writerow(row)


def cargar_historico(cuarteles_coords, dias=60):
    """
    cuarteles_coords: dict {vinedo_id: (lat, lon)}
    Devuelve dict {vinedo_id: [filas ordenadas por tiempo]} con datos REALES
    de NASA, o None si no se pudo (sin romper el arranque).

    Usa cache local si esta fresco (evita golpear NASA en cada reinicio).
    """
    if _cache_fresca():
        try:
            print("--> [NASA] Usando cache local fresco.")
            return _leer_cache()
        except Exception as e:
            print(f"--> [NASA] Cache ilegible ({e}); se redescarga.")

    fin = datetime.utcnow() - timedelta(days=2)   # NASA va ~2 dias atras
    inicio = fin - timedelta(days=dias)
    resultado = {}
    for vid, (lat, lon) in cuarteles_coords.items():
        try:
            filas = _fetch_point(lat, lon, inicio, fin)
            if filas:
                resultado[vid] = filas
                print(f"--> [NASA] {vid}: {len(filas)} horas reales descargadas.")
        except Exception as e:
            print(f"--> [NASA] {vid} fallo: {e}")

    if not resultado:
        print("--> [NASA] Sin datos. El simulador usara su historial sintetico.")
        return None

    try:
        _escribir_cache(resultado)
        print(f"--> [NASA] Cache guardado en {CACHE_FILE}")
    except Exception as e:
        print(f"--> [NASA] No se pudo cachear: {e}")
    return resultado
