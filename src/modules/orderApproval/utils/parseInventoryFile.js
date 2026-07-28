import * as XLSX from 'xlsx';

// ⚠ Pendiente de confirmar (ver documento de reglas): el nombre exacto y
// orden de las columnas del Excel de disponibilidad. Mientras se confirma,
// se detectan por nombre entre varias variantes razonables en vez de asumir
// un orden de columnas fijo.
const CANDIDATOS_ITEM = ['ITEM', 'CODIGO DE ITEM', 'CÓDIGO DE ITEM', 'CODIGO', 'ITEM CODE'];
const CANDIDATOS_DESCRIPCION = ['DESCRIPCION', 'DESCRIPCIÓN', 'DESCRIPTION'];
const CANDIDATOS_DISPONIBLE = ['CANTIDAD DISPONIBLE', 'DISPONIBLE', 'QTY DISPONIBLE', 'AVAILABLE'];
const CANDIDATOS_DEMANDA = ['DEMANDA', 'CONSUMO', 'DEMANDA/CONSUMO', 'DEMAND'];

function normalizar(valor) {
  return String(valor).trim().toUpperCase();
}

function encontrarClave(claves, candidatos) {
  return claves.find((clave) => candidatos.includes(normalizar(clave)));
}

// Lee la primera hoja del Excel y devuelve un mapa por código de Item con
// la cantidad disponible (y demanda/consumo si el archivo la trae).
export async function parseInventoryFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(primeraHoja, { defval: '' });

  const inventario = new Map();
  if (!filas.length) return inventario;

  const claves = Object.keys(filas[0]);
  const claveItem = encontrarClave(claves, CANDIDATOS_ITEM);
  const claveDescripcion = encontrarClave(claves, CANDIDATOS_DESCRIPCION);
  const claveDisponible = encontrarClave(claves, CANDIDATOS_DISPONIBLE);
  const claveDemanda = encontrarClave(claves, CANDIDATOS_DEMANDA);

  if (!claveItem || !claveDisponible) {
    throw new Error(
      'No se encontraron las columnas de Item y/o Cantidad Disponible en el Excel. ' +
        'Revisa que el archivo tenga columnas reconocibles (ver ayuda de la sección).'
    );
  }

  for (const fila of filas) {
    const codigo = normalizar(fila[claveItem]);
    if (!codigo) continue;
    inventario.set(codigo, {
      itemCode: codigo,
      descripcion: claveDescripcion ? String(fila[claveDescripcion]).trim() : '',
      disponible: Number(fila[claveDisponible]) || 0,
      demanda: claveDemanda ? Number(fila[claveDemanda]) || 0 : null,
    });
  }

  return inventario;
}
