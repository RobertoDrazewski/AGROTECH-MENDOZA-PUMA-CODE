import L from 'leaflet';

// Ícono de mapa para un nodo de hardware real transmitiendo: un anillo que
// pulsa (como un radar/beacon) detrás de un punto con "ondas de señal" tipo
// wifi/satélite — mucho más legible a simple vista que el pin genérico de
// Leaflet, y comunica "en vivo" en vez de "ubicación fija". Se inyecta una
// sola vez un <style> que anula el fondo/borde blanco que Leaflet le pone
// por defecto a los divIcon.
let estiloInyectado = false;
function asegurarEstilo() {
  if (estiloInyectado || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    .icono-nodo-vivo { background: transparent !important; border: none !important; }
  `;
  document.head.appendChild(style);
  estiloInyectado = true;
}

export function crearIconoNodoVivo(size = 36) {
  asegurarEstilo();
  const c = size / 2;
  const html = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
      <circle cx="${c}" cy="${c}" r="7" fill="#9bcc44" opacity="0.55">
        <animate attributeName="r" values="7;${size * 0.52};7" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0;0.55" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="${c}" cy="${c}" r="8" fill="#0e1512" stroke="#9bcc44" stroke-width="2" />
      <path d="M ${c} ${c - 4.2} C ${c + 2.6} ${c - 4.2} ${c + 4.7} ${c - 2.1} ${c + 4.7} ${c + 0.5}"
            stroke="#9bcc44" stroke-width="1.6" fill="none" stroke-linecap="round" />
      <path d="M ${c} ${c - 7.2} C ${c + 4.5} ${c - 7.2} ${c + 8.1} ${c - 3.6} ${c + 8.1} ${c + 1}"
            stroke="#9bcc44" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.65" />
      <circle cx="${c}" cy="${c + 2.6}" r="1.8" fill="#9bcc44" />
    </svg>
  `;
  return L.divIcon({
    html,
    className: 'icono-nodo-vivo',
    iconSize: [size, size],
    iconAnchor: [c, c],
    popupAnchor: [0, -c],
  });
}
