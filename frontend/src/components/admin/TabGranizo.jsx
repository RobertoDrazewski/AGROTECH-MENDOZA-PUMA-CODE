import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { CloudRain, CheckCircle, Loader2, Satellite, ShieldAlert, AlertTriangle, Layers, Radio } from 'lucide-react';

// Severidad SMN -> estilo
const NIVEL_SMN = {
  CRITICO: 'text-rose-300 bg-rose-500/10 border-rose-500/40',
  ALTO: 'text-orange-300 bg-orange-500/10 border-orange-500/40',
  MEDIO: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
};

export default function TabGranizo() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [clima, setClima] = useState(null);
  const [smn, setSmn] = useState(null);
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
    // Capa local (clima.py) + capa oficial (SMN). Si una falla, la otra sigue.
    Promise.all([
      apiService.getClima(selected).catch(() => null),
      apiService.getGranizoSMN().catch(() => null),
    ])
      .then(([c, s]) => { setClima(c); setSmn(s); })
      .finally(() => setLoading(false));
  }, [selected]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>;
  }

  const eventosGranizo = (clima?.forecast || []).filter(d => (d.riesgos || []).some(r => r.tipo === 'GRANIZO'));
  const smnDisponible = smn?.disponible;
  const smnHayGranizo = smn?.hay_granizo;
  const smnAlertas = smn?.alertas || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Monitoreo de Granizo</h2>
          <p className="text-xs text-[#8a9787]">Alerta oficial del SMN cruzada con el pronóstico convectivo local.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* ===== CAPA OFICIAL: SMN ===== */}
      <div className={`rounded-2xl border p-6 ${
        smnHayGranizo ? 'bg-gradient-to-br from-rose-950/20 to-[#18211b] border-rose-500/40'
                      : 'bg-gradient-to-br from-indigo-950/20 to-[#18211b] border-indigo-500/20'}`}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Satellite className={smnHayGranizo ? 'text-rose-400' : 'text-indigo-400'} size={20} />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Alerta oficial · SMN</h3>
          {smnDisponible ? (
            <span className={`ml-auto text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
              smnHayGranizo ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-[#9bcc44]/15 text-[#9bcc44] border-[#9bcc44]/30'}`}>
              {smnHayGranizo ? 'Granizo en alerta' : 'Sin alerta de granizo'}
            </span>
          ) : (
            <span className="ml-auto text-[10px] font-bold uppercase px-3 py-1 rounded-full border bg-[#121a14] text-[#8a9787] border-[#2a3a2c]/60">
              SMN no disponible
            </span>
          )}
        </div>

        {smnHayGranizo ? (
          <div className="space-y-3">
            {smnAlertas.map((a, i) => (
              <div key={i} className={`rounded-xl border p-4 ${NIVEL_SMN[a.nivel] || NIVEL_SMN.MEDIO}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">{a.nivel} · {a.color}</span>
                </div>
                {a.titulo && <p className="text-sm font-bold text-white">{a.titulo}</p>}
                {a.descripcion && <p className="text-xs text-[#cdd8c8] mt-1 leading-relaxed">{a.descripcion}</p>}
              </div>
            ))}
          </div>
        ) : smnDisponible ? (
          <p className="text-sm text-[#8a9787]">El SMN no tiene alertas de granizo vigentes para Mendoza en este momento.</p>
        ) : (
          <p className="text-sm text-[#8a9787]">No se pudo consultar el SMN ahora. El pronóstico local de abajo sigue activo.</p>
        )}
      </div>

      {/* ===== CAPA LOCAL: pronóstico convectivo (clima.py) ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Radio className="text-[#9bcc44]" size={14} />
          <h3 className="text-xs font-black uppercase tracking-widest text-[#8a9787]">
            Pronóstico convectivo local · fuente {clima?.fuente || '—'}
          </h3>
        </div>

        {eventosGranizo.length === 0 ? (
          <div className="bg-[#18211b] border border-[#2a3a2c] rounded-2xl p-8 text-center">
            <CheckCircle size={32} className="mx-auto mb-2 text-[#9bcc44]" />
            <p className="text-[#5d6f5a] text-sm">Sin condiciones convectivas de granizo en los próximos días.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventosGranizo.map((d, i) => (
              <div key={i} className="bg-sky-950/20 border border-sky-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CloudRain className="text-sky-400" />
                  <h3 className="font-black uppercase text-white">Posible evento: {d.fecha}</h3>
                  <span className="ml-auto text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-full font-bold uppercase">
                    {d.temp_max}° · hum {d.humedad}% · lluvia {d.prob_lluvia}%
                  </span>
                </div>
                {(d.riesgos || []).filter(r => r.tipo === 'GRANIZO').map((r, j) => (
                  <p key={j} className="text-sm text-sky-100">{r.detalle}</p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nota de cruce de fuentes */}
      <p className="text-[11px] text-[#5d6f5a] bg-[#18211b] border border-[#2a3a2c]/40 rounded-xl p-4">
        <strong className="text-[#9bcc44]">Doble verificación:</strong> el SMN da la alerta oficial por zona;
        el pronóstico local estima la convección con humedad, temperatura y probabilidad de lluvia.
        Cuando ambas coinciden, la confianza es máxima. Decisión de defensa: cruzá siempre con el parte oficial vigente.
      </p>
    </div>
  );
}
