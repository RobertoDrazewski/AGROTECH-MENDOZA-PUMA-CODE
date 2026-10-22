import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import apiService from '../../services/api';
import { nombreCuartel } from '../../utils/nombreCuartel';
import { crearIconoNodoVivo } from '../../utils/nodoVivoIcon';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ICONO_NODO_VIVO = crearIconoNodoVivo(36);

const CENTRO_MENDOZA = [-33.2, -68.95];

const COLOR_SEVERIDAD = {
  extreme: '#a855f7',
  severe: '#ef4444',
  moderate: '#f97316',
  minor: '#eab308',
};

function colorDe(severidad) {
  return COLOR_SEVERIDAD[(severidad || '').toLowerCase()] || '#94a3b8';
}

function formatearFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

// Ajusta el encuadre a los cuarteles (no a las alertas, que pueden cubrir
// medio país): así el mapa siempre arranca centrado en tus fincas, bien de
// cerca. Usa los vértices reales de la geocerca cuando ya está marcada (más
// preciso que el punto GPS solo) y el mismo maxZoom que VineyardMap.jsx para
// que el encuadre se sienta igual en todas las vistas con mapa — lo bastante
// alto para distinguir bien el ícono de un solo nodo real.
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

export default function AlertasMapa() {
  const [cuarteles, setCuarteles] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setActualizando(true);
    setError('');
    try {
      const [cu, al] = await Promise.all([
        apiService.getCuarteles(),
        apiService.getAlertasSmn(),
      ]);
      setCuarteles(Array.isArray(cu) ? cu.filter((c) => c.lat && c.lon) : []);
      setAlertas(Array.isArray(al?.alertas) ? al.alertas : []);
    } catch (e) {
      setError('No se pudieron cargar las alertas del SMN en este momento. El radar de abajo sigue funcionando igual.');
    } finally {
      setLoading(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargar();
    // Mismo intervalo que el caché del backend (10 min): no tiene sentido
    // pollear más seguido, el dato no cambia hasta que el SMN publique de nuevo.
    const iv = setInterval(cargar, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const totalAfectadas = new Set(alertas.flatMap((a) => a.cuarteles_afectados || [])).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mapa: geocercas propias + polígonos de alerta del SMN */}
        <div className="lg:col-span-2 bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-wider text-[#9fb09c] uppercase">Alertas vigentes del SMN</h3>
              <p className="text-xs text-[#5d6f5a]">Feed oficial (CAP) cruzado contra tus geocercas · se actualiza solo cada 10 min</p>
            </div>
            <button onClick={cargar} disabled={actualizando}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-[#2a3a2c] text-[#9fb09c] hover:border-[#9bcc44] hover:text-[#9bcc44] transition-colors disabled:opacity-40 shrink-0">
              <RefreshCw size={11} className={actualizando ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>

          {totalAfectadas > 0 && (
            <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
              <AlertTriangle size={14} className="shrink-0" />
              {totalAfectadas} de tus cuarteles {totalAfectadas === 1 ? 'cae' : 'caen'} dentro de una alerta vigente — detalle abajo.
            </div>
          )}

          <div className="relative rounded-lg overflow-hidden border border-[#2a3a2c]" style={{ height: 420 }}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0e1512] text-xs text-[#5d6f5a]">
                Cargando mapa…
              </div>
            ) : (
              <MapContainer center={CENTRO_MENDOZA} zoom={8} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution="Imagery &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
                <AjustarVista cuarteles={cuarteles} />

                {alertas.map((a, i) => (a.poligonos || []).map((poligono, j) => {
                  const afecta = (a.cuarteles_afectados || []).length > 0;
                  return (
                    <Polygon key={`alerta-${i}-${j}`} positions={poligono}
                      pathOptions={{
                        color: colorDe(a.severidad),
                        weight: afecta ? 3 : 1.5,
                        fillColor: colorDe(a.severidad),
                        fillOpacity: afecta ? 0.25 : 0.08,
                      }}>
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

                {cuarteles.map((c) => (
                  <React.Fragment key={c.vinedo_id}>
                    {c.geocerca && c.geocerca.length >= 3 && (
                      <Polygon
                        positions={c.geocerca.map((p) => [p.lat ?? p[0], p.lon ?? p[1]])}
                        pathOptions={{ color: '#9bcc44', weight: 2, fillColor: '#9bcc44', fillOpacity: 0.15 }}>
                        <Popup>{nombreCuartel(c.vinedo_id)}</Popup>
                      </Polygon>
                    )}
                    {/* Ícono "en vivo" en el punto GPS real del nodo — así siempre
                        se ve algo en el mapa, tenga o no geocerca marcada a mano. */}
                    <Marker position={[c.lat, c.lon]} icon={ICONO_NODO_VIVO}>
                      <Popup>{nombreCuartel(c.vinedo_id)}</Popup>
                    </Marker>
                  </React.Fragment>
                ))}
              </MapContainer>
            )}
          </div>

          {error && <p className="text-[11px] text-rose-400 mt-2">{error}</p>}
          <p className="text-[10px] text-[#5d6f5a] mt-2">
            Polígonos de color: zonas con alerta vigente del SMN (más intenso = tu cuartel está adentro). Verde: tus geocercas reales.
          </p>
        </div>

        {/* Radar en vivo de la DACC (Dirección de Contingencias Climáticas, Mendoza) */}
        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-5 shadow-xl flex flex-col">
          <h3 className="text-sm font-semibold tracking-wider text-[#9fb09c] uppercase mb-1">Radar DACC Mendoza</h3>
          <p className="text-xs text-[#5d6f5a] mb-3">Reflectividad en vivo · amarillo/rojo = posible granizo</p>
          <div className="relative flex-1 rounded-lg overflow-hidden border border-[#2a3a2c] bg-black/40 min-h-[260px]">
            <img
              src="https://www2.contingencias.mendoza.gov.ar/radar/animacion.gif"
              alt="Radar meteorológico animado de Mendoza (DACC)"
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <a href="https://www.mendoza.gov.ar/contingencias/radar/" target="_blank" rel="noreferrer"
            className="text-[10px] text-[#9bcc44] hover:underline mt-2 text-center">
            Ver radar completo en mendoza.gov.ar ↗
          </a>
        </div>
      </div>

      {!loading && alertas.length === 0 && (
        <div className="bg-[#18211b] border border-[#2a3a2c] rounded-2xl p-6 text-center text-xs text-[#5d6f5a]">
          No hay alertas vigentes del SMN en este momento.
        </div>
      )}

      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border"
              style={{ borderColor: colorDe(a.severidad) + '55', backgroundColor: colorDe(a.severidad) + '15' }}>
              <AlertTriangle size={15} style={{ color: colorDe(a.severidad) }} className="mt-0.5 shrink-0" />
              <div className="min-w-0 text-xs">
                <p className="font-black uppercase" style={{ color: colorDe(a.severidad) }}>
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
