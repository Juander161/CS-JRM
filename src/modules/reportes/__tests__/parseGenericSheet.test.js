import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseGenericSheet, validarEstructuraReporte } from '../utils/parseGenericSheet.js';

function construirBuffer(filas) {
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, hoja, 'Datos');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

describe('parseGenericSheet', () => {
  it('detecta columnas y filas de un reporte arbitrario', () => {
    const buffer = construirBuffer([
      ['Folio', 'Cliente', 'Estatus'],
      ['A-1', 'Cliente 1', 'Pendiente'],
      ['A-2', 'Cliente 2', 'Aprobado'],
    ]);
    const { columnas, filas } = parseGenericSheet(buffer);
    expect(columnas).toEqual(['Folio', 'Cliente', 'Estatus']);
    expect(filas).toHaveLength(2);
    expect(filas[0].Cliente).toBe('Cliente 1');
  });
});

describe('validarEstructuraReporte', () => {
  it('rechaza un archivo sin filas de datos', () => {
    const buffer = construirBuffer([['Folio', 'Cliente']]);
    const resultado = parseGenericSheet(buffer);
    expect(() => validarEstructuraReporte(resultado)).toThrow(/filas de datos/);
  });

  it('acepta un archivo con al menos una fila y columnas con nombre', () => {
    const buffer = construirBuffer([
      ['Folio', 'Cliente'],
      ['A-1', 'Cliente 1'],
    ]);
    const resultado = parseGenericSheet(buffer);
    expect(() => validarEstructuraReporte(resultado)).not.toThrow();
  });
});
