import { loadJSON, saveJSON } from '../../../services/storage/localStore.js';

const STORAGE_KEY = 'reportes-tipos';

// Lista inicial de tipos de reporte, editable desde la propia sección
// (igual que la lista blanca de carriers en Tracking), ya que la
// clasificación real de reportes de la oficina puede ir creciendo.
const TIPOS_POR_DEFECTO = [
  'Inventario (OH)',
  'Backorders',
  'Envíos',
  'Producción',
  'Otro',
];

export function getTiposReporte() {
  return loadJSON(STORAGE_KEY, TIPOS_POR_DEFECTO);
}

export function addTipoReporte(tipo) {
  const actuales = getTiposReporte();
  const valor = tipo.trim();
  if (!valor || actuales.includes(valor)) return actuales;
  const nuevos = [...actuales, valor];
  saveJSON(STORAGE_KEY, nuevos);
  return nuevos;
}

export function removeTipoReporte(tipo) {
  const nuevos = getTiposReporte().filter((t) => t !== tipo);
  saveJSON(STORAGE_KEY, nuevos);
  return nuevos;
}
