// Función serverless (Vercel) que consulta el estado real de un lote de
// trackings en ups.com mediante un navegador headless (puppeteer-core +
// @sparticuz/chromium). Es la "vía de contingencia" mientras la API oficial
// de UPS no esté autorizada (ver ReadMe / conversación del proyecto): una
// vez que se autorice la API, este archivo se reemplaza por la llamada a
// esa API sin tocar el resto de la app (src/modules/tracking/scrapers/
// index.js es el único lugar que decide qué fuente de datos se usa).
//
// ADVERTENCIA: hacer scraping del sitio de UPS puede violar sus Términos de
// Servicio. Usar solo si ya se evaluó y aceptó ese riesgo para este caso de
// uso interno (revisión de envíos propios).
//
// LIMITACIÓN IMPORTANTE DE ESTA IMPLEMENTACIÓN: se escribió sin poder
// acceder a ups.com en vivo (el entorno donde se generó este código bloquea
// la salida a ese dominio), así que los selectores en
// `extraerResultadoDePagina()` son un punto de partida basado en patrones
// conocidos del sitio, NO verificados contra la página real. Ese es el
// primer lugar a revisar si las pruebas en vivo fallan: abrir
// https://www.ups.com/track?tracknum=<uno real> en un navegador, usar F12
// para inspeccionar el bloque de estado/fecha de entrega, y actualizar los
// selectores ahí.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Vercel: sube el límite de tiempo de esta función.
// Hobby plan: máx 60s. Pro plan: hasta 300s.
export const config = {
  maxDuration: 60,
};

// Cada invocación procesa máx 2 items (secuencial dentro del handler) para
// completar bien dentro del límite de 60s. El frontend paraliza N llamadas
// simultáneas para maximizar el throughput — ver realScraper.js.
const MAX_ITEMS_POR_LLAMADA = 2;
const TIMEOUT_NAVEGACION_MS = 14000; // domcontentloaded es mucho más rápido
const TIMEOUT_SELECTOR_MS = 8000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Tipos de recurso que bloqueamos — solo nos importa el texto de estado,
// no imágenes, CSS, fuentes ni media.
const TIPOS_A_BLOQUEAR = new Set(['image', 'stylesheet', 'font', 'media', 'other']);

let browserPromise = null;

async function obtenerBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  return browserPromise;
}

// Único lugar que sabe "cómo se ve" el resultado en la página de UPS.
// Se prueban varios selectores conocidos porque UPS ha usado distintos
// bloques con el tiempo; si ups.com cambió su HTML, este es el punto a
// ajustar (ver advertencia arriba).
async function extraerResultadoDePagina(page) {
  return page.evaluate(() => {
    const SELECTORES_ESTADO = [
      '[data-test="tt-leg-details-status"]',
      '[data-testid="tt-leg-details-status"]',
      '.tt-status',
      '.il-status',
      '.trackingStatusText',
    ];
    const SELECTORES_FECHA = [
      '[data-test="tt-leg-details-date"]',
      '[data-testid="tt-leg-details-date"]',
      '.tt-deliveryDate',
      '.il-deliveryDate',
    ];

    function primerTextoNoVacio(selectores) {
      for (const sel of selectores) {
        const texto = document.querySelector(sel)?.textContent?.trim();
        if (texto) return texto;
      }
      return '';
    }

    return {
      status: primerTextoNoVacio(SELECTORES_ESTADO),
      deliveryDate: primerTextoNoVacio(SELECTORES_FECHA),
    };
  });
}

async function consultarUnTracking(browser, item) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(USER_AGENT);

    // Bloquear recursos innecesarios para acelerar la carga de la página.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (TIPOS_A_BLOQUEAR.has(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const url = `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(item.waybill)}&requester=WT`;

    // domcontentloaded dispara en cuanto se parsea el HTML (no espera JS ni
    // assets), lo cual es mucho más rápido que networkidle2 en páginas con
    // analytics/scripts que siguen haciendo peticiones.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_NAVEGACION_MS });

    await page
      .waitForSelector('[data-test="tt-leg-details-status"], .tt-status, .il-status, .trackingStatusText', {
        timeout: TIMEOUT_SELECTOR_MS,
      })
      .catch(() => null);

    const { status, deliveryDate } = await extraerResultadoDePagina(page);

    return {
      waybill: item.waybill,
      carrier: item.carrier,
      status: status || 'Sin información (revisar selectores del scraper)',
      deliveryDate: deliveryDate || null,
    };
  } catch (error) {
    return {
      waybill: item.waybill,
      carrier: item.carrier,
      status: `Error al consultar: ${error.message}`,
      deliveryDate: null,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se esperaba { items: [{ waybill, carrier }, ...] }' });
  }

  // Limitar el tamaño de lote para garantizar que la función termina a tiempo.
  const lote = items.slice(0, MAX_ITEMS_POR_LLAMADA);

  try {
    const browser = await obtenerBrowser();
    const resultados = [];
    for (const item of lote) {
      resultados.push(await consultarUnTracking(browser, item));
    }
    return res.status(200).json({ resultados });
  } catch (error) {
    console.error('Error consultando trackings reales:', error);
    return res.status(502).json({
      error: `No se pudo completar la consulta real a UPS: ${error.message}`,
    });
  }
}
