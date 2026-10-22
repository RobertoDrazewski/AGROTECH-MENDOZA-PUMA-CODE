import React from 'react';
import useDashboard from '../../hooks/useDashboard';
import MetricsGrid from '../dashboard/MetricsGrid';
import AlertPanel from '../dashboard/AlertPanel';
import WeatherChart from '../dashboard/WeatherChart';
import HarvestPredictor from '../dashboard/HarvestPredictor';
import VineyardMap from '../maps/VineyardMap';
import NasaComparison from '../dashboard/NasaComparison';
import RealTimeFrostPhysics from '../dashboard/RealTimeFrostPhysics';
import { Layers, WifiOff, CloudSun, Droplets, Bug, BarChart3, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { nombreCuartel } from '../../utils/nombreCuartel';

const ACCESOS = [
  { id: 'TabControlClimatico', label: 'Control Climático', desc: 'Heladas · Zonda · Granizo', icon: CloudSun, color: 'text-cyan-300', ring: 'hover:border-cyan-500/40' },
  { id: 'TabRiego', label: 'Riego Inteligente', desc: 'Humedad de suelo y electroválvula', icon: Droplets, color: 'text-sky-300', ring: 'hover:border-sky-500/40' },
  { id: 'TabFitosanitario', label: 'Control de Plagas', desc: 'Trampas y detección por IA', icon: Bug, color: 'text-amber-300', ring: 'hover:border-amber-500/40' },
  { id: 'TabAnalisis', label: 'Análisis Anual/Mes', desc: 'Históricos, GDD y carga de Brix', icon: BarChart3, color: 'text-fuchsia-300', ring: 'hover:border-fuchsia-500/40' },
];

export default function TabTelemetria({ onNavigate }) {
  // Se agregó 'nasa' extraído del custom hook
  const {
    vinedos, selected, setSelected, telemetry, frost,
    harvest, current, currentTemp, loading, error, nasa
  } = useDashboard(3000);

  const riesgoClima = frost?.risk_level;
  const climaAlerta = riesgoClima === 'CRITICAL' || riesgoClima === 'MEDIUM';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Panel general</h2>
          <p className="text-xs text-[#8a9787]">Lecturas de sensores e IA en vivo, actualizadas cada 3s.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{nombreCuartel(v)}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-4 rounded-xl flex items-center gap-2">
          <WifiOff size={16} /> {error}
        </div>
      )}

      {/* Alertas Críticas (Isolation Forest / Predictor Backend) */}
      {frost && <AlertPanel frostPrediction={frost} />}

      {/* Grilla principal de sensores */}
      <MetricsGrid currentData={current} anomaly={frost?.ml_anomaly} />

      {/* Accesos rápidos a las demás herramientas: resumen tipo dashboard,
          no hace falta recorrer el menú para saber el estado de cada una. */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#5d6f5a] font-bold mb-3">Herramientas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACCESOS.map((a) => {
            const Icon = a.icon;
            const esClima = a.id === 'TabControlClimatico';
            return (
              <button key={a.id} onClick={() => onNavigate?.(a.id)}
                className={`text-left bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] ${a.ring} group`}>
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-5 h-5 ${a.color}`} />
                  {esClima && riesgoClima ? (
                    climaAlerta ? (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        <ShieldAlert size={10} /> Atención
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-[#9bcc44] bg-[#9bcc44]/10 border border-[#9bcc44]/25 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> OK
                      </span>
                    )
                  ) : (
                    <ArrowRight size={14} className="text-[#5d6f5a] group-hover:text-[#9bcc44] group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
                <p className="text-xs font-black uppercase tracking-wide text-white">{a.label}</p>
                <p className="text-[10px] text-[#5d6f5a] mt-1">{a.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fila analítica: Física en tiempo real y contraste satelital NASA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeFrostPhysics currentData={current} />
        <NasaComparison current={current} nasa={nasa} />
      </div>

      {/* Mapa a todo el ancho (el doble de grande que antes) y, debajo,
          el gráfico de Tendencia climática — antes iban lado a lado en una
          grilla de 2 columnas y el mapa quedaba chico. */}
      <VineyardMap vinedos={vinedos} selectedVinedo={selected} setSelectedVinedo={setSelected}
        currentTemp={currentTemp} mapHeight={520} />
      <WeatherChart telemetryHistory={telemetry} />

      {/* Análisis de maduración (KPI por cuartel) */}
      <HarvestPredictor harvestAnalysis={harvest} />
    </div>
  );
}
