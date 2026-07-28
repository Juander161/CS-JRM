import ExcelJS from 'exceljs';

const COLOR_HEADER = 'FF2E75B6';
const COLOR_HEADER_TEXTO = 'FFFFFFFF';
const COLOR_PROCESADO = 'FF2E7D32';
const COLOR_NO_PROCESADO = 'FFC62828';

function estiloEncabezado(fila) {
  fila.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: COLOR_HEADER_TEXTO } };
    celda.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_HEADER },
    };
    celda.alignment = { vertical: 'middle', horizontal: 'center' };
    celda.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

function construirResumenPorCarrier(resultados) {
  const grupos = {};
  resultados.forEach((r) => {
    if (!grupos[r.carrier]) grupos[r.carrier] = [];
    grupos[r.carrier].push(r);
  });

  return Object.entries(grupos)
    .map(([carrier, items]) => {
      const total = items.length;
      const procesados = items.filter((r) => r.deliveryDate).length;
      const noProcesados = total - procesados;
      return {
        carrier,
        total,
        procesados,
        noProcesados,
        porcentajeProcesado: procesados / total,
        porcentajeNoProcesado: noProcesados / total,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function nombreHojaSeguro(nombre) {
  return String(nombre).replace(/[\\/?*[\]]/g, '-').slice(0, 31);
}

function construirHojaTruck(workbook, scanLocation, resultados) {
  const nombreHoja = nombreHojaSeguro(scanLocation);

  const hojaExistente = workbook.getWorksheet(nombreHoja);
  if (hojaExistente) {
    workbook.removeWorksheet(hojaExistente.id);
  }

  const hoja = workbook.addWorksheet(nombreHoja);

  hoja.addRow([`Reporte de trackings — ${scanLocation}`]);
  hoja.getRow(1).font = { bold: true, size: 14 };
  hoja.addRow([`Generado: ${new Date().toLocaleString()}`]);
  hoja.addRow([]);

  hoja.addRow(['Resumen por Carrier']).font = { bold: true, size: 12 };
  const filaEncabezadoResumen = hoja.addRow([
    'Carrier', 'Total', 'Procesados', '% Procesado', 'No Procesados', '% No Procesado',
  ]);
  estiloEncabezado(filaEncabezadoResumen);

  const resumen = construirResumenPorCarrier(resultados);
  resumen.forEach((r) => {
    const fila = hoja.addRow([
      r.carrier, r.total, r.procesados, r.porcentajeProcesado, r.noProcesados, r.porcentajeNoProcesado,
    ]);
    fila.getCell(4).numFmt = '0.0%';
    fila.getCell(4).font = { color: { argb: COLOR_PROCESADO }, bold: true };
    fila.getCell(6).numFmt = '0.0%';
    fila.getCell(6).font = { color: { argb: COLOR_NO_PROCESADO }, bold: true };
  });

  hoja.addRow([]);

  hoja.addRow(['Detalle de trackings']).font = { bold: true, size: 12 };
  const filaEncabezadoDetalle = hoja.addRow([
    'Waybill', 'Carrier', 'Estado', 'Fecha de entrega', 'Procesado',
  ]);
  estiloEncabezado(filaEncabezadoDetalle);

  resultados.forEach((r) => {
    const fila = hoja.addRow([
      r.waybill, r.carrier, r.status, r.deliveryDate || '', r.deliveryDate ? 'Sí' : 'No',
    ]);
    const celdaProcesado = fila.getCell(5);
    celdaProcesado.font = {
      color: { argb: r.deliveryDate ? COLOR_PROCESADO : COLOR_NO_PROCESADO },
      bold: true,
    };
  });

  hoja.columns = [
    { width: 24 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 14 },
  ];

  return hoja;
}

async function descargarWorkbook(workbook, nombreArchivo) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

export async function crearArchivoNuevo(scanLocation, resultados) {
  const workbook = new ExcelJS.Workbook();
  construirHojaTruck(workbook, scanLocation, resultados);
  await descargarWorkbook(workbook, 'reporte-trackings.xlsx');
}

export async function actualizarArchivoExistente(file, scanLocation, resultados) {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  construirHojaTruck(workbook, scanLocation, resultados);
  await descargarWorkbook(workbook, file.name);
}
