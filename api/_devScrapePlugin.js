// Plugin de Vite que sirve POST /api/scrape en el servidor de desarrollo
// usando el Chromium local (no necesita Vercel ni @sparticuz/chromium).
// En producción (Vercel) este archivo se ignora; la función real es api/scrape.js.

import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

// Detecta el navegador disponible según el sistema operativo.
// En Windows usa Edge (preinstalado por defecto).
// En Linux usa el Chromium del entorno de desarrollo (CCR).
// Se puede sobreescribir con la variable de entorno BROWSER_PATH.
function encontrarNavegador() {
  if (process.env.BROWSER_PATH && existsSync(process.env.BROWSER_PATH)) {
    return process.env.BROWSER_PATH;
  }

  const os = platform();

  if (os === 'win32') {
    const candidatos = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    return candidatos.find(existsSync) ?? null;
  }

  if (os === 'darwin') {
    const candidatos = [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    return candidatos.find(existsSync) ?? null;
  }

  // Linux — entorno CCR tiene Chromium preinstalado
  const candidatos = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];
  return candidatos.find(existsSync) ?? null;
}

const RUTA_NAVEGADOR = encontrarNavegador();

const TIMEOUT_MS = 20000;
const CONCURRENCIA = 3;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let browserPromise = null;

function buildChromiumArgs() {
  const base = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];
  if (process.env.HTTPS_PROXY) {
    base.push(`--proxy-server=${process.env.HTTPS_PROXY}`);
    // La CA del proxy del entorno CCR puede no estar en el bundle de Chromium
    base.push('--ignore-certificate-errors');
  }
  return base;
}

async function obtenerBrowser() {
  if (!browserPromise) {
    if (!RUTA_NAVEGADOR) {
      throw new Error(
        'No se encontró ningún navegador compatible (Edge, Chrome o Chromium). ' +
        'Configura la variable de entorno BROWSER_PATH con la ruta al ejecutable.'
      );
    }
    console.log(`[dev-scrape] Usando navegador: ${RUTA_NAVEGADOR}`);
    browserPromise = puppeteer.launch({
      executablePath: RUTA_NAVEGADOR,
      headless: true,
      args: buildChromiumArgs(),
    });
  }
  return browserPromise;
}

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
    function primerTexto(selectores) {
      for (const sel of selectores) {
        const txt = document.querySelector(sel)?.textContent?.trim();
        if (txt) return txt;
      }
      return '';
    }
    return { status: primerTexto(SELECTORES_ESTADO), deliveryDate: primerTexto(SELECTORES_FECHA) };
  });
}

async function consultarUno(browser, item) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(USER_AGENT);
    const url = `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(item.waybill)}&requester=WT`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT_MS });
    await page
      .waitForSelector('[data-test="tt-leg-details-status"], .tt-status, .il-status', { timeout: TIMEOUT_MS })
      .catch(() => null);
    const { status, deliveryDate } = await extraerResultadoDePagina(page);
    return {
      waybill: item.waybill,
      carrier: item.carrier,
      status: status || 'Sin información (revisar selectores)',
      deliveryDate: deliveryDate || null,
    };
  } catch (err) {
    return { waybill: item.waybill, carrier: item.carrier, status: `Error: ${err.message}`, deliveryDate: null };
  } finally {
    await page.close().catch(() => {});
  }
}

async function consultarLote(browser, items) {
  const resultados = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      resultados[idx] = await consultarUno(browser, items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, items.length) }, worker));
  return resultados;
}

async function leerBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

// Plugin de Vite — solo activo en `npm run dev`
export function devScrapePlugin() {
  return {
    name: 'dev-scrape-api',
    configureServer(server) {
      server.middlewares.use('/api/scrape', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Método no permitido' }));
          return;
        }

        let items;
        try {
          const raw = await leerBody(req);
          ({ items } = JSON.parse(raw));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'JSON inválido' }));
          return;
        }

        if (!Array.isArray(items) || !items.length) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Se esperaba { items: [...] }' }));
          return;
        }

        try {
          const browser = await obtenerBrowser();
          const resultados = await consultarLote(browser, items);
          res.statusCode = 200;
          res.end(JSON.stringify({ resultados }));
        } catch (err) {
          console.error('[dev-scrape] Error:', err.message);
          res.statusCode = 502;
          res.end(JSON.stringify({ error: `Error al iniciar el scraper: ${err.message}` }));
        }
      });
    },
  };
}
