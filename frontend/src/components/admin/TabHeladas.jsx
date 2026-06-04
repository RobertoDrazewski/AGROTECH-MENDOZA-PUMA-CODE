import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { CloudSnow, Sun, CloudRain, Wind, Loader2, AlertTriangle, Layers } from 'lucide-react';

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
    Promise.all([apiService.getClima(selected), apiService.getPrediccionHelada(selected)])
      .then(([c, h]) => { setClima(c); setHelada(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Clima & Heladas</h2>
          <p className="text-xs text-[#8a9787]">Pronóstico a 5 días y riesgos agroclimáticos por cuartel.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Predicción de helada (IA) */}
      {helada && (
        <div className={`rounded-2xl border p-6 ${helada.risk_level === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/40 animate-glow-critical' : helada.risk_level === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#18211b] border-[#2a3a2c]/60'}`}>
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className={helada.risk_level === 'CRITICAL' ? 'text-rose-400' : helada.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-[#9bcc44]'} size={22} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Predicción de helada · IA</h3>
            <span className="ml-auto text-xs font-black uppercase px-3 py-1 rounded-full border border-white/10">{helada.risk_level}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { l: 'Temp. actual', v: `${helada.current_temp ?? '--'}°C` },
              { l: 'Punto de rocío', v: `${helada.dew_point ?? '--'}°C` },
              { l: 'Enfriamiento', v: `${helada.cooling_rate_c_per_hour ?? 0}°C/h` },
              { l: 'Probabilidad', v: `${Math.round((helada.probability ?? 0) * 100)}%` },
            ].map((x, i) => (
              <div key={i} className="bg-[#121a14]/60 rounded-xl p-3">
                <p className="text-[10px] uppercase text-[#5d6f5a] font-bold">{x.l}</p>
                <p className="text-xl font-black text-white mt-1">{x.v}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#cdd8c8] italic mt-4">"{helada.message}"</p>
        </div>
      )}

      {/* Pronóstico 5 días */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : clima && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#5d6f5a] font-bold mb-3">
            Pronóstico 5 días · fuente: {clima.fuente}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {(clima.forecast || []).map((d, i) => (
              <div key={i} className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-4">
                <p className="text-xs font-black uppercase text-white">{d.fecha}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-white">{d.temp_max}°</span>
                  <span className="text-sm text-[#8a9787]">{d.temp_min}°</span>
                </div>
                <div className="text-[11px] text-[#8a9787] mt-2 space-y-0.5">
                  <p>💧 {d.humedad}% · 🌧 {d.prob_lluvia}%</p>
                  <p>💨 {d.viento_kmh} km/h</p>
                </div>
                <div className="mt-3 space-y-1.5">
                  {(d.riesgos || []).length === 0 ? (
                    <span className="text-[10px] text-[#9bcc44] font-bold uppercase">Sin riesgos</span>
                  ) : d.riesgos.map((r, j) => {
                    const st = RIESGO_STYLE[r.tipo] || RIESGO_STYLE.HELADA;
                    const Icon = st.icon;
                    return (
                      <div key={j} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${st.c}`}>
                        <Icon size={12} /> {r.tipo.replace(/_/g, ' ')}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
