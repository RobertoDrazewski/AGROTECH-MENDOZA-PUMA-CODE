import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { nombreCuartel } from '../../utils/nombreCuartel';
import { Beaker, Layers, CheckCircle2, Loader2 } from 'lucide-react';

export default function BrixManualForm() {
  const [vinedos, setVinedos] = useState([]);
  const [cuartel, setCuartel] = useState('');
  const [brix, setBrix] = useState('');
  const [ph, setPh] = useState('');
  const [fecha, setFecha] = useState('');
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe);
      if (safe.length) setCuartel(safe[0]);
    }).catch(() => {});
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setError(''); setOk(false);
    if (!cuartel || brix === '') { setError('Elegí un cuartel y cargá el valor de Brix.'); return; }
    setEnviando(true);
    try {
      await apiService.registrarBrixManual(cuartel, {
        brix: parseFloat(brix),
        ph: ph !== '' ? parseFloat(ph) : null,
        fecha: fecha || null,
        observacion: obs || null,
      });
      setOk(true);
      setBrix(''); setPh(''); setObs('');
      setTimeout(() => setOk(false), 3500);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo guardar la lectura.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-5 h-full flex flex-col">
      <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-1">
        <Beaker className="w-4 h-4 text-fuchsia-400" /> Carga manual de Brix
      </h3>
      <p className="text-xs text-[#8a9787] mb-4">
        Lectura tomada a mano por el ingeniero agrónomo (refractómetro de campo), por cuartel.
      </p>

      {error && <div className="mb-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl">{error}</div>}
      {ok && (
        <div className="mb-3 bg-[#9bcc44]/10 border border-[#9bcc44]/30 text-[#9bcc44] text-xs p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={14} /> Lectura guardada. El KPI de maduración del cuartel se actualiza solo.
        </div>
      )}

      <form onSubmit={enviar} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select value={cuartel} onChange={(e) => setCuartel(e.target.value)}
            className="w-full bg-[#121a14] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{nombreCuartel(v)}</option>)}
          </select>
        </div>
        <input type="number" step="0.1" value={brix} onChange={(e) => setBrix(e.target.value)} required
          placeholder="Brix (°)"
          className="bg-[#121a14] border-2 border-transparent p-3 rounded-xl outline-none focus:border-[#9bcc44] text-white text-sm placeholder-[#5d6f5a]" />
        <input type="number" step="0.01" value={ph} onChange={(e) => setPh(e.target.value)}
          placeholder="pH (opcional)"
          className="bg-[#121a14] border-2 border-transparent p-3 rounded-xl outline-none focus:border-[#9bcc44] text-white text-sm placeholder-[#5d6f5a]" />
        <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)}
          className="col-span-2 bg-[#121a14] border-2 border-transparent p-3 rounded-xl outline-none focus:border-[#9bcc44] text-white text-sm placeholder-[#5d6f5a]" />
        <input type="text" value={obs} onChange={(e) => setObs(e.target.value)}
          placeholder="Observación (opcional)"
          className="col-span-2 bg-[#121a14] border-2 border-transparent p-3 rounded-xl outline-none focus:border-[#9bcc44] text-white text-sm placeholder-[#5d6f5a]" />
        <button type="submit" disabled={enviando}
          className="col-span-2 bg-[#9bcc44] text-[#0e1512] py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-60">
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <Beaker size={15} />} Guardar lectura
        </button>
      </form>
    </div>
  );
}
