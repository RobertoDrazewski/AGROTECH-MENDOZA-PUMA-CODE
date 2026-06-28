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
  const [clima, setClima] = useState(null);
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
    
    // Usamos allSettled para que si un endpoint falla, no rompa toda la carga
    const results = await Promise.allSettled([
      apiService.getTelemetria(id, 24),    // 0
      apiService.getPrediccionHelada(id),  // 1
      apiService.getAnalisisCosecha(id),   // 2
      apiService.getAnomaliaML(id),        // 3
      apiService.getNasaData(id),          // 4
      apiService.getPrediccionZonda(id),   // 5
      apiService.getClima(id),             // 6
    ]);

    // Función auxiliar para obtener datos solo si la promesa fue exitosa
    const getData = (index) => results[index].status === 'fulfilled' ? results[index].value : null;

    setTelemetry(getData(0) || []);
    setFrost(getData(1));
    setHarvest(getData(2));
    setAnomaly(getData(3));
    setNasa(getData(4));
    setZonda(getData(5));
    setClima(getData(6));
    
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchAll(selected);
    const iv = setInterval(() => fetchAll(selected), pollMs);
    return () => clearInterval(iv);
  }, [selected, fetchAll, pollMs]);

  const current = telemetry.length ? telemetry[telemetry.length - 1] : null;
  const currentTemp = current ? (current.temp_aire ?? current.Temp_Aire_C ?? 12) : 12;

  return { vinedos, selected, setSelected, telemetry, frost, harvest, anomaly, nasa, zonda, clima, current, currentTemp, loading, error };
}