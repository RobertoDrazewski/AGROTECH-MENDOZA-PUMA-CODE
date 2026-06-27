import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ComposedChart, Area
} from 'recharts';
import { Loader2, Layers, Calendar, Thermometer, Droplet, Zap, ShieldAlert, Grape } from 'lucide-react';

// Tooltip con paleta verde de marca
const tooltipStyle = {
  backgroundColor: '#0e1512',
  border: '1px solid #2a3a2c',
  borderRadius: '12px',
  fontSize: '11px',
  color: '#cdd8c8',
  fontFamily: 'monospace',
};

const calcPercent = (val, min, max) => {
  if (val === null || val === undefined) return 0;
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
};

/**
 * GaugeCard - Estilo analógico, paleta verde de marca AgroTech.
 */
const GaugeCard = ({ title, valueText, caption, icon: Icon, iconColor, percent, gaugeColor, alert }) => {
  const radius = 40;
  const circumference = Math.PI * radius;
  const safePercent = (percent === null || percent === undefined || isNaN(percent)) ? 0 : Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className={`relative bg-[#18211b] border ${alert ? 'border-rose-500/40 shadow-lg shadow-rose-950/40' : 'border-[#2a3a2c]/60'} backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-[#9bcc44]/50 overflow-hidden`}>
      {alert && <div className="absolute inset-0 bg-rose-950/10 animate-pulse pointer-events-none" />}

      <div className="flex items-center justify-between mb-3 z-10">
        <span className="text-[10px] font-bold tracking-wider text-[#8a9787] uppercase">
          {title}
        </span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>

      <div className="relative flex flex-col items-center justify-center my-1 z-10">
        <svg viewBox="0 0 100 55" className="w-full max-w-[120px] drop-shadow-md">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#121a14" strokeWidth="10" strokeLinecap="round" />
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

export default function TabAnalisis() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [periodo, setPeriodo] = useState('anual');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe);
      if (safe.length) setSelected(safe[0]);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    apiService.getHistorico(selected, periodo)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected, periodo]);

  const serie = data?.serie || [];

  const kpis = (() => {
    if (!serie.length) return null;

    if (periodo === 'anual') {
      const gddTotal = serie.reduce((a, s) => a + (s.gdd || 0), 0);
      const heladas = serie.reduce((a, s) => a + (s.eventos_helada || 0), 0);
      const lluviaTotal = serie.reduce((a, s) => a + (s.precipitacion_mm || 0), 0);
      const tempMedia = serie.reduce((a, s) => a + (s.temp_media || 0), 0) / serie.length;

      return [
        {
          title: 'GDD Acumulado', valueText: Math.round(gddTotal).toLocaleString(), icon: Thermometer,
          iconColor: 'text-amber-400', gaugeColor: '#fbbf24', percent: calcPercent(gddTotal, 0, 3000),
          caption: 'Grados-día de crecimiento', alert: false
        },
        {
          title: 'Noches Helada', valueText: `${heladas}`, icon: ShieldAlert,
          iconColor: 'text-cyan-400', gaugeColor: '#22d3ee', percent: calcPercent(heladas, 0, 30),
          caption: 'Eventos bajo umbral', alert: heladas > 15
        },
        {
          title: 'Lluvia Total', valueText: `${Math.round(lluviaTotal)} mm`, icon: Droplet,
          iconColor: 'text-blue-400', gaugeColor: '#60a5fa', percent: calcPercent(lluviaTotal, 0, 600),
          caption: 'Acumulado anual', alert: false
        },
        {
          title: 'Temp Media', valueText: `${tempMedia.toFixed(1)}°C`, icon: Zap,
          iconColor: 'text-[#9bcc44]', gaugeColor: '#9bcc44', percent: calcPercent(tempMedia, 0, 30),
          caption: 'Promedio del período', alert: false
        },
      ];
    }

    const heladas = serie.reduce((a, s) => a + (s.eventos_helada || 0), 0);
    const brixVals = serie.map(s => s.brix_medio).filter(b => b > 0);
    const brixUlt = brixVals.length ? brixVals[brixVals.length - 1] : 0;
    const tmax = Math.max(...serie.map(s => s.temp_max || -99));
    const tmin = Math.min(...serie.map(s => s.temp_min || 99));

    return [
      {
        title: 'Días Helada', valueText: `${heladas}`, icon: ShieldAlert,
        iconColor: 'text-cyan-400', gaugeColor: '#22d3ee', percent: calcPercent(heladas, 0, 10),
        caption: 'En el período mensual', alert: heladas > 3
      },
      {
        title: 'Brix Actual', valueText: brixUlt ? `${brixUlt.toFixed(1)}°` : '--', icon: Grape,
        iconColor: 'text-fuchsia-400', gaugeColor: '#e879f9', percent: calcPercent(brixUlt, 0, 30),
        caption: 'Último azúcar medido', alert: false
      },
      {
        title: 'Máx Período', valueText: `${tmax.toFixed(1)}°C`, icon: Thermometer,
        iconColor: 'text-rose-400', gaugeColor: '#fb7185', percent: calcPercent(tmax, 0, 45),
        caption: 'Temperatura más alta', alert: tmax > 35
      },
      {
        title: 'Mín Período', valueText: `${tmin.toFixed(1)}°C`, icon: Thermometer,
        iconColor: 'text-blue-400', gaugeColor: '#60a5fa', percent: calcPercent(tmin, -10, 20),
        caption: 'Temperatura más baja', alert: tmin < 0
      },
    ];
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#2a3a2c]/60 pb-4">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#9bcc44]" /> Análisis histórico
          </h2>
          <p className="text-xs text-[#8a9787]">Tendencias agroclimáticas por mes y por año, a partir de la telemetría.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-1 flex">
            {['anual', 'mensual'].map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${periodo === p ? 'bg-[#9bcc44]/20 text-[#9bcc44] border border-[#9bcc44]/30' : 'text-[#8a9787] hover:text-[#cdd8c8]'}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="relative">
            <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
            <select value={selected} onChange={(e) => setSelected(e.target.value)}
              className="w-52 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer transition-colors">
              {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44] w-8 h-8" /></div>
      ) : serie.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[#5d6f5a] border border-dashed border-[#2a3a2c] rounded-2xl bg-[#18211b]/30">
          Sin datos históricos para este cuartel todavía.
        </div>
      ) : (
        <>
          {kpis && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((k, i) => <GaugeCard key={i} {...k} />)}
            </div>
          )}

          {periodo === 'anual' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Temperatura media y precipitaciones">
                <ComposedChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} tickMargin={8} />
                  <YAxis yAxisId="l" stroke="#fbbf24" fontSize={10} tickMargin={8} />
                  <YAxis yAxisId="r" orientation="right" stroke="#3b82f6" fontSize={10} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                  <Bar yAxisId="r" dataKey="precipitacion_mm" name="Lluvia (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Line yAxisId="l" type="monotone" dataKey="temp_media" name="Temp media (°C)" stroke="#fbbf24" strokeWidth={3} dot={{ r: 3, fill: '#0e1512' }} />
                </ComposedChart>
              </ChartCard>

              <ChartCard title="Eventos de helada por mes">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} tickMargin={8} />
                  <YAxis stroke="#22d3ee" fontSize={10} allowDecimals={false} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#2a3a2c', opacity: 0.4 }} />
                  <Bar dataKey="eventos_helada" name="Noches con helada" fill="#22d3ee" radius={[4, 4, 0, 0]} opacity={0.9} />
                </BarChart>
              </ChartCard>

              <ChartCard title="Grados-día de crecimiento acumulados (GDD)" full>
                <AreaChartGDD serie={serie} />
              </ChartCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Temperatura máxima y mínima diaria">
                <LineChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} tickMargin={8} />
                  <YAxis stroke="#8a9787" fontSize={10} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="temp_max" name="Máxima (°C)" stroke="#fb7185" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="temp_min" name="Mínima (°C)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ChartCard>

              <ChartCard title="Evolución del azúcar (Brix medio)">
                <LineChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} tickMargin={8} />
                  <YAxis stroke="#e879f9" fontSize={10} domain={['auto', 'auto']} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="brix_medio" name="Brix medio" stroke="#e879f9" strokeWidth={3} dot={{ r: 3, fill: '#0e1512' }} />
                </LineChart>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children, full }) {
  return (
    <div className={`bg-[#18211b] border border-[#2a3a2c]/60 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:border-[#9bcc44]/40 ${full ? 'lg:col-span-2' : ''}`}>
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#8a9787] mb-5 flex items-center gap-2">
        <Calendar size={14} className="text-[#9bcc44]" /> {title}
      </h3>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function AreaChartGDD({ serie }) {
  return (
    <ComposedChart data={serie}>
      <defs>
        <linearGradient id="gdd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#9bcc44" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#9bcc44" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
      <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} tickMargin={8} />
      <YAxis stroke="#9bcc44" fontSize={10} tickMargin={8} />
      <Tooltip contentStyle={tooltipStyle} />
      <Area type="monotone" dataKey="gdd" name="GDD" stroke="#9bcc44" strokeWidth={3} fill="url(#gdd)" />
    </ComposedChart>
  );
}
