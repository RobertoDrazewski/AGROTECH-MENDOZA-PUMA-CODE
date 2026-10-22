import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { nombreCuartel } from '../../utils/nombreCuartel';
import GaugeCard, { calcPercent } from './GaugeCard';
import ContingenciaMapa from '../maps/ContingenciaMapa';
import { COLOR_CATEGORIA } from '../../utils/climaIcons';
import {
  CloudSnow, Sun, CloudRain, CloudDrizzle, Wind, Loader2, AlertTriangle, Layers, Satellite,
  Thermometer, Droplet, TrendingUp, TrendingDown, Sunrise, ShieldAlert, CheckCircle, CheckCircle2,
  Snowflake, Radio, Gauge, CloudSun, ChevronDown,
} from 'lucide-react';

const RIESGO_STYLE = {
  HELADA: { c: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30', icon: CloudSnow },
  GRANIZO: { c: 'text-sky-300 bg-sky-500/10 border-sky-500/30', icon: CloudRain },
  GOLPE_DE_CALOR: { c: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: Sun },
  ZONDA: { c: 'text-orange-300 bg-orange-500/10 border-orange-500/30', icon: Wind },
};

const fmt = (v, d = 1) => (v === null || v === undefined || isNaN(v)) ? '--' : Number(v).toFixed(d);

// Una sola herramienta "Control Climático" con las 4 contingencias como
// secciones que se despliegan en el lugar (acordeón), en vez de pestañas
// que esconden todo lo demás. Cada una comparte el mismo tipo de mapa
// (ContingenciaMapa) con su propio color y su propia lista de alertas —
// ya no hay un cajón único de "alertas" mezclando todo.
const HERRAMIENTAS = [
  { id: 'HELADA', label: 'Heladas', desc: 'Predicción por enfriamiento radiativo + satélite', icon: CloudSnow },
  { id: 'ZONDA', label: 'Viento Zonda', desc: 'Detección local por firma termodinámica + dirección real', icon: Wind },
  { id: 'GRANIZO', label: 'Granizo', desc: 'Radar DACC/RainViewer + parte oficial del SMN', icon: CloudRain },
  { id: 'LLUVIA', label: 'Lluvia / Tormenta', desc: 'Radar DACC/RainViewer + parte oficial del SMN', icon: CloudDrizzle },
];

export default function TabControlClimatico() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [abierta, setAbierta] = useState('HELADA');

  // Estado compartido entre las 4 sub-herramientas, para no repetir el
  // mismo fetch 4 veces.
  const [clima, setClima] = useState(null);
  const [helada, setHelada] = useState(null);
  const [nasa, setNasa] = useState(null);
  const [zonda, setZonda] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cuarteles + alertas oficiales del SMN: un solo fetch para el mapa de
  // las 4 secciones (antes cada una traía esto por su cuenta).
  const [cuarteles, setCuarteles] = useState([]);
  const [alertasSmn, setAlertasSmn] = useState([]);
  const [smnOk, setSmnOk] = useState(true);
  const [smnMensaje, setSmnMensaje] = useState('');

  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe);
      if (safe.length) setSelected(safe[0]);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      apiService.getClima(selected),
      apiService.getPrediccionHelada(selected),
      apiService.getNasaData(selected),
      apiService.getPrediccionZonda(selected),
    ])
      .then(([c, h, n, z]) => { setClima(c); setHelada(h); setNasa(n); setZonda(z); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => {
    const cargar = () => Promise.all([apiService.getCuarteles(), apiService.getAlertasSmn()])
      .then(([cu, al]) => {
        setCuarteles(Array.isArray(cu) ? cu.filter((c) => c.lat && c.lon) : []);
        setAlertasSmn(Array.isArray(al?.alertas) ? al.alertas : []);
        setSmnOk(al?.smn_ok !== false);
        setSmnMensaje(al?.smn_mensaje || '');
      }).catch(() => { setSmnOk(false); setSmnMensaje('No se pudo contactar al backend.'); });
    cargar();
    // El backend ya cachea 10 min (no pega más seguido al SMN aunque le
    // preguntemos más seguido). Antes el front sondeaba cada 10 min, muy
    // por detrás de los 20s de la campanita — eso generaba el caso de
    // "la campana muestra una alerta que acá todavía no aparece". 60s es
    // un buen equilibrio sin generar tráfico extra real.
    const iv = setInterval(cargar, 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const eventosGranizo = (clima?.forecast || []).filter(d => (d.riesgos || []).some(r => r.tipo === 'GRANIZO'));
  const diasLluvia = (clima?.forecast || []).filter(d => d.prob_lluvia >= 50);
  const alertasDe = (cat) => alertasSmn.filter((a) => a.categoria === cat);

  const activoHelada = helada?.risk_level === 'CRITICAL' || helada?.risk_level === 'MEDIUM';
  const activoZonda = zonda?.risk_level === 'CRITICAL' || zonda?.risk_level === 'MEDIUM';
  const activoGranizo = eventosGranizo.length > 0 || alertasDe('GRANIZO').length > 0;
  const activoLluvia = diasLluvia.length > 0 || alertasDe('LLUVIA').length > 0;
  const ESTADOS = { HELADA: activoHelada, ZONDA: activoZonda, GRANIZO: activoGranizo, LLUVIA: activoLluvia };
  const windDeg = nasa?.viento_dir ?? null;

  return (
    <div className="space-y-6">
      {/* Header compartido: un solo selector de cuartel para las 4 señales. */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#2a3a2c]/60 pb-4">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-[#9bcc44]" /> Control Climático
          </h2>
          <p className="text-xs text-[#8a9787]">Heladas, viento Zonda, granizo y lluvia — predicción local, satélite y parte oficial del SMN, todo en un lugar.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{nombreCuartel(v)}</option>)}
          </select>
        </div>
      </div>

      {/* Acordeón: tocás una contingencia y se despliega ahí mismo con su
          mapa + sus alertas + su panel — nada se oculta detrás de una
          pestaña separada. */}
      <div className="space-y-3">
        {HERRAMIENTAS.map((h) => {
          const Icon = h.icon;
          const abiertaAhora = abierta === h.id;
          const activo = ESTADOS[h.id];
          const color = COLOR_CATEGORIA[h.id];
          return (
            <div key={h.id} className="bg-[#18211b] border rounded-2xl overflow-hidden transition-colors"
              style={{ borderColor: abiertaAhora ? color + '66' : '#2a3a2c99' }}>
              <button onClick={() => setAbierta(abiertaAhora ? null : h.id)}
                className="w-full flex items-center gap-3 p-4 sm:p-5 text-left">
                <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: color + '18', border: `1px solid ${color}40` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black uppercase tracking-wide text-white">{h.label}</p>
                  <p className="text-[11px] text-[#8a9787] truncate">{h.desc}</p>
                </div>
                <span className={`hidden sm:flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                  activo ? 'text-rose-300 bg-rose-500/10 border-rose-500/30' : 'text-[#9bcc44] bg-[#9bcc44]/10 border-[#9bcc44]/25'}`}>
                  {activo ? <ShieldAlert size={10} /> : <CheckCircle2 size={10} />} {activo ? 'Atención' : 'OK'}
                </span>
                <ChevronDown size={18} className={`text-[#5d6f5a] shrink-0 transition-transform ${abiertaAhora ? 'rotate-180' : ''}`} />
              </button>

              {abiertaAhora && (
                <div className="px-4 sm:px-5 pb-5 pt-1 space-y-5 border-t border-[#2a3a2c]/50">
                  {loading ? (
                    <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
                  ) : (
                    <>
                      <ContingenciaMapa categoria={h.id} cuarteles={cuarteles} alertas={alertasDe(h.id)}
                        activo={activo} windDeg={h.id === 'ZONDA' ? windDeg : null}
                        smnOk={smnOk} smnMensaje={smnMensaje} />
                      {h.id === 'HELADA' && <ContenidoHeladas helada={helada} nasa={nasa} clima={clima} />}
                      {h.id === 'ZONDA' && <ContenidoZonda zonda={zonda} windDeg={windDeg} />}
                      {h.id === 'GRANIZO' && <ContenidoConvectivo tipo="GRANIZO" eventos={eventosGranizo} fuente={clima?.fuente} />}
                      {h.id === 'LLUVIA' && <ContenidoConvectivo tipo="LLUVIA" eventos={diasLluvia} fuente={clima?.fuente} />}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContenidoHeladas({ helada, nasa, clima }) {
  const nivel = helada?.risk_level || 'LOW';
  const nivelCfg = {
    CRITICAL: { ring: 'border-rose-500/40 bg-rose-500/5', icon: ShieldAlert, ic: 'text-rose-400 animate-pulse', txt: 'text-rose-200', label: 'CRÍTICO' },
    MEDIUM: { ring: 'border-amber-500/30 bg-amber-500/5', icon: AlertTriangle, ic: 'text-amber-400', txt: 'text-amber-200', label: 'MODERADO' },
    LOW: { ring: 'border-[#2a3a2c]/60 bg-[#18211b]', icon: CheckCircle, ic: 'text-[#9bcc44]', txt: 'text-[#cdd8c8]', label: 'BAJO' },
  }[nivel] || {};
  const NivelIcon = nivelCfg.icon || CheckCircle;

  const pmin = helada?.projected_min_dawn;
  const alertMin = pmin != null && pmin <= 2;
  const pminColor = pmin == null ? 'text-white' : pmin <= 0 ? 'text-rose-400' : pmin <= 2 ? 'text-amber-400' : 'text-emerald-400';
  const pminGaugeColor = pmin == null ? '#94a3b8' : pmin <= 0 ? '#fb7185' : pmin <= 2 ? '#fbbf24' : '#34d399';
  const heladaNegra = helada?.dew_point != null && helada.dew_point < -2.0 && (pmin == null || pmin <= 2);

  const heladaGauges = helada ? [
    { title: 'Temp actual', valueText: `${fmt(helada.current_temp)}°C`, icon: Thermometer, iconColor: 'text-cyan-400', gaugeColor: '#22d3ee', percent: calcPercent(helada.current_temp, -5, 40), alert: false, caption: 'Lectura base' },
    { title: 'Punto rocío', valueText: `${fmt(helada.dew_point)}°C`, icon: Droplet, iconColor: 'text-sky-400', gaugeColor: '#38bdf8', percent: calcPercent(helada.dew_point, -10, 25), alert: helada.dew_point < 0, caption: 'Límite de enfriamiento' },
    { title: 'Enfriamiento', valueText: helada.cooling_rate_c_per_hour ? `-${fmt(helada.cooling_rate_c_per_hour)}°/h` : '--', icon: TrendingDown, iconColor: 'text-amber-400', gaugeColor: '#fbbf24', percent: calcPercent(helada.cooling_rate_c_per_hour, 0, 5), alert: helada.cooling_rate_c_per_hour > 1.5, caption: 'Tasa radiativa' },
    { title: 'Mín. amanecer', valueText: `${fmt(pmin)}°C`, icon: Sunrise, iconColor: pminColor, gaugeColor: pminGaugeColor, percent: calcPercent(pmin, -5, 20), alert: alertMin, caption: 'Proyección térmica' },
  ] : [];

  const nasaGauges = nasa ? [
    { title: 'Temp', valueText: `${fmt(nasa.temp_aire)}°C`, icon: Thermometer, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: calcPercent(nasa.temp_aire, -5, 45), caption: 'Capa límite' },
    { title: 'Humedad', valueText: `${fmt(nasa.humedad_aire, 0)}%`, icon: Droplet, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: nasa.humedad_aire, caption: 'Relativa ambiental' },
    { title: 'Presión', valueText: `${fmt(nasa.presion_atm, 0)} hPa`, icon: Layers, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: calcPercent(nasa.presion_atm, 880, 940), caption: 'Superficie' },
    { title: 'Pto. rocío', valueText: `${fmt(nasa.punto_rocio)}°C`, icon: CloudSnow, iconColor: 'text-indigo-400', gaugeColor: '#818cf8', percent: calcPercent(nasa.punto_rocio, -10, 25), caption: 'Saturación' },
  ] : [];

  return (
    <div className="space-y-6">
      {helada && (
        <div className={`rounded-2xl border p-6 ${nivelCfg.ring}`}>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <NivelIcon className={nivelCfg.ic} size={22} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Predicción de helada · IA local</h3>
            <span className={`ml-auto text-[10px] font-black uppercase px-3 py-1 rounded-full border ${nivelCfg.txt} border-current/30`}>
              Riesgo {nivelCfg.label} · {Math.round((helada.probability ?? 0) * 100)}%
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {heladaGauges.map((g, i) => <GaugeCard key={i} {...g} />)}
          </div>
          {heladaNegra && (
            <div className="mt-5 bg-fuchsia-950/30 border border-fuchsia-500/30 rounded-xl p-4 flex items-start gap-3">
              <Snowflake className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-fuchsia-200 leading-relaxed">
                <span className="font-black uppercase">Posible helada negra:</span> aire seco (punto de rocío {fmt(helada.dew_point)}°C).
                No forma escarcha visible y el daño al tejido es mayor. La defensa por aspersión necesita más volumen de agua.
              </p>
            </div>
          )}
          <p className="text-sm text-[#cdd8c8] italic mt-5 leading-relaxed">"{helada.message}"</p>
          <p className="text-[10px] text-[#5d6f5a] mt-4 border-t border-[#2a3a2c]/50 pt-3 leading-relaxed">
            Estimación por enfriamiento radiativo con piso en el punto de rocío. Vale para noche despejada y sin viento.
            Es soporte a la decisión — cruzalo con el parte del SMN / mapa de arriba.
          </p>
        </div>
      )}

      {nasa?.disponible && (
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-950/20 to-[#18211b] border-indigo-500/20 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Satellite className="text-indigo-400" size={20} />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Referencia satelital · NASA POWER</h3>
            <span className="ml-auto text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-full font-bold">
              hace {nasa.atraso_horas}h
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {nasaGauges.map((g, i) => <GaugeCard key={i} {...g} />)}
          </div>
          <p className="text-[10px] text-indigo-300/60 mt-4 italic">
            Dato satelital de una celda de ~50 km. Sirve de referencia de zona; tu nodo mide el punto exacto en vivo.
          </p>
        </div>
      )}

      {clima && (
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
                <div className="text-[11px] text-[#8a9787] mt-2 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><Droplet className="w-3 h-3 text-blue-400" /> {d.humedad}%</span>
                  <span className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-sky-400" /> {d.prob_lluvia}%</span>
                  <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-[#8a9787]" /> {d.viento_kmh}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {(d.riesgos || []).length === 0 ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#9bcc44] font-bold uppercase">
                      <CheckCircle className="w-3 h-3" /> Sin riesgos
                    </span>
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

function ContenidoZonda({ zonda, windDeg }) {
  if (!zonda) return null;
  const critico = zonda.risk_level === 'CRITICAL';
  const moderado = zonda.risk_level === 'MEDIUM';
  const activo = critico || moderado;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-6 ${critico ? 'border-orange-500/40 bg-orange-500/5' : 'border-[#2a3a2c]/60 bg-[#18211b]'}`}>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Radio className="text-[#9bcc44]" size={16} />
          <Wind className={critico ? 'text-orange-400 animate-pulse' : activo ? 'text-orange-300' : 'text-[#5d6f5a]'} />
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Detección local · Riesgo {zonda.risk_level}</h3>
          <span className={`ml-auto text-[10px] font-black px-3 py-1 rounded-full border ${activo ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-[#9bcc44]/10 text-[#9bcc44] border-[#9bcc44]/25'}`}>
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

        {!activo && (
          <p className="mt-4 text-[11px] text-[#9bcc44] flex items-start gap-2">
            <CheckCircle size={13} className="shrink-0 mt-0.5" />
            Riesgo bajo es lo esperable la mayor parte del año — el Zonda es un evento puntual (caída brusca de
            humedad + suba de temperatura). Este panel queda monitoreando en vivo y te avisa por la campanita apenas
            la firma termodinámica cambie.
          </p>
        )}

        <p className="text-[11px] text-[#5d6f5a] mt-4 leading-relaxed">
          Detección por firma termodinámica (humedad + temperatura en vivo). La dirección del viento en el mapa de
          arriba es un dato satelital real (NASA POWER){windDeg == null ? ', sin lectura disponible en este momento' : ''}.
          Soporte a la decisión: cruzá con el parte oficial del SMN.
        </p>
      </div>
    </div>
  );
}

// OJO: Tailwind necesita las clases completas y literales en el código
// fuente para poder generarlas (no arma "bg-" + variable en runtime), por
// eso cada tipo lleva su propio set de clases ya armadas en vez de
// interpolar un nombre de color.
const CONVECTIVO_CFG = {
  GRANIZO: {
    icon: CloudRain, titulo: 'Posible evento de granizo',
    sinRiesgo: 'No se detectan condiciones convectivas de granizo para los próximos días.',
    caja: 'bg-sky-950/20 border-sky-500/30', iconoTxt: 'text-sky-400',
    badge: 'text-sky-300 bg-sky-500/10 border-sky-500/30', cuerpo: 'text-sky-100',
  },
  LLUVIA: {
    icon: CloudDrizzle, titulo: 'Posible evento de lluvia/tormenta',
    sinRiesgo: 'No se detectan condiciones de lluvia o tormenta relevantes para los próximos días.',
    caja: 'bg-blue-950/20 border-blue-500/30', iconoTxt: 'text-blue-400',
    badge: 'text-blue-300 bg-blue-500/10 border-blue-500/30', cuerpo: 'text-blue-100',
  },
};

function ContenidoConvectivo({ tipo, eventos, fuente }) {
  const cfg = CONVECTIVO_CFG[tipo];
  const Icon = cfg.icon;
  return (
    <div className="pt-1">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="text-[#9bcc44]" size={14} />
        <h4 className="text-xs font-black uppercase tracking-widest text-[#8a9787]">
          Pronóstico convectivo propio · fuente {fuente || '—'}
        </h4>
      </div>

      {eventos.length === 0 ? (
        <div className="bg-[#18211b] border border-[#2a3a2c] rounded-2xl p-8 text-center">
          <CheckCircle size={32} className="mx-auto mb-2 text-[#9bcc44]" />
          <p className="text-[#5d6f5a] text-sm">{cfg.sinRiesgo}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map((d, i) => (
            <div key={i} className={`border rounded-2xl p-6 ${cfg.caja}`}>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Icon className={cfg.iconoTxt} />
                <h3 className="font-black uppercase text-white">{cfg.titulo}: {d.fecha}</h3>
                <span className={`ml-auto text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase flex items-center gap-2 ${cfg.badge}`}>
                  <Thermometer size={11} /> {d.temp_max}° · <Droplet size={11} /> {d.humedad}% · {d.prob_lluvia}% lluvia
                </span>
              </div>
              {tipo === 'GRANIZO'
                ? (d.riesgos || []).filter(r => r.tipo === 'GRANIZO').map((r, j) => (
                  <p key={j} className={`text-sm ${cfg.cuerpo}`}>{r.detalle}</p>
                ))
                : <p className={`text-sm ${cfg.cuerpo}`}>Probabilidad de lluvia {d.prob_lluvia}%, con {d.humedad}% de humedad — condiciones favorables a precipitación.</p>}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[#5d6f5a] bg-[#18211b] border border-[#2a3a2c]/40 rounded-xl p-4 mt-4">
        El mapa con el radar y las alertas oficiales del SMN es la fuente de verdad para decisiones de defensa. Esta
        tabla de abajo es un pronóstico propio (humedad, temperatura y lluvia proyectadas) — un complemento, no lo
        reemplaza.
      </p>
    </div>
  );
}
