import * as mockScraper from './mockScraper.js';
import * as realScraper from './realScraper.js';

// Único punto donde se decide qué implementación de scrapeBatch(items,
// onProgress) se usa. TrackingPage no importa mockScraper/realScraper
// directamente: así, agregar el modo 'api' el día que se autorice la API
// oficial de UPS es solo sumar un caso aquí (y en scraperModeConfig.js),
// sin tocar la página ni el resto del flujo.
export function getScraper(modo) {
  return modo === 'scraping' ? realScraper : mockScraper;
}
