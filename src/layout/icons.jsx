import React from 'react';

// Iconos de línea simples (sin dependencias externas) para la barra
// lateral. Todos comparten el mismo viewBox/stroke para verse consistentes
// en modo expandido y colapsado.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconInicio() {
  return (
    <svg {...base}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function IconOrderApproval() {
  return (
    <svg {...base}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

export function IconTracking() {
  return (
    <svg {...base}>
      <rect x="2" y="7" width="13" height="10" rx="1" />
      <path d="M15 10h3.5l3 3.2V17h-2" />
      <circle cx="7" cy="18.5" r="1.6" />
      <circle cx="17" cy="18.5" r="1.6" />
    </svg>
  );
}

export function IconReportes() {
  return (
    <svg {...base}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function IconAdmin() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.4-2-3.4-2.3.8a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.4 2.3a7.5 7.5 0 0 0-1.7 1l-2.3-.8-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.4 2 3.4 2.3-.8a7.5 7.5 0 0 0 1.7 1L11 21h4l.4-2.3a7.5 7.5 0 0 0 1.7-1l2.3.8 2-3.4-2-1.4Z" />
    </svg>
  );
}

export function IconColapsarIzquierda() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M9 4v16" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m14 10-2 2 2 2" />
    </svg>
  );
}

export function IconColapsarDerecha() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M9 4v16" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m12 10 2 2-2 2" />
    </svg>
  );
}
