import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { nombreCuartel } from '../../utils/nombreCuartel';
import { crearIconoNodoVivo } from '../../utils/nodoVivoIcon';
import { crearIconoCategoria, COLOR_CATEGORIA } from '../../utils/climaIcons';
import { obtenerFrameRadar, urlTileRadar } from '../../services/rainviewer';
import { AlertTriangle, CheckCircle, Radar as RadarIcon } from 'lucide-react';

const ICONO_NODO_VIVO = crearIconoNodoVivo(34);
const CENTRO_MENDOZA = [-33.2, -68.95];

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
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
  }, [cuarteles, map]);
  return null;
}

// Desplaza un punto lat/lon una pequeña distancia (grados) en una dirección
// arbitraria, solo para esparcir los íconos de "campo de viento" alrededor
// del nodo — no representa mediciones distintas, es el mismo dato real
// (una sola lectura de dirección) dibujado varias veces para que se lea
// como "viento sobre la zona" y no como un solo marcador suelto.
function desplazar([lat, lon], dLat, dLon) {
  return [lat + dLat, lon + dLon];
}

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
                />
              )}
              <AjustarVista cuarteles={cuarteles} />

              {/* Polígonos de alerta del SMN, ya filtrados a esta categoría */}
              {alertas.map((a, i) => (a.poligonos || []).map((poligono, j) => {
                const afecta = (a.cuarteles_afectados || []).length > 0;
                return (
                  <Polygon key={`alerta-${i}-${j}`} positions={poligono}
                    pathOptions={{ color, weight: afecta ? 3 : 1.5, fillColor: color, fillOpacity: afecta ? 0.25 : 0.08 }}>
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
                  repite en varios puntos alrededor del nodo para que se lea
                  como "viento sobre la zona" en vez de un solo marcador. */}
              {categoria === 'ZONDA' && nodo && windDeg != null && (
                <>
                  {[[0.012, 0], [-0.012, 0.014], [0.01, -0.016], [-0.014, -0.012]].map(([dLat, dLon], i) => (
                    <Marker key={`viento-${i}`} position={desplazar([nodo.lat, nodo.lon], dLat, dLon)}
                      icon={crearIconoCategoria('ZONDA', { size: 22, deg: windDeg })} interactive={false} />
                  ))}
                </>
              )}

              {/* Ícono de nodo + contingencia + geocercas reales */}
              {cuarteles.map((c) => (
                <React.Fragment key={c.vinedo_id}>
                  {c.geocerca && c.geocerca.length >= 3 && (
                    <Polygon positions={c.geocerca.map((p) => [p.lat ?? p[0], p.lon ?? p[1]])}
                      pathOptions={{ color: '#9bcc44', weight: 2, fillColor: '#9bcc44', fillOpacity: 0.15 }}>
                      <Popup>{nombreCuartel(c.vinedo_id)}</Popup>
                    </Polygon>
                  )}
                  <Marker position={[c.lat, c.lon]} icon={ICONO_NODO_VIVO}>
                    <Popup>{nombreCuartel(c.vinedo_id)}</Popup>
                  </Marker>
                  <Marker position={[c.lat + 0.006, c.lon + 0.006]}
                    icon={crearIconoCategoria(categoria, { size: 34, activo, deg: windDeg ?? 0 })}>
                    <Popup>
                      {categoria === 'ZONDA'
                        ? (windDeg != null ? `Viento desde ${Math.round(windDeg)}° (${aCardinal(windDeg)}) — NASA POWER` : 'Dirección de viento no disponible en este momento.')
                        : `${categoria.charAt(0) + categoria.slice(1).toLowerCase()} · ${nombreCuartel(c.vinedo_id)}`}
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>

          <p className="text-[10px] text-[#5d6f5a] mt-2">
            Polígono de color: zona con alerta vigente del SMN para esta contingencia (más intenso = tu cuartel está adentro). Verde: tu geocerca real.
            {mostrarRadar && ' Capa de fondo: radar de precipitación en vivo (RainViewer).'}
          </p>
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
          {alertas.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border"
              style={{ borderColor: color + '55', backgroundColor: color + '15' }}>
              <AlertTriangle size={15} style={{ color }} className="mt-0.5 shrink-0" />
              <div className="min-w-0 text-xs">
                <p className="font-black uppercase" style={{ color }}>
                  {a.evento} · {a.severidad || '—'}
                  {a.cuarteles_afectados?.length > 0 && ` · afecta ${a.cuarteles_afectados.length} cuartel(es)`}
                </p>
                <p className="text-[#cdd8c8] mt-0.5">{a.descripcion}</p>
                <p className="text-[#5d6f5a] mt-0.5">Vence: {formatearFecha(a.vence)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
