"""
Script puntual: completa la siembra de NASA de los cuarteles que faltan
en MySQL (Railway), con inserciones EN LOTE (rapidas y con progreso visible).

A diferencia de save_telemetry_db (que inserta fila por fila, lento sobre
Railway), este usa executemany por lotes de 500 y commitea cada lote, asi
no se cuelga y vas viendo el avance.

Uso (desde backend/, con el .env apuntando a Railway):
    python scripts/completar_siembra_nasa.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.simulator.vinedo_simulator import vinedo_sim
from app.db.database import get_engine, cuarteles_con_datos_nasa
from app.db.nasa_loader import cargar_historico
from app.models.vinedo import db_vinedos

LOTE = 500

INSERT_SQL = text("""
    INSERT INTO telemetria
        (vinedo_id, source, leido_en, temp_aire, humedad_aire, presion_atm,
         humedad_suelo, uva_brix, uva_ph, alerta_helada)
    VALUES
        (:vinedo_id, 'historical_nasa', :leido_en, :temp_aire, :humedad_aire,
         :presion_atm, :humedad_suelo, :uva_brix, :uva_ph, :alerta_helada)
""")


def main():
    ya = cuarteles_con_datos_nasa()
    print(f"--> Cuarteles que YA tienen datos NASA: {ya or '(ninguno)'}")

    coords = {vid: (m["lat"], m["lon"])
              for vid, m in db_vinedos.meta.items()
              if m.get("lat") is not None}
    todos = set(coords.keys())
    faltan = todos - ya
    if not faltan:
        print("--> Todos los cuarteles ya estan sembrados. Nada que hacer.")
        return

    print(f"--> Faltan sembrar: {faltan}")
    print("--> Descargando NASA (usa cache si esta fresco)...")
    historico = cargar_historico(coords, dias=60)
    if not historico:
        print("--> NASA no respondio. Revisa tu conexion e intenta de nuevo.")
        return

    eng = get_engine()
    for vinedo_id in faltan:
        filas = historico.get(vinedo_id)
        if not filas:
            print(f"--> {vinedo_id}: sin datos NASA, salteado.")
            continue

        base = vinedo_sim.cuarteles.get(vinedo_id, {})
        rows = [{
            "vinedo_id": vinedo_id,
            "leido_en": f["timestamp"],
            "temp_aire": f["temp_aire"],
            "humedad_aire": f["humedad_aire"],
            "presion_atm": f["presion_atm"],
            "humedad_suelo": base.get("humedad_suelo", 30.0),
            "uva_brix": base.get("brix", 20.0),
            "uva_ph": base.get("ph", 3.1),
            "alerta_helada": bool((f["temp_aire"] or 99) <= 2.0),
        } for f in filas]

        total = len(rows)
        insertados = 0
        for i in range(0, total, LOTE):
            lote = rows[i:i + LOTE]
            with eng.begin() as conn:
                conn.execute(INSERT_SQL, lote)
            insertados += len(lote)
            print(f"--> {vinedo_id}: {insertados}/{total} filas...", flush=True)
        print(f"--> {vinedo_id}: COMPLETO ({total} filas).")

    ahora = cuarteles_con_datos_nasa()
    print(f"\n--> Cuarteles con datos NASA ahora: {ahora}")
    if todos.issubset(ahora):
        print("--> LISTO: los 5 cuarteles tienen su historico real.")
    else:
        print(f"--> Todavia faltan: {todos - ahora}. Volve a correr el script.")


if __name__ == "__main__":
    main()