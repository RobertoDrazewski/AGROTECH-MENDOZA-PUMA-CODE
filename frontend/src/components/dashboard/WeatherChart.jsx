import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function WeatherChart({ telemetryHistory }) {
  
  // 1. Memoizamos el formateo de datos para no recalcular en cada render
  const formattedData = useMemo(() => {
    if (!telemetryHistory || !Array.isArray(telemetryHistory)) return [];
    
    return telemetryHistory.map(item => {
      // Manejo defensivo de fecha
      const date = new Date(item.timestamp);
      const isValidDate = !isNaN(date.getTime());
      
      return {
        ...item,
        Hora: isValidDate ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
        "Temp Aire (°C)": item.temp_aire ?? item.Temp_Aire_C ?? 0,
        "Humedad Aire (%)": item.humedad_aire ?? item.Humedad_Aire_Porc ?? 0
      };
    });
  }, [telemetryHistory]);

  // 2. Validación de visualización
  if (formattedData.length < 2) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl p-6 h-80 flex flex-col items-center justify-center text-center">
        <span className="text-slate-400 text-sm font-semibold mb-2">Esperando telemetría histórica</span>
        <span className="text-slate-600 text-xs">Se necesitan al menos 2 puntos de datos para graficar.</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
          Tendencia Climática (Últimas 24 Horas)
        </h3>
        <p className="text-xs text-slate-500">Monitoreo térmico continuo e interacción de masa húmeda</p>
      </div>

      <div className="h-72 w-full" style={{ width: '100%', height: '288px', minHeight: '288px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={formattedData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHumedad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="Hora" stroke="#64748b" fontSize={11} tickLine={false} dy={10} />
            <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} tickLine={false} domain={[0, 100]} />

            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc', fontSize: '12px' }}
              itemStyle={{ paddingVertical: '2px' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>

            <Area yAxisId="left" type="monotone" dataKey="Temp Aire (°C)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
            <Area yAxisId="right" type="monotone" dataKey="Humedad Aire (%)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHumedad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}