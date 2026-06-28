import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import {
  Wind, Droplet, TrendingUp, TrendingDown, Layers, Loader2,
  Satellite, ShieldAlert, Radio, Gauge
} from 'lucide-react';

const NIVEL_SMN = {
  CRITICO: 'text-rose-300 bg-rose-500/10 border-rose-500/40',
  ALTO: 'text-orange-300 bg-orange-500/10 border-orange-500/40',
  MEDIO: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
};

export default function TabZonda() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [zonda, setZonda] = useState(null);   // detector local (sensores)
  const [smn, setSmn] = useState(null);       // alerta oficial SMN
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
    Promise.all([
      apiService.getPrediccionZonda(selected).catch(() => null),
      apiService.getZondaSMN().catch(() => null),
    ])
      .then(([z, s]) => { setZonda(z); setSmn(s); })
      .finally(() => setLoading(false));
  }, [selected]);

  const fmt = (v) => (v === null || v === undefined || isNaN(v)) ? '--' : Number(v).toFixed(1);

  const critico = zonda?.risk_level === 'CRITICAL';
  const medio = zonda?.risk_level === 'MEDIUM';
  const localColor = critico ? 'orange-400' : medio ? 'amber-400' : 'orange-300';

  const smnDisponible = smn?.disponible;
  const smnHayZonda = smn?.hay_zonda;
  const smnAlertas = smn?.alertas || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Detector de Zonda</h2>
          <p className="text-xs text-[#8a9787]">Firma termodinámica en vivo (sensores) cruzada con la alerta oficial del SMN.</p>
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
        <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-orange-400" /></div>
      ) : (
        <>
          {/* ===== CAPA OFICIAL: SMN ===== */}
          <div className={`rounded-2xl border p-6 ${
            smnHayZonda ? 'bg-gradient-to-br from-orange-950/20 to-[#18211b] border-orange-500/40'
                        : 'bg-gradient-to-br from-indigo-950/20 to-[#18211b] border-indigo-500/20'}`}>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Satellite className={smnHayZonda ? 'text-orange-400' : 'text-indigo-400'} size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Alerta oficial · SMN</h3>
              {smnDisponible ? (
                <span className={`ml-auto text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  smnHayZonda ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                              : 'bg-[#9bcc44]/15 text-[#9bcc44] border-[#9bcc44]/30'}`}>
                  {smnHayZonda ? 'Zonda en alerta' : 'Sin alerta de Zonda'}
                </span>
              ) : (
                <span className="ml-auto text-[10px] font-bold uppercase px-3 py-1 rounded-full border bg-[#121a14] text-[#8a9787] border-[#2a3a2c]/60">
                  SMN no disponible
                </span>
              )}
            </div>

            {smnHayZonda ? (
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
              <p className="text-sm text-[#8a9787]">El SMN no tiene alertas de Zonda vigentes para Mendoza en este momento.</p>
            ) : (
              <p className="text-sm text-[#8a9787]">No se pudo consultar el SMN ahora. El detector local de abajo sigue activo.</p>
            )}
          </div>

          {/* ===== CAPA LOCAL: detector por sensores ===== */}
          {zonda && (
            <div className={`rounded-2xl border p-6 ${critico ? 'border-orange-500/40 bg-orange-500/5' : 'border-[#2a3a2c]/60 bg-[#18211b]'}`}>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <Radio className="text-[#9bcc44]" size={16} />
                <Wind className={critico ? 'text-orange-400 animate-pulse' : 'text-orange-300'} />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Detección local · Riesgo {zonda.risk_level}</h3>
                <span className="ml-auto text-[10px] font-black bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full border border-orange-500/30">
                  PROB. {((zonda.probability || 0) * 100).toFixed(0)}%
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#121a14] p-4 rounded-xl border border-[#2a3a2c]/60 text-center">
                  <TrendingUp className="w-4 h-4 text-orange-400 mx-auto mb-2" />
                  <span className="text-[10px] text-[#8a9787] block uppercase">Tasa Temp</span>
                  <span className="text-xl font-black text-white">+{fmt(zonda.temp_rate_c_per_hour)}°/h</span>
                </div>
                <div className="bg-[#121a14] p-4 rounded-xl border border-[#2a3a2c]/60 text-center">
                  <TrendingDown className="w-4 h-4 text-orange-400 mx-auto mb-2" />
                  <span className="text-[10px] text-[#8a9787] block uppercase">Tasa Hum</span>
                  <span className="text-xl font-black text-white">{fmt(zonda.hum_rate_porc_per_hour)}%/h</span>
                </div>
                <div className="bg-[#121a14] p-4 rounded-xl border border-[#2a3a2c]/60 text-center">
                  <Droplet className="w-4 h-4 text-orange-400 mx-auto mb-2" />
                  <span className="text-[10px] text-[#8a9787] block uppercase">Humedad</span>
                  <span className="text-xl font-black text-white">{fmt(zonda.current_hum)}%</span>
                </div>
                <div className="bg-[#121a14] p-4 rounded-xl border border-[#2a3a2c]/60 text-center">
                  <Gauge className="w-4 h-4 text-orange-400 mx-auto mb-2" />
                  <span className="text-[10px] text-[#8a9787] block uppercase">Presión</span>
                  <span className="text-xl font-black text-white">{fmt(zonda.current_press)}</span>
                </div>
              </div>

              <p className="mt-6 text-sm text-[#cdd8c8] italic bg-black/20 p-4 rounded-xl border border-[#2a3a2c]/40">
                "{zonda.message}"
              </p>
            </div>
          )}

          {/* Nota de cruce */}
          <p className="text-[11px] text-[#5d6f5a] bg-[#18211b] border border-[#2a3a2c]/40 rounded-xl p-4">
            <strong className="text-[#9bcc44]">Dos capas:</strong> el SMN da la alerta oficial por zona (anticipación);
            el detector local lee la firma del Zonda en tu punto exacto y en vivo (humedad que se desploma, temperatura
            que sube). Nota: la presión del nodo es referencial hasta reemplazar el sensor BMP280.
          </p>
        </>
      )}
    </div>
  );
}
