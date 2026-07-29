// Implementación real: llama a la función serverless `/api/scrape.js`, que
// hoy hace scraping vía navegador headless contra ups.com (mientras la API
// oficial de UPS no esté autorizada — ver comentarios en api/scrape.js).
// Se activa eligiendo "Scraping real (ups.com)" como fuente de datos en la
// barra de herramientas de Tracking (src/modules/tracking/config/
// scraperModeConfig.js decide qué implementación se usa, no un import fijo
// aquí), así que cuando se autorice la API oficial basta con agregar un
// tercer modo sin tocar TrackingPage.jsx.
//
// Lotes chicos a propósito: cada waybill implica abrir una página real y
// esperar su carga (mucho más lento que el mock), y las funciones
// serverless tienen un tiempo máximo de ejecución (ver `maxDuration` en
// api/scrape.js).
const TAMANO_LOTE = 9;

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
      const loteResuelto = await scrapeLote(lote);
      resultados.push(...loteResuelto);
    } catch (error) {
      lote.forEach((item) => {
        resultados.push({
          waybill: item.waybill,
          carrier: item.carrier,
          status: `Error al consultar: ${error.message}`,
          deliveryDate: null,
        });
      });
      console.error('Error en lote de consulta real:', error);
    }

    if (onProgress) onProgress(resultados.length, items.length);
  }

  return resultados;
}
