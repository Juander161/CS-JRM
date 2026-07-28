// Estructura lista para cuando exista una forma real y autorizada de
// consultar el estado de cada tracking (API oficial del carrier, o una
// función serverless propia). Hoy NO está conectado a nada: la página de
// Tracking usa `mockScraper.js` por defecto.
//
// Para activarlo en el futuro:
//   1. Definir e implementar el endpoint del lado servidor (ver
//      `api/scrape.js`, hoy también un stub) usando la API/mecanismo ya
//      autorizado.
//   2. Cambiar el import en TrackingPage.jsx de `mockScraper.js` a este
//      archivo.
const TAMANO_LOTE = 15;

async function scrapeLote(items) {
  const respuesta = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!respuesta.ok) {
    const errorTexto = await respuesta.text();
    throw new Error(`Error del servidor: ${respuesta.status} - ${errorTexto}`);
  }

  const datos = await respuesta.json();
  return datos.resultados;
}

export async function scrapeBatch(items, onProgress) {
  const resultados = [];

  for (let i = 0; i < items.length; i += TAMANO_LOTE) {
    const lote = items.slice(i, i + TAMANO_LOTE);
    try {
      const lotesResueltos = await scrapeLote(lote);
      resultados.push(...lotesResueltos);
    } catch (error) {
      lote.forEach((item) => {
        resultados.push({
          waybill: item.waybill,
          carrier: item.carrier,
          status: 'Error al consultar',
          deliveryDate: null,
        });
      });
      console.error('Error en lote de consulta:', error);
    }

    if (onProgress) onProgress(resultados.length, items.length);
  }

  return resultados;
}
