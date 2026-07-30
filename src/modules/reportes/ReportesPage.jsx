import React, { useMemo, useState } from 'react';
import Card from '../../components/Card.jsx';
import Toolbar from '../../components/Toolbar.jsx';
import TabBar from '../../components/TabBar.jsx';
import SubirReporte from './components/SubirReporte.jsx';
import VisorReporte from './components/VisorReporte.jsx';
import ComparadorReportes from './components/ComparadorReportes.jsx';
import { listarReportes, obtenerArchivoReporte, eliminarReporte } from './utils/reportesStore.js';
import { parseGenericSheet } from './utils/parseGenericSheet.js';
import { descargarArchivo } from './utils/descargarArchivo.js';
import { usePermission, usePermissionsContext } from '../../context/PermissionsContext.jsx';

export default function ReportesPage() {
  const puedeVer = usePermission('reportes', 'view');
  const puedeSubir = usePermission('reportes', 'upload');
  const puedeExportar = usePermission('reportes', 'export');
  const puedeEliminar = usePermission('reportes', 'eliminar');
  const { currentUser } = usePermissionsContext();

  const [reportes, setReportes] = useState(listarReportes);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarComparador, setMostrarComparador] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [contenidoActivo, setContenidoActivo] = useState(null);
  const [busquedaTabs, setBusquedaTabs] = useState('');

  const tabsFiltrados = useMemo(() => {
    if (!busquedaTabs.trim()) return reportes;
    const texto = busquedaTabs.toLowerCase();
    return reportes.filter(
      (r) => r.nombreArchivo.toLowerCase().includes(texto) || r.tipo.toLowerCase().includes(texto)
    );
  }, [reportes, busquedaTabs]);

  async function abrirReporte(reporte) {
    setActiveId(reporte.id);
    setMostrarComparador(false);
    const arrayBuffer = await obtenerArchivoReporte(reporte.id);
    if (!arrayBuffer) { setContenidoActivo(null); return; }
    const { columnas, filas } = parseGenericSheet(arrayBuffer);
    setContenidoActivo({ reporte, columnas, filas, arrayBuffer });
  }

  function handleSelectTab(id) {
    const reporte = reportes.find((r) => r.id === id);
    if (reporte) abrirReporte(reporte);
  }

  async function handleReporteSubido() {
    const actualizados = listarReportes();
    setReportes(actualizados);
    setMostrarFormulario(false);
    if (actualizados.length) abrirReporte(actualizados[0]);
  }

  async function handleCerrarTab(id) {
    if (!puedeEliminar) return;
    await eliminarReporte(id);
    const actualizados = listarReportes();
    setReportes(actualizados);
    if (activeId === id) {
      setActiveId(null);
      setContenidoActivo(null);
      if (actualizados.length) abrirReporte(actualizados[0]);
    }
  }

  function handleDescargarActivo() {
    if (contenidoActivo) descargarArchivo(contenidoActivo.reporte.nombreArchivo, contenidoActivo.arrayBuffer);
  }

  function handleToggleComparador() {
    setMostrarComparador((v) => !v);
    if (!mostrarComparador) setMostrarFormulario(false);
  }

  if (!puedeVer) {
    return <Card title="Reportes">No tienes permiso para ver esta sección.</Card>;
  }

  return (
    <>
      <Toolbar>
        <button className="secondary" disabled title="Pendiente de autorización">
          Sincronizar con Oracle (próximamente)
        </button>
        <div className="toolbar-separator" />
        {puedeSubir && (
          <button
            className={mostrarFormulario ? 'danger' : 'primary'}
            onClick={() => { setMostrarFormulario((v) => !v); setMostrarComparador(false); }}
          >
            {mostrarFormulario ? 'Cancelar' : '+ Cargar reporte'}
          </button>
        )}
        <button
          className={mostrarComparador ? 'primary' : 'secondary'}
          onClick={handleToggleComparador}
          disabled={reportes.length < 2}
          title={reportes.length < 2 ? 'Necesitas al menos 2 reportes para comparar' : 'Comparar dos reportes'}
        >
          ⇄ Comparar
        </button>
        <div className="toolbar-spacer" />
        <span className="hint">{reportes.length} reporte(s)</span>
      </Toolbar>

      {mostrarFormulario && (
        <SubirReporte
          subidoPor={currentUser?.nombre || 'Desconocido'}
          onReporteSubido={handleReporteSubido}
        />
      )}

      {mostrarComparador && (
        <ComparadorReportes reportes={reportes} />
      )}

      <TabBar
        tabs={tabsFiltrados.map((r) => ({
          id: r.id,
          label: r.nombreArchivo,
          sublabel: r.tipo,
          closable: puedeEliminar,
        }))}
        activeId={activeId}
        onSelect={handleSelectTab}
        onClose={handleCerrarTab}
        emptyMessage="Todavía no se ha cargado ningún reporte. Usa '+ Cargar reporte' arriba."
        extra={
          reportes.length > 3 && (
            <input
              type="text"
              placeholder="Filtrar pestañas…"
              value={busquedaTabs}
              onChange={(e) => setBusquedaTabs(e.target.value)}
              style={{ width: 180 }}
            />
          )
        }
      />

      {contenidoActivo && !mostrarComparador && (
        <VisorReporte
          key={contenidoActivo.reporte.id}
          reporte={contenidoActivo.reporte}
          columnas={contenidoActivo.columnas}
          filas={contenidoActivo.filas}
          puedeExportar={puedeExportar}
          onDescargar={handleDescargarActivo}
        />
      )}
    </>
  );
}
