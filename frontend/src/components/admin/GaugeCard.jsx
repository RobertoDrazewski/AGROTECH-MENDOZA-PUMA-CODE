import React from 'react';

/**
 * GaugeCard — tarjeta con medidor analógico semicircular, usada en todo el
 * panel (Control Climático, Análisis Anual/Mes) para que las métricas se
 * vean siempre con el mismo lenguaje visual en vez de repetir el mismo
 * componente copiado y ligeramente distinto en cada pestaña.
 */
export default function GaugeCard({ title, valueText, caption, icon: Icon, iconColor, percent, gaugeColor, alert }) {
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
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
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
}

export function calcPercent(val, min, max) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}
