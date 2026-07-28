// Implementación de prueba (sin conexión externa) para poder usar y
// mostrar todo el flujo de la sección de Tracking mientras no esté
// autorizada/definida la forma real de obtener el estado de cada envío
// (API oficial del carrier, o el enfoque de scraping vía función
// serverless descrito en `realScraper.js`).
//
// Simula una demora de red y devuelve, por cada waybill, un estado y una
// fecha de entrega aleatorios (o ninguno, para representar "no procesado").
const ESTADOS_NO_ENTREGADO = ['Out for Delivery', 'In Transit', 'Exception'];

function fechaAleatoriaReciente() {
  const hoy = new Date();
  const dias = Math.floor(Math.random() * 5);
  const fecha = new Date(hoy.getTime() - dias * 24 * 60 * 60 * 1000);
  return fecha.toLocaleDateString('en-US');
}

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeBatch(items, onProgress) {
  const resultados = [];

  for (const item of items) {
    await esperar(15);
    const entregado = Math.random() > 0.35;
    resultados.push({
      waybill: item.waybill,
      carrier: item.carrier,
      status: entregado
        ? 'Delivered'
        : ESTADOS_NO_ENTREGADO[Math.floor(Math.random() * ESTADOS_NO_ENTREGADO.length)],
      deliveryDate: entregado ? fechaAleatoriaReciente() : null,
    });
    if (onProgress) onProgress(resultados.length, items.length);
  }

  return resultados;
}
