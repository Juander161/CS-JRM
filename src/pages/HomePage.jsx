import React from 'react';
import Card from '../components/Card.jsx';

export default function HomePage() {
  return (
    <Card title="Bienvenido">
      <p>
        Esta es la suite interna de la oficina. Por ahora incluye tres herramientas,
        y está preparada para sumar más secciones y conectarse a APIs oficiales
        (Microsoft Graph, Oracle, carriers) en cuanto estén autorizadas.
      </p>
      <ul>
        <li><strong>Order Approval</strong>: compara solicitudes contra el inventario disponible.</li>
        <li><strong>Revisión de Trackings (UPS)</strong>: procesa reportes de trackings por Scan Location.</li>
        <li><strong>Reportes</strong>: repositorio central de reportes (carga manual mientras no haya sincronización con Oracle), con historial de reportes anteriores.</li>
      </ul>
      <p>
        Ve a <strong>Administración</strong> para crear usuarios y configurar a qué
        secciones y acciones tiene acceso cada uno (la pantalla de login se activará
        más adelante; por ahora esta configuración queda lista para cuando exista).
      </p>
    </Card>
  );
}
