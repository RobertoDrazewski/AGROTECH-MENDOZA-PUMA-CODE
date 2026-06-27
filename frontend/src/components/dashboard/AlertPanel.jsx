import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, TrendingDown } from 'lucide-react';

export default function AlertPanel({ frostPrediction }) {
  if (!frostPrediction) return null;

  const { risk_level, probability, message, cooling_rate_c_per_hour } = frostPrediction;

  const config = {
    CRITICAL: {
      ring: "border-rose-500/40 bg-rose-500/5 from-rose-950/30",
      textColor: "text-rose-200",
      iconColor: "text-rose-400 animate-pulse",
      icon: ShieldAlert,
      badge: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    },
    MEDIUM: {
      ring: "border-amber-500/30 bg-amber-500/5 from-amber-950/20",
      textColor: "text-amber-200",
      iconColor: "text-amber-400",
      icon: AlertTriangle,
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    },
    LOW: {
      ring: "border-[#2a3a2c]/60 bg-[#18211b] from-[#18211b]",
      textColor: "text-[#cdd8c8]",
      iconColor: "text-[#9bcc44]",
      icon: CheckCircle,
      badge: "bg-[#9bcc44]/15 text-[#9bcc44] border-[#9bcc44]/40",
    }
  };

  const cfg = config[risk_level] || config.LOW;
  const Icon = cfg.icon;

  return (
    <div className={`bg-gradient-to-br ${cfg.ring} backdrop-blur-md border rounded-2xl p-5 mb-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300`}>
      <div className="flex items-start gap-4">
        <div className="bg-[#121a14] p-3 rounded-xl border border-[#2a3a2c]/50 shrink-0">
          <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-black uppercase tracking-wide ${cfg.textColor}`}>
              {risk_level === 'LOW' ? 'Sistema protegido' : `Riesgo de helada: ${risk_level}`}
            </span>
            <span className={`text-[10px] px-2 py-0.5 font-black uppercase rounded-full border ${cfg.badge}`}>
              Probabilidad {(probability * 100).toFixed(0)}%
            </span>
            {cooling_rate_c_per_hour > 0 && (
              <span className="text-[10px] text-[#8a9787] bg-[#121a14] px-2 py-0.5 rounded-full border border-[#2a3a2c]/50 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> -{cooling_rate_c_per_hour}°C/h
              </span>
            )}
          </div>
          <p className="text-xs text-[#cdd8c8] leading-relaxed max-w-2xl">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
