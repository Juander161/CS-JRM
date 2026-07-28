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
