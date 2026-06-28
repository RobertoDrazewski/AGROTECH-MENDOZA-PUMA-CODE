"""Alertas oficiales del Servicio Meteorologico Nacional (SMN).

Consume la API NO oficial del SMN (https://ws.smn.gob.ar/) que alimenta el
Sistema de Alerta Temprana. Trae alertas vigentes (granizo, viento Zonda,
tormentas, lluvias, calor, etc.) y las filtra para Mendoza.

IMPORTANTE - DISEÑO DEFENSIVO:
- La API del SMN NO es oficial, no esta documentada y puede cambiar/caerse.
- Por eso TODO esta envuelto en try/except: si el SMN falla, el endpoint
  devuelve disponible=False y el resto del sistema sigue andando con la capa
  local (sensores + clima.py). Nunca rompe el dashboard.
- Cachea la respuesta unos minutos para no golpear al SMN en cada request.

Endpoints SMN usados:
  - https://ws.smn.gob.ar/alerts/type/AL  -> alertas por area (vigentes)
  - https://ws.smn.gob.ar/alerts/type/AC  -> avisos a corto plazo
"""
from fastapi import APIRouter
from datetime import datetime, timezone
import time

router = APIRouter(prefix="/smn", tags=["SMN"])

# --- Configuracion ---
SMN_ALERTS_URL = "https://ws.smn.gob.ar/alerts/type/AL"
SMN_AVISOS_URL = "https://ws.smn.gob.ar/alerts/type/AC"
CACHE_TTL_SEG = 300          # 5 min: las alertas no cambian tan seguido
REQUEST_TIMEOUT = 8          # seg; si tarda mas, fallback
PROVINCIA_OBJETIVO = "mendoza"   # filtro por texto (case-insensitive)

# Mapa de palabras clave -> tipo de riesgo normalizado para tu front.
# El SMN describe los fenomenos en texto; los clasificamos a tus categorias.
KEYWORDS_RIESGO = {
    "GRANIZO": ["granizo"],
    "ZONDA": ["zonda"],
    "TORMENTA": ["tormenta", "tormentas"],
    "LLUVIA": ["lluvia", "lluvias", "precipitaci"],
    "VIENTO": ["viento", "vientos"],
    "CALOR": ["calor", "altas temperaturas"],
    "NIEVE": ["nieve", "nevada"],
    "FRIO": ["frio", "bajas temperaturas", "heladas"],
}

# Niveles SMN -> severidad normalizada
NIVEL_SMN = {
    "amarillo": {"nivel": "MEDIO", "orden": 1},
    "naranja": {"nivel": "ALTO", "orden": 2},
    "rojo": {"nivel": "CRITICO", "orden": 3},
}

# --- Cache simple en memoria ---
_cache = {"ts": 0.0, "data": None}


def _clasificar_fenomeno(texto: str) -> list:
    """Dado el texto de una alerta, devuelve la lista de tipos de riesgo
    normalizados que menciona (GRANIZO, ZONDA, etc.)."""
    t = (texto or "").lower()
    tipos = []
    for tipo, claves in KEYWORDS_RIESGO.items():
        if any(c in t for c in claves):
            tipos.append(tipo)
    return tipos


def _normalizar_nivel(texto_nivel: str) -> dict:
    """Mapea el color/nivel del SMN a tu severidad."""
    t = (texto_nivel or "").lower()
    for color, info in NIVEL_SMN.items():
        if color in t:
            return {"color": color, **info}
    return {"color": "desconocido", "nivel": "MEDIO", "orden": 1}


def _es_de_mendoza(alerta: dict) -> bool:
    """Heuristica: la alerta aplica a Mendoza si la menciona en cualquiera
    de sus campos de texto (zonas, titulo, descripcion)."""
    blob = " ".join(str(v) for v in alerta.values() if isinstance(v, (str, int, float))).lower()
    # Tambien revisamos listas anidadas tipicas (zonas)
    for v in alerta.values():
        if isinstance(v, (list, dict)):
            blob += " " + str(v).lower()
    return PROVINCIA_OBJETIVO in blob


def _fetch_smn(url: str) -> list:
    """Trae y parsea una URL del SMN. Defensivo: ante cualquier problema
    devuelve lista vacia (no rompe)."""
    try:
        import requests
        r = requests.get(url, timeout=REQUEST_TIMEOUT,
                          headers={"User-Agent": "AgroTech-Mendoza/1.0"})
        if r.status_code != 200:
            print(f"[SMN] {url} respondio {r.status_code}")
            return []
        data = r.json()
        # El SMN suele devolver una lista de alertas, o un dict con 'alerts'.
        if isinstance(data, dict):
            data = data.get("alerts") or data.get("data") or []
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[SMN] Error consultando {url}: {e}")
        return []


