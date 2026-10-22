import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { nombreCuartel } from '../../utils/nombreCuartel';
import { crearIconoNodo, COLOR_CATEGORIA, colorSeveridad, nombreSeveridad } from '../../utils/climaIcons';
import { obtenerFrameRadar, urlTileRadar } from '../../services/rainviewer';
import { AlertTriangle, CheckCircle, Radar as RadarIcon, ArrowRight, Play, Pause } from 'lucide-react';

function formatearHora(unixSeg) {
  if (!unixSeg) return '--:--';
  return new Date(unixSeg * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// Más severa primero — para elegir cuál alerta mostrar en el banner
// cuando hay varias vigentes de la misma categoría al mismo tiempo.
const ORDEN_SEVERIDAD = { extreme: 4, severe: 3, moderate: 2, minor: 1 };
function alertaMasSevera(alertas) {
  if (!alertas.length) return null;
  return [...alertas].sort((a, b) =>
    (ORDEN_SEVERIDAD[(b.severidad || '').toLowerCase()] || 0) - (ORDEN_SEVERIDAD[(a.severidad || '').toLowerCase()] || 0)
  )[0];
}

const CENTRO_MENDOZA = [-33.2, -68.95];

// RainViewer solo genera tiles reales hasta este nivel de zoom — pedirle
// más que eso devuelve una imagen de "Zoom Level Not Supported" en vez de
// 404, y Leaflet la repite por todo el mapa. Bajamos el techo con margen
// (una celda de lluvia mide varios km, así que de cerca no se pierde nada
// útil al agrandar el último tile real disponible, solo se ve apenas más
// suave) y lo aplicamos creando la capa con Leaflet directamente (ver
// CapaRadar más abajo) en vez de pasarlo como prop a <TileLayer> — eso es
// lo que seguía fallando: el prop no se estaba aplicando de forma
// confiable en esta versión de react-leaflet, por eso el "Zoom Level Not
// Supported" seguía apareciendo en producción aun con el prop puesto.
const RADAR_MAX_NATIVE_ZOOM = 8;

const CARDINALES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
function aCardinal(deg) {
  if (deg == null) return null;
  return CARDINALES[Math.round(((deg % 360) / 45)) % 8];
}

function formatearFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

function AjustarVista({ cuarteles }) {
  const map = useMap();
  useEffect(() => {
    if (!cuarteles.length) return;
    const puntos = cuarteles.flatMap((c) =>
      c.geocerca && c.geocerca.length >= 3
        ? c.geocerca.map((p) => [p.lat ?? p[0], p.lon ?? p[1]])
        : [[c.lat, c.lon]]
    );
    if (!puntos.length) return;
    const bounds = L.latLngBounds(puntos);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
  }, [cuarteles, map]);
  return null;
}

// Capa de radar creada con Leaflet directamente (map.addLayer), no con el
// componente declarativo <TileLayer>: así maxNativeZoom queda garantizado
// en la capa real sin depender de cómo esta versión de react-leaflet
// reenvía props al tile layer interno.
function CapaRadar({ frame, opacity }) {
  const map = useMap();
  useEffect(() => {
    if (!frame) return;
    const layer = L.tileLayer(urlTileRadar(frame), {
      attribution: 'Weather data &copy; RainViewer',
      opacity,
      maxNativeZoom: RADAR_MAX_NATIVE_ZOOM,
      maxZoom: 19,
      zIndex: 450,
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, frame, opacity]);
  return null;
}

const LEYENDA_SEVERIDAD = [
  { label: 'Menor', color: '#eab308' },
  { label: 'Moderado', color: '#f97316' },
  { label: 'Severo', color: '#ef4444' },
  { label: 'Extremo', color: '#a855f7' },
];

export default function ContingenciaMapa({
  categoria, cuarteles = [], alertas = [], activo = false, windDeg = null,
  radarPorDefecto = true, height = 440, smnOk = true, smnMensaje = '',
}) {
  const [mostrarRadar, setMostrarRadar] = useState(radarPorDefecto);
  const [radarData, setRadarData] = useState(null); // { host, frames, nowIndex }
  const [radarCargando, setRadarCargando] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  // Arranca animando solo — igual que AccuWeather, que ya se ve corriendo
  // sin que nadie le toque play. El botón de pausa queda para quien
  // quiera mirar un instante fijo.
  const [reproduciendo, setReproduciendo] = useState(true);

  useEffect(() => {
    if (!mostrarRadar || radarData) return;
    setRadarCargando(true);
    obtenerFrameRadar().then((d) => {
      setRadarData(d);
      if (d) setFrameIndex(d.nowIndex);
      setRadarCargando(false);
    });
  }, [mostrarRadar, radarData]);

  // Animación real: avanza un frame cada 700ms y, al llegar al final,
  // vuelve al principio y sigue — un loop continuo de verdad, no un video
  // que hay que volver a apretar play para que repita.
  useEffect(() => {
    if (!reproduciendo || !radarData?.frames?.length) return;
    const iv = setInterval(() => {
      setFrameIndex((i) => (i + 1) % radarData.frames.length);
    }, 700);
    return () => clearInterval(iv);
  }, [reproduciendo, radarData]);

  const frameActual = radarData?.frames?.[frameIndex] || null;

  const color = COLOR_CATEGORIA[categoria];
  const totalAfectadas = new Set(alertas.flatMap((a) => a.cuarteles_afectados || [])).size;
  const nodo = cuarteles.find((c) => c.lat && c.lon);
  const hayAlgunaSeveridad = alertas.some((a) => a.severidad);
  const principal = alertaMasSevera(alertas);
  const colorPrincipal = principal ? colorSeveridad(principal.severidad) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-4 shadow-xl">
          {/* Banner de aviso grande arriba del mapa, al estilo de los
              servicios meteorológicos (AccuWeather, SMN): "Aviso amarillo
              por lluvia", con el color real de la severidad — mucho más
              imposible de pasar por alto que la cajita chica de antes. */}
          {principal && (
            <a href={`#detalle-alertas-${categoria}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3 font-black hover:brightness-110 transition-all"
              style={{ backgroundColor: colorPrincipal, color: (principal.severidad || '').toLowerCase() === 'minor' ? '#1a1406' : '#ffffff' }}>
              <AlertTriangle size={18} className="shrink-0" />
              <span className="text-[11px] sm:text-xs uppercase tracking-wide truncate">
                Aviso {nombreSeveridad(principal.severidad)} por {principal.evento}
                {totalAfectadas > 0 && ` · afecta ${totalAfectadas} ${totalAfectadas === 1 ? 'cuartel' : 'cuarteles'}`}
              </span>
              <ArrowRight size={16} className="ml-auto shrink-0" />
            </a>
          )}

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9fb09c]">Mapa en vivo · {nombreCuartel(nodo?.vinedo_id)}</h3>
              <p className="text-[11px] text-[#5d6f5a]">Geocerca real + alertas oficiales del SMN, cruzadas contra tu nodo.</p>
            </div>
            <button onClick={() => setMostrarRadar((v) => !v)}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                mostrarRadar ? 'border-current text-white bg-white/10' : 'border-[#2a3a2c] text-[#9fb09c] hover:border-[#9bcc44] hover:text-[#9bcc44]'}`}
              style={mostrarRadar ? { borderColor: color, color } : {}}>
              <RadarIcon size={11} className={radarCargando ? 'animate-spin' : ''} /> Radar de precipitación
            </button>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-[#2a3a2c]" style={{ height }}>
            <MapContainer center={CENTRO_MENDOZA} zoom={8} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution="Imagery &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {mostrarRadar && radarData && frameActual && (
                <CapaRadar frame={{ host: radarData.host, path: frameActual.path }} opacity={0.6} />
              )}
              <AjustarVista cuarteles={cuarteles} />

              {/* Polígonos de alerta del SMN (ya filtrados a esta categoría),
                  coloreados por la severidad OFICIAL del SMN — la misma
                  escala que usa su propia app/radar — no por categoría. */}
              {alertas.map((a, i) => (a.poligonos || []).map((poligono, j) => {
                const afecta = (a.cuarteles_afectados || []).length > 0;
                const colorSev = colorSeveridad(a.severidad);
                return (
                  <Polygon key={`alerta-${i}-${j}`} positions={poligono}
                    pathOptions={{ color: colorSev, weight: afecta ? 3 : 1.5, fillColor: colorSev, fillOpacity: afecta ? 0.3 : 0.1 }}>
                    <Popup>
                      <div style={{ fontSize: 12, color: '#18211b' }}>
                        <b>{a.evento}</b><br />
                        Severidad: {a.severidad || '—'}<br />
                        Vence: {formatearFecha(a.vence)}
                        {a.cuarteles_afectados?.length > 0 && (
                          <><br /><br /><b>Afecta:</b> {a.cuarteles_afectados.map((v) => nombreCuartel(v)).join(', ')}</>
                        )}
                      </div>
                    </Popup>
                  </Polygon>
                );
              }))}

              {/* Zona estimada de helada: radio referencial alrededor del
                  nodo cuando el modelo local marca riesgo activo — no es
                  una medición satelital de la mancha de frío, se aclara en
                  el popup para no sobre-prometer precisión. */}
              {categoria === 'HELADA' && activo && nodo && (
                <Circle center={[nodo.lat, nodo.lon]} radius={2200}
                  pathOptions={{ color, weight: 2, dashArray: '6 6', fillColor: color, fillOpacity: 0.12 }}>
                  <Popup>Zona estimada de influencia de la helada (radio referencial del modelo local, no una medición satelital de la mancha de frío).</Popup>
                </Circle>
              )}

              {/* Geocerca real + UN solo marcador chico por nodo (sin
                  pictograma de clima inventado — eso ahora lo muestra el
                  radar real de arriba): solo dice "acá está tu nodo", con
                  la flecha de dirección de viento real en Zonda. */}
              {cuarteles.map((c) => (
                <React.Fragment key={c.vinedo_id}>
                  {c.geocerca && c.geocerca.length >= 3 && (
                    <Polygon positions={c.geocerca.map((p) => [p.lat ?? p[0], p.lon ?? p[1]])}
                      pathOptions={{ color: '#9bcc44', weight: 2, fillColor: '#9bcc44', fillOpacity: 0.15 }}>
                      <Popup>{nombreCuartel(c.vinedo_id)}</Popup>
                    </Polygon>
                  )}
                  <Marker position={[c.lat, c.lon]}
                    icon={crearIconoNodo(categoria, { size: 30, activo, deg: windDeg })}>
                    <Popup>
                      {nombreCuartel(c.vinedo_id)}
                      {categoria === 'ZONDA' && (windDeg != null
                        ? ` — viento desde ${Math.round(windDeg)}° (${aCardinal(windDeg)}), NASA POWER`
                        : ' — dirección de viento no disponible en este momento')}
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>

          {/* Reproductor del radar: se anima solo apenas carga (loop
              continuo, no hay que apretar play) — igual que el radar
              nacional de AccuWeather que mandaste. El slider deja
              retroceder/adelantar a mano; tocarlo pausa el loop para que
              no se pelee con el dedo. */}
          {mostrarRadar && radarData && radarData.frames.length > 1 && (
            <div className="flex items-center gap-2 mt-2 bg-[#121a14] border border-[#2a3a2c]/60 rounded-xl px-3 py-2">
              <button onClick={() => setReproduciendo((v) => !v)}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-black"
                style={{ backgroundColor: color }}>
                {reproduciendo ? <Pause size={11} /> : <Play size={11} />}
              </button>
              <span className="text-[9px] font-mono text-[#8a9787] shrink-0">{formatearHora(radarData.frames[0].time)}</span>
              <input type="range" min={0} max={radarData.frames.length - 1} step={1} value={frameIndex}
                onChange={(e) => { setReproduciendo(false); setFrameIndex(Number(e.target.value)); }}
                className="flex-1 accent-current h-1" style={{ color }} />
              <span className="text-[9px] font-mono text-[#8a9787] shrink-0">{formatearHora(radarData.frames[radarData.frames.length - 1].time)}</span>
              <span className="text-[9px] font-black uppercase shrink-0 w-24 text-right" style={{ color }}>
                {frameIndex === radarData.nowIndex ? 'Ahora'
                  : frameIndex < radarData.nowIndex ? `Hace ${Math.round((radarData.frames[radarData.nowIndex].time - frameActual.time) / 60)}min`
                  : `Pronóstico +${Math.round((frameActual.time - radarData.frames[radarData.nowIndex].time) / 60)}min`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
            <p className="text-[10px] text-[#5d6f5a]">
              Verde: tu geocerca real.{mostrarRadar && ' Capa de fondo: radar de precipitación en vivo (RainViewer).'}
            </p>
            {hayAlgunaSeveridad && (
              <div className="flex items-center gap-2 flex-wrap">
                {LEYENDA_SEVERIDAD.map((l) => (
                  <span key={l.label} className="flex items-center gap-1 text-[9px] font-bold uppercase text-[#8a9787]">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: l.color }} /> {l.label}
                  </span>
                ))}
                <span className="text-[9px] text-[#5d6f5a]">· escala oficial SMN</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas de ESTA categoría solamente — ya no se mezclan todas en un
          único cajón "No hay alertas vigentes" genérico. Si el feed del
          SMN falló (red, SSL, cambio de formato) lo decimos explícito en
          vez de mostrar la misma caja que "hoy no hay alertas": antes las
          dos se veían idénticas y no había forma de saber cuál pasaba. */}
      <div id={`detalle-alertas-${categoria}`} />
      {alertas.length === 0 ? (
        !smnOk ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center text-xs text-amber-200 flex flex-col items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            No se pudo leer el feed del SMN en este momento{smnMensaje ? ` (${smnMensaje})` : ''}. Puede no ser que no haya
            alertas — reintenta en unos minutos.
          </div>
        ) : (
          <div className="bg-[#18211b] border border-[#2a3a2c] rounded-2xl p-6 text-center text-xs text-[#5d6f5a] flex flex-col items-center gap-2">
            <CheckCircle size={18} className="text-[#9bcc44]" />
            No hay alertas vigentes del SMN de {categoria === 'LLUVIA' ? 'lluvia/tormenta' : categoria.toLowerCase()} en este momento.
          </div>
        )
      ) : (
        <div className="space-y-2">
          {alertas.map((a, i) => {
            const colorSev = colorSeveridad(a.severidad);
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border"
                style={{ borderColor: colorSev + '55', backgroundColor: colorSev + '15' }}>
                <AlertTriangle size={15} style={{ color: colorSev }} className="mt-0.5 shrink-0" />
                <div className="min-w-0 text-xs">
                  <p className="font-black uppercase" style={{ color: colorSev }}>
                    {a.evento} · {a.severidad || '—'}
                    {a.cuarteles_afectados?.length > 0 && ` · afecta ${a.cuarteles_afectados.length} cuartel(es)`}
                  </p>
                  <p className="text-[#cdd8c8] mt-0.5">{a.descripcion}</p>
                  <p className="text-[#5d6f5a] mt-0.5">Vence: {formatearFecha(a.vence)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
