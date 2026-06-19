import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import apiService from '../../services/api';
import { ShieldAlert, CheckCircle2, Waves, MapPin, Pencil, Check, X, Undo2 } from 'lucide-react';

// Leaflet + bundlers: hay que indicar las imágenes del pin a mano una sola vez.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// Centro aproximado de la zona vitivinícola de Mendoza (entre los 4 oasis).
const CENTRO_MENDOZA = [-33.2, -68.95];

// Vértices reales de los viñedos cargados manualmente
const GEOCERCAS_REALES = {
  "Cuartel_Malbec_1": [
    [-32.957419, -68.745316],
    [-32.957729, -68.744339],
    [-32.959332, -68.745037],
    [-32.959224, -68.745385],
    [-32.960020, -68.745793],
    [-32.959795, -68.746501]
  ],
  "Cuartel_Cabernet_2": [
    [-33.160630, -68.919275],
    [-33.162345, -68.911314],
    [-33.164124, -68.911475],
    [-33.162372, -68.919704]
  ],
  "Cuartel_Chardonnay_3": [
    [-33.158671, -68.917977],
    [-33.160127, -68.911164],
    [-33.162210, -68.911271],
    [-33.160638, -68.918556]
  ],
  "Cuartel_Syrah_4": [
    [-33.568776, -69.025420],
    [-33.568096, -69.022727],
    [-33.572816, -69.024712],
    [-33.572172, -69.027008]
  ],
  "Cuartel_Bonarda_5": [
    [-33.349958, -69.176238],
    [-33.349304, -69.175809],
    [-33.350156, -69.173040],
    [-33.351088, -69.173266]
  ]
};

// Genera un cuadrado aproximado (geocerca) como fallback para viñedos
// nuevos que aún no tengan geocerca real asignada.
function geocercaAproximada(lat, lon, hectareas = 3) {
  const ladoMetros = Math.sqrt((hectareas || 3) * 10000); // m2 -> lado del cuadrado
  const mitad = ladoMetros / 2;
  const dLat = mitad / 111320;
  const dLon = mitad / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat - dLat, lon - dLon],
    [lat - dLat, lon + dLon],
    [lat + dLat, lon + dLon],
    [lat + dLat, lon - dLon],
  ];
}

function estadoCuartel(id, selectedVinedo, currentTemp) {
  if (id === selectedVinedo && Number(currentTemp) < 2) {
    return { color: '#ef4444', label: 'Crítico (Helada)', icon: ShieldAlert };
  }
  return { color: '#9bcc44', label: 'Monitoreando', icon: Waves };
}

