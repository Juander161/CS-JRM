// Implementación real: llama a la función serverless `/api/scrape.js`, que
// hoy hace scraping vía navegador headless contra ups.com (mientras la API
// oficial de UPS no esté autorizada — ver comentarios en api/scrape.js).
// Se activa eligiendo "Scraping real (ups.com)" como fuente de datos en la
// barra de herramientas de Tracking (src/modules/tracking/config/
// scraperModeConfig.js decide qué implementación se usa, no un import fijo
// aquí), así que cuando se autorice la API oficial basta con agregar un
// tercer modo sin tocar TrackingPage.jsx.
//
// Arquitectura de paralelismo:
//   - El servidor procesa máx 2 items por llamada (secuencial, para no exceder
//     el límite de 60s de Vercel — ver MAX_ITEMS_POR_LLAMADA en api/scrape.js).
//   - El cliente lanza CONCURRENCIA_FRONTEND llamadas en paralelo para
//     maximizar el throughput sin sobrecargar UPS.
//   - Ejemplo con 114 trackings y 6 workers: ~10 rondas × ~25s = ~4 min.

const TAMANO_LOTE = 2;          // items por llamada al servidor (sincronizado con MAX_ITEMS_POR_LLAMADA)
const CONCURRENCIA_FRONTEND = 6; // llamadas fetch paralelas desde el navegador

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
  // Preparar todos los lotes con su índice de destino en el array final
  const lotes = [];
  for (let i = 0; i < items.length; i += TAMANO_LOTE) {
    lotes.push({ indiceBase: i, items: items.slice(i, i + TAMANO_LOTE) });
  }

  const resultados = new Array(items.length);
  let loteSiguiente = 0;
  let completados = 0;

  async function trabajador() {
    while (loteSiguiente < lotes.length) {
      const { indiceBase, items: lote } = lotes[loteSiguiente++];
      try {
        const loteResuelto = await scrapeLote(lote);
        lote.forEach((_, i) => {
          resultados[indiceBase + i] = loteResuelto[i];
        });
      } catch (error) {
        lote.forEach((item, i) => {
          resultados[indiceBase + i] = {
            waybill: item.waybill,
            carrier: item.carrier,
            status: `Error al consultar: ${error.message}`,
            deliveryDate: null,
          };
        });
        console.error('Error en lote de consulta real:', error);
      }
      completados += lote.length;
      if (onProgress) onProgress(completados, items.length);
    }
  }

  const numWorkers = Math.min(CONCURRENCIA_FRONTEND, lotes.length);
  await Promise.all(Array.from({ length: numWorkers }, trabajador));

  return resultados;
}
