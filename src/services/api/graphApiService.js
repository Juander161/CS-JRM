// Placeholder para la futura integración con Microsoft Graph API
// (mencionada en el documento de reglas de Order Approval como parte de
// la automatización completa, pendiente de que se apruebe el acceso).
//
// Uso previsto una vez autorizado: leer los correos de la bandeja Order
// Approval directamente (en vez de que el usuario los pegue a mano) y,
// eventualmente, escribir la decisión de vuelta.
//
// Mientras no haya credenciales/autorización, cada función lanza un error
// explícito para que quede claro en desarrollo si algo intenta usarlas
// antes de tiempo; el flujo actual de Order Approval no las llama.

export async function leerCorreosOrderApproval() {
  throw new Error(
    'graphApiService.leerCorreosOrderApproval: Microsoft Graph API todavía no está autorizada/configurada.'
  );
}
