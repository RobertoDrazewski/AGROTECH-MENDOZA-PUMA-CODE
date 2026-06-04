import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function WeatherChart({ telemetryHistory }) {
  
  if (!telemetryHistory || telemetryHistory.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl p-6 h-80 flex items-center justify-center animate-pulse">
        <span className="text-slate-500 text-sm">Cargando curvas de tendencia climática...</span>
      </div>
    );
  }

  // Formateamos los datos para que el eje X muestre solo la hora de cada lectura
  const formattedData = telemetryHistory.map(item => {
    const date = new Date(item.timestamp);
    const horaFormateada = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      ...item,
      Hora: horaFormateada,
      // Mapeo defensivo por si las llaves vienen en mayúscula o minúscula desde FastAPI
      "Temp Aire (°C)": item.temp_aire !== undefined ? item.temp_aire : (item.Temp_Aire_C || 0),
      "Humedad Aire (%)": item.humedad_aire !== undefined ? item.humedad_aire : (item.Humedad_Aire_Porc || 0)
    };
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
          Tendencia Climática (Últimas 24 Horas)
        </h3>
        <p className="text-xs text-slate-500">Monitoreo térmico continuo e interacción de masa húmeda</p>
      </div>

      {/* SOLUCIÓN AL WARNING: Se definen dimensiones explícitas y minHeight en el contenedor padre */}
      <div className="h-72 w-full" style={{ width: '100%', height: '288px', minHeight: '288px' }}>
        {/* minWidth={0} evita que colapse en pantallas chicas o flexboxes de Tailwind */}
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={formattedData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
            <defs>
              {/* Degradado premium para la curva de Temperatura */}
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              {/* Degradado premium para la curva de Humedad */}
              <linearGradient id="colorHumedad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            
            <XAxis 
              dataKey="Hora" 
              stroke="#64748b" 
              fontSize={11}
              tickLine={false}
              dy={10}
            />
            
            {/* Eje Izquierdo para Temperatura */}
            <YAxis 
              yAxisId="left"
              stroke="#f59e0b" 
              fontSize={11}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            
            {/* Eje Derecho para Humedad */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#3b82f6" 
              fontSize={11}
              tickLine={false}
              domain={[0, 100]}
            />

            {/* Tooltip flotante estilizado */}
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#f8fafc',
                fontSize: '12px'
              }}
              itemStyle={{ paddingVertical: '2px' }}
            />
            
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>

            {/* Área de Temperatura */}
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="Temp Aire (°C)" 
              stroke="#f59e0b" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorTemp)" 
            />
            
            {/* Área de Humedad */}
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="Humedad Aire (%)" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorHumedad)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}