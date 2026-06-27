import React from 'react';
import { 
  Thermometer, Droplets, Gauge, Shovel, Radio, 
  FlaskConical, BrainCircuit, Battery, BatteryMedium, 
  BatteryLow, Zap 
} from 'lucide-react';

/**
 * GaugeCard - Componente interno para renderizar el gráfico analógico
 */
const GaugeCard = ({ title, valueText, caption, icon: Icon, iconColor, percent, gaugeColor, alert }) => {
  // Cálculos para el semicírculo SVG
  const radius = 40;
  const circumference = Math.PI * radius; // Aprox 125.6
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className={`relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border ${alert ? 'border-rose-500/40 shadow-lg shadow-rose-950/50' : 'border-slate-800'} backdrop-blur-md rounded-xl p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-slate-700 overflow-hidden`}>
      {/* Fondo de alerta sutil */}
      {alert && <div className="absolute inset-0 bg-rose-950/10 animate-pulse pointer-events-none" />}
      
      <div className="flex items-center justify-between mb-4 z-10">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </span>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      <div className="relative flex flex-col items-center justify-center my-2 z-10">
        <svg viewBox="0 0 100 55" className="w-full max-w-[140px] drop-shadow-md">
          {/* Fondo del Gauge */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinecap="round" 
          />
          {/* Valor del Gauge */}
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
        
        {/* Texto central superpuesto */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            {valueText}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center z-10">
        <p className={`text-xs ${alert ? 'font-medium text-rose-400' : 'text-slate-400'}`}>
          {caption}
        </p>
      </div>
    </div>
  );
};

export default function MetricsGrid({ currentData, anomaly }) {
  if (!currentData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 bg-slate-800/50 rounded-xl border border-slate-700/50"></div>
        ))}
      </div>
    );
  }

  const {
    temp_aire, humedad_aire, presion_atm, humedad_suelo,
    temp_suelo, source, bateria_v,
  } = currentData;

  const isHardware = source === 'hardware';
  const isCold = temp_aire <= 2.0;
  const isDrySoil = humedad_suelo < 20.0;

  // Helpers para calcular porcentajes de los gauges según rangos lógicos
  const calcPercent = (val, min, max) => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

  const metrics = [
    {
      title: "Temperatura Aire",
      valueText: `${temp_aire} °C`,
      icon: Thermometer,
      iconColor: isCold ? "text-cyan-400" : "text-amber-400",
      gaugeColor: isCold ? "#22d3ee" : "#fbbf24", // cyan-400 / amber-400
      percent: calcPercent(temp_aire, -5, 45),
      alert: isCold,
      caption: isCold ? "Riesgo de helada activo" : "Temperatura de canopia"
    },
    {
      title: "Humedad Relativa",
      valueText: `${humedad_aire} %`,
      icon: Droplets,
      iconColor: "text-blue-400",
      gaugeColor: "#60a5fa", // blue-400
      percent: humedad_aire,
      alert: false,
      caption: "Humedad ambiente"
    },
    {
      title: "Presión Atmosférica",
      valueText: `${presion_atm} hPa`,
      icon: Gauge,
      iconColor: "text-emerald-400",
      gaugeColor: "#34d399", // emerald-400
      percent: calcPercent(presion_atm, 950, 1050), // Rango barométrico típico
      alert: false,
      caption: "Estabilidad barométrica"
    },
    {
      title: "Humedad del Suelo",
      valueText: `${humedad_suelo} %`,
      icon: Shovel,
      iconColor: isDrySoil ? "text-rose-400" : "text-amber-600",
      gaugeColor: isDrySoil ? "#fb7185" : "#d97706", // rose-400 / amber-600
      percent: humedad_suelo,
      alert: isDrySoil,
      caption: isDrySoil ? "Riego crítico requerido" : "Estrés hídrico óptimo"
    }
  ];

  // Quinta tarjeta: temp de suelo real
  if (temp_suelo !== null && temp_suelo !== undefined) {
    metrics.push({
      title: "Temperatura Suelo",
      valueText: `${temp_suelo} °C`,
      icon: Shovel,
      iconColor: "text-orange-400",
      gaugeColor: "#fb923c", // orange-400
      percent: calcPercent(temp_suelo, 0, 40),
      alert: false,
      caption: "Sonda DS18B20 a 30 cm"
    });
  }

  // Tarjeta de batería del nodo con lógica mejorada
  if (bateria_v !== null && bateria_v !== undefined) {
    const isCharging = bateria_v >= 4.15;
    const pct = isCharging ? 100 : Math.max(0, Math.min(100, Math.round(((bateria_v - 3.3) / 0.9) * 100)));
    
    let batIcon = Zap;
    let batColor = "text-emerald-400";
    let batHex = "#34d399";
    let batAlert = false;

    if (!isCharging) {
      if (pct >= 70) {
        batIcon = Battery;
        batColor = "text-lime-400";
        batHex = "#a3e635";
      } else if (pct >= 30) {
        batIcon = BatteryMedium;
        batColor = "text-yellow-400";
        batHex = "#facc15";
      } else {
        batIcon = BatteryLow;
        batColor = "text-rose-500";
        batHex = "#f43f5e";
        batAlert = true;
      }
    }
    
    metrics.push({
      title: isCharging ? "Alimentación Activa" : "Batería del Nodo",
      valueText: `${Number(bateria_v).toFixed(2)} V`,
      icon: batIcon,
      iconColor: batColor,
      gaugeColor: batHex,
      percent: pct,
      alert: batAlert,
      caption: isCharging ? "Cargador/Panel conectado" : `${pct}% restante`
    });
  }

  // Tarjeta ML: score de anomalía del Isolation Forest
  if (anomaly && anomaly.disponible) {
    const score = anomaly.score_anomalia;
    const anom = anomaly.es_anomalia;
    metrics.push({
      title: "Anomalía · IA",
      valueText: `${Math.round(score * 100)} %`,
      icon: BrainCircuit,
      iconColor: anom ? "text-fuchsia-400" : "text-violet-400",
      gaugeColor: anom ? "#e879f9" : "#a78bfa", // fuchsia-400 / violet-400
      percent: score * 100,
      alert: anom,
      caption: anom ? "Patrón anómalo (Isolation Forest)" : "Clima normal"
    });
  }

  return (
    <div className="space-y-3">
      {/* Badge de origen del dato */}
      <div className="flex items-center gap-2 mb-4">
        {isHardware ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                           bg-lime-500/15 text-lime-400 border border-lime-500/30">
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
        {metrics.map((item, index) => (
          <GaugeCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
}