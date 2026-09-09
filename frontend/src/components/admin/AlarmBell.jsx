import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, ShieldAlert, Wind, CloudRain, History } from 'lucide-react';
import apiService from '../../services/api';

const ICONOS = { HELADA: ShieldAlert, ZONDA: Wind, GRANIZO: CloudRain };
const COLORES = {
  HELADA:  { text: 'text-rose-400',   bg: 'bg-rose-500/10',   ring: 'border-rose-500/30' },
  ZONDA:   { text: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'border-orange-500/30' },
  GRANIZO: { text: 'text-sky-400',    bg: 'bg-sky-500/10',    ring: 'border-sky-500/30' },
};

const POLL_MS = 20000;

/** Beep corto con Web Audio API (sin archivo de audio externo). */
function reproducirBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch (e) { /* Autoplay bloqueado o sin soporte: no rompe nada */ }
}

function formatearFecha(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

export default function AlarmBell() {
  const [activas, setActivas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [nuevas, setNuevas] = useState(0);
  const [open, setOpen] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const prevKeysRef = useRef(new Set());
  const primerScanRef = useRef(true);

  const escanear = async () => {
    try {
      const res = await apiService.escanearAlarmas();
      const act = Array.isArray(res?.activas) ? res.activas : [];
      setActivas(act);

      const keysActuales = new Set(act.map(a => `${a.vinedo_id}-${a.tipo}`));
      if (primerScanRef.current) {
        // Al cargar el panel por primera vez mostramos las que ya estaban
        // activas como pendientes de revisar, pero sin hacer sonar el pitido.
        primerScanRef.current = false;
        setNuevas(keysActuales.size);
      } else {
        const nuevasKeys = [...keysActuales].filter(k => !prevKeysRef.current.has(k));
        if (nuevasKeys.length > 0) {
          reproducirBeep();
          setNuevas(n => n + nuevasKeys.length);
        }
      }
      prevKeysRef.current = keysActuales;
    } catch (e) { /* si falla el scan, seguimos con lo último que había */ }
  };

  useEffect(() => {
    escanear();
    const iv = setInterval(escanear, POLL_MS);
    return () => clearInterval(iv);
  }, []);

  const abrirPanel = async () => {
    setOpen(true);
    setNuevas(0);
    setCargandoHistorial(true);
    try {
      const h = await apiService.getAlarmasHistorico(80);
      setHistorial(Array.isArray(h) ? h : []);
    } catch (e) {
      setHistorial([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  return (
    <>
      <button onClick={abrirPanel}
        className="relative p-2.5 rounded-xl bg-[#121a14] border border-[#2a3a2c] text-[#9fb09c] hover:text-white hover:border-[#9bcc44]/50 transition-all"
        title="Alarmas">
        <Bell size={18} className={activas.length > 0 ? 'animate-pulse text-amber-400' : ''} />
        {nuevas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center leading-none">
            {nuevas > 99 ? '99+' : nuevas}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 h-screen w-full max-w-sm bg-[#18211b] border-l border-[#2a3a2c]/60 z-50 flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#2a3a2c]/60 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Bell size={16} className="text-amber-400" /> Alarmas
              </h3>
              <button onClick={() => setOpen(false)} className="text-[#8a9787] hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#8a9787] mb-3">
                  Activas ahora ({activas.length})
                </h4>
                {activas.length === 0 ? (
                  <p className="text-xs text-[#5d6f5a] py-4 text-center border border-dashed border-[#2a3a2c] rounded-xl">
                    Sin alarmas activas en este momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activas.map((a, i) => {
                      const cfg = COLORES[a.tipo] || COLORES.HELADA;
                      const Icon = ICONOS[a.tipo] || ShieldAlert;
                      return (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.ring} ${cfg.bg}`}>
                          <Icon size={16} className={`${cfg.text} mt-0.5 shrink-0`} />
                          <div className="min-w-0">
                            <p className={`text-xs font-black uppercase ${cfg.text}`}>
                              {a.tipo} · {(a.vinedo_id || '').replace(/_/g, ' ')}
                            </p>
                            <p className="text-[11px] text-[#cdd8c8] mt-0.5">{a.mensaje}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#8a9787] mb-3 flex items-center gap-1.5">
                  <History size={13} /> Histórico
                </h4>
                {cargandoHistorial ? (
                  <p className="text-xs text-[#5d6f5a] py-4 text-center">Cargando…</p>
                ) : historial.length === 0 ? (
                  <p className="text-xs text-[#5d6f5a] py-4 text-center border border-dashed border-[#2a3a2c] rounded-xl">
                    Todavía no hay alarmas registradas.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {historial.map((a) => {
                      const cfg = COLORES[a.tipo] || COLORES.HELADA;
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#121a14] border border-[#2a3a2c]/40">
                          <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase ${cfg.text}`}>
                              {a.tipo} · {(a.vinedo_id || '').replace(/_/g, ' ')}
                            </p>
                            <p className="text-[10px] text-[#8a9787] truncate">{a.mensaje}</p>
                          </div>
                          <span className="text-[10px] text-[#5d6f5a] shrink-0 font-mono">{formatearFecha(a.creado_en)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
