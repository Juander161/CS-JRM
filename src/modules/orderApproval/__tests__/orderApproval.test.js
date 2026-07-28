import { describe, it, expect } from 'vitest';
import { parseRequestText, parseRddDate } from '../utils/parseRequestText.js';
import { evaluarSolicitudes } from '../utils/evaluateRules.js';

const TEXTO_EJEMPLO = `
PRDF: RDD 24-JUL-26, Event Date N/A, SLADE JAN, Rep SLADE JAN, BO# 95637276
Item [2000097477]    Qty [1]    Description [SERVICE: RETURN.ALTERATION.]
PRDF: RDD 31-JUL-26, Event Date N/A, JOSTENS COLLEGE PREPAID C&G, Rep FLANAGAN GREG, BO# 95628302
Item [2000097477]    Qty [5]    Description [SERVICE: RETURN.ALTERATION.]
Item [9999999999]    Qty [2]    Description [ITEM SIN INVENTARIO]
`;

describe('parseRddDate', () => {
  it('interpreta día-mes-año de 2 dígitos', () => {
    const fecha = parseRddDate('24-JUL-26');
    expect(fecha.getUTCFullYear()).toBe(2026);
    expect(fecha.getUTCMonth()).toBe(6); // julio = índice 6
    expect(fecha.getUTCDate()).toBe(24);
  });
});

describe('parseRequestText', () => {
  it('agrupa cada encabezado PRDF con sus artículos', () => {
    const solicitudes = parseRequestText(TEXTO_EJEMPLO);
    expect(solicitudes).toHaveLength(2);
    expect(solicitudes[0].bo).toBe('95637276');
    expect(solicitudes[0].cliente).toBe('SLADE JAN');
    expect(solicitudes[0].items).toHaveLength(1);
    expect(solicitudes[1].bo).toBe('95628302');
    expect(solicitudes[1].items).toHaveLength(2);
    expect(solicitudes[1].items[0].qty).toBe(5);
  });
});

describe('evaluarSolicitudes', () => {
  const inventario = new Map([
    ['2000097477', { itemCode: '2000097477', descripcion: 'Alteración', disponible: 100, demanda: 50 }],
  ]);
  const ahora = new Date(2026, 6, 28); // 28-jul-2026, coincide con la fecha del contexto de la tarea

  it('rechaza automáticamente cuando el RDD está a menos del margen de días', () => {
    const solicitudes = parseRequestText(TEXTO_EJEMPLO);
    const [conRddVencido] = evaluarSolicitudes([solicitudes[0]], inventario, {
      umbralPorcentaje: 0.3,
      margenDiasRdd: 3,
      ahora,
    });
    expect(conRddVencido.items[0].estado).toBe('Rechazado');
    expect(conRddVencido.items[0].motivo).toMatch(/RDD/);
  });

  it('aprueba cuando el consumo está por debajo del umbral y el RDD tiene margen suficiente', () => {
    const solicitudes = parseRequestText(TEXTO_EJEMPLO);
    const [evaluada] = evaluarSolicitudes([solicitudes[1]], inventario, {
      umbralPorcentaje: 0.3,
      margenDiasRdd: 3,
      ahora,
    });
    // 5 / 100 = 5% < 30% => Aprobado
    expect(evaluada.items[0].estado).toBe('Aprobado');
    // item sin inventario => Sin dato
    expect(evaluada.items[1].estado).toBe('Sin dato');
  });
});
