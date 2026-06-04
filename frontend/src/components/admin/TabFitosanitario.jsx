import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { Bug, Cpu, Loader2, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';

const NIVEL = {
  ALTO: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  MEDIO: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  BAJO: 'text-[#9bcc44] bg-[#9bcc44]/10 border-[#9bcc44]/25',
};

export default function TabFitosanitario() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [modelo, setModelo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe); if (safe.length) setSelected(safe[0]);
    }).catch(() => setLoading(false));
    apiService.getModeloFito().then(setModelo).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    apiService.getFitosanitario(selected).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Sanidad vegetal · IA</h2>
          <p className="text-xs text-[#8a9787]">Trampas inteligentes + visión por computadora para detección de plagas.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Estado del modelo IA */}
      {modelo && (
        <div className="bg-gradient-to-br from-[#9bcc44]/10 to-[#18211b] border border-[#9bcc44]/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="text-[#9bcc44]" size={20} />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Modelo de visión · {modelo.arquitectura}</h3>
            <span className="ml-auto text-[10px] font-bold uppercase text-[#9bcc44] bg-[#9bcc44]/10 border border-[#9bcc44]/25 px-3 py-1 rounded-full">{modelo.fase}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: 'Precisión actual', v: `${Math.round(modelo.precision_actual * 100)}%` },
              { l: 'Objetivo', v: `${Math.round(modelo.precision_objetivo * 100)}%` },
              { l: 'Imágenes etiquetadas', v: modelo.imagenes_etiquetadas.toLocaleString() },
              { l: 'Meta de imágenes', v: modelo.imagenes_objetivo.toLocaleString() },
            ].map((x, i) => (
              <div key={i} className="bg-[#121a14]/60 rounded-xl p-3">
                <p className="text-[10px] uppercase text-[#5d6f5a] font-bold">{x.l}</p>
                <p className="text-lg font-black text-white mt-1">{x.v}</p>
              </div>
            ))}
          </div>
          <div className="w-full bg-[#2a3a2c] h-2 rounded-full overflow-hidden mt-4">
            <div className="bg-[#9bcc44] h-full transition-all duration-1000"
              style={{ width: `${(modelo.imagenes_etiquetadas / modelo.imagenes_objetivo) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Detecciones por cuartel */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : data && (
        <>
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${NIVEL[data.riesgo_global] || NIVEL.BAJO}`}>
            {data.riesgo_global === 'ALTO' ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
            <span className="text-sm font-black uppercase tracking-widest">Riesgo fitosanitario global: {data.riesgo_global}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {(data.detecciones || []).map((d, i) => (
              <div key={i} className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bug size={16} className="text-[#9bcc44]" />
                      <h4 className="text-sm font-black text-white italic">{d.especie}</h4>
                    </div>
                    <p className="text-[11px] text-[#8a9787] mt-0.5">{d.nombre_comun}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${NIVEL[d.nivel]}`}>{d.nivel}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{d.capturas_semana}</span>
                  <span className="text-xs text-[#5d6f5a]">capturas/sem · umbral {d.umbral_accion}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-[#5d6f5a] mb-1">
                    <span>Confianza IA</span><span className="text-[#9bcc44] font-bold">{Math.round(d.confianza_ia * 100)}%</span>
                  </div>
                  <div className="w-full bg-[#2a3a2c] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#9bcc44] h-full" style={{ width: `${d.confianza_ia * 100}%` }} />
                  </div>
                </div>
                <p className="text-[11px] text-[#cdd8c8] mt-3 leading-relaxed border-l-2 border-[#9bcc44]/40 pl-2">{d.recomendacion}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] text-[#5d6f5a] bg-[#18211b] border border-[#2a3a2c]/40 rounded-xl p-4">
        Cada trampa con cámara envía imágenes al gateway; el modelo de visión identifica y cuenta los
        insectos, y cruza los conteos con el umbral de acción de cada especie. Así se decide el tratamiento
        fitosanitario en el momento justo, reduciendo aplicaciones y costos.
      </p>
    </div>
  );
}
