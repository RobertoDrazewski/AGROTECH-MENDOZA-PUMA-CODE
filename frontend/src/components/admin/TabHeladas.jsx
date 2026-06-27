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

// Helper para calcular porcentajes de los gauges
const calcPercent = (val, min, max) => {
  if (val === null || val === undefined) return 0;
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
};

/**
 * GaugeCard - Reutilizado para mantener el estilo analógico
 */
const GaugeCard = ({ title, valueText, caption, icon: Icon, iconColor, percent, gaugeColor, alert }) => {
  const radius = 40;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border ${alert ? 'border-rose-500/40 shadow-lg shadow-rose-950/50' : 'border-[#2a3a2c]/60'} backdrop-blur-md rounded-xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-[#9bcc44]/50 overflow-hidden`}>
      {alert && <div className="absolute inset-0 bg-rose-950/10 animate-pulse pointer-events-none" />}
      
      <div className="flex items-center justify-between mb-3 z-10">
        <span className="text-[10px] font-bold tracking-wider text-[#5d6f5a] uppercase">
          {title}
        </span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>

      <div className="relative flex flex-col items-center justify-center my-1 z-10">
        <svg viewBox="0 0 100 55" className="w-full max-w-[120px] drop-shadow-md">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#18211b" strokeWidth="10" strokeLinecap="round" />
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={gaugeColor} 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-xl font-black tracking-tight text-white drop-shadow-sm">
            {valueText}
          </span>
        </div>
      </div>

      <div className="mt-3 text-center z-10">
        <p className={`text-[10px] ${alert ? 'font-bold text-rose-400' : 'text-[#8a9787]'}`}>
          {caption}
        </p>
      </div>
    </div>
  );
};

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

  const nivel = helada?.risk_level || 'LOW';
  const nivelCfg = {
    CRITICAL: { ring: 'border-rose-500/40 bg-rose-500/5', icon: ShieldAlert, ic: 'text-rose-400 animate-pulse', txt: 'text-rose-200', label: 'CRÍTICO' },
    MEDIUM: { ring: 'border-amber-500/30 bg-amber-500/5', icon: AlertTriangle, ic: 'text-amber-400', txt: 'text-amber-200', label: 'MODERADO' },
    LOW: { ring: 'border-[#2a3a2c]/60 bg-[#18211b]', icon: CheckCircle, ic: 'text-[#9bcc44]', txt: 'text-[#cdd8c8]', label: 'BAJO' },
  }[nivel] || {};
  const NivelIcon = nivelCfg.icon || CheckCircle;

  const pmin = helada?.projected_min_dawn;
  const alertMin = pmin != null && pmin <= 2;
  const pminColor = pmin == null ? 'text-white' : pmin <= 0 ? 'text-rose-400' : pmin <= 2 ? 'text-amber-400' : 'text-emerald-400';
  const pminGaugeColor = pmin == null ? '#94a3b8' : pmin <= 0 ? '#fb7185' : pmin <= 2 ? '#fbbf24' : '#34d399';

  const heladaNegra = helada?.dew_point != null && helada.dew_point < -2.0 && (pmin == null || pmin <= 2);

  // Configuración de Gauges para Predicción de Helada
  const heladaGauges = helada ? [
    { 
      title: 'Temp actual', valueText: `${fmt(helada.current_temp)}°C`, icon: Thermometer, 
      iconColor: 'text-cyan-400', gaugeColor: '#22d3ee', percent: calcPercent(helada.current_temp, -5, 40), 
      alert: false, caption: 'Lectura base' 
    },
    { 
      title: 'Punto rocío', valueText: `${fmt(helada.dew_point)}°C`, icon: Droplet, 
      iconColor: 'text-sky-400', gaugeColor: '#38bdf8', percent: calcPercent(helada.dew_point, -10, 25), 
      alert: helada.dew_point < 0, caption: 'Límite de enfriamiento' 
    },
    { 
      title: 'Enfriamiento', valueText: helada.cooling_rate_c_per_hour ? `-${fmt(helada.cooling_rate_c_per_hour)}°/h` : '--', icon: TrendingDown, 
      iconColor: 'text-amber-400', gaugeColor: '#fbbf24', percent: calcPercent(helada.cooling_rate_c_per_hour, 0, 5), 
      alert: helada.cooling_rate_c_per_hour > 1.5, caption: 'Tasa radiativa' 
    },
    { 
      title: 'Mín. amanecer', valueText: `${fmt(pmin)}°C`, icon: Sunrise, 
      iconColor: pminColor, gaugeColor: pminGaugeColor, percent: calcPercent(pmin, -5, 20), 
      alert: alertMin, caption: 'Proyección térmica' 
    },
  ] : [];

  // Configuración de Gauges para NASA
  const nasaGauges = nasa ? [
    { title: 'Temp', valueText: `${fmt(nasa.temp_aire)}°C`, icon: Thermometer, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: calcPercent(nasa.temp_aire, -5, 45), caption: 'Capa límite' },
    { title: 'Humedad', valueText: `${fmt(nasa.humedad_aire, 0)}%`, icon: Droplet, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: nasa.humedad_aire, caption: 'Relativa ambiental' },
    { title: 'Presión', valueText: `${fmt(nasa.presion_atm, 0)} hPa`, icon: Layers, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: calcPercent(nasa.presion_atm, 950, 1050), caption: 'Superficie' },
    { title: 'Pto. rocío', valueText: `${fmt(nasa.punto_rocio)}°C`, icon: CloudSnow, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: calcPercent(nasa.punto_rocio, -10, 25), caption: 'Saturación' },
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
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <NivelIcon className={nivelCfg.ic} size={22} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Predicción de helada · IA Local</h3>
            <span className={`ml-auto text-[10px] font-black uppercase px-3 py-1 rounded-full border ${nivelCfg.txt} border-current/30`}>
              Riesgo {nivelCfg.label} · {Math.round((helada.probability ?? 0) * 100)}%
            </span>
          </div>

          {/* Grid de Gauges Analógicos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {heladaGauges.map((gauge, i) => (
              <GaugeCard key={i} {...gauge} />
            ))}
          </div>

          {heladaNegra && (
            <div className="mt-5 bg-fuchsia-950/30 border border-fuchsia-500/30 rounded-xl p-4 flex items-start gap-3">
              <Snowflake className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-fuchsia-200 leading-relaxed">
                <span className="font-black uppercase">Posible helada negra:</span> aire seco (punto de rocío {fmt(helada.dew_point)}°C).
                No forma escarcha visible y el daño al tejido es mayor. La defensa por aspersión necesita más volumen de agua.
              </p>
            </div>
          )}

          <p className="text-sm text-[#cdd8c8] italic mt-5 leading-relaxed">"{helada.message}"</p>

          <p className="text-[10px] text-[#5d6f5a] mt-4 border-t border-[#2a3a2c]/50 pt-3 leading-relaxed">
            Estimación por enfriamiento radiativo con piso en el punto de rocío. Vale para noche despejada y sin viento.
            Es soporte a la decisión — cruzalo con el parte del SMN / Contingencias.
          </p>
        </div>
      )}

      {/* Referencia satelital NASA */}
      {nasa?.disponible && (
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-950/20 to-[#18211b] border-indigo-500/20 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Satellite className="text-indigo-400" size={20} />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Referencia satelital · NASA POWER</h3>
            <span className="ml-auto text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-full font-bold">
              hace {nasa.atraso_horas}h
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {nasaGauges.map((gauge, i) => (
              <GaugeCard key={i} {...gauge} />
            ))}
          </div>

          <p className="text-[10px] text-indigo-300/60 mt-4 italic">
            Dato satelital de una celda de ~50 km. Sirve de referencia de zona; tu nodo mide el punto exacto en vivo.
          </p>
        </div>
      )}

      {/* Pronóstico 5 días */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : clima && (
        <div className="mt-6">
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