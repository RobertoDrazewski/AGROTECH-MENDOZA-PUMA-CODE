import L from 'leaflet';

// Iconos de mapa para cada una de las 4 contingencias de Control Climático.
// Cada ícono es UN SOLO marcador que ya incluye el anillo "en vivo" (así no
// hace falta superponerlo con el ícono genérico de nodoVivoIcon.js — eso
// era lo que se pisaba en el mapa). Un pulso tenue y lento corre siempre
// (comunica "esto está midiendo en vivo"); cuando hay riesgo activo se
// suma un segundo pulso más rápido y marcado.
export const COLOR_CATEGORIA = {
  HELADA: '#22d3ee',   // cyan
  ZONDA: '#fb923c',    // naranja
  GRANIZO: '#a78bfa',  // violeta (cumulonimbo / tormenta severa)
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

// Anillo "en vivo" tenue (siempre) + anillo de alerta fuerte (solo si activo).
function anillos(color, activo, size) {
  const c = size / 2;
  const vivo = `<circle cx="${c}" cy="${c}" r="${size * 0.3}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.35">
      <animate attributeName="r" values="${size * 0.3};${size * 0.5};${size * 0.3}" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.35;0;0.35" dur="3s" repeatCount="indefinite" />
    </circle>`;
  const alerta = activo ? `<circle cx="${c}" cy="${c}" r="${size * 0.32}" fill="${color}" opacity="0.5">
      <animate attributeName="r" values="${size * 0.32};${size * 0.58};${size * 0.32}" dur="1.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>` : '';
  return vivo + alerta;
}

// Copo de hielo: 3 ejes de 6 puntas con ramificaciones chicas — mucho más
// reconocible como "hielo/escarcha" a simple vista que una cruz lisa.
export function crearIconoHelada(size = 42, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.HELADA;
  const R = size * 0.34;
  let ejes = '';
  for (let i = 0; i < 6; i++) {
    const ang = (i * 60 * Math.PI) / 180;
    const x2 = c + R * Math.cos(ang), y2 = c + R * Math.sin(ang);
    const xm = c + R * 0.55 * Math.cos(ang), ym = c + R * 0.55 * Math.sin(ang);
    const perp = ang + Math.PI / 2;
    const bx1 = xm + R * 0.18 * Math.cos(perp), by1 = ym + R * 0.18 * Math.sin(perp);
    const bx2 = xm - R * 0.18 * Math.cos(perp), by2 = ym - R * 0.18 * Math.sin(perp);
    ejes += `<line x1="${c}" y1="${c}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${xm}" y1="${ym}" x2="${bx1}" y2="${by1}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" />
      <line x1="${xm}" y1="${ym}" x2="${bx2}" y2="${by2}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" />`;
  }
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${anillos(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.46}" fill="#0b1210" stroke="${color}" stroke-width="2" />
    ${ejes}
    <circle cx="${c}" cy="${c}" r="2.4" fill="${color}" />
  </svg>`;
  return divIcon(html, size);
}

export function crearIconoViento(size = 38, deg = 0, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.ZONDA;
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${anillos(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.46}" fill="#0b1210" stroke="${color}" stroke-width="2" />
    <g transform="rotate(${deg} ${c} ${c})">
      <path d="M ${c} ${c - size * 0.28} L ${c - size * 0.15} ${c + size * 0.1} L ${c} ${c + size * 0.02} L ${c + size * 0.15} ${c + size * 0.1} Z"
            fill="${color}" />
      <line x1="${c}" y1="${c + size * 0.02}" x2="${c}" y2="${c + size * 0.24}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
    </g>
  </svg>`;
  return divIcon(html, size);
}

// Cumulonimbo: cuerpo de nube oscuro con "yunque" (chato arriba) +
// granizo + un rayo chico — así se lee como tormenta severa, no como
// lluvia común.
export function crearIconoGranizo(size = 42, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.GRANIZO;
  const s = size / 42;
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${anillos(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.46}" fill="#0b1210" stroke="${color}" stroke-width="2" />
    <g transform="translate(${c - 21 * s}, ${c - 17 * s}) scale(${s})">
      <path d="M8 24 a6 6 0 0 1 0.5 -11.8 a8 8 0 0 1 15.4 -1 a9 9 0 0 1 8.6 5.3 a6 6 0 0 1 -2.5 11.5 Z"
            fill="${color}" opacity="0.95" />
      <path d="M4 24 h30" stroke="#0b1210" stroke-width="1.4" opacity="0.25" />
    </g>
    <path d="M ${c - 2} ${c + 7} l -3.4 5.6 h3.2 l -2.4 4.6" stroke="#fde047" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${c - 7}" cy="${c + 13}" r="1.7" fill="${color}" />
    <circle cx="${c + 7}" cy="${c + 12}" r="1.7" fill="${color}" />
  </svg>`;
  return divIcon(html, size);
}

// Nimboestrato: nube más redondeada/pareja (sin yunque), color más claro,
// con líneas de lluvia en vez de granizo+rayo.
export function crearIconoLluvia(size = 42, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.LLUVIA;
  const s = size / 42;
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${anillos(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.46}" fill="#0b1210" stroke="${color}" stroke-width="2" />
    <g transform="translate(${c - 20 * s}, ${c - 15 * s}) scale(${s})">
      <ellipse cx="20" cy="15" rx="15" ry="8.5" fill="${color}" opacity="0.9" />
      <circle cx="10" cy="13" r="7" fill="${color}" opacity="0.9" />
      <circle cx="28" cy="11" r="8" fill="${color}" opacity="0.9" />
    </g>
    <line x1="${c - 7}" y1="${c + 7}" x2="${c - 9.5}" y2="${c + 14}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
    <line x1="${c}" y1="${c + 8}" x2="${c - 2.5}" y2="${c + 15}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
    <line x1="${c + 7}" y1="${c + 7}" x2="${c + 4.5}" y2="${c + 14}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
  </svg>`;
  return divIcon(html, size);
}

const FABRICAS = { HELADA: crearIconoHelada, ZONDA: crearIconoViento, GRANIZO: crearIconoGranizo, LLUVIA: crearIconoLluvia };

export function crearIconoCategoria(categoria, opts = {}) {
  const f = FABRICAS[categoria] || crearIconoGranizo;
  if (categoria === 'ZONDA') return f(opts.size, opts.deg ?? 0, opts.activo);
  return f(opts.size, opts.activo);
}

// Escala oficial de severidad del SMN (CAP: minor/moderate/severe/extreme),
// la misma que se usa en el radar/alertas oficiales — así el color de cada
// polígono en el mapa significa lo mismo que en la app del SMN.
export const COLOR_SEVERIDAD = {
  extreme: '#a855f7',
  severe: '#ef4444',
  moderate: '#f97316',
  minor: '#eab308',
};
export function colorSeveridad(severidad) {
  return COLOR_SEVERIDAD[(severidad || '').toLowerCase()] || '#94a3b8';
}
