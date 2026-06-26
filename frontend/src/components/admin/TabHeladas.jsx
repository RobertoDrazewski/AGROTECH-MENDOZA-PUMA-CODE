import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import {
  CloudSnow, Sun, CloudRain, Wind, Loader2, AlertTriangle, Layers, Satellite,
  Thermometer, Droplet, TrendingDown, Sunrise, ShieldAlert, CheckCircle, Snowflake,
} from 'lucide-react';

const RIESGO_STYLE = {
  HELADA: { c: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30', icon: CloudSnow },
  GRANIZO: { c: 'text-sky-300 bg-sky-500/10 border-sky-500/30', icon: CloudRain },
  GOLPE_DE_CALOR: { c: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: Sun },
  ZONDA: { c: 'text-orange-300 bg-orange-500/10 border-orange-500/30', icon: Wind },
};

const fmt = (v, d = 1) => (v === null || v === undefined ? '--' : Number(v).toFixed(d));

export default function TabHeladas() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [clima, setClima] = useState(null);
  const [helada, setHelada] = useState(null);
  const [nasa, setNasa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe); if (safe.length) setSelected(safe[0]);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      apiService.getClima(selected),
      apiService.getPrediccionHelada(selected),
      apiService.getNasaData(selected),
    ])
      .then(([c, h, n]) => { setClima(c); setHelada(h); setNasa(n); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  // Estilo del panel principal según el nivel de riesgo del backend
  const nivel = helada?.risk_level || 'LOW';
  const nivelCfg = {
    CRITICAL: { ring: 'border-rose-500/40 bg-rose-500/5', icon: ShieldAlert, ic: 'text-rose-400 animate-pulse', txt: 'text-rose-200', label: 'CRÍTICO' },
    MEDIUM: { ring: 'border-amber-500/30 bg-amber-500/5', icon: AlertTriangle, ic: 'text-amber-400', txt: 'text-amber-200', label: 'MODERADO' },
    LOW: { ring: 'border-[#2a3a2c]/60 bg-[#18211b]', icon: CheckCircle, ic: 'text-[#9bcc44]', txt: 'text-[#cdd8c8]', label: 'BAJO' },
  }[nivel] || {};
  const NivelIcon = nivelCfg.icon || CheckCircle;

  // Mínima proyectada: color según umbral de daño
  const pmin = helada?.projected_min_dawn;
  const pminColor = pmin == null ? 'text-white'
    : pmin <= 0 ? 'text-rose-300' : pmin <= 2 ? 'text-amber-300' : 'text-emerald-300';

  // Helada negra: punto de rocío muy bajo (aire seco, sin escarcha protectora)
  const heladaNegra = helada?.dew_point != null && helada.dew_point < -2.0 && (pmin == null || pmin <= 2);

  const celdas = helada ? [
    { label: 'Temp actual', val: `${fmt(helada.current_temp)}°`, icon: Thermometer, color: 'text-cyan-300' },
    { label: 'Punto rocío', val: `${fmt(helada.dew_point)}°`, icon: Droplet, color: 'text-sky-300' },
    { label: 'Enfriam.', val: helada.cooling_rate_c_per_hour ? `-${fmt(helada.cooling_rate_c_per_hour)}°/h` : '--', icon: TrendingDown, color: 'text-amber-300' },
    { label: 'Mín. amanecer', val: `${fmt(pmin)}°`, icon: Sunrise, color: pminColor },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Clima & Heladas</h2>
          <p className="text-xs text-[#8a9787]">Pronóstico físico (IA local) y contraste satelital NASA por cuartel.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Panel principal de helada */}
      {helada && (
        <div className={`rounded-2xl border p-6 ${nivelCfg.ring}`}>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <NivelIcon className={nivelCfg.ic} size={22} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Predicción de helada · IA Local</h3>
            <span className={`ml-auto text-[10px] font-black uppercase px-3 py-1 rounded-full border ${nivelCfg.txt} border-current/30`}>
              Riesgo {nivelCfg.label} · {Math.round((helada.probability ?? 0) * 100)}%
            </span>
          </div>

          {/* Cuatro métricas accionables con íconos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {celdas.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="bg-[#121a14] border border-[#2a3a2c]/50 rounded-xl p-3">
                  <p className="text-[10px] text-[#5d6f5a] font-bold uppercase flex items-center gap-1 mb-1">
                    <Icon className="w-3 h-3" /> {c.label}
                  </p>
                  <p className={`text-xl font-black ${c.color}`}>{c.val}</p>
                </div>
              );
            })}
          </div>

          {/* Aviso de helada negra (la más peligrosa) */}
          {heladaNegra && (
            <div className="mt-4 bg-fuchsia-950/30 border border-fuchsia-500/30 rounded-xl p-3 flex items-start gap-2.5">
              <Snowflake className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-fuchsia-200 leading-relaxed">
                <span className="font-black uppercase">Posible helada negra:</span> aire seco (punto de rocío {fmt(helada.dew_point)}°C).
                No forma escarcha visible y el daño al tejido es mayor. La defensa por aspersión necesita más volumen de agua.
              </p>
            </div>
          )}

          <p className="text-sm text-[#cdd8c8] italic mt-4 leading-relaxed">"{helada.message}"</p>

          <p className="text-[10px] text-[#5d6f5a] mt-3 border-t border-[#2a3a2c]/50 pt-2 leading-relaxed">
            Estimación por enfriamiento radiativo con piso en el punto de rocío. Vale para noche despejada y sin viento.
            Es soporte a la decisión — cruzalo con el parte del SMN / Contingencias Mendoza.
          </p>
        </div>
      )}

      {/* Referencia satelital NASA */}
      {nasa?.disponible && (
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-950/20 to-[#18211b] border-indigo-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Satellite className="text-indigo-400" size={20} />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Referencia satelital · NASA POWER</h3>
            <span className="ml-auto text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-full font-bold">
              hace {nasa.atraso_horas}h
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Temp', v: `${fmt(nasa.temp_aire)}°C`, icon: Thermometer },
              { l: 'Humedad', v: `${fmt(nasa.humedad_aire, 0)}%`, icon: Droplet },
              { l: 'Presión', v: `${fmt(nasa.presion_atm, 0)} hPa`, icon: Layers },
              { l: 'Punto rocío', v: `${fmt(nasa.punto_rocio)}°C`, icon: CloudSnow },
            ].map((x, i) => {
              const Icon = x.icon;
              return (
                <div key={i} className="bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-xl">
                  <p className="text-[10px] text-indigo-300/80 font-bold uppercase flex items-center gap-1 mb-1">
                    <Icon className="w-3 h-3" /> {x.l}
                  </p>
                  <p className="text-lg font-black text-white">{x.v}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-indigo-300/60 mt-3 italic">
            Dato satelital de una celda de ~50 km. Sirve de referencia de zona; tu nodo mide el punto exacto en vivo.
          </p>
        </div>
      )}

      {/* Pronóstico 5 días con chips de riesgo */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : clima && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#5d6f5a] font-bold mb-3">
            Pronóstico 5 días · fuente: {clima.fuente}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {(clima.forecast || []).map((d, i) => (
              <div key={i} className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-4">
                <p className="text-xs font-black uppercase text-white">{d.fecha}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-white">{d.temp_max}°</span>
                  <span className="text-sm text-[#8a9787]">{d.temp_min}°</span>
                </div>
                <div className="text-[11px] text-[#8a9787] mt-2 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><Droplet className="w-3 h-3 text-blue-400" /> {d.humedad}%</span>
                  <span className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-sky-400" /> {d.prob_lluvia}%</span>
                  <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-slate-400" /> {d.viento_kmh}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {(d.riesgos || []).length === 0 ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#9bcc44] font-bold uppercase">
                      <CheckCircle className="w-3 h-3" /> Sin riesgos
                    </span>
                  ) : d.riesgos.map((r, j) => {
                    const st = RIESGO_STYLE[r.tipo] || RIESGO_STYLE.HELADA;
                    const Icon = st.icon;
                    return (
                      <div key={j} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${st.c}`}>
                        <Icon size={12} /> {r.tipo.replace(/_/g, ' ')}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
