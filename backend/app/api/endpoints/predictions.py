from fastapi import APIRouter
from app.models.vinedo import db_vinedos
from app.ml_models.frost_predictor import FrostPredictor
from app.ml_models.harvest_optimizer import HarvestOptimizer
from app.ml_models.anomaly_detector import AnomalyDetector

router = APIRouter(prefix="/analisis", tags=["Inteligencia Artificial"])
frost = FrostPredictor()
harvest = HarvestOptimizer()
anomaly = AnomalyDetector()  # Isolation Forest entrenado con historico de Mendoza


@router.get("/helada/{vinedo_id}")
def riesgo_helada(vinedo_id: str):
    historial = db_vinedos.get_history(vinedo_id, limit=6)
    if not historial:
        return {"risk_level": "LOW", "current_temp": 14.0, "cooling_rate_c_per_hour": 0.0,
                "probability": 0.0, "message": "Sin lecturas suficientes."}

    # 1) Predictor fisico (punto de rocio + tendencia) — explica el POR QUE
    fisico = frost.predict_frost_risk(historial)

    # 2) Modelo ML real (Isolation Forest) — detecta el PATRON anomalo
    ml = anomaly.score(historial)
    if ml is not None:
        fisico["ml_anomaly"] = ml
        if ml["es_anomalia"] and ml["score_anomalia"] > 0.55:
            if fisico["risk_level"] == "LOW":
                fisico["risk_level"] = "MEDIUM"
                fisico["probability"] = max(fisico.get("probability", 0), 0.45)
                fisico["message"] += (" El modelo de ML detecto un patron "
                                      "climatico anomalo (posible helada en formacion).")
        fisico["motor"] = "fisico + IsolationForest"
    else:
        fisico["motor"] = "fisico (ML no entrenado)"

    return fisico


@router.get("/anomalia/{vinedo_id}")
def deteccion_anomalia_ml(vinedo_id: str, limit: int = 24):
    """Isolation Forest: puntua la serie reciente y devuelve el grado de
    anomalia climatica. Pieza de ML que respalda el claim de CV."""
    historial = db_vinedos.get_history(vinedo_id, limit=limit)
    ml = anomaly.score(historial)
    if ml is None:
        return {"disponible": False,
                "mensaje": "Modelo no entrenado. Corre: python -m app.ml_models.anomaly_detector --train"}
    return {"disponible": True, "vinedo_id": vinedo_id, **ml}


@router.get("/cosecha/{vinedo_id}")
def optimizar_cosecha(vinedo_id: str):
    historial = db_vinedos.get_history(vinedo_id, limit=48)
    return harvest.analyze_ripening(historial)


@router.get("/historico/{vinedo_id}")
def analisis_historico(vinedo_id: str, periodo: str = "mensual"):
    """Series agregadas para los reportes anuales/mensuales del dashboard.
    Mientras no haya un año de datos reales, se generan series estacionales
    sintéticas representativas del clima de Mendoza para la demo."""
    import math, random
    meta = db_vinedos.get_meta(vinedo_id)
    if periodo == "anual":
        meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                 "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        serie = []
        for i, m in enumerate(meses):
            # Curva estacional (hemisferio sur): verano cálido en Dic-Feb
            temp = 18 + 9 * math.cos((i - 0) * math.pi / 6) + random.uniform(-1, 1)
            lluvia = max(0, 40 + 35 * math.cos((i - 1) * math.pi / 6) + random.uniform(-10, 10))
            heladas = max(0, int(6 * math.cos((i - 6) * math.pi / 6))) if i in (4, 5, 6, 7, 8) else 0
            gdd = max(0, (temp - 10) * 30)
            serie.append({
                "periodo": m, "temp_media": round(temp, 1),
                "precipitacion_mm": round(lluvia, 1),
                "eventos_helada": heladas, "gdd": round(gdd, 0),
            })
        return {"vinedo_id": vinedo_id, "periodo": "anual", "variedad": meta.get("variedad"),
                "serie": serie}
    else:
        # Mensual: usa las lecturas reales agregadas por día
        hist = db_vinedos.get_history(vinedo_id, limit=720)
        by_day = {}
        for r in hist:
            ts = r["timestamp"]
            day = ts.strftime("%d/%m") if hasattr(ts, "strftime") else str(ts)[:10]
            by_day.setdefault(day, []).append(r)
        serie = []
        for day, regs in list(by_day.items())[-30:]:
            temps = [x["temp_aire"] for x in regs]
            brix = [x["uva_brix"] for x in regs]
            serie.append({
                "periodo": day,
                "temp_max": round(max(temps), 1),
                "temp_min": round(min(temps), 1),
                "brix_medio": round(sum(brix) / len(brix), 2),
                "eventos_helada": sum(1 for x in regs if x["temp_aire"] <= 2.0),
            })
        return {"vinedo_id": vinedo_id, "periodo": "mensual", "serie": serie}
