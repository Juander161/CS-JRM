import { describe, it, expect } from 'vitest';
import { extraerClaveDia, agruparBusquedasPorDia } from '../utils/exportExcelStyled.js';

describe('extraerClaveDia', () => {
  it('deja igual el nombre del primer truck del día (sin sufijo)', () => {
    expect(extraerClaveDia('Truck Shipment Jul 28 2026')).toBe('Truck Shipment Jul 28 2026');
  });

  it('quita la letra de sufijo de trucks adicionales del mismo día', () => {
    expect(extraerClaveDia('Truck Shipment Jul 28 2026A')).toBe('Truck Shipment Jul 28 2026');
    expect(extraerClaveDia('Truck Shipment Jul 28 2026B')).toBe('Truck Shipment Jul 28 2026');
    expect(extraerClaveDia('Truck Shipment Jul 28 2026C')).toBe('Truck Shipment Jul 28 2026');
  });

  it('usa el texto completo si no termina en año de 4 dígitos (+ letra opcional)', () => {
    expect(extraerClaveDia('Andén 3')).toBe('Andén 3');
  });
});

describe('agruparBusquedasPorDia', () => {
  it('agrupa los 4 trucks de un mismo día en un solo grupo, ordenados', () => {
    const busquedas = [
      { scanLocation: 'Truck Shipment Jul 28 2026C', resultados: [] },
      { scanLocation: 'Truck Shipment Jul 28 2026', resultados: [] },
      { scanLocation: 'Truck Shipment Jul 28 2026A', resultados: [] },
      { scanLocation: 'Truck Shipment Jul 28 2026B', resultados: [] },
    ];

    const grupos = agruparBusquedasPorDia(busquedas);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].dia).toBe('Truck Shipment Jul 28 2026');
    expect(grupos[0].trucks.map((t) => t.scanLocation)).toEqual([
      'Truck Shipment Jul 28 2026',
      'Truck Shipment Jul 28 2026A',
      'Truck Shipment Jul 28 2026B',
      'Truck Shipment Jul 28 2026C',
    ]);
  });

  it('separa trucks de días distintos en grupos distintos', () => {
    const busquedas = [
      { scanLocation: 'Truck Shipment Jul 28 2026', resultados: [] },
      { scanLocation: 'Truck Shipment Jul 29 2026', resultados: [] },
    ];

    const grupos = agruparBusquedasPorDia(busquedas);

    expect(grupos.map((g) => g.dia).sort()).toEqual([
      'Truck Shipment Jul 28 2026',
      'Truck Shipment Jul 29 2026',
    ]);
  });
});
