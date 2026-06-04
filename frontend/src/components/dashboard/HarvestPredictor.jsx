import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Grape, Calendar, Award } from 'lucide-react';

export default function HarvestPredictor({ harvestAnalysis }) {
  if (!harvestAnalysis) {
    return (
      <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-xl p-6 h-full flex items-center justify-center animate-pulse">
        <span className="text-[#5d6f5a] text-sm">Calculando ventana óptima de cosecha…</span>
      </div>
    );
  }

  const {
    current_brix = 18.0, current_ph = 3.1, estimated_days_to_harvest = null,
    wine_quality_potential = 'UNDETERMINED', message = 'Analizando curvas de maduración…',
  } = harvestAnalysis;

  const data = [
    { name: '-2d', brix: current_brix - 0.8, ph: current_ph - 0.05 },
    { name: '-1d', brix: current_brix - 0.4, ph: current_ph - 0.02 },
    { name: 'Hoy', brix: current_brix, ph: current_ph },
    { name: '+1d', brix: current_brix + 0.4, ph: current_ph + 0.03 },
    { name: '+2d', brix: current_brix + 0.8, ph: current_ph + 0.06 },
  ];

  const qualityColors = {
    ULTRA_PREMIUM: 'text-amber-400 border-amber-500/50 bg-amber-500/10',
    RESERVA: 'text-fuchsia-400 border-fuchsia-500/50 bg-fuchsia-500/10',
    EVOLVING: 'text-sky-400 border-sky-500/50 bg-sky-500/10',
    UNDETERMINED: 'text-slate-400 border-slate-500/50 bg-slate-500/10',
  };

  return (
    <div className="bg-gradient-to-br from-[#8b2e4a]/25 to-[#18211b] border border-[#c0395f]/20 rounded-xl p-6 shadow-2xl h-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-[#e5b8c5] uppercase flex items-center gap-2">
            <Grape className="w-4 h-4 text-[#c0395f]" /> Optimización de Cosecha · IA
          </h3>
          <p className="text-xs text-[#8a9787] mt-1">Análisis predictivo de maduración (Brix/pH)</p>
        </div>
        <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${qualityColors[wine_quality_potential] || qualityColors.UNDETERMINED}`}>
          {String(wine_quality_potential).replace(/_/g, ' ')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#c0395f]/20 p-4 rounded-2xl border border-[#c0395f]/30">
              <Calendar className="w-8 h-8 text-[#c0395f]" />
            </div>
            <div>
              <span className="text-[#8a9787] text-xs block uppercase font-medium">Cosecha estimada en</span>
              <span className="text-4xl font-black text-white tracking-tighter">
                {estimated_days_to_harvest ?? '--'} <small className="text-lg font-normal text-[#5d6f5a]">días</small>
              </span>
            </div>
          </div>

          {[
            { label: 'Concentración de azúcar', val: `${current_brix} °Brix`, color: 'bg-amber-500', txt: 'text-amber-400', pct: (current_brix / 30) * 100 },
            { label: 'Índice de acidez (pH)', val: `${current_ph} pH`, color: 'bg-fuchsia-500', txt: 'text-fuchsia-400', pct: (current_ph / 4.5) * 100 },
          ].map((m, i) => (
            <div key={i} className="bg-[#121a14] p-4 rounded-xl border border-[#2a3a2c]/50">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#8a9787] uppercase">{m.label}</span>
                <span className={`${m.txt} font-bold`}>{m.val}</span>
              </div>
              <div className="w-full bg-[#2a3a2c] h-1.5 rounded-full overflow-hidden">
                <div className={`${m.color} h-full transition-all duration-1000`}
                  style={{ width: `${Math.min(100, Math.max(0, m.pct))}%` }} />
              </div>
            </div>
          ))}

          <p className="text-sm text-[#cdd8c8] italic leading-relaxed bg-[#8b2e4a]/15 p-3 rounded-lg border-l-2 border-[#c0395f]">
            "{message}"
          </p>
        </div>

        <div className="h-64 lg:h-full min-h-[250px] relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <Award className="w-32 h-32 text-[#c0395f]" />
          </div>
          <div style={{ width: '100%', height: '240px', minHeight: '240px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a2c" vertical={false} />
                <XAxis dataKey="name" stroke="#5d6f5a" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" hide domain={['auto', 'auto']} />
                <YAxis yAxisId="right" hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#121a14', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                <ReferenceArea yAxisId="left" y1={current_brix - 0.2} y2={current_brix + 0.6} fill="#9bcc44" fillOpacity={0.12} />
                <Line yAxisId="left" type="monotone" dataKey="brix" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} name="Brix" />
                <Line yAxisId="right" type="monotone" dataKey="ph" stroke="#e879f9" strokeWidth={3} dot={{ r: 4, fill: '#e879f9' }} name="pH" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-center text-[#5d6f5a] mt-2 flex justify-center gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> Azúcar (Brix)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-fuchsia-500 rounded-full" /> Acidez (pH)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
