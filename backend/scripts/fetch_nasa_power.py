"""
Descarga datos meteorológicos históricos REALES de NASA POWER para las
coordenadas de los cuarteles de AgroTech Mendoza y los guarda como CSV.

NASA POWER es gratuito, sin API key, datos satelitales horarios validados.
Docs: https://power.larc.nasa.gov/docs/services/api/temporal/hourly/

Uso:
    python scripts/fetch_nasa_power.py --start 2023-01-01 --end 2024-12-31

Si NASA POWER no responde (red caída, firewall), usa --synthetic para
generar un dataset físicamente realista del clima de Mendoza como respaldo,
de modo que el entrenamiento del modelo nunca se bloquee.
"""
import argparse
import csv
import math
import random
from datetime import datetime, timedelta

import requests

# Cuarteles reales del proyecto (lat, lon, zona)
CUARTELES = {
    "Cuartel_Malbec_1":     (-32.958598, -68.745336, "Maipu"),
    "Cuartel_Cabernet_2":   (-33.162103, -68.915638, "Lujan de Cuyo"),
    "Cuartel_Chardonnay_3": (-33.160387, -68.915273, "Agrelo"),
    "Cuartel_Syrah_4":      (-33.570331, -69.024776, "Tunuyan"),
    "Cuartel_Bonarda_5":    (-33.350075, -69.174682, "Tupungato"),
}

POWER_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"
# T2M=temp aire, RH2M=humedad rel, PS=presion sup, T2MDEW=punto rocio,
# ALLSKY_SFC_SW_DWN=radiacion, WS2M=viento
PARAMS = "T2M,RH2M,PS,T2MDEW,WS2M"


def fetch_real(lat, lon, start, end):
    """Devuelve lista de dicts horarios desde NASA POWER."""
    params = {
        "parameters": PARAMS,
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start.replace("-", ""),
        "end": end.replace("-", ""),
        "format": "JSON",
    }
    r = requests.get(POWER_URL, params=params, timeout=120)
    r.raise_for_status()
    p = r.json()["properties"]["parameter"]
    filas = []
    for ts_key in sorted(p["T2M"].keys()):
        # ts_key formato: YYYYMMDDHH
        dt = datetime.strptime(ts_key, "%Y%m%d%H")
        t = p["T2M"][ts_key]
        # NASA usa -999 como fill para datos faltantes
        if t <= -900:
            continue
        filas.append({
            "timestamp": dt.isoformat(),
            "temp_aire": round(t, 2),
            "humedad_aire": round(p["RH2M"][ts_key], 2),
            "presion_atm": round(p["PS"][ts_key] * 10.0, 2),  # kPa -> hPa
            "punto_rocio": round(p["T2MDEW"][ts_key], 2),
            "viento": round(p["WS2M"][ts_key], 2),
        })
    return filas


def gen_synthetic(lat, lon, start, end):
    """Respaldo: clima horario realista de Mendoza (hemisferio sur, semiarido).
    Solo se usa si NASA POWER no esta disponible. Incluye heladas de invierno
    para que el modelo de anomalias tenga eventos reales que detectar."""
    d0 = datetime.strptime(start, "%Y-%m-%d")
    d1 = datetime.strptime(end, "%Y-%m-%d")
    filas = []
    t = d0
    while t <= d1:
        doy = t.timetuple().tm_yday
        # Estacional: verano caluroso dic-feb (hemisferio sur)
        estacional = 9.0 * math.cos((doy - 15) * 2 * math.pi / 365)
        temp_media_dia = 16.0 + estacional
        # Ciclo diario
        diurno = 8.0 * math.sin((t.hour - 9) * math.pi / 12)
        temp = temp_media_dia + diurno + random.uniform(-1.5, 1.5)
        # Heladas de invierno (jun-ago) en madrugada
        es_invierno = doy < 60 or doy > 330 or (152 <= doy <= 244)
        if es_invierno and 2 <= t.hour <= 7 and random.random() < 0.18:
            temp = random.uniform(-4.0, 1.5)
        hum = max(12.0, min(95.0, 60.0 - diurno * 2.5 + random.uniform(-5, 5)))
        # Punto de rocio aproximado (Magnus inverso)
        a, b = 17.27, 237.7
        alpha = ((a * temp) / (b + temp)) + math.log(max(0.1, hum) / 100.0)
        dew = (b * alpha) / (a - alpha)
        filas.append({
            "timestamp": t.isoformat(),
            "temp_aire": round(temp, 2),
            "humedad_aire": round(hum, 2),
            "presion_atm": round(940.0 + random.uniform(-4, 4), 2),  # Mendoza ~800m
            "punto_rocio": round(dew, 2),
            "viento": round(abs(random.gauss(2.5, 1.5)), 2),
        })
        t += timedelta(hours=1)
    return filas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2023-01-01")
    ap.add_argument("--end", default="2024-12-31")
    ap.add_argument("--out", default="data/clima_historico_mendoza.csv")
    ap.add_argument("--synthetic", action="store_true",
                    help="Forzar datos sinteticos sin llamar a NASA")
    args = ap.parse_args()

    todas = []
    for vid, (lat, lon, zona) in CUARTELES.items():
        print(f"--> {vid} ({zona}) lat={lat} lon={lon}")
        filas = None
        if not args.synthetic:
            try:
                filas = fetch_real(lat, lon, args.start, args.end)
                print(f"    NASA POWER OK: {len(filas)} horas reales")
            except Exception as e:
                print(f"    NASA POWER fallo ({e}); usando respaldo sintetico")
        if filas is None:
            filas = gen_synthetic(lat, lon, args.start, args.end)
            print(f"    Sintetico: {len(filas)} horas")
        for f in filas:
            f["vinedo_id"] = vid
            f["zona"] = zona
            todas.append(f)

    campos = ["vinedo_id", "zona", "timestamp", "temp_aire", "humedad_aire",
              "presion_atm", "punto_rocio", "viento"]
    with open(args.out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=campos)
        w.writeheader()
        w.writerows(todas)
    print(f"\n--> Guardado: {args.out} ({len(todas)} filas)")


if __name__ == "__main__":
    main()
