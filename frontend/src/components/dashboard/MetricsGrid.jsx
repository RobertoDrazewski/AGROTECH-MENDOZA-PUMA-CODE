import React from 'react';
import {
  Thermometer, Droplets, Gauge, Shovel, Radio,
  FlaskConical, BrainCircuit, Battery, BatteryMedium,
  BatteryLow, Zap
} from 'lucide-react';

// Helper: ¿es un número válido (no null/undefined/NaN)?
const isNum = (v) => v !== null && v !== undefined && !isNaN(v) && isFinite(v);

// Helper: formatea un valor o devuelve "--" si no es válido
const fmtVal = (v, unit, dec = 1) =>
  isNum(v) ? `${Number(v).toFixed(dec)} ${unit}` : `-- ${unit}`;

/**
 * GaugeCard - Gráfico analógico semicircular. Paleta verde de marca AgroTech.
 */
const GaugeCard = ({ title, valueText, caption, icon: Icon, iconColor, percent, gaugeColor, alert, noData }) => {
  const radius = 40;
  const circumference = Math.PI * radius;
  const safePercent = isNum(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className={`relative bg-[#18211b] border ${alert ? 'border-rose-500/40 shadow-lg shadow-rose-950/40' : 'border-[#2a3a2c]/60'} backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-[#3a4a3c] overflow-hidden`}>
      {alert && <div className="absolute inset-0 bg-rose-950/10 animate-pulse pointer-events-none" />}

      <div className="flex items-center justify-between mb-4 z-10">
        <span className="text-xs font-bold tracking-wider text-[#8a9787] uppercase">
          {title}
        </span>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      <div className="relative flex flex-col items-center justify-center my-2 z-10">
        <svg viewBox="0 0 100 55" className="w-full max-w-[140px] drop-shadow-md">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#121a14"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={noData ? "#3a4a3c" : gaugeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute bottom-1 flex flex-col items-center">
          <span className={`text-2xl font-black tracking-tight drop-shadow-sm ${noData ? 'text-[#5d6f5a]' : 'text-white'}`}>
            {valueText}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center z-10">
        <p className={`text-xs ${alert ? 'font-medium text-rose-400' : 'text-[#8a9787]'}`}>
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
          <div key={i} className="h-44 bg-[#18211b] rounded-2xl border border-[#2a3a2c]/50"></div>
        ))}
      </div>
    );
  }

  const {
    temp_aire, humedad_aire, presion_atm, humedad_suelo,
    temp_suelo, source, bateria_v,
  } = currentData;

  const isHardware = source === 'hardware';
  const isCold = isNum(temp_aire) && temp_aire <= 2.0;
  const isDrySoil = isNum(humedad_suelo) && humedad_suelo < 20.0;

  const calcPercent = (val, min, max) =>
    isNum(val) ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 0;

  const metrics = [
    {
      title: "Temperatura Aire",
      valueText: fmtVal(temp_aire, "°C"),
      noData: !isNum(temp_aire),
      icon: Thermometer,
      iconColor: isCold ? "text-cyan-400" : "text-amber-400",
      gaugeColor: isCold ? "#22d3ee" : "#fbbf24",
      percent: calcPercent(temp_aire, -5, 45),
      alert: isCold,
      caption: !isNum(temp_aire) ? "Sin lectura" : (isCold ? "Riesgo de helada activo" : "Temperatura de canopia")
    },
    {
      title: "Humedad Relativa",
      valueText: fmtVal(humedad_aire, "%", 0),
      noData: !isNum(humedad_aire),
      icon: Droplets,
      iconColor: "text-blue-400",
      gaugeColor: "#60a5fa",
      percent: isNum(humedad_aire) ? humedad_aire : 0,
      alert: false,
      caption: !isNum(humedad_aire) ? "Sin lectura" : "Humedad ambiente"
    },
    {
      title: "Presión Atmosférica",
      valueText: fmtVal(presion_atm, "hPa", 0),
      noData: !isNum(presion_atm),
      icon: Gauge,
      iconColor: "text-[#9bcc44]",
      gaugeColor: "#9bcc44",
      // Rango para Mendoza (~750m, presión típica ~915 hPa).
      percent: calcPercent(presion_atm, 880, 940),
      alert: false,
      caption: !isNum(presion_atm) ? "Sensor en revisión" : "Estabilidad barométrica"
    },
    {
      title: "Humedad del Suelo",
      valueText: fmtVal(humedad_suelo, "%", 0),
      noData: !isNum(humedad_suelo),
      icon: Shovel,
      iconColor: isDrySoil ? "text-rose-400" : "text-amber-600",
      gaugeColor: isDrySoil ? "#fb7185" : "#d97706",
      percent: isNum(humedad_suelo) ? humedad_suelo : 0,
      alert: isDrySoil,
      caption: !isNum(humedad_suelo) ? "Sensor en revisión" : (isDrySoil ? "Riego crítico requerido" : "Estrés hídrico óptimo")
    }
  ];

  if (isNum(temp_suelo)) {
    metrics.push({
      title: "Temperatura Suelo",
      valueText: fmtVal(temp_suelo, "°C"),
      noData: false,
      icon: Shovel,
      iconColor: "text-orange-400",
      gaugeColor: "#fb923c",
      percent: calcPercent(temp_suelo, 0, 40),
      alert: false,
      caption: "Sonda DS18B20 a 30 cm"
    });
  }

  if (isNum(bateria_v)) {
    const isCharging = bateria_v >= 4.15;
    const pct = isCharging ? 100 : Math.max(0, Math.min(100, Math.round(((bateria_v - 3.3) / 0.9) * 100)));

    let batIcon = Zap;
    let batColor = "text-[#9bcc44]";
    let batHex = "#9bcc44";
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
      noData: false,
      icon: batIcon,
      iconColor: batColor,
      gaugeColor: batHex,
      percent: pct,
      alert: batAlert,
      caption: isCharging ? "Cargador/Panel conectado" : `${pct}% restante`
    });
  }

  if (anomaly && anomaly.disponible && isNum(anomaly.score_anomalia)) {
    const score = anomaly.score_anomalia;
    const anom = anomaly.es_anomalia;
    metrics.push({
      title: "Anomalía · IA",
      valueText: `${Math.round(score * 100)} %`,
      noData: false,
      icon: BrainCircuit,
      iconColor: anom ? "text-fuchsia-400" : "text-violet-400",
      gaugeColor: anom ? "#e879f9" : "#a78bfa",
      percent: score * 100,
      alert: anom,
      caption: anom ? "Patrón anómalo (Isolation Forest)" : "Clima normal"
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        {isHardware ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                           bg-[#9bcc44]/15 text-[#9bcc44] border border-[#9bcc44]/30">
            <Radio className="w-3.5 h-3.5" /> Sensor real · nodo en campo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                           bg-[#121a14] text-[#8a9787] border border-[#2a3a2c]/60">
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
