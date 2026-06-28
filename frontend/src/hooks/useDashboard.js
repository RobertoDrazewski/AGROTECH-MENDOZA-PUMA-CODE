import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export default function useDashboard(pollMs = 3000) {
  const [vinedos, setVinedos] = useState([]);
  const [selected, setSelected] = useState('');
  const [telemetry, setTelemetry] = useState([]);
  const [frost, setFrost] = useState(null);
  const [harvest, setHarvest] = useState(null);
  const [anomaly, setAnomaly] = useState(null);
  const [nasa, setNasa] = useState(null);
  const [zonda, setZonda] = useState(null);
  const [clima, setClima] = useState(null); // ← NUEVO: Estado para riesgos de clima/granizo
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
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchAll = useCallback(async (id) => {
    if (!id) return;
    try {
      const [h, f, c, a, n, z, cl] = await Promise.all([
        apiService.getTelemetria(id, 24),
        apiService.getPrediccionHelada(id),
        apiService.getAnalisisCosecha(id),
        apiService.getAnomaliaML(id),
        apiService.getNasaData(id),
        apiService.getPrediccionZonda(id),
        apiService.getClima(id), // ← NUEVO: Obtenemos pronóstico y riesgos
      ]);
      
      setTelemetry(Array.isArray(h) ? h : []);
      setFrost(f || null);
      setHarvest(c || null);
      setAnomaly(a || null);
      setNasa(n || null);
      setZonda(z || null);
      setClima(cl || null); // ← NUEVO
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

  return { vinedos, selected, setSelected, telemetry, frost, harvest, anomaly, nasa, zonda, clima, loading, error };
}