import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ComposedChart, Area
} from 'recharts';
import { Loader2, Layers, Calendar, Thermometer, Droplet, Zap, ShieldAlert, Grape } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: '#0e1512', border: '1px solid #2a3a2c', borderRadius: '12px',
  fontSize: '11px', color: '#cdd8c8', fontFamily: 'monospace',
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

  // KPIs CALCULADOS desde la serie real (no hardcodeados).
  const kpis = (() => {
    if (!serie.length) return null;
    if (periodo === 'anual') {
      const gddTotal = serie.reduce((a, s) => a + (s.gdd || 0), 0);
      const heladas = serie.reduce((a, s) => a + (s.eventos_helada || 0), 0);
      const lluviaTotal = serie.reduce((a, s) => a + (s.precipitacion_mm || 0), 0);
      const tempMedia = serie.reduce((a, s) => a + (s.temp_media || 0), 0) / serie.length;
      return [
        { title: 'GDD acumulado', value: Math.round(gddTotal).toLocaleString(), desc: 'Grados-día de crecimiento', icon: <Thermometer className="text-[#f59e0b]" /> },
        { title: 'Noches de helada', value: heladas, desc: 'Eventos bajo umbral en el año', icon: <ShieldAlert className="text-[#22d3ee]" /> },
        { title: 'Lluvia total', value: `${Math.round(lluviaTotal)} mm`, desc: 'Acumulado anual', icon: <Droplet className="text-[#3b82f6]" /> },
        { title: 'Temp media', value: `${tempMedia.toFixed(1)}°C`, desc: 'Promedio del período', icon: <Zap className="text-[#9bcc44]" /> },
      ];
    }
    const heladas = serie.reduce((a, s) => a + (s.eventos_helada || 0), 0);
    const brixVals = serie.map(s => s.brix_medio).filter(b => b > 0);
    const brixUlt = brixVals.length ? brixVals[brixVals.length - 1] : 0;
    const tmax = Math.max(...serie.map(s => s.temp_max || -99));
    const tmin = Math.min(...serie.map(s => s.temp_min || 99));
    return [
      { title: 'Días con helada', value: heladas, desc: 'En el período mensual', icon: <ShieldAlert className="text-[#22d3ee]" /> },
      { title: 'Brix actual', value: brixUlt ? `${brixUlt.toFixed(1)}°` : '--', desc: 'Último azúcar medido', icon: <Grape className="text-[#a21caf]" /> },
      { title: 'Máx del período', value: `${tmax.toFixed(1)}°C`, desc: 'Temperatura más alta', icon: <Thermometer className="text-[#ef4444]" /> },
      { title: 'Mín del período', value: `${tmin.toFixed(1)}°C`, desc: 'Temperatura más baja', icon: <Thermometer className="text-[#22d3ee]" /> },
    ];
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#2a3a2c]/40 pb-4">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#9bcc44]" /> Análisis histórico
          </h2>
          <p className="text-xs text-[#8a9787]">Tendencias agroclimáticas por mes y por año, a partir de la telemetría.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="bg-[#18211b] border border-[#2a3a2c] rounded-xl p-1 flex">
            {['anual', 'mensual'].map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${periodo === p ? 'bg-[#9bcc44] text-[#0e1512]' : 'text-[#8a9787]'}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="relative">
            <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
            <select value={selected} onChange={(e) => setSelected(e.target.value)}
              className="w-52 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
              {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44] w-8 h-8" /></div>
      ) : serie.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[#5d6f5a] border border-dashed border-[#2a3a2c] rounded-2xl">
          Sin datos históricos para este cuartel todavía.
        </div>
      ) : (
        <>
          {/* KPIs calculados desde datos reales */}
          {kpis && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
            </div>
          )}

          {periodo === 'anual' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Temperatura media y precipitaciones">
                <ComposedChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
                  <YAxis yAxisId="l" stroke="#f59e0b" fontSize={11} />
                  <YAxis yAxisId="r" orientation="right" stroke="#3b82f6" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="r" dataKey="precipitacion_mm" name="Lluvia (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="l" type="monotone" dataKey="temp_media" name="Temp media (°C)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ChartCard>

              <ChartCard title="Eventos de helada por mes">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
                  <YAxis stroke="#22d3ee" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="eventos_helada" name="Noches con helada" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartCard>

              <ChartCard title="Grados-día de crecimiento acumulados (GDD)" full>
                <AreaChartGDD serie={serie} />
              </ChartCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Temperatura máxima y mínima diaria">
                <LineChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} />
                  <YAxis stroke="#f59e0b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="temp_max" name="Máxima (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="temp_min" name="Mínima (°C)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartCard>

              <ChartCard title="Evolución del azúcar (Brix medio)">
                <LineChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} />
                  <YAxis stroke="#a21caf" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="brix_medio" name="Brix medio" stroke="#a21caf" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, desc, icon }) {
  return (
    <div className="bg-[#18211b] border border-[#2a3a2c]/50 rounded-xl p-4 flex items-start justify-between">
      <div className="space-y-1">
        <span className="text-[10px] font-black tracking-widest uppercase text-[#5d6f5a] block">{title}</span>
        <span className="text-lg font-black tracking-tight text-white block">{value}</span>
        <span className="text-[10px] text-[#8a9787] block">{desc}</span>
      </div>
      <div className="bg-[#121a14] p-2 rounded-lg border border-[#2a3a2c]/30">{icon}</div>
    </div>
  );
}

function ChartCard({ title, children, full }) {
  return (
    <div className={`bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-5 ${full ? 'lg:col-span-2' : ''}`}>
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#9fb09c] mb-4 flex items-center gap-2 font-mono">
        <Calendar size={13} className="text-[#9bcc44]" /> {title}
      </h3>
      <div style={{ width: '100%', height: 280 }}>
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
      <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
      <YAxis stroke="#9bcc44" fontSize={11} />
      <Tooltip contentStyle={tooltipStyle} />
      <Area type="monotone" dataKey="gdd" name="GDD" stroke="#9bcc44" strokeWidth={2.5} fill="url(#gdd)" />
    </ComposedChart>
  );
}
