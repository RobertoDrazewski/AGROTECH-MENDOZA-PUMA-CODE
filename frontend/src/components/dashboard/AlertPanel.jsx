import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, TrendingDown, Wind, CloudRain } from 'lucide-react';

export default function AlertPanel({ frostPrediction, zondaPrediction, climaPrediction }) {
  // 1. Detectar si hay Granizo en el pronóstico
  const granizoAlert = climaPrediction?.forecast?.flatMap(d => d.riesgos || [])
    .find(r => r.tipo === 'GRANIZO');

  // 2. Prioridad de Alertas
  const isZondaActive = zondaPrediction?.risk_level === 'CRITICAL' || zondaPrediction?.risk_level === 'MEDIUM';
  const isFrostActive = frostPrediction?.risk_level === 'CRITICAL' || frostPrediction?.risk_level === 'MEDIUM';
  
  const activeAlert = isZondaActive ? { ...zondaPrediction, type: 'ZONDA' } 
                    : isFrostActive ? { ...frostPrediction, type: 'HELADA' }
                    : granizoAlert ? { ...granizoAlert, type: 'GRANIZO', risk_level: 'MEDIUM', probability: 0.6, message: granizoAlert.detalle } 
                    : null;

  if (!activeAlert) return null;

  const config = {
    HELADA: { icon: ShieldAlert, color: 'text-rose-400', ring: "border-rose-500/40" },
    ZONDA: { icon: Wind, color: 'text-orange-400', ring: "border-orange-500/40" },
    GRANIZO: { icon: CloudRain, color: 'text-sky-400', ring: "border-sky-500/40" }
  };

  const cfg = config[activeAlert.type] || config.HELADA;
  const Icon = cfg.icon;

  return (
    <div className={`bg-gradient-to-br from-[#18211b] border ${cfg.ring} backdrop-blur-md rounded-2xl p-5 mb-4 shadow-xl flex items-center gap-4`}>
      <div className="bg-[#121a14] p-3 rounded-xl border border-[#2a3a2c]/50">
        <Icon className={`w-8 h-8 ${cfg.color} animate-pulse`} />
      </div>
      <div>
        <span className={`text-sm font-black uppercase ${cfg.color}`}>Alerta: {activeAlert.type}</span>
        <p className="text-xs text-[#cdd8c8]">{activeAlert.message || activeAlert.detalle}</p>
      </div>
    </div>
  );
}