import * as XLSX from 'xlsx';

function normalizarClave(clave) {
  return String(clave).trim().toUpperCase();
}

function encontrarColumna(fila, nombreBuscado) {
  const claves = Object.keys(fila);
  const encontrada = claves.find((k) => normalizarClave(k) === nombreBuscado);
  return encontrada ? fila[encontrada] : undefined;
}

function filasDesdeWorkbook(workbook) {
  // Lee todas las hojas que tengan la columna WAYBILL y las combina
  const todasLasFilas = [];
  for (const nombre of workbook.SheetNames) {
    const hoja = workbook.Sheets[nombre];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });
    if (filas.length && Object.keys(filas[0]).some((k) => normalizarClave(k) === 'WAYBILL')) {
      todasLasFilas.push(...filas);
    }
  }
  return todasLasFilas;
}

function mapearRegistros(filas, carriersValidos) {
  return filas
    .map((fila) => ({
      waybill: encontrarColumna(fila, 'WAYBILL'),
      carrier: encontrarColumna(fila, 'CARRIER'),
      scanLocation: encontrarColumna(fila, 'SCAN LOCATION'),
    }))
    .filter((r) => r.waybill && r.carrier && r.scanLocation)
    .filter((r) => carriersValidos.includes(String(r.carrier).trim()));
}

export async function parseTrackingFile(file, carriersValidos) {
  const arrayBuffer = await file.arrayBuffer();
  return parseTrackingArrayBuffer(arrayBuffer, carriersValidos);
}

// Versión que trabaja desde un ArrayBuffer ya en memoria (para cuando el
// archivo viene del módulo de Reportes en vez de una subida directa).
export function parseTrackingArrayBuffer(arrayBuffer, carriersValidos) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const filas = filasDesdeWorkbook(workbook);
  return mapearRegistros(filas, carriersValidos);
}

export function extraerScanLocations(registros) {
  return [...new Set(registros.map((r) => r.scanLocation))].sort();
}

export function extraerCarriersPorLocation(registros, scanLocation) {
  return [
    ...new Set(
      registros.filter((r) => r.scanLocation === scanLocation).map((r) => r.carrier)
    ),
  ].sort();
}
