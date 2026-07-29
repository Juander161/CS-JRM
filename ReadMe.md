Primera version

## Tracking (UPS): scraping real vs simulado

La sección de Tracking puede correr en dos modos, elegibles desde la barra
de herramientas de la página ("Fuente de datos"):

- **Simulado**: datos de prueba generados localmente, sin salir a internet.
  Es el modo por defecto.
- **Scraping real (ups.com)**: consulta real contra ups.com usando un
  navegador headless (`api/scrape.js`, con `puppeteer-core` +
  `@sparticuz/chromium`), mientras la API oficial de UPS no esté
  autorizada. Es la vía de contingencia acordada para este período.

Cuando la API oficial de UPS se autorice, se agrega un tercer modo en
`src/modules/tracking/config/scraperModeConfig.js` y
`src/modules/tracking/scrapers/index.js` — el resto de la app no cambia.

### Cómo hacer la primera prueba real (pendiente de hacer con internet real)

Este código se escribió en un entorno que **bloquea la salida a ups.com**
(confirmado con `curl` y con la herramienta de fetch: ambos devuelven
403), así que no se pudo verificar en vivo. Sí se confirmó que:

- `puppeteer-core` + `@sparticuz/chromium` arrancan y funcionan en Node.
- El manejo de errores por tracking funciona (si una consulta falla, se
  reporta ese error puntual sin tumbar el resto del lote).
- El flujo completo en la UI (elegir "Scraping real", buscar, ver
  errores legibles) funciona sin romperse.

Lo único sin verificar son los **selectores CSS** que leen el estado y la
fecha de entrega de la página real de UPS (están en
`extraerResultadoDePagina()` dentro de `api/scrape.js`), porque no hay
forma de inspeccionar la página real desde este entorno.

Pasos para la primera prueba, una vez desplegado (Vercel) o corriendo con
`vercel dev` en una máquina con internet:

1. Abrir Tracking, cambiar "Fuente de datos" a "Scraping real (ups.com)".
2. Cargar un Excel con **un solo waybill real** y buscarlo.
3. Si el estado sale bien: listo, no hay que tocar nada más.
4. Si sale "Sin información (revisar selectores del scraper)" o un error
   de timeout: abrir `https://www.ups.com/track?tracknum=<ese waybill>`
   en un navegador normal, presionar F12 → Elements, ubicar el bloque
   donde se muestra el estado/fecha de entrega, y actualizar los
   selectores en `extraerResultadoDePagina()` (`api/scrape.js`) para que
   coincidan.
5. Repetir con 3-5 waybills variados (entregado, en tránsito, excepción)
   antes de usarlo para revisiones reales.

**Nota de riesgo (ya señalada en el código)**: hacer scraping del sitio de
UPS puede violar sus Términos de Servicio. Se usa aquí como contingencia
mientras se autoriza la API oficial, con ese riesgo ya aceptado para este
caso de uso interno.
