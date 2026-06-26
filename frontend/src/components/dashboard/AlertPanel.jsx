import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Flame } from 'lucide-react';

export default function AlertPanel({ frostPrediction }) {
  if (!frostPrediction) return null;

  const { risk_level, probability, message, cooling_rate_c_per_hour } = frostPrediction;

  const config = {
    CRITICAL: {
      bgColor: "bg-red-950/40 border-red-500/40 from-red-950/30",
      textColor: "text-red-200",
      iconColor: "text-red-400 animate-pulse",
      icon: ShieldAlert,
      badge: "bg-red-500/20 text-red-400 border-red-500/50",
      actionButton: true
    },
    MEDIUM: {
      bgColor: "bg-amber-950/40 border-amber-500/30 from-amber-950/20",
      textColor: "text-amber-200",
      iconColor: "text-amber-400",
      icon: AlertTriangle,
      badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      actionButton: false
    },
    LOW: {
      bgColor: "bg-emerald-950/20 border-emerald-500/20 from-emerald-950/10",
      textColor: "text-emerald-200",
      iconColor: "text-emerald-400",
      icon: CheckCircle,
      badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      actionButton: false
    }
  };

  // Fallback a LOW si el backend envía algo inesperado
  const currentConfig = config[risk_level] || config.LOW;
  const Icon = currentConfig.icon;

  const handleMitigationTrigger = () => {
    // Aquí conectás con el endpoint que acciona los relés de defensa activa
    console.log("Comando enviado: Activando defensa de helada...");
  };

  return (
    <div className={`bg-gradient-to-br ${currentConfig.bgColor} backdrop-blur-md border rounded-xl p-5 mb-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300`}>
      <div className="flex items-start gap-4">
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shrink-0">
          <Icon className={`w-8 h-8 ${currentConfig.iconColor}`} />
        </div>
        
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-bold ${currentConfig.textColor}`}>
              {risk_level === 'LOW' ? 'Sistema Protegido' : `Riesgo de Helada: ${risk_level}`}
            </span>
            <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-full border ${currentConfig.badge}`}>
              Probabilidad: {(probability * 100).toFixed(0)}%
            </span>
            {cooling_rate_c_per_hour > 0 && (
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                Enfriamiento: -{cooling_rate_c_per_hour}°C/h
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            {message}
          </p>
        </div>
      </div>

      {currentConfig.actionButton && (
        <button
          onClick={handleMitigationTrigger}
          className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all hover:scale-105 shrink-0"
        >
          <Flame className="w-4 h-4" />
          ACTIVAR DEFENSA
        </button>
      )}
    </div>
  );
}