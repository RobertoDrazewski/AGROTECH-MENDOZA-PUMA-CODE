import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { nombreCuartel } from '../../utils/nombreCuartel';
import { crearIconoCategoria, COLOR_CATEGORIA, colorSeveridad } from '../../utils/climaIcons';
import { obtenerFrameRadar, urlTileRadar } from '../../services/rainviewer';
import { AlertTriangle, CheckCircle, Radar as RadarIcon } from 'lucide-react';

const CENTRO_MENDOZA = [-33.2, -68.95];

// RainViewer solo genera tiles reales hasta este nivel de zoom — pedirle
// más que eso devuelve una imagen de "Zoom Level Not Supported" en vez de
// 404, y Leaflet la repite por todo el mapa. Con maxNativeZoom, Leaflet
// sigue usando el último tile real disponible y lo agranda (se ve un poco
// más borroso bien de cerca, pero nunca rompe).
const RADAR_MAX_NATIVE_ZOOM = 9;

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

// Desplaza un punto lat/lon una pequeña distancia (grados), solo para
// esparcir los íconos de "campo de viento" alrededor del nodo — es la
// misma lectura real repetida varias veces para que se lea como "viento
// sobre la zona" y no como un solo marcador suelto.
function desplazar([lat, lon], dLat, dLon) {
  return [lat + dLat, lon + dLon];
}

const LEYENDA_SEVERIDAD = [
  { label: 'Menor', color: '#eab308' },
  { label: 'Moderado', color: '#f97316' },
  { label: 'Severo', color: '#ef4444' },
  { label: 'Extremo', color: '#a855f7' },
];

export default function ContingenciaMapa({
  categoria, cuarteles = [], alertas = [], activo = false, windDeg = null,
  radarPorDefecto = false, height = 440,
}) {
  const [mostrarRadar, setMostrarRadar] = useState(radarPorDefecto);
  const [radarFrame, setRadarFrame] = useState(null);
  const [radarCargando, setRadarCargando] = useState(false);

  useEffect(() => {
    if (!mostrarRadar || radarFrame) return;
    setRadarCargando(true);
    obtenerFrameRadar().then((f) => { setRadarFrame(f); setRadarCargando(false); });
  }, [mostrarRadar, radarFrame]);

  const color = COLOR_CATEGORIA[categoria];
  const totalAfectadas = new Set(alertas.flatMap((a) => a.cuarteles_afectados || [])).size;
  const nodo = cuarteles.find((c) => c.lat && c.lon);
  const hayAlgunaSeveridad = alertas.some((a) => a.severidad);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-4 shadow-xl">
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

          {totalAfectadas > 0 && (
            <div className="flex items-center gap-2 mb-3 p-3 rounded-xl text-xs font-bold"
              style={{ backgroundColor: color + '18', border: `1px solid ${color}55`, color }}>
              <AlertTriangle size={14} className="shrink-0" />
              {totalAfectadas} de tus cuarteles {totalAfectadas === 1 ? 'cae' : 'caen'} dentro de una alerta vigente — detalle abajo.
            </div>
          )}

          <div className="relative rounded-lg overflow-hidden border border-[#2a3a2c]" style={{ height }}>
            <MapContainer center={CENTRO_MENDOZA} zoom={8} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution="Imagery &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {mostrarRadar && radarFrame && (
                <TileLayer
                  attribution="Weather data &copy; RainViewer"
                  url={urlTileRadar(radarFrame)}
                  opacity={0.55}
                  zIndex={450}
                  maxNativeZoom={RADAR_MAX_NATIVE_ZOOM}
                  maxZoom={19}
                />
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

              {/* Campo de viento: la misma dirección real (NASA POWER) se
                  repite en 3 puntos alrededor del nodo para que se lea como
                  "viento sobre la zona" — sin pisar el ícono del nodo. */}
              {categoria === 'ZONDA' && nodo && windDeg != null && (
                <>
                  {[[0.014, 0.01], [-0.014, 0.016], [0.004, -0.018]].map(([dLat, dLon], i) => (
                    <Marker key={`viento-${i}`} position={desplazar([nodo.lat, nodo.lon], dLat, dLon)}
                      icon={crearIconoCategoria('ZONDA', { size: 22, deg: windDeg })} interactive={false} />
                  ))}
                </>
              )}

              {/* Geocerca real + UN solo marcador por nodo: el ícono ya
                  incluye el anillo "en vivo" + el símbolo de la
                  contingencia, así no hay dos íconos pisándose en el mismo
                  punto (el bug que reportaste). */}
              {cuarteles.map((c) => (
                <React.Fragment key={c.vinedo_id}>
                  {c.geocerca && c.geocerca.length >= 3 && (
                    <Polygon positions={c.geocerca.map((p) => [p.lat ?? p[0], p.lon ?? p[1]])}
                      pathOptions={{ color: '#9bcc44', weight: 2, fillColor: '#9bcc44', fillOpacity: 0.15 }}>
                      <Popup>{nombreCuartel(c.vinedo_id)}</Popup>
                    </Polygon>
                  )}
                  <Marker position={[c.lat, c.lon]}
                    icon={crearIconoCategoria(categoria, { size: 44, activo, deg: windDeg ?? 0 })}>
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
          único cajón "No hay alertas vigentes" genérico. */}
      {alertas.length === 0 ? (
        <div className="bg-[#18211b] border border-[#2a3a2c] rounded-2xl p-6 text-center text-xs text-[#5d6f5a] flex flex-col items-center gap-2">
          <CheckCircle size={18} className="text-[#9bcc44]" />
          No hay alertas vigentes del SMN de {categoria === 'LLUVIA' ? 'lluvia/tormenta' : categoria.toLowerCase()} en este momento.
        </div>
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
