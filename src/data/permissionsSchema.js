// Catálogo central de secciones y acciones de la app.
// Cuando se agregue una sección nueva (p. ej. una tercera herramienta),
// solo hay que añadirla aquí y el panel de administración y el modelo
// de permisos la reconocen automáticamente.
export const SECTIONS = [
  {
    key: 'orderApproval',
    label: 'Order Approval',
    actions: [
      { key: 'view', label: 'Ver la sección' },
      { key: 'run', label: 'Ejecutar comparación (pegar solicitud + Excel)' },
      { key: 'configureThreshold', label: 'Configurar el umbral de aprobación' },
    ],
  },
  {
    key: 'tracking',
    label: 'Revisión de Trackings (UPS)',
    actions: [
      { key: 'view', label: 'Ver la sección' },
      { key: 'search', label: 'Ejecutar búsqueda / consulta de trackings' },
      { key: 'export', label: 'Descargar reporte Excel' },
    ],
  },
];

export const ROLES = ['admin', 'user'];

export function buildEmptyPermissions() {
  const permissions = {};
  for (const section of SECTIONS) {
    permissions[section.key] = {};
    for (const action of section.actions) {
      permissions[section.key][action.key] = false;
    }
  }
  return permissions;
}

export function buildFullPermissions() {
  const permissions = {};
  for (const section of SECTIONS) {
    permissions[section.key] = {};
    for (const action of section.actions) {
      permissions[section.key][action.key] = true;
    }
  }
  return permissions;
}
