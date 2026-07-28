// Placeholder para las futuras APIs oficiales de los carriers (UPS,
// FedEx, USPS) mencionadas en el proyecto de Tracking, como alternativa
// preferible al scraping una vez que se autoricen/contraten.
//
// Uso previsto una vez autorizado: reemplazar
// `src/modules/tracking/scrapers/mockScraper.js` (y el enfoque de
// scraping de `realScraper.js`) por consultas directas a estas APIs.
//
// Mientras no haya credenciales/autorización, cada función lanza un
// error explícito; el flujo actual de Tracking sigue usando datos
// simulados (mockScraper.js).

export async function consultarTrackingUPS(_waybill) {
  throw new Error('carrierApiService.consultarTrackingUPS: la API oficial de UPS todavía no está configurada.');
}

export async function consultarTrackingFedEx(_waybill) {
  throw new Error('carrierApiService.consultarTrackingFedEx: la API oficial de FedEx todavía no está configurada.');
}

export async function consultarTrackingUSPS(_waybill) {
  throw new Error('carrierApiService.consultarTrackingUSPS: la API oficial de USPS todavía no está configurada.');
}
