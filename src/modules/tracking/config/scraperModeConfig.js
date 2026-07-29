import { loadJSON, saveJSON } from '../../../services/storage/localStore.js';

const STORAGE_KEY = 'tracking-scraper-mode';

// 'mock'     -> datos simulados localmente (scrapers/mockScraper.js), sin
//               salir a internet. Es el modo seguro por defecto.
// 'scraping' -> consulta real contra ups.com vía la función serverless
//               /api/scrape (scrapers/realScraper.js -> api/scrape.js).
//               Mientras la API oficial de UPS no esté autorizada, esta es
//               la vía a seguir (ver comentarios en api/scrape.js).
// Cuando se autorice la API oficial, se agrega un tercer modo ('api') aquí
// y en scrapers/index.js, sin tocar el resto de la app.
export const MODOS_SCRAPER = [
  { value: 'mock', label: 'Simulado (datos de prueba)' },
  { value: 'scraping', label: 'Scraping real (ups.com)' },
];

export function getScraperMode() {
  return loadJSON(STORAGE_KEY, 'mock');
}

export function setScraperMode(modo) {
  saveJSON(STORAGE_KEY, modo);
  return modo;
}
