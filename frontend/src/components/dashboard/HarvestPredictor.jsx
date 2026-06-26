import React from 'react';
import { Grape, Wine, Beaker } from 'lucide-react';

export default function HarvestPredictor({ harvestAnalysis }) {
  if (!harvestAnalysis) {
    return (
      <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-6 h-full flex items-center justify-center animate-pulse">
        <span className="text-[#5d6f5a] text-sm">Cargando métricas de maduración…</span>
      </div>
    );
  }

  const {
    current_brix = 18.0, 
    current_ph = 3.1, 
    message = 'Monitor de maduración activo',
  } = harvestAnalysis;

  // Cálculo físico real: Alcohol Potencial
  const alcoholPotencial = (current_brix * 0.59).toFixed(1);
  
  // Ventana de cosecha (22 - 26 Bx estándar)
  const isOptimal = current_brix >= 22.0 && current_brix <= 26.0;
  const isEarly = current_brix < 22.0;

  return (
    <div className="bg-gradient-to-br from-purple-950/20 to-[#18211b] border border-purple-900/30 rounded-xl p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grape className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200">
              Estado de Maduración
            </h3>
          </div>
          {isOptimal ? (
             <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full uppercase font-bold tracking-wider">
               Ventana Óptima
             </span>
          ) : isEarly ? (
             <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full uppercase font-bold tracking-wider">
               En Envero
             </span>
          ) : (
             <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full uppercase font-bold tracking-wider">
               Sobre-maduración
             </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#121a14] border border-[#2a3a2c]/60 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
               <Beaker className="w-3 h-3" /> Grados Brix
            </span>
            <span className="text-2xl font-black text-white">{current_brix.toFixed(1)}°</span>
          </div>
          <div className="bg-[#121a14] border border-[#2a3a2c]/60 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
               <Wine className="w-3 h-3" /> Alcohol Potencial
            </span>
            <span className="text-2xl font-black text-purple-400">{alcoholPotencial}%</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2a3a2c]/60 pt-3">
        <div className="flex justify-between items-end">
           <div>
             <span className="text-[10px] font-bold uppercase text-slate-500 block">pH Actual</span>
             <span className="text-sm font-bold text-slate-300">{current_ph.toFixed(2)}</span>
           </div>
           <p className="text-[11px] text-slate-400 text-right max-w-[60%]">
             {message}
           </p>
        </div>
      </div>
    </div>
  );
}