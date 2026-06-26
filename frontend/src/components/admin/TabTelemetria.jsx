import React from 'react';
import useDashboard from '../../hooks/useDashboard';
import MetricsGrid from '../dashboard/MetricsGrid';
import AlertPanel from '../dashboard/AlertPanel';
import WeatherChart from '../dashboard/WeatherChart';
import HarvestPredictor from '../dashboard/HarvestPredictor';
import VineyardMap from '../maps/VineyardMap';
import NasaComparison from '../dashboard/NasaComparison';
import RealTimeFrostPhysics from '../dashboard/RealTimeFrostPhysics';
import { Layers, WifiOff } from 'lucide-react';

export default function TabTelemetria() {
  // Se agregó 'nasa' extraído del custom hook
  const { 
    vinedos, selected, setSelected, telemetry, frost, 
    harvest, current, currentTemp, loading, error, nasa 
  } = useDashboard(3000);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Telemetría en vivo</h2>
          <p className="text-xs text-[#8a9787]">Lecturas de sensores e IA por cuartel, actualizadas cada 3s.</p>
        </div>
        <div className="relative">
          <Layers className="w-4 h-4 text-[#5d6f5a] absolute left-3 top-1/2 -translate-y-1/2" />
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-60 bg-[#18211b] border border-[#2a3a2c] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-[#cdd8c8] focus:outline-none focus:border-[#9bcc44] appearance-none cursor-pointer">
            {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
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
      
      {/* Fila analítica: Física en tiempo real y contraste satelital NASA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeFrostPhysics currentData={current} />
        <NasaComparison current={current} nasa={nasa} />
      </div>

      {/* Mapas y Gráficos Históricos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VineyardMap vinedos={vinedos} selectedVinedo={selected} setSelectedVinedo={setSelected} currentTemp={currentTemp} />
        <WeatherChart telemetryHistory={telemetry} />
      </div>
      
      {/* Análisis de maduración y predicción de cosecha */}
      <HarvestPredictor harvestAnalysis={harvest} />
    </div>
  );
}