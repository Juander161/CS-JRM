import { loadJSON, saveJSON } from '../../../services/storage/localStore.js';

const STORAGE_KEY = 'tracking-carriers-whitelist';

// Lista blanca inicial de carriers a considerar (ver documento del proyecto
// de trackings). Es editable desde la propia sección de Tracking, sin
// necesidad de tocar código, y queda guardada en localStorage.
const CARRIERS_POR_DEFECTO = [
  'UPS_SP.1P',
  'UPS GROUND',
  'UPS-1D',
  'UPS-2D',
  'UPS-3D',
  'POS-1C',
  'UPS-CP',
];

export function getCarriersWhitelist() {
  return loadJSON(STORAGE_KEY, CARRIERS_POR_DEFECTO);
}

export function addCarrier(carrier) {
  const actuales = getCarriersWhitelist();
  const valor = carrier.trim();
  if (!valor || actuales.includes(valor)) return actuales;
  const nuevos = [...actuales, valor];
  saveJSON(STORAGE_KEY, nuevos);
  return nuevos;
}

export function removeCarrier(carrier) {
  const nuevos = getCarriersWhitelist().filter((c) => c !== carrier);
  saveJSON(STORAGE_KEY, nuevos);
  return nuevos;
}
