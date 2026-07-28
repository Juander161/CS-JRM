// Parsea el texto tal como se pega desde el correo de Order Approval.
// Formato observado (correos auto-generados con formato estructurado):
//
//   PRDF: RDD 24-JUL-26, Event Date N/A, SLADE JAN, Rep SLADE JAN, BO# 95637276
//   Item [2000097477]    Qty [1]    Description [SERVICE: RETURN.ALTERATION.]
//   Item [1012010779]    Qty [13]   Description [PRODUCT PACKAGE: ...]
//
// Un mismo bloque de texto puede traer varias solicitudes (varios BO#) una
// tras otra; cada una se separa por su propia línea "PRDF: ...".
//
// Los correos con preguntas específicas (fuera de este formato con BO#)
// quedan fuera de esta primera fase, tal como se definió en el documento de
// reglas de negocio: no se intentan interpretar aquí.

const MESES = {
  ENE: 0, JAN: 0,
  FEB: 1,
  MAR: 2,
  ABR: 3, APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AGO: 7, AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DIC: 11, DEC: 11,
};

const HEADER_REGEX =
  /PRDF:\s*RDD\s*([^,]+),\s*Event Date\s*([^,]+),\s*(.+?),\s*Rep\s+(.+?),\s*BO#\s*(\S+)/i;

const ITEM_REGEX = /Item\s*\[([^\]]*)\]\s*Qty\s*\[([^\]]*)\]\s*Description\s*\[([^\]]*)\]/i;

export function parseRddDate(rddRaw) {
  const match = String(rddRaw).trim().match(/^(\d{1,2})-([A-Za-zÁ-Úá-ú]{3})-(\d{2,4})$/);
  if (!match) return null;
  const [, diaStr, mesStr, anioStr] = match;
  const mes = MESES[mesStr.toUpperCase()];
  if (mes === undefined) return null;
  const dia = Number(diaStr);
  let anio = Number(anioStr);
  if (anio < 100) anio += 2000;
  return new Date(Date.UTC(anio, mes, dia));
}

// Divide el texto pegado en líneas y va agrupando cada encabezado "PRDF: ..."
// con los renglones de artículo que le siguen, hasta el próximo encabezado.
export function parseRequestText(texto) {
  if (!texto || !texto.trim()) return [];

  const lineas = texto.split(/\r?\n/);
  const solicitudes = [];
  let actual = null;

  for (const lineaOriginal of lineas) {
    const linea = lineaOriginal.trim();
    if (!linea) continue;

    const headerMatch = linea.match(HEADER_REGEX);
    if (headerMatch) {
      const [, rddRaw, eventDate, cliente, rep, bo] = headerMatch;
      actual = {
        bo: bo.trim(),
        rddRaw: rddRaw.trim(),
        rdd: parseRddDate(rddRaw),
        eventDate: eventDate.trim(),
        cliente: cliente.trim(),
        rep: rep.trim(),
        items: [],
      };
      solicitudes.push(actual);
      continue;
    }

    const itemMatch = linea.match(ITEM_REGEX);
    if (itemMatch && actual) {
      const [, itemCode, qty, descripcion] = itemMatch;
      actual.items.push({
        itemCode: itemCode.trim(),
        qty: Number(qty.trim()) || 0,
        descripcion: descripcion.trim(),
      });
    }
  }

  return solicitudes;
}
