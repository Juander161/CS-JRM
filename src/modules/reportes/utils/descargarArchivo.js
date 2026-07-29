// Dispara la descarga de un ArrayBuffer ya en memoria con el nombre
// original del archivo (usado para "Descargar" desde el historial de
// reportes, reutilizando el mismo patrón que los exportadores de Excel).
export function descargarArchivo(nombreArchivo, arrayBuffer) {
  const blob = new Blob([arrayBuffer]);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
