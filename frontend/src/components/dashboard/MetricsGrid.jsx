import React from 'react';
import { Thermometer, Droplets, Gauge, Shovel, Radio, FlaskConical, BrainCircuit } from 'lucide-react';

/**
 * MetricsGrid
 * - Distingue lecturas de SENSOR REAL (source: "hardware") vs DEMO (simulator)
 *   con un badge, para que en la ANR/bodega quede claro qué es dato físico.
 * - Muestra Brix/pH como "estimado (lab)" cuando el nodo real no los mide.
 * - Sexta tarjeta opcional: score de anomalía del Isolation Forest.
 */
export default function MetricsGrid({ currentData, anomaly }) {
  if (!currentData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-800/50 rounded-xl border border-slate-700/50"></div>
        ))}
      </div>
    );
  }

  const {
    temp_aire, humedad_aire, presion_atm, humedad_suelo,
    temp_suelo, source,
  } = currentData;

  const isHardware = source === 'hardware';
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

  // Quinta tarjeta: temp de suelo real (solo si el nodo la manda)
  if (temp_suelo !== null && temp_suelo !== undefined) {
    metrics.push({
      title: "Temperatura Suelo",
      value: `${temp_suelo} °C`,
      icon: Shovel,
      iconColor: "text-orange-300",
      borderColor: "border-slate-800",
      bgGradient: "from-slate-900/50 to-transparent",
      caption: "Sonda DS18B20 a 30 cm"
    });
  }

  // Tarjeta ML: score de anomalía del Isolation Forest
  if (anomaly && anomaly.disponible) {
    const score = anomaly.score_anomalia;
    const anom = anomaly.es_anomalia;
    metrics.push({
      title: "Anomalía Climática · IA",
      value: `${Math.round(score * 100)} %`,
      icon: BrainCircuit,
      iconColor: anom ? "text-fuchsia-400 animate-pulse" : "text-violet-400",
      borderColor: anom ? "border-fuchsia-500/40 shadow-lg shadow-fuchsia-950/50" : "border-slate-800",
      bgGradient: anom ? "from-fuchsia-950/20 to-transparent" : "from-slate-900/50 to-transparent",
      caption: anom ? "Patrón anómalo detectado (Isolation Forest)" : "Clima dentro del patrón normal"
    });
  }

  return (
    <div className="space-y-3">
      {/* Badge de origen del dato */}
      <div className="flex items-center gap-2">
        {isHardware ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                           bg-vine-500/15 text-vine-400 border border-vine-500/30">
            <Radio className="w-3.5 h-3.5" /> Sensor real · nodo en campo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                           bg-slate-700/40 text-slate-300 border border-slate-600/40">
            <FlaskConical className="w-3.5 h-3.5" /> Datos de demostración
          </span>
        )}
      </div>

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
    </div>
  );
}
