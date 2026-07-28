import * as XLSX from 'xlsx';

function normalizarClave(clave) {
  return String(clave).trim().toUpperCase();
}

function encontrarColumna(fila, nombreBuscado) {
  const claves = Object.keys(fila);
  const encontrada = claves.find((k) => normalizarClave(k) === nombreBuscado);
  return encontrada ? fila[encontrada] : undefined;
}

export async function parseTrackingFile(file, carriersValidos) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(primeraHoja, { defval: '' });

  const registros = filas
    .map((fila) => ({
      waybill: encontrarColumna(fila, 'WAYBILL'),
      carrier: encontrarColumna(fila, 'CARRIER'),
      scanLocation: encontrarColumna(fila, 'SCAN LOCATION'),
    }))
    .filter((r) => r.waybill && r.carrier && r.scanLocation)
    .filter((r) => carriersValidos.includes(String(r.carrier).trim()));

  return registros;
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
