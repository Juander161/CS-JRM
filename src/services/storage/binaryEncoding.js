// Conversión entre ArrayBuffer y base64, para poder guardar el contenido de
// un archivo (como el Excel de disponibilidad) en sessionStorage, que solo
// admite strings.
export function arrayBufferToBase64(buffer) {
  let binario = '';
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binario += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return window.btoa(binario);
}

export function base64ToArrayBuffer(base64) {
  const binario = window.atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes.buffer;
}