// Ajusta automáticamente el encuadre del mapa a los cuarteles cargados.
function AjustarVista({ cuarteles }) {
  const map = useMap();
  useEffect(() => {
    if (!cuarteles.length) return;
    const bounds = L.latLngBounds(cuarteles.map((c) => [c.lat, c.lon]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [cuarteles, map]);
  return null;
}

// Mientras está activo el modo "marcar geocerca", cada clic sobre el satélite
// agrega un punto al contorno que se está dibujando a mano.
function CapturarClics({ activo, onClick }) {
  useMapEvents({
    click(e) {
      if (activo) onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function VineyardMap({ vinedos, selectedVinedo, setSelectedVinedo, currentTemp }) {
  const [cuarteles, setCuarteles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [puntosNuevos, setPuntosNuevos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const recargarCuarteles = async () => {
    try {
      const data = await apiService.getCuarteles();
      setCuarteles(Array.isArray(data) ? data.filter((c) => c.lat && c.lon) : []);
    } catch (e) {
      setCuarteles([]);
    }
  };

  useEffect(() => {
    let activo = true;
    (async () => {
      await recargarCuarteles();
      if (activo) setLoading(false);
    })();
    return () => { activo = false; };
  }, []);

  const seleccionado = useMemo(
    () => cuarteles.find((c) => c.vinedo_id === selectedVinedo),
    [cuarteles, selectedVinedo]
  );

  const empezarMarcado = () => {
    setPuntosNuevos([]);
    setEditando(true);
  };
  const cancelarMarcado = () => {
    setPuntosNuevos([]);
    setEditando(false);
  };
  const deshacerPunto = () => setPuntosNuevos((p) => p.slice(0, -1));
  const guardarMarcado = async () => {
    if (puntosNuevos.length < 3 || !selectedVinedo) return;
    setGuardando(true);
    try {
      const payload = puntosNuevos.map(([lat, lon]) => ({ lat, lon }));
      await apiService.guardarGeocerca(selectedVinedo, payload);
      await recargarCuarteles();
      setEditando(false);
      setPuntosNuevos([]);
    } catch (e) {
      // si falla el guardado, dejamos los puntos para reintentar
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-5 shadow-xl h-full flex flex-col justify-between">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-[#9fb09c] uppercase">Distribución del viñedo</h3>
          <p className="text-xs text-[#5d6f5a]">Mapa satelital real · cuarteles y estado de alertas IoT</p>
        </div>
        <div className="flex items-center gap-2">
          {seleccionado?.zona && !editando && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#9bcc44] bg-[#9bcc44]/10 border border-[#9bcc44]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <MapPin size={11} /> {seleccionado.zona}
            </span>
          )}
          {!editando ? (
            <button onClick={empezarMarcado} disabled={!selectedVinedo}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-[#2a3a2c] text-[#9fb09c] hover:border-[#9bcc44] hover:text-[#9bcc44] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Pencil size={11} /> Marcar geocerca
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9bcc44] font-mono">{puntosNuevos.length} puntos</span>
              <button onClick={deshacerPunto} disabled={!puntosNuevos.length}
                className="p-1.5 rounded-full border border-[#2a3a2c] text-[#9fb09c] hover:border-[#9bcc44] disabled:opacity-30" title="Deshacer último punto">
                <Undo2 size={13} />
              </button>
              <button onClick={cancelarMarcado}
                className="p-1.5 rounded-full border border-[#2a3a2c] text-red-400 hover:border-red-400" title="Cancelar">
                <X size={13} />
              </button>
              <button onClick={guardarMarcado} disabled={puntosNuevos.length < 3 || guardando}
                className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-full bg-[#9bcc44] text-[#0e1512] disabled:opacity-40" title="Guardar geocerca">
                <Check size={13} /> {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {editando && (
        <p className="text-[10px] text-[#9bcc44] -mt-2 mb-2">
          Hacé clic sobre el satélite siguiendo las esquinas reales de "{(selectedVinedo || '').replace(/_/g, ' ')}". Necesitás al menos 3 puntos.
        </p>
      )}


      <div className="relative rounded-lg overflow-hidden border border-[#2a3a2c] min-h-[260px]" style={{ height: 280 }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0e1512] text-xs text-[#5d6f5a]">
            Cargando mapa…
          </div>
        ) : (
          <MapContainer center={CENTRO_MENDOZA} zoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution="Imagery &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <AjustarVista cuarteles={editando ? [] : cuarteles} />
            <CapturarClics activo={editando} onClick={(pt) => setPuntosNuevos((p) => [...p, pt])} />
            {editando && puntosNuevos.length > 0 && (
              <>
                <Polyline positions={puntosNuevos} pathOptions={{ color: '#facc15', weight: 2, dashArray: '5,5' }} />
                {puntosNuevos.map((pt, i) => (
                  <CircleMarker key={i} center={pt} radius={5} pathOptions={{ color: '#facc15', fillColor: '#facc15', fillOpacity: 1 }} />
                ))}
              </>
            )}
            {cuarteles.map((c) => {
              const st = estadoCuartel(c.vinedo_id, selectedVinedo, currentTemp);
              const sel = c.vinedo_id === selectedVinedo;
              
              // Prioridad 1: Coordenadas reales estáticas. 
              // Prioridad 2: Coordenadas traídas del backend (API).
              // Fallback: Geocerca aproximada.
              const geocerca = GEOCERCAS_REALES[c.vinedo_id] 
                ? GEOCERCAS_REALES[c.vinedo_id]
                : (c.geocerca && c.geocerca.length >= 3
                  ? c.geocerca.map((p) => [p.lat ?? p[0], p.lon ?? p[1]])
                  : geocercaAproximada(c.lat, c.lon, c.hectareas));

              return (
                <React.Fragment key={c.vinedo_id}>
                  <Polygon
                    positions={geocerca}
                    pathOptions={{
                      color: sel ? '#9bcc44' : st.color,
                      weight: sel ? 3 : 2,
                      fillColor: sel ? '#9bcc44' : st.color,
                      fillOpacity: sel ? 0.3 : 0.15,
                    }}
                    eventHandlers={{ click: () => !editando && vinedos.includes(c.vinedo_id) && setSelectedVinedo(c.vinedo_id) }}
                  />
                  <Marker
                    position={[c.lat, c.lon]}
                    eventHandlers={{ click: () => !editando && vinedos.includes(c.vinedo_id) && setSelectedVinedo(c.vinedo_id) }}
                  >
                    <Popup>
                      <div style={{ fontSize: 12, color: '#18211b' }}>
                        <b>{(c.vinedo_id || '').replace(/_/g, ' ')}</b><br />
                        {c.variedad} · {c.hectareas} ha<br />
                        {c.zona}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#2a3a2c]/60 grid grid-cols-2 gap-2 text-[11px]">
        {vinedos.map((id) => {
          const meta = cuarteles.find((c) => c.vinedo_id === id);
          const st = estadoCuartel(id, selectedVinedo, currentTemp);
          const Icon = st.icon;
          const sel = id === selectedVinedo;
          return (
            <div key={id} onClick={() => setSelectedVinedo(id)}
              className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${sel ? 'bg-[#9bcc44]/10 border-[#9bcc44]/50' : 'bg-[#0e1512]/40 border-transparent hover:border-[#2a3a2c]'}`}>
              <Icon className="w-4 h-4 shrink-0" style={{ color: sel ? '#9bcc44' : st.color }} />
              <div className="truncate">
                <span className={`block font-semibold ${sel ? 'text-white' : 'text-[#cdd8c8]'}`}>
                  {id.replace('Cuartel_', '').replace('_', ' ')}
                </span>
                <span className="text-[9px] text-[#5d6f5a] block -mt-0.5">
                  {meta?.zona || st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}