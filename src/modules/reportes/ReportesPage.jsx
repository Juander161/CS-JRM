import React, { useEffect, useMemo, useState } from 'react';
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
  const puedeVer     = usePermission('reportes', 'view');
  const puedeSubir   = usePermission('reportes', 'upload');
  const puedeExportar = usePermission('reportes', 'export');
  const puedeEliminar = usePermission('reportes', 'eliminar');
  const { currentUser } = usePermissionsContext();

  const [reportes, setReportes] = useState(listarReportes);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarComparador, setMostrarComparador] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [contenidoActivo, setContenidoActivo] = useState(null);
  const [busquedaTabs, setBusquedaTabs] = useState('');

  // Tipos únicos disponibles para el select
  const tiposDisponibles = useMemo(
    () => [...new Set(reportes.map((r) => r.tipo))].sort(),
    [reportes]
  );

  // Reportes que pasan el filtro de tipo
  const reportesDeTipo = useMemo(
    () => filtroTipo ? reportes.filter((r) => r.tipo === filtroTipo) : reportes,
    [reportes, filtroTipo]
  );

  // Adicionalmente filtrado por texto en la barra de pestañas
  const tabsFiltrados = useMemo(() => {
    if (!busquedaTabs.trim()) return reportesDeTipo;
    const q = busquedaTabs.toLowerCase();
    return reportesDeTipo.filter((r) => r.nombreArchivo.toLowerCase().includes(q));
  }, [reportesDeTipo, busquedaTabs]);

  // Abre el contenido de un reporte en el visor
  async function abrirReporte(reporte) {
    setActiveId(reporte.id);
    setMostrarComparador(false);
    const arrayBuffer = await obtenerArchivoReporte(reporte.id);
    if (!arrayBuffer) { setContenidoActivo(null); return; }
    const { columnas, filas } = parseGenericSheet(arrayBuffer);
    setContenidoActivo({ reporte, columnas, filas, arrayBuffer });
  }

  // Al montar: abrir el primer reporte automáticamente (evita pantalla en blanco)
  useEffect(() => {
    const lista = listarReportes();
    if (lista.length > 0) abrirReporte(lista[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar tipo: abrir el primer reporte de ese tipo
  function handleFiltroTipo(tipo) {
    setFiltroTipo(tipo);
    const lista = tipo ? reportes.filter((r) => r.tipo === tipo) : reportes;
    if (lista.length > 0) abrirReporte(lista[0]);
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
      const resta = filtroTipo ? actualizados.filter((r) => r.tipo === filtroTipo) : actualizados;
      if (resta.length) abrirReporte(resta[0]);
    }
  }

  function handleDescargarActivo() {
    if (contenidoActivo) descargarArchivo(contenidoActivo.reporte.nombreArchivo, contenidoActivo.arrayBuffer);
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
        <div className="toolbar-separator" />

        {/* Filtro por tipo y botón de comparador */}
        {tiposDisponibles.length > 1 && (
          <select
            value={filtroTipo}
            onChange={(e) => handleFiltroTipo(e.target.value)}
            style={{ fontSize: 13 }}
            title="Filtrar pestañas por tipo de reporte"
          >
            <option value="">Todos los tipos</option>
            {tiposDisponibles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <button
          className={mostrarComparador ? 'primary' : 'secondary'}
          onClick={() => { setMostrarComparador((v) => !v); setMostrarFormulario(false); }}
          disabled={reportesDeTipo.length < 2}
          title={reportesDeTipo.length < 2
            ? 'Necesitas al menos 2 reportes del mismo tipo para comparar'
            : 'Comparar dos reportes (cambios día a día)'}
        >
          ⇄ Comparar
        </button>

        <div className="toolbar-spacer" />
        <span className="hint">
          {reportesDeTipo.length !== reportes.length
            ? `${reportesDeTipo.length} de ${reportes.length} reporte(s)`
            : `${reportes.length} reporte(s)`}
        </span>
      </Toolbar>

      {mostrarFormulario && (
        <SubirReporte
          subidoPor={currentUser?.nombre || 'Desconocido'}
          onReporteSubido={handleReporteSubido}
        />
      )}

      {mostrarComparador && (
        <ComparadorReportes reportes={reportesDeTipo} tipoFiltrado={filtroTipo} />
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
        emptyMessage={
          filtroTipo
            ? `No hay reportes de tipo "${filtroTipo}". Cambia el tipo o carga uno nuevo.`
            : "Todavía no se ha cargado ningún reporte. Usa '+ Cargar reporte' arriba."
        }
        extra={
          reportesDeTipo.length > 3 && (
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
