import React, { useState } from 'react';
import Card from '../../components/Card.jsx';
import SubirReporte from './components/SubirReporte.jsx';
import HistorialReportes from './components/HistorialReportes.jsx';
import VisorReporte from './components/VisorReporte.jsx';
import { listarReportes } from './utils/reportesStore.js';
import { parseGenericSheet } from './utils/parseGenericSheet.js';
import { usePermission, usePermissionsContext } from '../../context/PermissionsContext.jsx';

export default function ReportesPage() {
  const puedeVer = usePermission('reportes', 'view');
  const puedeSubir = usePermission('reportes', 'upload');
  const puedeExportar = usePermission('reportes', 'export');
  const puedeEliminar = usePermission('reportes', 'eliminar');
  const { currentUser } = usePermissionsContext();

  const [reportes, setReportes] = useState(listarReportes);
  const [reporteAbierto, setReporteAbierto] = useState(null);

  function refrescarHistorial() {
    setReportes(listarReportes());
  }

  function handleVerReporte(reporte, arrayBuffer) {
    const { columnas, filas } = parseGenericSheet(arrayBuffer);
    setReporteAbierto({ reporte, columnas, filas });
  }

  function handleReporteEliminado() {
    if (reporteAbierto && !listarReportes().some((r) => r.id === reporteAbierto.reporte.id)) {
      setReporteAbierto(null);
    }
    refrescarHistorial();
  }

  if (!puedeVer) {
    return <Card title="Reportes">No tienes permiso para ver esta sección.</Card>;
  }

  return (
    <>
      <div className="warning-box">
        La sincronización automática con Oracle todavía no está autorizada. Por ahora, todos
        los reportes (de Oracle o generados a mano) se cargan aquí manualmente en vez de
        enviarse por correo; la estructura ya queda lista para activar la sincronización
        automática apenas se autorice.
      </div>

      <Card
        title="Sincronización con Oracle"
        actions={<button className="secondary" disabled title="Pendiente de autorización">Sincronizar con Oracle (próximamente)</button>}
      >
        <p className="hint">
          Cuando se autorice el acceso, los reportes de Oracle se sincronizarán solos en
          horarios programados (con reintentos automáticos y aviso al administrador si Oracle
          no responde), sin necesidad de subirlos a mano.
        </p>
      </Card>

      {puedeSubir && (
        <SubirReporte subidoPor={currentUser?.nombre || 'Desconocido'} onReporteSubido={refrescarHistorial} />
      )}

      <VisorReporte
        reporte={reporteAbierto?.reporte}
        columnas={reporteAbierto?.columnas || []}
        filas={reporteAbierto?.filas || []}
        onCerrar={() => setReporteAbierto(null)}
      />

      <HistorialReportes
        reportes={reportes}
        onVerReporte={handleVerReporte}
        onReporteEliminado={handleReporteEliminado}
        puedeExportar={puedeExportar}
        puedeEliminar={puedeEliminar}
      />
    </>
  );
}
