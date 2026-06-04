import React from 'react';
import useDashboard from '../../hooks/useDashboard';
import MetricsGrid from '../dashboard/MetricsGrid';
import AlertPanel from '../dashboard/AlertPanel';
import WeatherChart from '../dashboard/WeatherChart';
import VineyardMap from '../maps/VineyardMap';
import { Activity, Layers, WifiOff } from 'lucide-react';

export default function LiveDemo() {
  const { vinedos, selected, setSelected, telemetry, frost, current, currentTemp, loading, error } = useDashboard(3000);

  return (
    <section id="demo" className="max-w-[1440px] mx-auto px-6 md:px-12 py-24">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">Demo en vivo</span>
        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mt-3">
          Así se ve tu finca <span className="text-[#9bcc44]">en tiempo real</span>
        </h2>
        <p className="text-[#aebaa8] mt-4">
          Estos datos provienen de nuestro simulador. Al instalar el hardware, las mismas
          pantallas muestran tus sensores reales sin cambiar nada.
        </p>
      </div>

      {error && (
        <div className="max-w-xl mx-auto mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-4 rounded-xl flex items-center gap-2">
          <WifiOff size={16} /> {error} Iniciá el backend (uvicorn) para ver la demo en vivo.
        </div>
      )}

      <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-3xl p-5 md:p-7 shadow-2xl">
        {/* Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-full uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {loading ? 'Conectando…' : 'Datos en vivo'}
          </div>
          <div className="relative">
            <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
            <select value={selected} onChange={(e) => setSelected(e.target.value)}
              className="w-56 bg-[#121a14] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
              {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-5">
          {frost && <AlertPanel frostPrediction={frost} />}
          <MetricsGrid currentData={current} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <VineyardMap vinedos={vinedos} selectedVinedo={selected} setSelectedVinedo={setSelected} currentTemp={currentTemp} />
            <WeatherChart telemetryHistory={telemetry} />
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/login" className="inline-flex items-center gap-2 text-[#9bcc44] hover:text-white text-xs font-black uppercase tracking-widest transition-colors">
            <Activity size={14} /> Acceder al panel completo de tu bodega →
          </a>
        </div>
      </div>
    </section>
  );
}
