import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ComposedChart, Area,
} from 'recharts';
import { Loader2, Layers, Calendar } from 'lucide-react';

export default function TabAnalisis() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [periodo, setPeriodo] = useState('anual');
  const [data, setData] = useState(null);
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
    apiService.getHistorico(selected, periodo).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [selected, periodo]);

  const serie = data?.serie || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Análisis histórico</h2>
          <p className="text-xs text-[#8a9787]">Tendencias climáticas y agronómicas por mes y por año.</p>
        </div>
        <div className="flex gap-3">
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
              className="w-48 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
              {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : periodo === 'anual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Temperatura media y precipitaciones">
            <ComposedChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
              <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
              <YAxis yAxisId="l" stroke="#f59e0b" fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke="#3b82f6" fontSize={11} />
              <Tooltip contentStyle={tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="r" dataKey="precipitacion_mm" name="Lluvia (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line yAxisId="l" type="monotone" dataKey="temp_media" name="Temp (°C)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
            </ComposedChart>
          </ChartCard>

          <ChartCard title="Eventos de helada por mes">
            <BarChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
              <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
              <YAxis stroke="#22d3ee" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="eventos_helada" name="Heladas" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Grados-día de crecimiento (GDD)" full>
            <AreaChartGDD serie={serie} />
          </ChartCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Temperatura máx/mín diaria">
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
              <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} />
              <YAxis stroke="#f59e0b" fontSize={11} />
              <Tooltip contentStyle={tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="temp_max" name="Máx" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="temp_min" name="Mín" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>

          <ChartCard title="Evolución del azúcar (Brix medio)">
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
              <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} />
              <YAxis stroke="#9bcc44" fontSize={11} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tooltip} />
              <Line type="monotone" dataKey="brix_medio" name="Brix" stroke="#9bcc44" strokeWidth={3} dot={{ r: 2 }} />
            </LineChart>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

const tooltip = { backgroundColor: '#121a14', border: '1px solid #2a3a2c', borderRadius: 8, fontSize: 12, color: '#fff' };

function ChartCard({ title, children, full }) {
  return (
    <div className={`bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-5 ${full ? 'lg:col-span-2' : ''}`}>
      <h3 className="text-xs font-black uppercase tracking-widest text-[#9fb09c] mb-4 flex items-center gap-2">
        <Calendar size={13} className="text-[#9bcc44]" /> {title}
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
          <stop offset="5%" stopColor="#9bcc44" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#9bcc44" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
      <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
      <YAxis stroke="#9bcc44" fontSize={11} />
      <Tooltip contentStyle={tooltip} />
      <Area type="monotone" dataKey="gdd" name="GDD" stroke="#9bcc44" strokeWidth={2} fill="url(#gdd)" />
    </ComposedChart>
  );
}
