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
  const [error, setError] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError(false);
    try {
      const [cuartelesData, alertasData] = await Promise.all([
        apiService.getCuarteles().catch(() => []),
        apiService.getAlertasSmn().catch(() => { setError(true); return { alertas: [] }; }),
      ]);
      setCuarteles(Array.isArray(cuartelesData) ? cuartelesData.filter((c) => c.lat && c.lon) : []);
      setAlertas(Array.isArray(alertasData?.alertas) ? alertasData.alertas : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const alertasAfectando = alertas.filter((a) => (a.cuarteles_afectados || []).length > 0);

  return (
    <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-[#9fb09c] uppercase">Alertas oficiales del SMN</h3>
          <p className="text-xs text-[#5d6f5a]">
            Polígonos vigentes del Servicio Meteorológico Nacional cruzados con la ubicación de tus nodos.
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-[#2a3a2c] text-[#9fb09c] hover:border-[#9bcc44] hover:text-[#9bcc44] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-amber-300 flex items-center gap-1.5">
          <AlertTriangle size={12} /> No se pudo consultar el feed del SMN en este momento.
        </p>
      )}

      <div className="relative rounded-lg overflow-hidden border border-[#2a3a2c]" style={{ height: 320 }}>
        <MapContainer center={CENTRO_MENDOZA} zoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="Imagery &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <AjustarVista cuarteles={cuarteles} />
          {alertas.map((a, i) =>
            (a.poligonos || []).map((poligono, j) => (
              <Polygon
                key={`${i}-${j}`}
                positions={poligono}
                pathOptions={{ color: colorDe(a.severidad), weight: 2, fillColor: colorDe(a.severidad), fillOpacity: 0.2 }}
              >
                <Popup>
                  <div style={{ fontSize: 12, color: '#18211b' }}>
                    <b>{a.evento || 'Alerta SMN'}</b><br />
                    Severidad: {a.severidad || '—'}<br />
                    Desde: {formatearFecha(a.inicio)}<br />
                    Hasta: {formatearFecha(a.vence)}
                  </div>
                </Popup>
              </Polygon>
            ))
          )}
          {cuarteles.map((c) => {
            const geocerca = c.geocerca && c.geocerca.length >= 3
              ? c.geocerca.map((p) => [p.lat ?? p[0], p.lon ?? p[1]])
              : null;
            return (
              <React.Fragment key={c.vinedo_id}>
                {geocerca && (
                  <Polygon
                    positions={geocerca}
                    pathOptions={{ color: '#9bcc44', weight: 2, fillColor: '#9bcc44', fillOpacity: 0.15 }}
                  />
                )}
                <Marker position={[c.lat, c.lon]} icon={ICONO_NODO_VIVO}>
                  <Popup>
                    <div style={{ fontSize: 12, color: '#18211b' }}>
                      <b>{nombreCuartel(c.vinedo_id)}</b><br />
                      {c.zona}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {alertasAfectando.length > 0 ? (
        <div className="space-y-2">
          {alertasAfectando.map((a, i) => (
            <div
              key={i}
              className="rounded-lg border p-3 text-xs"
              style={{ borderColor: `${colorDe(a.severidad)}66`, background: `${colorDe(a.severidad)}14` }}
            >
              <div className="flex items-center gap-2 font-bold text-white">
                <AlertTriangle size={14} style={{ color: colorDe(a.severidad) }} />
                {a.evento || 'Alerta SMN'}
                <span className="font-normal text-[#8a9787]">
                  · {formatearFecha(a.inicio)} → {formatearFecha(a.vence)}
                </span>
              </div>
              {a.descripcion && <p className="mt-1 text-[#cdd8c8]">{a.descripcion}</p>}
              <p className="mt-1 text-[#8a9787]">
                Afecta a: {a.cuarteles_afectados.map(nombreCuartel).join(', ')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[#8a9787]">
          {loading ? 'Consultando alertas…' : 'Ninguna alerta vigente del SMN afecta a tus nodos en este momento.'}
        </p>
      )}

      <p className="text-[11px] text-[#5d6f5a]">
        Radar de contingencias de Mendoza:{' '}
        <a
          href="https://www.contingencias.mendoza.gov.ar/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#9bcc44] underline"
        >
          DACC
        </a>
      </p>
    </div>
  );
}
