// Placeholder para la futura integración con la base de datos de Oracle
// (mencionada en el documento de reglas de Order Approval: acceso
// pendiente de aprobación, necesario para la automatización completa).
//
// Uso previsto una vez autorizado: reemplazar la carga manual del Excel
// de material disponible por una consulta directa de inventario, y
// registrar ahí mismo la decisión (Aprobado/Rechazado) en vez de solo
// mostrarla en esta herramienta intermedia.
//
// Mientras no haya credenciales/autorización, cada función lanza un error
// explícito; el flujo actual de Order Approval sigue usando el Excel
// subido manualmente (ver parseInventoryFile.js).

export async function consultarDisponibilidad(_codigosItem) {
  throw new Error(
    'oracleService.consultarDisponibilidad: la conexión a Oracle todavía no está autorizada/configurada.'
  );
}

export async function registrarDecision(_bo, _decision) {
  throw new Error(
    'oracleService.registrarDecision: la conexión a Oracle todavía no está autorizada/configurada.'
  );
}

// Placeholder para la sincronización automática de reportes descrita en
// la "Propuesta de Plataforma Centralizada de Reportes": los reportes que
// hoy se generan en Oracle y se envían por correo deberán sincronizarse
// solos en horarios programados. Mientras no esté autorizada la conexión,
// la sección de Reportes solo admite carga manual (ver
// modules/reportes/utils/reportesStore.js) y este botón queda deshabilitado
// en la interfaz.
//
// Cuando se autorice: implementar aquí la consulta programada, con
// reintentos automáticos y una alerta al administrador si Oracle no
// responde en el horario esperado (riesgo ya señalado en el documento),
// en vez de que el reporte simplemente falte sin aviso.
export async function sincronizarReportes() {
  throw new Error(
    'oracleService.sincronizarReportes: la sincronización automática con Oracle todavía no está autorizada/configurada. Usa la carga manual mientras tanto.'
  );
}
