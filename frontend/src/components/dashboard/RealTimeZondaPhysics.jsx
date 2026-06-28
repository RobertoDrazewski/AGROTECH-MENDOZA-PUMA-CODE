import React from 'react';
import { Wind, Gauge, AlertTriangle, Thermometer } from 'lucide-react';

export default function RealTimeZondaPhysics({ currentData }) {
  if (!currentData || currentData.humedad_aire === undefined) return null;

  const { temp_aire, humedad_aire } = currentData;
  
  // Lógica de diagnóstico de Zonda en vivo
  let status = 'NORMAL';
  let color = 'text-[#9bcc44]';
  let bg = 'from-[#9bcc44]/5 to-transparent';
  let msg = 'Condiciones de humedad estables.';

  if (humedad_aire <= 25 && humedad_aire > 15) {
    status = 'DRY';
    color = 'text-amber-400';
    bg = 'from-amber-950/20 to-transparent';
    msg = 'Masa de aire seca detectada. Vigilancia por Zonda.';
  } else if (humedad_aire <= 15) {
    status = 'CRITICAL_ZONDA';
    color = 'text-orange-500';
    bg = 'from-orange-950/40 to-transparent';
    msg = '¡EXTREMA SEQUEDAD! Condiciones termodinámicas de Zonda en superficie.';
  }

  return (
    <div className={`bg-gradient-to-br ${bg} bg-[#18211b]/80 border border-[#2a3a2c]/60 backdrop-blur-md rounded-2xl p-5 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wind className={`w-5 h-5 ${color}`} />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Termodinámica Zonda</h3>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-[#121a14] text-[#8a9787] border border-[#2a3a2c]/60">
          Sensor Local
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4 md:border-r border-[#2a3a2c]/50 md:pr-4">
          <div>
            <span className="text-xs font-bold text-[#8a9787] uppercase">Humedad Crítica</span>
            <div className="text-4xl font-black tracking-tighter text-white mt-1">
              {humedad_aire.toFixed(1)}%
            </div>
            <div className="w-full bg-[#121a14] h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${humedad_aire < 20 ? 'bg-orange-500' : 'bg-[#9bcc44]'}`}
                style={{ width: `${Math.min(100, (100 - humedad_aire))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-8 h-8 ${color} shrink-0 mt-1 ${status === 'CRITICAL_ZONDA' ? 'animate-pulse' : ''}`} />
          <div>
            <span className={`text-xs font-black uppercase tracking-wider ${color} block mb-1`}>Estado del Aire</span>
            <p className="text-sm text-[#cdd8c8] font-medium leading-tight">{msg}</p>
            {temp_aire > 28 && (
              <div className="mt-2 text-[10px] text-orange-200 bg-orange-950/30 p-1.5 rounded border border-orange-500/20">
                Calentamiento adiabático activo: {temp_aire.toFixed(1)}°C
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}