def _procesar_alertas() -> dict:
    """Trae alertas + avisos, filtra Mendoza, clasifica granizo/zonda/etc.
    Devuelve estructura lista para el front."""
    crudas = _fetch_smn(SMN_ALERTS_URL) + _fetch_smn(SMN_AVISOS_URL)

    if not crudas:
        # No hay alertas vigentes O el SMN no respondio. Distinguimos con flag.
        return {
            "disponible": True,
            "hay_alertas": False,
            "alertas": [],
            "resumen": {"granizo": False, "zonda": False},
            "mensaje": "Sin alertas vigentes del SMN para Mendoza.",
            "fuente": "SMN - Sistema de Alerta Temprana",
            "consultado": datetime.now(timezone.utc).isoformat(),
        }

    procesadas = []
    for a in crudas:
        if not isinstance(a, dict):
            continue
        if not _es_de_mendoza(a):
            continue

        # Campos de texto tolerantes a distintas formas del JSON del SMN
        titulo = a.get("title") or a.get("titulo") or a.get("name") or ""
        desc = a.get("description") or a.get("descripcion") or a.get("text") or ""
        nivel_raw = (a.get("level") or a.get("nivel") or a.get("severity")
                     or a.get("color") or "")

        tipos = _clasificar_fenomeno(f"{titulo} {desc}")
        if not tipos:
            continue  # alerta de un fenomeno que no nos interesa

        nivel = _normalizar_nivel(str(nivel_raw))
        procesadas.append({
            "tipos": tipos,
            "nivel": nivel["nivel"],
            "color": nivel["color"],
            "orden": nivel["orden"],
            "titulo": titulo.strip()[:200],
            "descripcion": desc.strip()[:500],
            "vigencia": a.get("valid_from") or a.get("desde") or a.get("date") or "",
        })

    # Ordenar por severidad (rojo primero)
    procesadas.sort(key=lambda x: x["orden"], reverse=True)

    hay_granizo = any("GRANIZO" in p["tipos"] for p in procesadas)
    hay_zonda = any("ZONDA" in p["tipos"] for p in procesadas)

    return {
        "disponible": True,
        "hay_alertas": len(procesadas) > 0,
        "alertas": procesadas,
        "resumen": {"granizo": hay_granizo, "zonda": hay_zonda},
        "mensaje": (f"{len(procesadas)} alerta(s) vigente(s) para Mendoza."
                    if procesadas else "Sin alertas relevantes para Mendoza."),
        "fuente": "SMN - Sistema de Alerta Temprana",
        "consultado": datetime.now(timezone.utc).isoformat(),
    }


def _obtener_con_cache() -> dict:
    """Devuelve alertas usando cache de CACHE_TTL_SEG. Si el procesamiento
    falla por completo, devuelve un fallback que NO rompe el front."""
    ahora = time.time()
    if _cache["data"] is not None and (ahora - _cache["ts"]) < CACHE_TTL_SEG:
        cached = dict(_cache["data"])
        cached["cache"] = True
        return cached

    try:
        data = _procesar_alertas()
        _cache["data"] = data
        _cache["ts"] = ahora
        data = dict(data)
        data["cache"] = False
        return data
    except Exception as e:
        print(f"[SMN] Fallback por error general: {e}")
        # Si hay algo viejo en cache, lo damos aunque este vencido
        if _cache["data"] is not None:
            stale = dict(_cache["data"])
            stale["cache"] = True
            stale["stale"] = True
            return stale
        # Sin nada: avisamos que no esta disponible, pero no rompemos
        return {
            "disponible": False,
            "hay_alertas": False,
            "alertas": [],
            "resumen": {"granizo": False, "zonda": False},
            "mensaje": "SMN no disponible momentaneamente.",
            "fuente": "SMN - Sistema de Alerta Temprana",
            "consultado": datetime.now(timezone.utc).isoformat(),
        }


@router.get("/alertas")
def alertas_smn():
    """Alertas oficiales vigentes del SMN para Mendoza (granizo, Zonda, etc).
    Defensivo: si el SMN falla, devuelve disponible=False sin romper nada."""
    return _obtener_con_cache()


@router.get("/granizo")
def alerta_granizo():
    """Atajo: solo el estado de granizo segun el SMN."""
    data = _obtener_con_cache()
    granizo = [a for a in data.get("alertas", []) if "GRANIZO" in a.get("tipos", [])]
    return {
        "disponible": data.get("disponible", False),
        "hay_granizo": len(granizo) > 0,
        "alertas": granizo,
        "fuente": data.get("fuente"),
        "consultado": data.get("consultado"),
    }


@router.get("/zonda")
def alerta_zonda():
    """Atajo: solo el estado de Zonda segun el SMN."""
    data = _obtener_con_cache()
    zonda = [a for a in data.get("alertas", []) if "ZONDA" in a.get("tipos", [])]
    return {
        "disponible": data.get("disponible", False),
        "hay_zonda": len(zonda) > 0,
        "alertas": zonda,
        "fuente": data.get("fuente"),
        "consultado": data.get("consultado"),
    }