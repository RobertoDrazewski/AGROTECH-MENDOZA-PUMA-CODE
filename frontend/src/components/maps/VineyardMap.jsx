import React from 'react';
import { ShieldAlert, CheckCircle2, Waves } from 'lucide-react';

export default function VineyardMap({ vinedos, selectedVinedo, setSelectedVinedo, currentTemp }) {
  const getStatus = (id) => {
    if (id === selectedVinedo && Number(currentTemp) < 2) {
      return { color: 'fill-red-500/20 stroke-red-500', textColor: 'text-red-400',
        label: 'Crítico (Helada)', icon: <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> };
    }
    if (id.includes('Malbec_1')) {
      return { color: 'fill-[#9bcc44]/20 stroke-[#9bcc44]', textColor: 'text-[#9bcc44]',
        label: 'Óptimo', icon: <CheckCircle2 className="w-4 h-4 text-[#9bcc44]" /> };
    }
    return { color: 'fill-sky-500/10 stroke-sky-500/50', textColor: 'text-sky-400',
      label: 'Monitoreando', icon: <Waves className="w-4 h-4 text-sky-400" /> };
  };

  const polys = [
    { id: 'Cuartel_Malbec_1', pts: '20,20 180,20 160,90 20,90', tx: 50, ty: 60, label: 'Malbec 1' },
    { id: 'Cuartel_Cabernet_2', pts: '195,20 380,20 380,90 175,90', tx: 240, ty: 60, label: 'Cabernet 2' },
    { id: 'Cuartel_Chardonnay_3', pts: '20,105 155,105 135,180 20,180', tx: 40, ty: 150, label: 'Chardonnay 3' },
    { id: 'Cuartel_Syrah_4', pts: '170,105 380,105 380,180 150,180', tx: 240, ty: 150, label: 'Syrah 4' },
  ];

  return (
    <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-5 shadow-xl h-full flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-wider text-[#9fb09c] uppercase">Distribución del viñedo</h3>
        <p className="text-xs text-[#5d6f5a]">Mapa de cuarteles y estado de alertas IoT</p>
      </div>

      <div className="relative bg-[#0e1512] rounded-lg p-4 border border-[#2a3a2c] flex items-center justify-center min-h-[220px]">
        <svg viewBox="0 0 400 200" className="w-full h-auto max-w-sm">
          {polys.map(p => {
            const sel = selectedVinedo === p.id;
            const st = getStatus(p.id);
            return (
              <g key={p.id} className="cursor-pointer transition-all"
                onClick={() => vinedos.includes(p.id) && setSelectedVinedo(p.id)}>
                <polygon points={p.pts}
                  className={`transition-colors duration-200 stroke-2 ${sel ? 'fill-[#9bcc44]/40 stroke-[#9bcc44]' : st.color}`} />
                <text x={p.tx} y={p.ty} className="fill-[#9fb09c] font-bold text-[10px] pointer-events-none uppercase tracking-wider">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-2 right-2 bg-[#18211b]/90 border border-[#2a3a2c] px-2.5 py-1 rounded-md text-[10px] font-mono text-[#9fb09c]">
          Foco: <span className="text-[#9bcc44] font-bold">{(selectedVinedo || '').replace('Cuartel_', '')}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#2a3a2c]/60 grid grid-cols-2 gap-2 text-[11px]">
        {vinedos.map((id) => {
          const st = getStatus(id);
          const sel = id === selectedVinedo;
          return (
            <div key={id} onClick={() => setSelectedVinedo(id)}
              className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${sel ? 'bg-[#9bcc44]/10 border-[#9bcc44]/50' : 'bg-[#0e1512]/40 border-transparent hover:border-[#2a3a2c]'}`}>
              {st.icon}
              <div className="truncate">
                <span className={`block font-semibold ${sel ? 'text-white' : 'text-[#cdd8c8]'}`}>
                  {id.replace('Cuartel_', '').replace('_', ' ')}
                </span>
                <span className="text-[9px] text-[#5d6f5a] block -mt-0.5">{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
