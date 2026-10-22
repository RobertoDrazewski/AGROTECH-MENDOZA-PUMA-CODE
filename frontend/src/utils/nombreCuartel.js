// Nombre de pantalla de cada cuartel/nodo. Por defecto formateamos el
// vinedo_id (saca guiones bajos), pero algunos ids tienen un nombre
// comercial propio — hoy solo "Patio_Casa", el nodo de hardware real, que
// se muestra como "Nodo DEMO" en todo el panel (mapas, selectores, campana
// de alarmas) sin tocar el vinedo_id real que usa el firmware para
// identificarse al hacer POST a /telemetria/ingest.
const NOMBRES = {
  Patio_Casa: 'Nodo DEMO',
};

export function nombreCuartel(vinedoId) {
  if (!vinedoId) return '';
  return NOMBRES[vinedoId] || vinedoId.replace(/_/g, ' ');
}
