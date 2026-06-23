import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { Bug, Cpu, Loader2, Layers, ShieldCheck, AlertTriangle, Camera, RefreshCw, Wifi } from 'lucide-react';

const NIVEL = {
  ALTO: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  MEDIO: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  BAJO: 'text-[#9bcc44] bg-[#9bcc44]/10 border-[#9bcc44]/25',
};

function TrampaFisicaCard({ trampa, onRefresh, onCapturar, capturando }) {
  const [imgError, setImgError] = useState(false);
  // Cache-bust doble: timestamp del backend + nonce del cliente.
  // El nonce cambia cada vez que cambia el timestamp (imagen nueva),
  // garantizando que el navegador NUNCA reuse una imagen cacheada.
  const imgUrl = `${apiService.urlImagenTrampa(trampa.trap_id)}?t=${trampa.timestamp}&n=${trampa._nonce || trampa.timestamp}`;
  const fecha = new Date(trampa.timestamp * 1000).toLocaleString('es-AR');

  // Si cambia la imagen (nuevo timestamp), resetear el estado de error
  useEffect(() => { setImgError(false); }, [trampa.timestamp]);

  return (
    <div className={`rounded-2xl border overflow-hidden bg-[#18211b] ${
      trampa.requiere_accion ? 'border-rose-500/40' : 'border-[#2a3a2c]/60'}`}>
      <div className="relative bg-[#0d130f] aspect-video flex items-center justify-center">
        {!imgError ? (
          <img key={imgUrl} src={imgUrl} alt={`Trampa ${trampa.trap_id}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover" />
        ) : (
          <div className="text-[#5d6f5a] flex flex-col items-center gap-2 text-xs">
            <Camera size={28} /> Sin imagen disponible
          </div>
        )}
        {trampa.requiere_accion && (
          <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest
            px-3 py-1 rounded-full bg-rose-500/90 text-white flex items-center gap-1.5 shadow-lg">
            <AlertTriangle size={12} /> Requiere tratamiento
          </span>
        )}
        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase text-[#9bcc44]
          bg-black/60 border border-[#9bcc44]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <Wifi size={11} /> {trampa.fuente || 'ESP32-CAM'}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-black text-white italic">{trampa.trap_id}</h4>
            <p className="text-[11px] text-[#8a9787] mt-0.5">
              {(trampa.cuartel || '—').replace(/_/g, ' ')} · captura #{trampa.seq}
            </p>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
            NIVEL[trampa.riesgo_global] || NIVEL.BAJO}`}>{trampa.riesgo_global}</span>
        </div>

        <div className="space-y-2">
          {(trampa.detecciones || []).map((d, i) => (
            <div key={i} className="flex items-center justify-between bg-[#121a14]/60 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bug size={13} className="text-[#9bcc44] shrink-0" />
                <span className="text-[11px] text-[#cdd8c8] italic truncate">{d.especie}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-black text-white leading-none">{d.capturas_semana}</span>
                <span className="text-[10px] text-[#5d6f5a]">/ {d.umbral_accion}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${NIVEL[d.nivel]}`}>
                  {d.nivel}
                </span>
              </div>
            </div>
          ))}
        </div>

        {trampa.motor_conteo && (
          <p className="text-[10px] text-[#5d6f5a] mt-2 italic">Motor de conteo: {trampa.motor_conteo}</p>
        )}

        <div className="flex items-center justify-between mt-3 gap-2">
          <p className="text-[10px] text-[#5d6f5a]">{fecha}</p>
          <div className="flex items-center gap-3">
            <button onClick={() => onRefresh(trampa.trap_id)}
              className="text-[10px] font-bold uppercase text-[#9bcc44] flex items-center gap-1
              hover:text-white transition-colors">
              <RefreshCw size={11} /> Actualizar
            </button>
            <button onClick={() => onCapturar(trampa.trap_id)} disabled={capturando}
              className="text-[10px] font-black uppercase text-black bg-[#9bcc44] px-3 py-1.5 rounded-lg
              flex items-center gap-1.5 hover:bg-[#b3e052] transition-colors disabled:opacity-50">
              {capturando ? <Loader2 size={11} className="animate-spin" /> : <Camera size={12} />}
              {capturando ? 'Capturando…' : 'Capturar ahora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TabFitosanitario() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [modelo, setModelo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trampas, setTrampas] = useState([]);
  const [capturandoId, setCapturandoId] = useState(null);

  // Agrega un nonce único a cada trampa para forzar recarga de imagen
  const conNonce = (lista) =>
    (Array.isArray(lista) ? lista : []).map(t => ({ ...t, _nonce: Date.now() }));

  const cargarTrampas = () => {
    apiService.getTrampasFisicas()
      .then(t => setTrampas(conNonce(t)))
      .catch(() => {});
  };

  const refrescarUna = (trapId) => {
    apiService.getTrampaFisica(trapId)
      .then(t => setTrampas(prev => prev.map(x =>
        x.trap_id === trapId ? { ...t, _nonce: Date.now() } : x)))
      .catch(() => {});
  };

  // Pide captura al nodo y espera la nueva imagen
  const capturarAhora = (trapId) => {
    setCapturandoId(trapId);
    const tsPrevio = trampas.find(x => x.trap_id === trapId)?.timestamp || 0;
    apiService.solicitarCaptura(trapId).catch(() => {});
    let intentos = 0;
    const iv = setInterval(async () => {
      intentos++;
      try {
        const t = await apiService.getTrampaFisica(trapId);
        if (t && t.timestamp !== tsPrevio) {
          setTrampas(prev => prev.map(x =>
            x.trap_id === trapId ? { ...t, _nonce: Date.now() } : x));
          clearInterval(iv);
          setCapturandoId(null);
          return;
        }
      } catch (_) {}
      if (intentos >= 20) {  // ~60s de espera máxima
        clearInterval(iv);
        setCapturandoId(null);
      }
    }, 3000);
  };

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe); if (safe.length) setSelected(safe[0]);
    }).catch(() => setLoading(false));
    apiService.getModeloFito().then(setModelo).catch(() => {});
    cargarTrampas();
    const id = setInterval(cargarTrampas, 30000);
    return () => clearInterval(id);
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

      {/* ====== TRAMPAS FÍSICAS (nodos ESP32-CAM) ====== */}
      {trampas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Camera className="text-[#9bcc44]" size={16} />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              Trampas físicas en campo · {trampas.length} {trampas.length === 1 ? 'nodo' : 'nodos'}
            </h3>
            <button onClick={cargarTrampas}
              className="ml-auto text-[10px] font-bold uppercase text-[#9bcc44] flex items-center gap-1 hover:text-white transition-colors">
              <RefreshCw size={11} /> Refrescar red
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trampas.map((t) => (
              <TrampaFisicaCard key={t.trap_id} trampa={t} onRefresh={refrescarUna}
                onCapturar={capturarAhora} capturando={capturandoId === t.trap_id} />
            ))}
          </div>
        </div>
      )}

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

      {/* Detecciones por cuartel (simuladas) */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
      ) : data && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="text-[#5d6f5a]" size={14} />
            <h3 className="text-xs font-black uppercase tracking-widest text-[#8a9787]">
              Monitoreo simulado · {selected.replace(/_/g, ' ')}
            </h3>
          </div>
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
                {typeof d.confianza_ia === 'number' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-[#5d6f5a] mb-1">
                      <span>Confianza IA</span><span className="text-[#9bcc44] font-bold">{Math.round(d.confianza_ia * 100)}%</span>
                    </div>
                    <div className="w-full bg-[#2a3a2c] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#9bcc44] h-full" style={{ width: `${d.confianza_ia * 100}%` }} />
                    </div>
                  </div>
                )}
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
