import * as XLSX from 'xlsx';

// A diferencia de Order Approval (que tiene un formato de columnas ya
// conocido), un reporte cargado aquí puede traer cualquier estructura de
// columnas. Por eso este parser es genérico: lee la primera hoja y
// devuelve las columnas (en el orden del encabezado) y las filas como
// objetos planos, listos para mostrarse en una tabla con filtro/búsqueda.
export function parseGenericSheet(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

  const columnas = filas.length ? Object.keys(filas[0]) : [];

  return { columnas, filas };
}

// Validación de estructura al momento de la carga (ver "Previsiones del
// Proyecto" del documento de la plataforma centralizada: los reportes
// manuales pueden traer formatos inconsistentes y eso no debe romper el
// resto de la app en silencio). Se valida lo mínimo indispensable: que se
// haya podido leer al menos una fila con al menos una columna con nombre.
export function validarEstructuraReporte({ columnas, filas }) {
  if (!filas.length) {
    throw new Error('El archivo no tiene filas de datos (¿está vacío o es solo un encabezado?).');
  }
  if (!columnas.length) {
    throw new Error('No se pudo detectar ninguna columna en la primera fila del archivo.');
  }
  const columnasSinNombre = columnas.filter((c) => c.startsWith('__EMPTY') || !c.trim());
  if (columnasSinNombre.length === columnas.length) {
    throw new Error('El archivo no parece tener un encabezado de columnas válido.');
  }
}
