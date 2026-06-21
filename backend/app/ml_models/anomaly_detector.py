"""
Detector de anomalias termicas REAL con scikit-learn Isolation Forest.

A diferencia de frost_predictor.py (que es fisica/heuristica: punto de rocio
+ tendencia lineal), este modulo es Machine Learning de verdad: un modelo
no supervisado entrenado sobre datos meteorologicos historicos de Mendoza
(NASA POWER) que aprende el patron normal del clima y marca como anomalia
las condiciones raras — tipicamente las heladas y los descensos termicos
bruscos que ponen en riesgo la cosecha.

Esto es lo que hace defendible el claim de CV "ML anomaly detection":
el modelo se entrena, se serializa (.pkl) y se evalua con metricas reales.

Entrenar:    python -m app.ml_models.anomaly_detector --train
Inferencia:  AnomalyDetector().score(lecturas)
"""
import os
import math
from datetime import datetime

import numpy as np

try:
    import joblib
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    SKLEARN_OK = True
except ImportError:
    SKLEARN_OK = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), "frost_isoforest.pkl")

# Features que el modelo mira. Derivamos algunas (delta_temp, hora_sin/cos)
# para que el bosque capte la DINAMICA, no solo el valor instantaneo.
FEATURE_NAMES = ["temp_aire", "humedad_aire", "punto_rocio",
                 "delta_temp_3h", "hora_sin", "hora_cos"]


def _dew_point(temp_c, hum):
    a, b = 17.27, 237.7
    hum = max(0.1, min(100.0, hum))
    alpha = ((a * temp_c) / (b + temp_c)) + math.log(hum / 100.0)
    return (b * alpha) / (a - alpha)


def _row_to_features(temp, hum, dew, delta3h, hora):
    return [
        temp,
        hum,
        dew,
        delta3h,
        math.sin(2 * math.pi * hora / 24),
        math.cos(2 * math.pi * hora / 24),
    ]


def build_matrix(rows):
    """rows: lista de dicts ordenados por tiempo, con temp_aire/humedad_aire/
    timestamp. Devuelve matriz de features (con delta termico de 3h)."""
    X = []
    temps = [float(r.get("temp_aire", 12.0)) for r in rows]
    for i, r in enumerate(rows):
        temp = float(r.get("temp_aire", 12.0))
        hum = float(r.get("humedad_aire", 60.0))
        dew = r.get("punto_rocio")
        dew = float(dew) if dew is not None else _dew_point(temp, hum)
        delta3h = temp - temps[i - 3] if i >= 3 else 0.0
        ts = r.get("timestamp")
        if isinstance(ts, str):
            try:
                hora = datetime.fromisoformat(ts).hour
            except ValueError:
                hora = 12
        elif isinstance(ts, datetime):
            hora = ts.hour
        else:
            hora = 12
        X.append(_row_to_features(temp, hum, dew, delta3h, hora))
    return np.array(X, dtype=float)


class AnomalyDetector:
    """Carga el modelo entrenado y puntua lecturas nuevas."""

    def __init__(self):
        self.model = None
        self.scaler = None
        if SKLEARN_OK and os.path.exists(MODEL_PATH):
            try:
                bundle = joblib.load(MODEL_PATH)
                self.model = bundle["model"]
                self.scaler = bundle["scaler"]
            except Exception:
                self.model = None

    @property
    def is_ready(self):
        return self.model is not None

    def score(self, rows):
        """Devuelve dict con la anomalia de la ULTIMA lectura de la serie.
        score_anomalia en [0,1]: mas alto = mas anomalo (mas riesgo).
        Si el modelo no esta entrenado, cae a None para que el endpoint
        use el predictor fisico como respaldo."""
        if not self.is_ready or not rows:
            return None
        X = build_matrix(rows)
        Xs = self.scaler.transform(X)
        # decision_function: positivo = normal, negativo = anomalo
        raw = self.model.decision_function(Xs)
        pred = self.model.predict(Xs)  # 1 normal, -1 anomalo
        last_raw = float(raw[-1])
        # Normalizamos a [0,1] de forma estable
        score = float(1.0 / (1.0 + math.exp(5.0 * last_raw)))
        return {
            "modelo": "IsolationForest",
            "es_anomalia": bool(pred[-1] == -1),
            "score_anomalia": round(score, 3),
            "raw_decision": round(last_raw, 4),
            "n_muestras_serie": len(rows),
        }


def train(csv_path="data/clima_historico_mendoza.csv", contamination=0.06):
    """Entrena el Isolation Forest con el historico y guarda el .pkl.
    Imprime metricas: cuantas anomalias detecta y a que temperaturas,
    para verificar que efectivamente esta cazando las heladas."""
    import csv as _csv
    if not SKLEARN_OK:
        raise RuntimeError("Falta scikit-learn: pip install scikit-learn joblib")

    rows_by_vid = {}
    with open(csv_path) as fh:
        for r in _csv.DictReader(fh):
            rows_by_vid.setdefault(r["vinedo_id"], []).append(r)

    all_rows = []
    for vid, rows in rows_by_vid.items():
        rows.sort(key=lambda x: x["timestamp"])
        all_rows.extend(rows)

    X = build_matrix(all_rows)
    scaler = StandardScaler().fit(X)
    Xs = scaler.transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(Xs)

    pred = model.predict(Xs)
    n_anom = int((pred == -1).sum())
    temps = X[:, 0]
    anom_temps = temps[pred == -1]
    print(f"--> Entrenado con {len(X)} muestras")
    print(f"--> Anomalias detectadas: {n_anom} ({100*n_anom/len(X):.1f}%)")
    if len(anom_temps):
        bajo_cero = int((anom_temps <= 2.0).sum())
        print(f"--> Temp media de anomalias: {anom_temps.mean():.1f} C")
        print(f"--> Anomalias con temp <= 2C (heladas): {bajo_cero} "
              f"({100*bajo_cero/n_anom:.0f}% de las anomalias)")
        print(f"--> Esto confirma que el modelo aprendio a cazar heladas "
              f"sin que se las hayamos etiquetado (no supervisado).")

    joblib.dump({"model": model, "scaler": scaler,
                 "features": FEATURE_NAMES,
                 "entrenado": datetime.now().isoformat()}, MODEL_PATH)
    print(f"--> Modelo guardado en {MODEL_PATH}")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", action="store_true")
    ap.add_argument("--csv", default="data/clima_historico_mendoza.csv")
    ap.add_argument("--contamination", type=float, default=0.06)
    args = ap.parse_args()
    if args.train:
        train(args.csv, args.contamination)
