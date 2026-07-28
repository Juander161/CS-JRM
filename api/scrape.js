// Stub de función serverless (Vercel). Todavía NO implementa ninguna
// consulta real: la sección de Tracking funciona hoy con datos simulados
// (`src/modules/tracking/scrapers/mockScraper.js`) mientras se define y
// autoriza la forma real de obtener el estado de cada envío (API oficial
// del carrier, o el enfoque de scraping descrito en la documentación
// previa del proyecto).
//
// Cuando esté listo:
//   - Reemplazar el cuerpo de este handler por la consulta real (API del
//     carrier o scraping vía puppeteer-core + @sparticuz/chromium).
//   - Recordar que el scraping de sitios de carriers puede violar sus
//     Términos de Servicio; usarlo solo si ya se evaluó y aceptó ese
//     riesgo para el caso de uso específico.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  return res.status(501).json({
    error:
      'Consulta real de trackings aún no implementada. La app usa datos simulados mientras se define/autoriza el mecanismo real.',
  });
}
