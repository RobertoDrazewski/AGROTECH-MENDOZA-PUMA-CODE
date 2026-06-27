import React from 'react';
import { ThermometerSnowflake, Droplets, AlertOctagon, Info } from 'lucide-react';

/**
 * RealTimeFrostPhysics
 * Física meteorológica en vivo, calculada en el frontend a partir del nodo.
 * - Fórmula de Magnus-Tetens para el Punto de Rocío.
 * - Distingue Helada Negra vs Helada Blanca.
 * Paleta verde de marca AgroTech.
 */
export default function RealTimeFrostPhysics({ currentData }) {
  if (!currentData || currentData.temp_aire === undefined || currentData.humedad_aire === undefined) {
    return null;
  }

  const { temp_aire, humedad_aire } = currentData;
  if (temp_aire === null || humedad_aire === null) return null;

  const calculateDewPoint = (temp, hum) => {
    const a = 17.27, b = 237.7;
    const safeHum = Math.max(0.1, Math.min(100, hum));
    const alpha = ((a * temp) / (b + temp)) + Math.log(safeHum / 100.0);
    return (b * alpha) / (a - alpha);
  };

  const dewPoint = calculateDewPoint(temp_aire, humedad_aire);
  const dewPointFormatted = dewPoint.toFixed(1);

  // Diagnóstico físico. Por defecto: seguro (verde de marca).
  let alertState = 'SAFE';
  let statusColor = 'text-[#9bcc44]';
  let bgGradient = 'from-[#9bcc44]/5 to-transparent';
  let borderColor = 'border-[#2a3a2c]/60';
  let message = 'Condiciones termodinámicas seguras.';

  if (temp_aire <= 2.0 && dewPoint > 0) {
    alertState = 'WATCH';
    statusColor = 'text-amber-400';
    bgGradient = 'from-amber-950/20 to-transparent';
    borderColor = 'border-amber-500/30';
    message = 'Descenso térmico crítico. Monitorear de cerca.';
  } else if (temp_aire <= 0 && dewPoint >= -2.0) {
    alertState = 'WHITE_FROST';
    statusColor = 'text-cyan-400';
    bgGradient = 'from-cyan-950/30 to-transparent';
    borderColor = 'border-cyan-500/50';
    message = 'Helada blanca en curso. La escarcha protege parcialmente el tejido.';
  } else if (temp_aire <= 2.0 && dewPoint < -2.0) {
    alertState = 'BLACK_FROST';
    statusColor = 'text-fuchsia-500';
    bgGradient = 'from-fuchsia-950/40 to-transparent';
    borderColor = 'border-fuchsia-500/60';
    message = '¡ALERTA DE HELADA NEGRA! Aire muy seco. Daño celular inminente sin escarcha visible.';
  }

  return (
    <div className={`bg-gradient-to-br ${bgGradient} bg-[#18211b]/80 border ${borderColor} backdrop-blur-md rounded-2xl p-5 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ThermometerSnowflake className={`w-5 h-5 ${statusColor}`} />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Física termodinámica</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#121a14] text-[#8a9787] border border-[#2a3a2c]/60">
          Cálculo local
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col justify-center space-y-4 md:border-r border-[#2a3a2c]/50 md:pr-4">
          <div>
            <span className="text-xs font-bold text-[#8a9787] uppercase flex items-center gap-1">
              Punto de rocío <Info className="w-3 h-3 text-[#5d6f5a]" />
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-4xl font-black tracking-tighter ${statusColor}`}>
                {dewPointFormatted}°C
              </span>
            </div>
            <p className="text-[11px] text-[#5d6f5a] mt-1 leading-tight">
              Temperatura a la que el vapor de agua actual se condensa.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-[#121a14] rounded-xl p-2 flex-1 border border-[#2a3a2c]/60">
              <span className="text-[10px] text-[#5d6f5a] uppercase font-bold block mb-1">T. actual</span>
              <span className="text-sm font-bold text-[#cdd8c8]">{temp_aire.toFixed(1)}°C</span>
            </div>
            <div className="bg-[#121a14] rounded-xl p-2 flex-1 border border-[#2a3a2c]/60">
              <span className="text-[10px] text-[#5d6f5a] uppercase font-bold block mb-1">HR actual</span>
              <span className="text-sm font-bold text-[#cdd8c8]">{humedad_aire.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center md:pl-2">
          <div className="flex items-start gap-3">
            {alertState === 'BLACK_FROST' ? (
              <AlertOctagon className="w-8 h-8 text-fuchsia-500 shrink-0 mt-1 animate-pulse" />
            ) : alertState === 'WHITE_FROST' ? (
              <ThermometerSnowflake className="w-8 h-8 text-cyan-400 shrink-0 mt-1" />
            ) : (
              <Droplets className={`w-8 h-8 ${statusColor} shrink-0 mt-1`} />
            )}

            <div>
              <span className={`text-xs font-black uppercase tracking-wider ${statusColor} block mb-1`}>
                Diagnóstico de campo
              </span>
              <p className="text-sm text-[#cdd8c8] font-medium leading-relaxed">
                {message}
              </p>

              {alertState === 'BLACK_FROST' && (
                <div className="mt-3 bg-fuchsia-950/40 border border-fuchsia-500/30 rounded-xl p-2.5">
                  <p className="text-[11px] text-fuchsia-200 font-semibold leading-tight">
                    La defensa por aspersión requiere más volumen de agua por la evaporación rápida. Priorizar quemadores si están disponibles.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
