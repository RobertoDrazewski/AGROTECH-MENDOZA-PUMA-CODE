import React from 'react';
import { Satellite, Radio, ArrowLeftRight, Clock, MapPin } from 'lucide-react';

/**
 * NasaComparison
 * Compara la lectura del SENSOR en campo contra NASA POWER.
 * Honesto con el desfase: NASA va días atrás y promedia ~50 km.
 * Paleta verde de marca AgroTech (con índigo para lo satelital).
 */
export default function NasaComparison({ current, nasa }) {
  if (!nasa || !nasa.disponible || !current) {
    return (
      <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-6 flex items-center gap-3">
        <Satellite className="w-5 h-5 text-[#5d6f5a]" />
        <span className="text-[#5d6f5a] text-sm">
          Sin dato satelital de NASA POWER para este punto en este momento.
        </span>
      </div>
    );
  }

  const fmt = (v, d = 1) => (v === null || v === undefined ? '--' : Number(v).toFixed(d));

  const rows = [
    { label: 'Temperatura', unit: '°C', sensor: current.temp_aire, nasa: nasa.temp_aire, decimals: 1 },
    { label: 'Humedad', unit: '%', sensor: current.humedad_aire, nasa: nasa.humedad_aire, decimals: 0 },
    { label: 'Presión', unit: 'hPa', sensor: current.presion_atm, nasa: nasa.presion_atm, decimals: 0 },
  ];

  const atrasoH = nasa.atraso_horas;
  const atrasoTxt = atrasoH != null
    ? (atrasoH >= 24 ? `${(atrasoH / 24).toFixed(1)} días` : `${atrasoH} h`)
    : '—';

  return (
    <div className="bg-gradient-to-br from-indigo-950/20 to-[#18211b] border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" /> Sensor en campo vs Satélite NASA
          </h3>
          <p className="text-xs text-[#5d6f5a] mt-1">
            Validación cruzada de tu nodo contra NASA POWER
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                         bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <Satellite className="w-3.5 h-3.5" /> NASA POWER
        </span>
      </div>

      <div className="grid grid-cols-12 gap-2 px-2 mb-2 text-[10px] font-black uppercase tracking-wider text-[#5d6f5a]">
        <div className="col-span-4">Variable</div>
        <div className="col-span-3 text-right flex items-center justify-end gap-1">
          <Radio className="w-3 h-3 text-[#9bcc44]" /> Sensor
        </div>
        <div className="col-span-3 text-right flex items-center justify-end gap-1">
          <Satellite className="w-3 h-3 text-indigo-400" /> NASA
        </div>
        <div className="col-span-2 text-right">Δ</div>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => {
          const diff = (r.sensor != null && r.nasa != null)
            ? Number(r.sensor) - Number(r.nasa) : null;
          const diffTxt = diff == null ? '--'
            : `${diff > 0 ? '+' : ''}${diff.toFixed(r.decimals)}`;
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-center bg-[#121a14] rounded-xl px-2 py-2.5 border border-[#2a3a2c]/50">
              <div className="col-span-4 text-xs font-medium text-[#cdd8c8]">
                {r.label} <span className="text-[#5d6f5a]">{r.unit}</span>
              </div>
              <div className="col-span-3 text-right text-sm font-bold text-[#9bcc44]">
                {fmt(r.sensor, r.decimals)}
              </div>
              <div className="col-span-3 text-right text-sm font-bold text-indigo-300">
                {fmt(r.nasa, r.decimals)}
              </div>
              <div className="col-span-2 text-right text-xs font-semibold text-[#8a9787]">
                {diffTxt}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#2a3a2c]/50 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] text-[#8a9787]">
          <Clock className="w-3.5 h-3.5 text-[#5d6f5a]" />
          Dato NASA de hace <span className="text-[#cdd8c8] font-semibold">{atrasoTxt}</span> · el sensor es en vivo
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#8a9787]">
          <MapPin className="w-3.5 h-3.5 text-[#5d6f5a]" />
          NASA promedia una celda de ~50 km; tu nodo mide el punto exacto del cuartel
        </div>
        <p className="text-[11px] text-indigo-300/80 italic pt-1">
          La diferencia es esperable: el satélite da la tendencia de la zona, el nodo da el dato preciso del lugar.
        </p>
      </div>
    </div>
  );
}
