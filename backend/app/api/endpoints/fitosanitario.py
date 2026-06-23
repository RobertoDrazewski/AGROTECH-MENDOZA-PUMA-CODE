"""Monitoreo fitosanitario con IA — AgroTech Mendoza.
Red de trampas inteligentes + clasificador de visión (YOLOv8) que detecta y
cuenta insectos plaga clave del viñedo. Las trampas físicas (nodo ESP32-CAM)
envían la imagen al endpoint /ingest; el modelo devuelve especie, conteo y
nivel, y se cruza con el umbral de acción de cada especie.

Captura bajo demanda (polling invertido): el panel marca una "orden de captura"
con POST /trampa/{trap_id}/solicitar-captura. El nodo, que está detrás de una
red doméstica y no es alcanzable desde internet, consulta periódicamente
GET /trampa/{trap_id}/orden; cuando hay orden pendiente, dispara y la consume.
Esto funciona tanto en red local como con el backend en producción (Railway).
"""
import os
import json
import time
import random
import hashlib

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, Response

from app.models.vinedo import db_vinedos
from app.ml_models.insect_detector import contar_insectos, modelo_activo

router = APIRouter(prefix="/fitosanitario", tags=["Sanidad Vegetal IA"])

# Plagas detectadas por el modelo de visión (umbral = capturas/semana que disparan acción).
# Las claves coinciden EXACTAMENTE con las clases del dataset YOLO (insect_detector.ESPECIES).
PLAGAS = {
    "mosca_blanca": {"nombre": "Mosca blanca", "umbral": 20},
    "trips":        {"nombre": "Trips", "umbral": 15},
    "mosca_fruta":  {"nombre": "Mosca de la fruta", "umbral": 8},
}

MODELO = {
    "arquitectura": "YOLOv8 (detección de objetos)",
    "precision_objetivo": 0.98,
    "precision_actual": 0.91,
    "imagenes_etiquetadas": 3120,
    "imagenes_objetivo": 5000,
    "fase": "Entrenamiento supervisado en campo",
}

