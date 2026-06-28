import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { CloudRain, CheckCircle, Loader2 } from 'lucide-react';

export default function TabGranizo() {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [clima, setClima] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Cargar lista de viñedos al iniciar
  useEffect(() => {
    apiService.getVinedos().then(v => {
      const safe = Array.isArray(v) ? v : [];
      setVinedos(safe);
      if (safe.length) setSelected(safe[0]);
    });
  }, []);

  // 2. Cargar datos del clima cuando cambia el viñedo seleccionado
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    apiService.getClima(selected)
      .then(data => setClima(data))
      .catch(err => console.error("Error al cargar clima:", err))
      .finally(() => setLoading(false));
  }, [selected]);

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-sky-400" /></div>;
  if (!clima) return <div className="text-[#8a9787]">No se pudieron cargar los datos.</div>;

  // Filtrar eventos de granizo
  const eventosGranizo = clima.forecast.filter(d => d.riesgos.some(r => r.tipo === 'GRANIZO'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase italic text-white">Monitoreo de Granizo</h2>
        <select 
          value={selected} 
          onChange={(e) => setSelected(e.target.value)}
          className="bg-[#18211b] border border-[#2a3a2c] rounded-xl px-4 py-2 text-xs font-semibold text-[#cdd8c8]"
        >
          {vinedos.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      
      {eventosGranizo.length === 0 ? (
        <div className="bg-[#18211b] border border-[#2a3a2c] rounded-2xl p-8 text-center">
          <CheckCircle size={32} className="mx-auto mb-2 text-[#9bcc44]" />
          <p className="text-[#5d6f5a] text-sm">No se detectan condiciones convectivas de granizo para los próximos días.</p>
        </div>
      ) : (
        eventosGranizo.map((d, i) => (
          <div key={i} className="bg-sky-950/20 border border-sky-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CloudRain className="text-sky-400" />
              <h3 className="font-black uppercase text-white">Evento posible: {d.fecha}</h3>
            </div>
            {d.riesgos.filter(r => r.tipo === 'GRANIZO').map((r, j) => (
              <p key={j} className="text-sm text-sky-100">{r.detalle}</p>
            ))}
          </div>
        ))
      )}
    </div>
  );
}