import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export default function useDashboard(pollMs = 3000) {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [telemetry, setTelemetry] = useState([]);
  const [frost, setFrost] = useState(null);
  const [harvest, setHarvest] = useState(null);
  const [anomaly, setAnomaly] = useState(null);   // ← NUEVO: anomalía ML (Isolation Forest)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const lista = await apiService.getVinedos();
        const safe = Array.isArray(lista) ? lista : [];
        setVinedos(safe);
        if (safe.length) setSelected(safe[0]);
      } catch (e) {
        setError('No se pudo conectar con el servidor de telemetría.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchAll = useCallback(async (id) => {
    if (!id) return;
    try {
      const [h, f, c, a] = await Promise.all([
        apiService.getTelemetria(id, 24),
        apiService.getPrediccionHelada(id),
        apiService.getAnalisisCosecha(id),
        apiService.getAnomaliaML(id),          // ← NUEVO
      ]);
      setTelemetry(Array.isArray(h) ? h : []);
      setFrost(f || null);
      setHarvest(c || null);
      setAnomaly(a || null);                   // ← NUEVO
      setError(null);
    } catch (e) {
      setError('Error actualizando datos de sensores.');
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchAll(selected);
    const iv = setInterval(() => fetchAll(selected), pollMs);
    return () => clearInterval(iv);
  }, [selected, fetchAll, pollMs]);

  const current = telemetry.length ? telemetry[telemetry.length - 1] : null;
  const currentTemp = current ? (current.temp_aire ?? current.Temp_Aire_C ?? 12) : 12;

  return { vinedos, selected, setSelected, telemetry, frost, harvest, anomaly, current, currentTemp, loading, error };
}