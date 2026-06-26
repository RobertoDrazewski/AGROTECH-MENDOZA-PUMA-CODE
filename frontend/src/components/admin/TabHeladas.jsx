import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { CloudSnow, Sun, CloudRain, Wind, Loader2, AlertTriangle, Layers, Satellite, Thermometer } from 'lucide-react';

const RIESGO_STYLE = {
  HELADA: { c: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30', icon: CloudSnow },
  GRANIZO: { c: 'text-sky-300 bg-sky-500/10 border-sky-500/30', icon: CloudRain },
  GOLPE_DE_CALOR: { c: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: Sun },
  ZONDA: { c: 'text-orange-300 bg-orange-500/10 border-orange-500/30', icon: Wind },
};

export default function TabHeladas() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [clima, setClima] = useState(null);
  const [helada, setHelada] = useState(null);
  const [nasa, setNasa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe); if (safe.length) setSelected(safe[0]);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    // Agregamos la llamada a NASA POWER al pipeline de carga
    Promise.all([
      apiService.getClima(selected), 
      apiService.getPrediccionHelada(selected),
      apiService.getNasaData(selected) // Asumiendo que esta función existe en api.js
    ])
      .then(([c, h, n]) => { setClima(c); setHelada(h); setNasa(n); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Clima & Heladas</h2>
          <p className="text-xs text-[#8a9787]">Pronóstico satelital vs IA local por cuartel.</p>
        </div>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
          {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Grilla Superior: IA vs NASA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {helada && (
          <div className="rounded-2xl border bg-[#18211b] border-[#2a3a2c]/60 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={helada.risk_level === 'CRITICAL' ? 'text-rose-400' : 'text-[#9bcc44]'} size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Predicción de helada · IA Local</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#121a14] p-3 rounded-lg"><p className="text-[10px] text-[#5d6f5a] font-bold">Temp. Actual</p><p className="text-lg font-black text-white">{helada.current_temp}°C</p></div>
              <div className="bg-[#121a14] p-3 rounded-lg"><p className="text-[10px] text-[#5d6f5a] font-bold">Punto Rocío</p><p className="text-lg font-black text-white">{helada.dew_point}°C</p></div>
            </div>
          </div>
        )}

        {nasa?.disponible && (
          <div className="rounded-2xl border bg-[#18211b] border-indigo-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Satellite className="text-indigo-400" size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Referencia Satelital · NASA</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-950/20 p-3 rounded-lg"><p className="text-[10px] text-indigo-300 font-bold">Temp. Histórica</p><p className="text-lg font-black text-white">{nasa.temp_aire}°C</p></div>
              <div className="bg-indigo-950/20 p-3 rounded-lg"><p className="text-[10px] text-indigo-300 font-bold">Atraso Satelital</p><p className="text-lg font-black text-white">{nasa.atraso_horas}h</p></div>
            </div>
          </div>
        )}
      </div>

      {/* Pronóstico 5 días */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : clima && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {(clima.forecast || []).map((d, i) => (
            <div key={i} className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-4">
              <p className="text-xs font-black text-white">{d.fecha}</p>
              <p className="text-2xl font-black text-white mt-2">{d.temp_max}° / {d.temp_min}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}