# --- Rutas de almacenamiento ---
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
UPLOAD_DIR = os.path.join(_BASE_DIR, "uploads", "trampas")
STATE_FILE = os.path.join(_BASE_DIR, "uploads", "trampas_estado.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_IMG_BYTES = 4 * 1024 * 1024  # 4 MB

# Última lectura por trampa (en memoria, respaldada en disco)
TRAMPAS_FISICAS: dict = {}
# Órdenes de captura manual pendientes: { trap_id: True }
ORDENES_CAPTURA: dict = {}


# ---------------------------------------------------------------------------
# Persistencia simple en disco (JSON). Sobrevive reinicios sin MySQL.
# ---------------------------------------------------------------------------
def _guardar_estado():
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(TRAMPAS_FISICAS, f)
    except Exception as e:
        print(f"--> [VISION] No se pudo guardar estado: {e}")


def _cargar_estado():
    global TRAMPAS_FISICAS
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                TRAMPAS_FISICAS = json.load(f)
            print(f"--> [VISION] Estado de {len(TRAMPAS_FISICAS)} trampa(s) recuperado de disco.")
    except Exception as e:
        print(f"--> [VISION] No se pudo cargar estado: {e}")
        TRAMPAS_FISICAS = {}


_cargar_estado()


def _seed(vinedo_id, plaga):
    h = int(hashlib.md5(f"{vinedo_id}{plaga}".encode()).hexdigest(), 16)
    return h % 1000


def _evaluar(conteos: dict) -> tuple:
    detecciones = []
    riesgo_global = "BAJO"
    requiere_accion = False
    for esp, info in PLAGAS.items():
        capturas = int(conteos.get(esp, 0))
        umbral = info["umbral"]
        supera = capturas >= umbral
        nivel = "ALTO" if supera else ("MEDIO" if capturas >= umbral * 0.5 else "BAJO")
        if nivel == "ALTO":
            riesgo_global = "ALTO"
            requiere_accion = True
        elif nivel == "MEDIO" and riesgo_global != "ALTO":
            riesgo_global = "MEDIO"
        detecciones.append({
            "especie": esp,
            "nombre_comun": info["nombre"],
            "capturas_semana": capturas,
            "umbral_accion": umbral,
            "nivel": nivel,
            "recomendacion": (
                "Aplicar tratamiento fitosanitario dirigido y revisar curva de vuelo."
                if supera else
                "Sin acción. Continuar monitoreo." if nivel == "BAJO" else
                "Vigilancia reforzada: la próxima lectura puede superar el umbral."
            ),
        })
    return detecciones, riesgo_global, requiere_accion


@router.get("/modelo")
def estado_modelo():
    return {**MODELO, "motor_conteo": modelo_activo()}


@router.get("")
def red_trampas():
    vinedos = db_vinedos.get_all_vinedos_ids()
    trampas = len(vinedos) * 4
    return {
        "trampas_totales": trampas,
        "trampas_activas": max(0, trampas - 1),
        "trampas_fisicas": len(TRAMPAS_FISICAS),
        "cuarteles_monitoreados": len(vinedos),
        "modelo": MODELO,
    }


# ---------------------------------------------------------------------------
# INGESTA DE IMAGEN desde el nodo ESP32-CAM (POST del JPEG crudo)
# ---------------------------------------------------------------------------
@router.post("/ingest")
async def ingest_imagen(
    request: Request,
    trap_id: str = Query(...),
    cuartel: str = Query(""),
    seq: int = Query(0),
):
    img_bytes = await request.body()
    if not img_bytes:
        return JSONResponse({"error": "cuerpo vacío"}, status_code=400)
    if len(img_bytes) > MAX_IMG_BYTES:
        return JSONResponse({"error": "imagen demasiado grande"}, status_code=413)

    ts = int(time.time())
    safe_id = "".join(c for c in trap_id if c.isalnum() or c in "-_")[:40]
    fname = f"{safe_id}_ultima.jpg"  # nombre fijo: siempre la última, no acumula
    fpath = os.path.join(UPLOAD_DIR, fname)
    try:
        with open(fpath, "wb") as f:
            f.write(img_bytes)
    except Exception as e:
        print(f"--> [VISION] No se pudo guardar {fname}: {e}")

    conteos = contar_insectos(img_bytes)
    detecciones, riesgo_global, requiere_accion = _evaluar(conteos)

    payload = {
        "trap_id": trap_id,
        "cuartel": cuartel,
        "archivo": fname,
        "seq": seq,
        "timestamp": ts,
        "fuente": "ESP32-CAM",
        "riesgo_global": riesgo_global,
        "requiere_accion": requiere_accion,
        "detecciones": detecciones,
        "motor_conteo": modelo_activo(),
    }
    TRAMPAS_FISICAS[trap_id] = payload
    _guardar_estado()
    return payload


# ---------------------------------------------------------------------------
# CAPTURA BAJO DEMANDA (polling invertido)
# ---------------------------------------------------------------------------
@router.post("/trampa/{trap_id}/solicitar-captura")
def solicitar_captura(trap_id: str):
    """El panel marca una orden de captura para esta trampa.
    El nodo la recogerá en su próximo poll."""
    ORDENES_CAPTURA[trap_id] = True
    return {"trap_id": trap_id, "orden": "pendiente"}


@router.get("/trampa/{trap_id}/orden")
def consultar_orden(trap_id: str):
    """El nodo ESP32-CAM consulta esto periódicamente. Si hay orden pendiente,
    devuelve capturar=true y la consume (one-shot)."""
    pendiente = ORDENES_CAPTURA.pop(trap_id, False)
    return {"capturar": bool(pendiente)}


@router.get("/trampas-fisicas")
def listar_trampas_fisicas():
    return list(TRAMPAS_FISICAS.values())


@router.get("/trampa/{trap_id}")
def lectura_trampa(trap_id: str):
    data = TRAMPAS_FISICAS.get(trap_id)
    if not data:
        return JSONResponse({"error": "trampa sin lecturas aún"}, status_code=404)
    return data


@router.get("/trampa/{trap_id}/imagen")
def imagen_trampa(trap_id: str):
    data = TRAMPAS_FISICAS.get(trap_id)
    if not data:
        return JSONResponse({"error": "trampa sin lecturas aún"}, status_code=404)
    fpath = os.path.join(UPLOAD_DIR, data["archivo"])
    if not os.path.exists(fpath):
        return JSONResponse({"error": "imagen no encontrada"}, status_code=404)
    with open(fpath, "rb") as f:
        return Response(content=f.read(), media_type="image/jpeg",
                        headers={"Cache-Control": "no-store"})


@router.get("/{vinedo_id}")
def deteccion_cuartel(vinedo_id: str):
    meta = db_vinedos.get_meta(vinedo_id)
    rng = random.Random(_seed(vinedo_id, "base"))
    detecciones = []
    riesgo_global = "BAJO"
    for esp, info in PLAGAS.items():
        capturas = rng.randint(0, 18)
        confianza = round(rng.uniform(0.86, 0.985), 3)
        supera = capturas >= info["umbral"]
        nivel = "ALTO" if supera else ("MEDIO" if capturas >= info["umbral"] * 0.5 else "BAJO")
        if nivel == "ALTO":
            riesgo_global = "ALTO"
        elif nivel == "MEDIO" and riesgo_global != "ALTO":
            riesgo_global = "MEDIO"
        detecciones.append({
            "especie": esp,
            "nombre_comun": info["nombre"],
            "capturas_semana": capturas,
            "umbral_accion": info["umbral"],
            "confianza_ia": confianza,
            "nivel": nivel,
            "recomendacion": (
                "Aplicar tratamiento fitosanitario dirigido y revisar curva de vuelo."
                if supera else
                "Sin acción. Continuar monitoreo." if nivel == "BAJO" else
                "Vigilancia reforzada: la próxima lectura puede superar el umbral."
            ),
        })
    return {
        "vinedo_id": vinedo_id,
        "variedad": meta.get("variedad"),
        "riesgo_global": riesgo_global,
        "modelo": {"arquitectura": MODELO["arquitectura"], "precision_actual": MODELO["precision_actual"]},
        "detecciones": detecciones,
    }
