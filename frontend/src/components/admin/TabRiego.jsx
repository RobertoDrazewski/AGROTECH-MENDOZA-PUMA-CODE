import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/api';
import { Droplets, Power, PowerOff, Cpu, Loader2, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TabRiego() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe); if (safe.length) setSelected(safe[0]);
    }).catch(() => setLoading(false));
  }, []);

  const refresh = useCallback(() => {
    if (!selected) return;
    apiService.getRiego(selected).then(setEstado).catch(() => {}).finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => {
    setLoading(true); refresh();
    const iv = setInterval(refresh, 4000);
    return () => clearInterval(iv);
  }, [selected, refresh]);

  const comando = async (accion) => {
    setSending(true);
    try { await apiService.comandoRiego(selected, accion); refresh(); }
    finally { setSending(false); }
  };

  const recomiendaRegar = estado?.recomendacion?.includes('SE RECOMIENDA REGAR');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Riego inteligente</h2>
          <p className="text-xs text-[#8a9787]">Decisión automática según humedad de suelo + control manual de electroválvula.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : estado && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Humedad de suelo */}
          <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-6">
            <p className="text-[10px] uppercase tracking-widest text-[#5d6f5a] font-bold mb-2">Humedad de suelo</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white">{estado.humedad_suelo ?? '--'}</span>
              <span className="text-xl text-[#8a9787] mb-1">%</span>
            </div>
            <div className="w-full bg-[#2a3a2c] h-2 rounded-full overflow-hidden mt-4">
              <div className="bg-blue-400 h-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, estado.humedad_suelo || 0))}%` }} />
            </div>
            <p className="text-[11px] text-[#5d6f5a] mt-2">Umbral de riego: 20%</p>
          </div>

          {/* Recomendación IA */}
          <div className={`rounded-2xl p-6 border ${recomiendaRegar ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#9bcc44]/8 border-[#9bcc44]/25'}`}>
            <p className="text-[10px] uppercase tracking-widest text-[#5d6f5a] font-bold mb-2">Recomendación</p>
            <div className="flex items-center gap-2 mb-2">
              {recomiendaRegar ? <AlertCircle className="text-amber-400" size={22} /> : <CheckCircle2 className="text-[#9bcc44]" size={22} />}
              <span className={`text-sm font-black uppercase ${recomiendaRegar ? 'text-amber-300' : 'text-[#9bcc44]'}`}>
                {recomiendaRegar ? 'Regar' : 'No regar'}
              </span>
            </div>
            <p className="text-xs text-[#cdd8c8] leading-relaxed">{estado.recomendacion}</p>
          </div>

          {/* Estado de válvula */}
          <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-6 flex flex-col">
            <p className="text-[10px] uppercase tracking-widest text-[#5d6f5a] font-bold mb-2">Electroválvula</p>
            <div className="flex items-center gap-2 mb-1">
              <Droplets className={estado.valvula_abierta ? 'text-blue-400' : 'text-[#5d6f5a]'} size={22} />
              <span className={`text-lg font-black uppercase ${estado.valvula_abierta ? 'text-blue-400' : 'text-[#8a9787]'}`}>
                {estado.valvula_abierta ? 'Abierta' : 'Cerrada'}
              </span>
            </div>
            <p className="text-[11px] text-[#5d6f5a] mb-4">
              Modo: <span className="text-[#9bcc44] font-bold uppercase">{estado.modo}</span>
            </p>
            <div className="mt-auto grid grid-cols-3 gap-2">
              <button disabled={sending} onClick={() => comando('abrir')}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase hover:bg-blue-500/20 transition-all disabled:opacity-50">
                <Power size={16} /> Abrir
              </button>
              <button disabled={sending} onClick={() => comando('cerrar')}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase hover:bg-rose-500/20 transition-all disabled:opacity-50">
                <PowerOff size={16} /> Cerrar
              </button>
              <button disabled={sending} onClick={() => comando('auto')}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#9bcc44]/10 border border-[#9bcc44]/30 text-[#9bcc44] text-[10px] font-black uppercase hover:bg-[#9bcc44]/20 transition-all disabled:opacity-50">
                <Cpu size={16} /> Auto
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#5d6f5a] bg-[#18211b] border border-[#2a3a2c]/40 rounded-xl p-4">
        En modo <strong className="text-[#9bcc44]">Auto</strong>, la plataforma abre o cierra el riego según la humedad real.
        Con hardware conectado, los comandos viajan por <strong className="text-[#9bcc44]">downlink LoRaWAN</strong> al actuador de la electroválvula en campo.
      </p>
    </div>
  );
}
