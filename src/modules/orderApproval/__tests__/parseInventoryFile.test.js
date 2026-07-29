import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseInventoryArrayBuffer } from '../utils/parseInventoryFile.js';

// Replica la estructura real del "Reporte OH": columna "Item" duplicada
// (SheetJS la renombra a "Item_1"), varias filas por el mismo código de
// Item (distintos Locators) que hay que sumar, más una hoja "QC MEX" que
// NO debe contarse como disponible (según lo confirmado con el usuario).
function construirWorkbookDePrueba() {
  const datosOH = [
    ['Item', 'Item', 'Locator', 'Item Description', 'On-hand Qty'],
    [1000029486, 'CAP', 'WCO-STAGING---', 'CAP: FINE QUALITY', 1],
    [1000029486, 'CAP', 'WCO-122-0030-A-', 'CAP: FINE QUALITY', 5],
    [2000097477, 'SERVICE', 'WCO-DEFAULT---', 'SERVICE: RETURN.ALTERATION.', 300],
  ];
  const datosQC = [
    ['Item', 'Item', 'Locator', 'Item Description', 'On-hand Qty'],
    [2000097477, 'SERVICE', 'QC MEX-PE-JRM--', 'SERVICE: RETURN.ALTERATION.', 999],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(datosOH), 'OH');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(datosQC), 'QC MEX');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return buffer;
}

describe('parseInventoryArrayBuffer con el formato real del Reporte OH', () => {
  const inventario = parseInventoryArrayBuffer(construirWorkbookDePrueba());

  it('usa la hoja "OH" en vez de otras hojas del archivo', () => {
    // Si hubiera tomado QC MEX, 2000097477 valdría 999 en vez de 300.
    expect(inventario.get('2000097477').disponible).toBe(300);
  });

  it('suma el disponible del mismo Item repetido en distintos Locators', () => {
    expect(inventario.get('1000029486').disponible).toBe(6);
  });

  it('no confunde la columna "Item" duplicada (Item_1) con la descripción', () => {
    const item = inventario.get('1000029486');
    expect(item.descripcion).toBe('CAP: FINE QUALITY');
  });
});
