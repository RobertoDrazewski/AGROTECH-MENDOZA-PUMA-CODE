import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { CloudRain, CheckCircle, Loader2, Layers, Radio, Thermometer, Droplet } from 'lucide-react';

export default function TabGranizo() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [clima, setClima] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe);
      if (safe.length) setSelected(safe[0]);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    apiService.getClima(selected)
      .then(data => setClima(data))
      .catch(err => console.error("Error al cargar clima:", err))
      .finally(() => setLoading(false));
  }, [selected]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>;
  }

  const eventosGranizo = (clima?.forecast || []).filter(d => (d.riesgos || []).some(r => r.tipo === 'GRANIZO'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Monitoreo de Granizo</h2>
          <p className="text-xs text-[#8a9787]">Pronóstico convectivo a partir de humedad, temperatura y probabilidad de lluvia.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <Radio className="text-[#9bcc44]" size={14} />
        <h3 className="text-xs font-black uppercase tracking-widest text-[#8a9787]">
          Pronóstico convectivo · fuente {clima?.fuente || '—'}
        </h3>
      </div>

      {eventosGranizo.length === 0 ? (
        <div className="bg-[#18211b] border border-[#2a3a2c] rounded-2xl p-8 text-center">
          <CheckCircle size={32} className="mx-auto mb-2 text-[#9bcc44]" />
          <p className="text-[#5d6f5a] text-sm">No se detectan condiciones convectivas de granizo para los próximos días.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventosGranizo.map((d, i) => (
            <div key={i} className="bg-sky-950/20 border border-sky-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <CloudRain className="text-sky-400" />
                <h3 className="font-black uppercase text-white">Posible evento: {d.fecha}</h3>
                <span className="ml-auto text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-full font-bold uppercase flex items-center gap-2">
                  <Thermometer size={11} /> {d.temp_max}° · <Droplet size={11} /> {d.humedad}% · {d.prob_lluvia}% lluvia
                </span>
              </div>
              {(d.riesgos || []).filter(r => r.tipo === 'GRANIZO').map((r, j) => (
                <p key={j} className="text-sm text-sky-100">{r.detalle}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[#5d6f5a] bg-[#18211b] border border-[#2a3a2c]/40 rounded-xl p-4">
        El pronóstico estima la convección con humedad, temperatura y probabilidad de lluvia.
        Para decisiones de defensa antigranizo, cruzá siempre con el parte oficial vigente del SMN.
      </p>
    </div>
  );
}
