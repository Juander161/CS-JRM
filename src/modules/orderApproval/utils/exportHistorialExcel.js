import ExcelJS from 'exceljs';

const COLOR_HEADER = 'FF2E75B6';
const COLOR_HEADER_TEXTO = 'FFFFFFFF';
const COLOR_POR_ESTADO = {
  Aprobado: 'FF2E7D32',
  Rechazado: 'FFC62828',
  Revisar: 'FF92400E',
  'Sin dato': 'FF475569',
};

// Exporta el historial de comparaciones evaluadas durante la sesión (todas
// las solicitudes procesadas, no solo la última) como respaldo de qué se
// aprobó/rechazó y por qué durante la jornada.
export async function exportarHistorialExcel(historial) {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet('Historial del día');

  hoja.addRow([`Historial de Order Approval — ${new Date().toLocaleString()}`]);
  hoja.getRow(1).font = { bold: true, size: 14 };
  hoja.addRow([]);

  const filaEncabezado = hoja.addRow([
    'Hora', 'BO#', 'Cliente', 'Rep', 'RDD', 'Item', 'Descripción',
    'Qty solicitada', 'Cantidad disponible', '% consumo', 'Estado', 'Motivo',
  ]);
  filaEncabezado.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: COLOR_HEADER_TEXTO } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    celda.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  historial.forEach((entrada) => {
    entrada.solicitud.items.forEach((item) => {
      const fila = hoja.addRow([
        entrada.hora,
        entrada.solicitud.bo,
        entrada.solicitud.cliente,
        entrada.solicitud.rep,
        entrada.solicitud.rddRaw,
        item.itemCode,
        item.descripcionInventario || item.descripcion,
        item.qty,
        item.disponible === null ? '' : item.disponible,
        item.porcentajeConsumo === null ? '' : item.porcentajeConsumo,
        item.estado,
        item.motivo,
      ]);
      fila.getCell(10).numFmt = '0.0%';
      const color = COLOR_POR_ESTADO[item.estado];
      if (color) fila.getCell(11).font = { color: { argb: color }, bold: true };
    });
  });

  hoja.columns = [
    { width: 10 }, { width: 14 }, { width: 26 }, { width: 18 }, { width: 12 },
    { width: 16 }, { width: 30 }, { width: 14 }, { width: 16 }, { width: 12 },
    { width: 14 }, { width: 40 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `historial-order-approval-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
