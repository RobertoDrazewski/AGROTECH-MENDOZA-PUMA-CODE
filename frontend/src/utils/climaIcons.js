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

// Color fijo del "punto vivo" del nodo — el mismo verde de marca que usa
// nodoVivoIcon.js en el resto del panel, así se lee igual en todos lados:
// "este punto exacto es donde está tu hardware".
const COLOR_NODO = '#9bcc44';

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

// El punto exacto del nodo: se dibuja SIEMPRE AL FINAL (encima de todo lo
// demás del ícono) para que nunca quede tapado por el símbolo de la
// contingencia (nube, copo, flecha) — antes el relleno sólido de la nube
// de Granizo/Lluvia pasaba justo por el centro y "se comía" el punto del
// nodo. Con un anillo claro de contraste se ve nítido sobre cualquier
// fondo, color o imagen satelital.
function puntoNodo(size) {
  const c = size / 2;
  const r = Math.max(2.6, size * 0.065);
  return `<circle cx="${c}" cy="${c}" r="${r + 1.3}" fill="#0b1210" />
    <circle cx="${c}" cy="${c}" r="${r + 1.3}" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.9" />
    <circle cx="${c}" cy="${c}" r="${r}" fill="${COLOR_NODO}" />`;
}

// Copo de hielo: diseño simplificado a propósito — 3 ejes (6 puntas) bien
// gruesos con una pequeña punta en diamante en cada extremo, SIN las
// ramificaciones finas de la versión anterior (a tamaño de ícono de mapa
// se veían como una mancha confusa, no como hielo). Menos líneas, más
// gruesas y contrastadas = más reconocible de un vistazo.
export function crearIconoHelada(size = 42, activo = false) {
  const c = size / 2;
  const color = COLOR_CATEGORIA.HELADA;
  const R = size * 0.36;
  let ejes = '';
  for (let i = 0; i < 6; i++) {
    const ang = (i * 60 * Math.PI) / 180;
    const x2 = c + R * Math.cos(ang), y2 = c + R * Math.sin(ang);
    // Puntita en diamante en la punta de cada eje (da la textura de
    // "cristal" sin agregar líneas extra que ensucien el ícono).
    const perp = ang + Math.PI / 2;
    const dR = R * 0.12;
    const dx1 = x2 - R * 0.16 * Math.cos(ang) + dR * Math.cos(perp), dy1 = y2 - R * 0.16 * Math.sin(ang) + dR * Math.sin(perp);
    const dx2 = x2 - R * 0.16 * Math.cos(ang) - dR * Math.cos(perp), dy2 = y2 - R * 0.16 * Math.sin(ang) - dR * Math.sin(perp);
    ejes += `<line x1="${c}" y1="${c}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.8" stroke-linecap="round" />
      <path d="M ${x2} ${y2} L ${dx1} ${dy1} L ${dx2} ${dy2} Z" fill="${color}" />`;
  }
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${anillos(color, activo, size)}
    <circle cx="${c}" cy="${c}" r="${size * 0.46}" fill="#0b1210" stroke="${color}" stroke-width="2" />
    ${ejes}
    ${puntoNodo(size)}
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
    ${puntoNodo(size)}
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
    ${puntoNodo(size)}
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
    ${puntoNodo(size)}
  </svg>`;
  return divIcon(html, size);
}

const FABRICAS = { HELADA: crearIconoHelada, ZONDA: crearIconoViento, GRANIZO: crearIconoGranizo, LLUVIA: crearIconoLluvia };

export function crearIconoCategoria(categoria, opts = {}) {
  const f = FABRICAS[categoria] || crearIconoGranizo;
  if (categoria === 'ZONDA') return f(opts.size, opts.deg ?? 0, opts.activo);
  return f(opts.size, opts.activo);
}

// Marcador simple del nodo: un beacon chico (como nodoVivoIcon.js) teñido
// con el color de la categoría, SIN dibujar un pictograma de nube/copo —
// Roberto pidió explícitamente mostrar la imagen REAL del radar sobre el
// mapa en vez de íconos inventados para representar la tormenta. Este
// marcador solo dice "acá está tu nodo", el clima lo muestra el radar de
// verdad (CapaRadar) y los polígonos oficiales del SMN.
export function crearIconoNodo(categoria, { size = 30, activo = false, deg = null } = {}) {
  const c = size / 2;
  const color = COLOR_CATEGORIA[categoria] || COLOR_NODO;
  const flecha = (categoria === 'ZONDA' && deg != null)
    ? `<g transform="rotate(${deg} ${c} ${c})">
         <path d="M ${c} ${c - size * 0.62} L ${c - size * 0.11} ${c - size * 0.38} L ${c + size * 0.11} ${c - size * 0.38} Z" fill="${color}" />
       </g>`
    : '';
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${anillos(color, activo, size)}
    ${flecha}
    ${puntoNodo(size)}
  </svg>`;
  return divIcon(html, size);
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

// Nombre en español de cada nivel, al estilo "aviso amarillo/naranja/rojo"
// que usan el SMN y los servicios meteorológicos en general (AccuWeather
// incluido) — mucho más claro de un vistazo que mostrar la palabra en
// inglés de la severidad CAP cruda.
const NOMBRE_SEVERIDAD = { extreme: 'púrpura', severe: 'rojo', moderate: 'naranja', minor: 'amarillo' };
export function nombreSeveridad(severidad) {
  return NOMBRE_SEVERIDAD[(severidad || '').toLowerCase()] || 'vigente';
}
