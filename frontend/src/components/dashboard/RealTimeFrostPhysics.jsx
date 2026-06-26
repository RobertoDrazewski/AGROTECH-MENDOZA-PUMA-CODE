import React from 'react';
import { ThermometerSnowflake, Droplets, AlertOctagon, Info } from 'lucide-react';

/**
 * RealTimeFrostPhysics
 * Componente de física meteorológica real que procesa los datos del nodo
 * al instante en el frontend.
 * - Utiliza la fórmula de Magnus-Tetens para el Punto de Rocío.
 * - Detecta condiciones de Helada Negra vs Helada Blanca.
 */
export default function RealTimeFrostPhysics({ currentData }) {
  if (!currentData || currentData.temp_aire === undefined || currentData.humedad_aire === undefined) {
    return null;
  }

  const { temp_aire, humedad_aire } = currentData;

  // Fórmula de Magnus-Tetens para calcular el punto de rocío
  const calculateDewPoint = (temp, hum) => {
    // Constantes estándar para agua
    const a = 17.27;
    const b = 237.7;
    
    // Protección contra humedad 0 para evitar -Infinity en el logaritmo
    const safeHum = Math.max(0.1, Math.min(100, hum));
    
    const alpha = ((a * temp) / (b + temp)) + Math.log(safeHum / 100.0);
    const dewPoint = (b * alpha) / (a - alpha);
    
    return dewPoint;
  };

  const dewPoint = calculateDewPoint(temp_aire, humedad_aire);
  const dewPointFormatted = dewPoint.toFixed(1);

  // Lógica dura agronómica para determinar el riesgo físico
  let alertState = 'SAFE'; // SAFE, WATCH, WHITE_FROST, BLACK_FROST
  let statusColor = 'text-emerald-400';
  let bgGradient = 'from-emerald-950/20 to-transparent';
  let borderColor = 'border-emerald-500/20';
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
    message = 'Helada Blanca en curso. Formación de escarcha protegiendo parcialmente el tejido.';
  } else if (temp_aire <= 2.0 && dewPoint < -2.0) {
    alertState = 'BLACK_FROST';
    statusColor = 'text-fuchsia-500';
    bgGradient = 'from-fuchsia-950/40 to-transparent';
    borderColor = 'border-fuchsia-500/60';
    message = '¡ALERTA DE HELADA NEGRA! Aire extremadamente seco. Daño celular inminente sin escarcha visible.';
  }

  return (
    <div className={`bg-gradient-to-br ${bgGradient} bg-[#18211b]/80 border ${borderColor} backdrop-blur-md rounded-xl p-5 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ThermometerSnowflake className={`w-5 h-5 ${statusColor}`} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Física Termodinámica</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-slate-300 border border-slate-700">
          Cálculo Frontend Local
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel Izquierdo: El cálculo duro */}
        <div className="flex flex-col justify-center space-y-4 border-r border-slate-700/50 pr-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1">
              Punto de Rocío <Info className="w-3 h-3 text-slate-500" />
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-4xl font-black tracking-tighter ${statusColor}`}>
                {dewPointFormatted}°C
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Temperatura a la que el vapor de agua actual se condensará.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-900/60 rounded-lg p-2 flex-1 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">T. Actual</span>
              <span className="text-sm font-bold text-slate-200">{temp_aire.toFixed(1)}°C</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2 flex-1 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">HR Actual</span>
              <span className="text-sm font-bold text-slate-200">{humedad_aire.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Panel Derecho: El diagnóstico físico */}
        <div className="flex flex-col justify-center pl-2">
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
                Diagnóstico de Campo
              </span>
              <p className="text-sm text-slate-200 font-medium leading-relaxed">
                {message}
              </p>
              
              {alertState === 'BLACK_FROST' && (
                <div className="mt-3 bg-fuchsia-950/40 border border-fuchsia-500/30 rounded-lg p-2.5">
                  <p className="text-[11px] text-fuchsia-200 font-semibold leading-tight">
                    Acción recomendada: La defensa por aspersión requerirá un volumen de agua significativamente mayor debido a la rápida evaporación. Priorizar quemadores si están disponibles.
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