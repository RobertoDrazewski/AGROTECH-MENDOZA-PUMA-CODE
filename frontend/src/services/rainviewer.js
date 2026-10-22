// RainViewer Weather Maps API: radar de precipitación mundial, gratis y sin
// API key (https://www.rainviewer.com/api.html). Nos da tiles georeferenciados
// (a diferencia del gif estático de la DACC) así se puede superponer de
// verdad sobre el mapa real de Mendoza, con el mismo z/x/y que cualquier
// TileLayer de Leaflet.
//
// Cacheado a nivel módulo (no por componente): si 2+ mapas de Control
// Climático están abiertos a la vez, comparten el mismo pedido en vez de
// golpear la API una vez por mapa.
const ENDPOINT = 'https://api.rainviewer.com/public/weather-maps.json';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min, igual de frecuente que publica RainViewer

let cache = { data: null, ts: 0, promesa: null };

export async function obtenerFrameRadar() {
  const ahora = Date.now();
  if (cache.data && (ahora - cache.ts) < CACHE_TTL_MS) return cache.data;
  if (cache.promesa) return cache.promesa;

  cache.promesa = (async () => {
    try {
      const res = await fetch(ENDPOINT);
      const json = await res.json();
      const past = json?.radar?.past || [];
      const nowcast = json?.radar?.nowcast || [];
      // Último frame real (no el nowcast, que es proyección) para "ahora";
      // dejamos armada la lista completa por si más adelante se anima.
      const ultimo = past[past.length - 1];
      const resultado = ultimo
        ? { host: json.host, path: ultimo.path, time: ultimo.time, frames: [...past, ...nowcast] }
        : null;
      cache = { data: resultado, ts: Date.now(), promesa: null };
      return resultado;
    } catch (e) {
      cache.promesa = null;
      return null;
    }
  })();
  return cache.promesa;
}

export function urlTileRadar(frame) {
  if (!frame) return null;
  // size=256, color=2 (universal blue-green-red), smooth+snow=1_1
  return `${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
}
