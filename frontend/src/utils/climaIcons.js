import L from 'leaflet';

// Iconos de mapa para cada una de las 4 contingencias de Control Climático.
// Mismo lenguaje visual que nodoVivoIcon.js (SVG inline, sin el cuadrito
// blanco que Leaflet pone por defecto a los divIcon) y una sola paleta de
// color por categoría, reutilizada en el mapa, las alertas y los badges —
// así el usuario aprende "este color = esta contingencia" en todo el panel.
export const COLOR_CATEGORIA = {
  HELADA: '#22d3ee',   // cyan
  ZONDA: '#fb923c',    // naranja
  GRANIZO: '#38bdf8',  // celeste
  LLUVIA: '#3b82f6',   // azul
};

let estiloInyectado = false;
function asegurarEstilo() {
  if (estiloInyectado || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `.icono-clima { background: transparent !important; border: none !important; }`;
  document.head.appendChild(style);
  estiloInyectado = true;
}

function divIcon(html, size, anchor) {
  asegurarEstilo();
  return L.divIcon({ html, className: 'icono-clima', iconSize: [size, size], iconAnchor: anchor || [size / 2, size / 2], popupAnchor: [0, -size / 2] });
}

function pulso(color, activo, size) {
  if (!activo) return '';
  const c = size / 2;
  return `<circle cx="${c}" cy="${c}" r="${size * 0.3}" fill="${color}" opacity="0.5">
      <animate attributeName="r" values="${size * 0.3};${size * 0.56};${size * 0.3}" dur="1.8s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0;0.5" dur="1.8s" repeatCount="indefinite" />
    </circle>`;
}

export function crearIconoHelada(size = 38, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.HELADA;
  const brazo = (ang) => {
    const r1 = size * 0.1, r2 = size * 0.32;
    const rad = (ang * Math.PI) / 180;
    const x1 = c + r1 * Math.cos(rad), y1 = c + r1 * Math.sin(rad);
    const x2 = c + r2 * Math.cos(rad), y2 = c + r2 * Math.sin(rad);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" stroke-linecap="round" />`;
  };
  const brazos = [0, 60, 120, 180, 240, 300].map(brazo).join('');
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${pulso(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.4}" fill="#0e1512" stroke="${color}" stroke-width="2" />
    ${brazos}
    <circle cx="${c}" cy="${c}" r="2" fill="${color}" />
  </svg>`;
  return divIcon(html, size);
}

export function crearIconoViento(size = 34, deg = 0, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.ZONDA;
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${pulso(color, activo, size)}
    <g transform="rotate(${deg} ${c} ${c})">
      <circle cx="${c}" cy="${c}" r="${size * 0.4}" fill="#0e1512" stroke="${color}" stroke-width="2" />
      <path d="M ${c} ${c - size * 0.26} L ${c - size * 0.14} ${c + size * 0.1} L ${c} ${c + size * 0.02} L ${c + size * 0.14} ${c + size * 0.1} Z"
            fill="${color}" />
    </g>
  </svg>`;
  return divIcon(html, size);
}

export function crearIconoGranizo(size = 36, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.GRANIZO;
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${pulso(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.4}" fill="#0e1512" stroke="${color}" stroke-width="2" />
    <path d="M ${c - 8} ${c - 1} a 5 5 0 0 1 1.3 -9.8 a 6.5 6.5 0 0 1 12.3 1.6 a 4.6 4.6 0 0 1 -1 9 Z"
          transform="translate(0, -3) scale(${size / 36})" fill="${color}" opacity="0.9" />
    <circle cx="${c - 4}" cy="${c + 7}" r="1.6" fill="${color}" />
    <circle cx="${c + 2}" cy="${c + 9}" r="1.6" fill="${color}" />
    <circle cx="${c + 7}" cy="${c + 6}" r="1.6" fill="${color}" />
  </svg>`;
  return divIcon(html, size);
}

export function crearIconoLluvia(size = 36, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.LLUVIA;
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${pulso(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.4}" fill="#0e1512" stroke="${color}" stroke-width="2" />
    <path d="M ${c - 8} ${c - 1} a 5 5 0 0 1 1.3 -9.8 a 6.5 6.5 0 0 1 12.3 1.6 a 4.6 4.6 0 0 1 -1 9 Z"
          transform="translate(0, -3) scale(${size / 36})" fill="${color}" opacity="0.9" />
    <line x1="${c - 5}" y1="${c + 6}" x2="${c - 7}" y2="${c + 11}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" />
    <line x1="${c}" y1="${c + 7}" x2="${c - 2}" y2="${c + 12}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" />
    <line x1="${c + 5}" y1="${c + 6}" x2="${c + 3}" y2="${c + 11}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" />
  </svg>`;
  return divIcon(html, size);
}

const FABRICAS = { HELADA: crearIconoHelada, ZONDA: crearIconoViento, GRANIZO: crearIconoGranizo, LLUVIA: crearIconoLluvia };

export function crearIconoCategoria(categoria, opts = {}) {
  const f = FABRICAS[categoria] || crearIconoGranizo;
  if (categoria === 'ZONDA') return f(opts.size, opts.deg ?? 0, opts.activo);
  return f(opts.size, opts.activo);
}
