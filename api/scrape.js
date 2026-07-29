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

// Vercel: sube el límite de tiempo de esta función (por defecto los planes
// gratis/hobby dan 10s, insuficiente para varias navegaciones reales).
// Ajustar según el plan contratado.
export const config = {
  maxDuration: 60,
};

const CONCURRENCIA = 3;
const TIMEOUT_NAVEGACION_MS = 20000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
    const url = `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(item.waybill)}&requester=WT`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT_NAVEGACION_MS });
    await page
      .waitForSelector('[data-test="tt-leg-details-status"], .tt-status, .il-status', {
        timeout: TIMEOUT_NAVEGACION_MS,
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

async function consultarConConcurrenciaLimitada(browser, items) {
  const resultados = new Array(items.length);
  let siguienteIndice = 0;

  async function trabajador() {
    while (siguienteIndice < items.length) {
      const indice = siguienteIndice++;
      resultados[indice] = await consultarUnTracking(browser, items[indice]);
    }
  }

  const trabajadores = Array.from({ length: Math.min(CONCURRENCIA, items.length) }, trabajador);
  await Promise.all(trabajadores);
  return resultados;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se esperaba { items: [{ waybill, carrier }, ...] }' });
  }

  try {
    const browser = await obtenerBrowser();
    const resultados = await consultarConConcurrenciaLimitada(browser, items);
    return res.status(200).json({ resultados });
  } catch (error) {
    console.error('Error consultando trackings reales:', error);
    return res.status(502).json({
      error: `No se pudo completar la consulta real a UPS: ${error.message}`,
    });
  }
}
