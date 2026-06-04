import React from 'react';
import { AlertTriangle, ShieldAlert, CloudSnow, CheckCircle, Flame } from 'lucide-react';

export default function AlertPanel({ frostPrediction }) {
  if (!frostPrediction) return null;

  const { risk_level, probability, message, cooling_rate_c_per_hour } = frostPrediction;

  // Definición de estilos y configuraciones según el nivel de riesgo de la IA
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
      textColor: "text-emerald-300",
      iconColor: "text-emerald-400",
      icon: CheckCircle,
      badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      actionButton: false
    }
  };

  const currentConfig = config[risk_level] || config.LOW;
  const CurrentIcon = currentConfig.icon;

  // Función falsa para simular la mitigación (Defensa activa)
  const handleMitigationTrigger = () => {
    alert("--> [IoT] Señal enviada vía LoRaWAN: Activando quemadores y aspersores en Cuartel Malbec 1.");
  };

  return (
    <div className={`w-full bg-gradient-to-r ${currentConfig.bgColor} to-slate-900/90 border backdrop-blur-md rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-500 shadow-xl`}>
      
      <div className="flex items-start gap-4">
        <div className="mt-1 sm:mt-0">
          <CurrentIcon className={`w-6 h-6 ${currentConfig.iconColor}`} />
        </div>
        
        <div>
          <div className="flex items-center gap-2 flex-wrap">
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
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      {/* BOTÓN DE ACCIÓN: El gancho comercial absoluto del SaaS */}
      {currentConfig.actionButton && (
        <button
          onClick={handleMitigationTrigger}
          className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 tracking-wider uppercase transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <Flame className="w-4 h-4 animate-bounce" />
          Activar Defensa Pasiva
        </button>
      )}

    </div>
  );
}