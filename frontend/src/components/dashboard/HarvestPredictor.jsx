import React from 'react';
import { Grape, Wine, Beaker } from 'lucide-react';

export default function HarvestPredictor({ harvestAnalysis }) {
  if (!harvestAnalysis) {
    return (
      <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-6 h-full flex items-center justify-center animate-pulse">
        <span className="text-[#5d6f5a] text-sm">Cargando métricas de maduración…</span>
      </div>
    );
  }

  const {
    current_brix = 18.0,
    current_ph = 3.1,
    message = 'Monitor de maduración activo',
  } = harvestAnalysis;

  // Alcohol potencial aproximado (Brix × 0.59)
  const alcoholPotencial = (current_brix * 0.59).toFixed(1);

  const isOptimal = current_brix >= 22.0 && current_brix <= 26.0;
  const isEarly = current_brix < 22.0;

  return (
    <div className="bg-gradient-to-br from-purple-950/20 to-[#18211b] border border-purple-900/30 rounded-2xl p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grape className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Estado de maduración
            </h3>
          </div>
          {isOptimal ? (
             <span className="text-[10px] px-2 py-0.5 bg-[#9bcc44]/20 text-[#9bcc44] border border-[#9bcc44]/30 rounded-full uppercase font-black tracking-wider">
               Ventana óptima
             </span>
          ) : isEarly ? (
             <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full uppercase font-black tracking-wider">
               En envero
             </span>
          ) : (
             <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full uppercase font-black tracking-wider">
               Sobre-maduración
             </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#121a14] border border-[#2a3a2c]/60 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-[#5d6f5a] flex items-center gap-1 mb-1">
               <Beaker className="w-3 h-3" /> Grados Brix
            </span>
            <span className="text-2xl font-black text-white">{current_brix.toFixed(1)}°</span>
          </div>
          <div className="bg-[#121a14] border border-[#2a3a2c]/60 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-[#5d6f5a] flex items-center gap-1 mb-1">
               <Wine className="w-3 h-3" /> Alcohol potencial
            </span>
            <span className="text-2xl font-black text-purple-400">{alcoholPotencial}%</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2a3a2c]/60 pt-3">
        <div className="flex justify-between items-end">
           <div>
             <span className="text-[10px] font-bold uppercase text-[#5d6f5a] block">pH actual</span>
             <span className="text-sm font-bold text-[#cdd8c8]">{current_ph.toFixed(2)}</span>
           </div>
           <p className="text-[11px] text-[#8a9787] text-right max-w-[60%]">
             {message}
           </p>
        </div>
      </div>
    </div>
  );
}
