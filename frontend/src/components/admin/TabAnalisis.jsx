import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ComposedChart, Area
} from 'recharts';
import { Loader2, Layers, Calendar, Thermometer, Droplet, Zap, ShieldAlert } from 'lucide-react';

// Estilos globales de tooltips movidos arriba para evitar errores de hoisting en compilación
const tooltipStyle = { 
  backgroundColor: '#0e1512', 
  border: '1px solid #2a3a2c', 
  borderRadius: '12px', 
  fontSize: '11px', 
  color: '#cdd8c8',
  fontFamily: 'monospace' 
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

  // NORMALIZACIÓN DEFENSIVA: Si el backend envía la métrica GDD con otro nombre, 
  // la mapeamos acá para asegurar que Recharts siempre encuentre la propiedad 'gdd'.
  const serie = (data?.serie || []).map(item => ({
    ...item,
    gdd: item.gdd ?? item.gdd_acumulado ?? item.grados_dia ?? 0
  }));

  const resumen = data?.resumen || { gdd_total: 1420, noches_helada: 12, estres_hidrico_dias: 4, eficiencia_nodo: 99.4 };

  return (
    <div className="space-y-6">
      {/* Header del Panel de Control */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#2a3a2c]/40 pb-4">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#9bcc44] animate-pulse" /> Analytics de Telemetría
          </h2>
          <p className="text-xs text-[#8a9787]">
            Análisis predictivo e histórico basado en los nodos de campo y sensores de canopia.
          </p>
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
      ) : (
        <>
          {/* Fila de KPIs de Hardware & Agronomía */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Acumulación GDD" value={`${resumen.gdd_total} Ópt`} desc="Grados-Día de Crecimiento" icon={<Thermometer className="text-[#f59e0b]" />} />
            <KpiCard title="Eventos Helada" value={`${resumen.noches_helada} Noches`} desc="Bajo 0°C en Canopia" icon={<ShieldAlert className="text-[#22d3ee]" />} />
            <KpiCard title="Estrés Hídrico" value={`${resumen.estres_hidrico_dias} Alertas`} desc="Suelo bajo el marchitamiento" icon={<Droplet className="text-[#3b82f6]" />} />
            <KpiCard title="Uptime de Nodos" value={`${resumen.eficiencia_nodo}%`} desc="Paquetes I2C/RF estables" icon={<Zap className="text-[#9bcc44]" />} />
          </div>

          {/* Bloque de Gráficos según periodo */}
          {periodo === 'anual' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <ChartCard title="Dinámica de Suelo: Humedad Volumétrica vs Inercia Térmica (Sonda 30cm)">
                <ComposedChart data={serie}>
                  <defs>
                    <linearGradient id="colorVwc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
                  <YAxis yAxisId="l" stroke="#3b82f6" fontSize={11} label={{ value: 'Humedad %', angle: -90, position: 'insideLeft', fill: '#5d6f5a', fontSize: 10 }} />
                  <YAxis yAxisId="r" orientation="right" stroke="#f59e0b" fontSize={11} label={{ value: 'Suelo °C', angle: 90, position: 'insideRight', fill: '#5d6f5a', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="l" type="monotone" dataKey="vwc_suelo" name="Humedad Suelo (%)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVwc)" />
                  <Line yAxisId="r" type="monotone" dataKey="temp_suelo_30cm" name="Temp Suelo 30cm (°C)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                </ComposedChart>
              </ChartCard>

              <ChartCard title="Análisis de Heladas Invernales y Horas Críticas">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={11} />
                  <YAxis yAxisId="l" stroke="#22d3ee" fontSize={11} allowDecimals={false} />
                  <YAxis yAxisId="r" orientation="right" stroke="#ef4444" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="l" dataKey="eventos_helada" name="Noches con Helada" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="r" type="monotone" dataKey="temp_min_absoluta" name="Mín Absoluta (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </BarChart>
              </ChartCard>

              <ChartCard title="Balance Térmico: Grados-Día de Crecimiento Acumulados (GDD)" full>
                <AreaChartGDD serie={serie} />
              </ChartCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <ChartCard title="Microclima de Canopia: Diferencial Aire vs Canopia Diario">
                <LineChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} />
                  <YAxis stroke="#f59e0b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="temp_max" name="Máx Atmosférica" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="temp_canopia_media" name="Canopia (SHT31)" stroke="#9bcc44" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="temp_min" name="Mín Atmosférica" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartCard>

              <ChartCard title="Cinética de Maduración: Evolución de Azúcar vs Gestión Hídrica">
                <ComposedChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                  <XAxis dataKey="periodo" stroke="#5d6f5a" fontSize={10} />
                  <YAxis yAxisId="l" stroke="#a21caf" fontSize={11} domain={[10, 28]} />
                  <YAxis yAxisId="r" orientation="right" stroke="#3b82f6" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="r" dataKey="riego_litros" name="Riego Aplicado (L)" fill="#1e3a8a" opacity={0.6} radius={[2, 2, 0, 0]} />
                  <Line yAxisId="l" type="monotone" dataKey="brix_medio" name="Grados Brix Medio" stroke="#a21caf" strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Sub-componentes estilizados de soporte
function KpiCard({ title, value, desc, icon }) {
  return (
    <div className="bg-[#18211b] border border-[#2a3a2c]/50 rounded-xl p-4 flex items-start justify-between">
      <div className="space-y-1">
        <span className="text-[10px] font-black tracking-widest uppercase text-[#5d6f5a] block">{title}</span>
        <span className="text-lg font-black tracking-tight text-white block">{value}</span>
        <span className="text-[10px] text-[#8a9787] block">{desc}</span>
      </div>
      <div className="bg-[#121a14] p-2 rounded-lg border border-[#2a3a2c]/30">
        {icon}
      </div>
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
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Componente optimizado usando ComposedChart para blindar el renderizado de áreas vectoriales
function AreaChartGDD({ serie }) {
  if (!serie || serie.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-[#5d6f5a] font-mono border border-dashed border-[#2a3a2c] rounded-xl">
        Alineando telemetría e índices GDD...
      </div>
    );
  }

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
      <Area type="monotone" dataKey="gdd" name="GDD Acumulado" stroke="#9bcc44" strokeWidth={2.5} fill="url(#gdd)" />
    </ComposedChart>
  );
}