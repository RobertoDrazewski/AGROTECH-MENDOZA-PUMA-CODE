"""
Detector y contador de insectos en trampas cromáticas — AgroTech Mendoza.

Recibe la imagen JPEG de una trampa (ESP32-CAM) y devuelve el conteo por
especie. Se integra con la lógica de umbrales en fitosanitario.py.

Modos:
  - PLACEHOLDER (por defecto): conteo determinístico por hash. Cierra el
    pipeline sin modelo entrenado.
  - YOLO (real): si existe models/trampas_yolov8.pt y ultralytics está
    instalado, corre detección real.

Especies (coinciden EXACTAMENTE con las clases del dataset y con PLAGAS):
    mosca_blanca, trips, mosca_fruta

Entrenar el modelo real:
    yolo detect train data=trampas.yaml model=yolov8n.pt epochs=100 imgsz=640
    # copiar best.pt a backend/models/trampas_yolov8.pt
"""
import os
import hashlib

# Claves de especie — DEBEN coincidir con PLAGAS en fitosanitario.py
ESPECIES = [
    "mosca_blanca",
    "trips",
    "mosca_fruta",
]

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "models", "trampas_yolov8.pt",
)

# Mapeo clase YOLO (id entero) -> especie. El orden DEBE coincidir con el
# orden de clases del dataset exportado de Roboflow (revisá data.yaml).
_CLASES_YOLO = {
    0: "mosca_blanca",
    1: "mosca_fruta",
    2: "trips",
}

_model = None
_model_intentado = False


def _cargar_modelo():
    global _model, _model_intentado
    if _model_intentado:
        return _model
    _model_intentado = True
    if not os.path.exists(_MODEL_PATH):
        print(f"--> [VISION] Sin pesos en {_MODEL_PATH}; uso conteo placeholder.")
        return None
    try:
        from ultralytics import YOLO
        _model = YOLO(_MODEL_PATH)
        print("--> [VISION] Modelo YOLOv8 de trampas cargado.")
    except Exception as e:
        print(f"--> [VISION] No se pudo cargar YOLO ({e}); uso placeholder.")
        _model = None
    return _model


def _conteo_placeholder(img_bytes: bytes) -> dict:
    h = hashlib.md5(img_bytes).hexdigest()
    conteos = {}
    for i, esp in enumerate(ESPECIES):
        seg = int(h[i * 4: i * 4 + 4], 16)
        conteos[esp] = seg % 30
    return conteos


def contar_insectos(img_bytes: bytes) -> dict:
    """Devuelve {especie: conteo} de los bytes JPEG de la trampa."""
    modelo = _cargar_modelo()
    if modelo is None:
        return _conteo_placeholder(img_bytes)

    import tempfile
    conteos = {esp: 0 for esp in ESPECIES}
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name
        resultados = modelo(tmp_path, conf=0.35, verbose=False)[0]
        for box in resultados.boxes:
            cls_id = int(box.cls[0])
            esp = _CLASES_YOLO.get(cls_id)
            if esp in conteos:
                conteos[esp] += 1
    except Exception as e:
        print(f"--> [VISION] Error en inferencia ({e}); uso placeholder.")
        return _conteo_placeholder(img_bytes)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    return conteos


def modelo_activo() -> str:
    return "YOLOv8 (pesos cargados)" if _cargar_modelo() else "placeholder (sin pesos)"
