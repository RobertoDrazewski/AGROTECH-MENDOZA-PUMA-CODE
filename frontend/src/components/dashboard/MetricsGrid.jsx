import React from 'react';
import { Thermometer, Droplets, Gauge, Shovel } from 'lucide-react';

export default function MetricsGrid({ currentData }) {
  // Si aún no han llegado datos del backend, mostramos un estado de carga elegante
  if (!currentData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-800/50 rounded-xl border border-slate-700/50"></div>
        ))}
      </div>
    );
  }

  const { temp_aire, humedad_aire, presion_atm, humedad_suelo } = currentData;

  // Evaluamos condiciones extremas para aplicar alertas visuales en las tarjetas
  const isCold = temp_aire <= 2.0;
  const isDrySoil = humedad_suelo < 20.0;

  const metrics = [
    {
      title: "Temperatura Aire",
      value: `${temp_aire} °C`,
      icon: Thermometer,
      iconColor: isCold ? "text-cyan-400 animate-bounce" : "text-amber-400",
      borderColor: isCold ? "border-cyan-500/40 shadow-lg shadow-cyan-950/50" : "border-slate-800",
      bgGradient: isCold ? "from-cyan-950/20 to-transparent" : "from-slate-900/50 to-transparent",
      caption: isCold ? "Riesgo de helada activo" : "Temperatura de canopia estable"
    },
    {
      title: "Humedad Relativa",
      value: `${humedad_aire} %`,
      icon: Droplets,
      iconColor: "text-blue-400",
      borderColor: "border-slate-800",
      bgGradient: "from-slate-900/50 to-transparent",
      caption: "Humedad ambiente"
    },
    {
      title: "Presión Atmosférica",
      value: `${presion_atm} hPa`,
      icon: Gauge,
      iconColor: "text-emerald-400",
      borderColor: "border-slate-800",
      bgGradient: "from-slate-900/50 to-transparent",
      caption: "Estabilidad barométrica"
    },
    {
      title: "Humedad del Suelo",
      value: `${humedad_suelo} %`,
      icon: Shovel,
      iconColor: isDrySoil ? "text-rose-400 animate-pulse" : "text-amber-600",
      borderColor: isDrySoil ? "border-rose-500/40 shadow-lg shadow-rose-950/50" : "border-slate-800",
      bgGradient: isDrySoil ? "from-rose-950/20 to-transparent" : "from-slate-900/50 to-transparent",
      caption: isDrySoil ? "Riego crítico requerido" : "Nivel de estrés hídrico óptimo"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${item.bgGradient} bg-slate-900/80 border ${item.borderColor} backdrop-blur-md rounded-xl p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-slate-700`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                {item.title}
              </span>
              <Icon className={`w-5 h-5 ${item.iconColor}`} />
            </div>
            
            <div className="my-2">
              <span className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                {item.value}
              </span>
            </div>

            <div className="mt-1">
              <p className={`text-xs ${item.borderColor !== 'border-slate-800' ? 'font-medium text-slate-300' : 'text-slate-500'}`}>
                {item.caption}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}