import * as XLSX from 'xlsx';

export function exportarFiltrado(nombreBase, columnas, filas) {
  const datos = [columnas, ...filas.map((f) => columnas.map((c) => f[c] ?? ''))];
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  hoja['!cols'] = columnas.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, 'Datos');
  const nombre = `${nombreBase.replace(/\.[^.]+$/, '')}-filtrado.xlsx`;
  XLSX.writeFile(wb, nombre);
}
