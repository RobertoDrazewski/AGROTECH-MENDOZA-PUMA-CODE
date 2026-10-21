"""Integración con el feed oficial de alertas del Servicio Meteorológico
Nacional (SMN) en formato CAP (Common Alerting Protocol). Sin API key: es
el mismo feed público que usa la app oficial del SMN.

Flujo: 1) bajamos el índice RSS (CAP/AR.php), 2) por cada alerta vigente
bajamos su XML CAP individual (con caché, para no pegarle al SMN en cada
poll de la campanita), 3) parseamos evento/severidad/polígono, 4) cruzamos
el polígono contra las geocercas (o el punto lat/lon) de cada cuartel con
un point-in-polygon casero, sin depender de librerías geoespaciales pesadas
(shapely, etc.) que no están en requirements.txt."""
import time
import xml.etree.ElementTree as ET
import requests

FEED_URL = "https://ssl.smn.gob.ar/CAP/AR.php"
CAP_NS = {"cap": "urn:oasis:names:tc:emergency:cap:1.2"}

# 10 minutos: alcanza para no saturar al SMN y sigue siendo "tiempo real" a
# los fines prácticos de una alerta de tormenta/granizo.
_CACHE_TTL_SEG = 600
_cache = {"alertas": [], "actualizado_en": 0.0}


def _punto_en_poligono(lat, lon, poligono) -> bool:
    """Ray casting clásico. poligono: lista de (lat, lon)."""
    if lat is None or lon is None or len(poligono) < 3:
        return False
    dentro = False
    n = len(poligono)
    j = n - 1
    for i in range(n):
        yi, xi = poligono[i]
        yj, xj = poligono[j]
        if (yi > lat) != (yj > lat):
            x_interseccion = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
            if lon < x_interseccion:
                dentro = not dentro
        j = i
    return dentro


def _parsear_cap_xml(xml_text: str):
    try:
        root = ET.fromstring(xml_text)
        info = root.find("cap:info", CAP_NS)
        if info is None:
            return None

        def campo(tag, default=""):
            return (info.findtext(f"cap:{tag}", default=default, namespaces=CAP_NS) or "").strip()

        evento = campo("event")
        severidad = campo("severity")
        certeza = campo("certainty")
        urgencia = campo("urgency")
        descripcion = campo("description")
        inicio = campo("onset")
        vence = campo("expires")

        poligonos = []
        for area in info.findall("cap:area", CAP_NS):
            for poly_el in area.findall("cap:polygon", CAP_NS):
                puntos = []
                for par in (poly_el.text or "").strip().split():
                    try:
                        lat_s, lon_s = par.split(",")
                        puntos.append((float(lat_s), float(lon_s)))
                    except ValueError:
                        continue
                if len(puntos) >= 3:
                    poligonos.append(puntos)

        if not poligonos:
            return None  # sin polígono no podemos cruzarla contra las geocercas

        return {
            "evento": evento,
            "severidad": severidad,
            "certeza": certeza,
            "urgencia": urgencia,
            "descripcion": descripcion,
            "inicio": inicio,
            "vence": vence,
            "poligonos": poligonos,
        }
    except Exception as e:
        print(f"--> [SMN] No se pudo parsear un CAP XML: {e}")
        return None


def _bajar_alertas_vigentes() -> list:
    alertas = []
    try:
        resp = requests.get(FEED_URL, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        links = [item.findtext("link") for item in root.iter("item")]
        links = [l for l in links if l]
    except Exception as e:
        print(f"--> [SMN] No se pudo bajar el feed de alertas: {e}")
        return alertas

    for link in links:
        try:
            r = requests.get(link, timeout=10)
            r.raise_for_status()
            alerta = _parsear_cap_xml(r.text)
            if alerta:
                alertas.append(alerta)
        except Exception as e:
            print(f"--> [SMN] No se pudo bajar/parsear {link}: {e}")
            continue
    return alertas


def alertas_vigentes(forzar: bool = False) -> list:
    """Devuelve las alertas vigentes del SMN (con polígono), con caché de
    10 minutos para no pegarle al servidor del SMN en cada poll."""
    ahora = time.time()
    if not forzar and (ahora - _cache["actualizado_en"]) < _CACHE_TTL_SEG:
        return _cache["alertas"]
    alertas = _bajar_alertas_vigentes()
    _cache["alertas"] = alertas
    _cache["actualizado_en"] = ahora
    return alertas


def _puntos_de_cuartel(cuartel: dict):
    geocerca = cuartel.get("geocerca") or []
    puntos = []
    if geocerca and len(geocerca) >= 3:
        for p in geocerca:
            if isinstance(p, dict):
                lat, lon = p.get("lat"), p.get("lon")
            else:
                lat, lon = (p[0], p[1]) if len(p) >= 2 else (None, None)
            if lat is not None and lon is not None:
                puntos.append((lat, lon))
    if not puntos:
        lat, lon = cuartel.get("lat"), cuartel.get("lon")
        if lat is not None and lon is not None:
            puntos.append((lat, lon))
    return puntos


def cuarteles_en_alerta(cuarteles: list) -> list:
    """cuarteles: lista de dicts con vinedo_id/lat/lon/geocerca (lo que
    devuelve db_vinedos.get_meta). Devuelve una lista de {vinedo_id, alerta}
    por cada combinación cuartel + alerta donde el cuartel (su geocerca
    real, o si no tiene, su punto GPS) cae dentro del polígono del SMN."""
    alertas = alertas_vigentes()
    if not alertas:
        return []
    matches = []
    for c in cuarteles:
        vinedo_id = c.get("vinedo_id")
        puntos = _puntos_de_cuartel(c)
        if not vinedo_id or not puntos:
            continue
        for alerta in alertas:
            afecta = any(
                _punto_en_poligono(lat, lon, poligono)
                for (lat, lon) in puntos
                for poligono in alerta["poligonos"]
            )
            if afecta:
                matches.append({"vinedo_id": vinedo_id, "alerta": alerta})
    return matches
