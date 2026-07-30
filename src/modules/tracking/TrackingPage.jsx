import React, { useEffect, useRef, useState } from 'react';
import Card from '../../components/Card.jsx';
import Toolbar from '../../components/Toolbar.jsx';
import TabBar from '../../components/TabBar.jsx';
import ScanLocationSelect from './components/ScanLocationSelect.jsx';
import CarrierCheckboxes from './components/CarrierCheckboxes.jsx';
import ResultsReport from './components/ResultsReport.jsx';
import CarrierWhitelistEditor from './components/CarrierWhitelistEditor.jsx';
import {
  parseTrackingArrayBuffer,
  extraerScanLocations,
  extraerCarriersPorLocation,
} from './utils/parseFile.js';
import { getScraper } from './scrapers/index.js';
import { getCarriersWhitelist, addCarrier, removeCarrier } from './config/carriersConfig.js';
import { getScraperMode, setScraperMode, MODOS_SCRAPER } from './config/scraperModeConfig.js';
import { crearArchivoNuevo, actualizarArchivoExistente } from './utils/exportExcelStyled.js';
import { usePermission } from '../../context/PermissionsContext.jsx';
import {
  listarReportesEmbarques,
  obtenerArchivoReporte,
} from '../../services/reporteHub.js';

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function TrackingPage() {
  const puedeVer = usePermission('tracking', 'view');
  const puedeBuscar = usePermission('tracking', 'search');
  const puedeExportar = usePermission('tracking', 'export');
  const puedeConfigurarFuente = usePermission('tracking', 'configureSource');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [scraperMode, setScraperModeState] = useState(getScraperMode);
  const [carriersWhitelist, setCarriersWhitelist] = useState(getCarriersWhitelist);

  // Reportes de embarques disponibles (del módulo de Reportes)
  const [reportesEmbarques, setReportesEmbarques] = useState([]);
  const [reporteSeleccionadoId, setReporteSeleccionadoId] = useState('');
  const [reporteNombre, setReporteNombre] = useState('');

  const [registros, setRegistros] = useState([]);
  const [scanLocations, setScanLocations] = useState([]);
  const [scanLocationSeleccionado, setScanLocationSeleccionado] = useState('');
  const [carriersDisponibles, setCarriersDisponibles] = useState([]);
  const [carriersSeleccionados, setCarriersSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [busquedas, setBusquedas] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [errorReporte, setErrorReporte] = useState('');
  const inputArchivoRef = useRef(null);

  useEffect(() => {
    const lista = listarReportesEmbarques();
    setReportesEmbarques(lista);
    if (lista.length > 0) setReporteSeleccionadoId(lista[0].id);
  }, []);

  // Recarga la lista de reportes cuando se abre el formulario
  useEffect(() => {
    if (mostrarFormulario) {
      const lista = listarReportesEmbarques();
      setReportesEmbarques(lista);
      if (!reporteSeleccionadoId && lista.length) setReporteSeleccionadoId(lista[0].id);
    }
  }, [mostrarFormulario]);

  async function handleCargarReporte(id) {
    if (!id) return;
    setErrorReporte('');
    setRegistros([]);
    setScanLocations([]);
    setScanLocationSeleccionado('');
    setCarriersDisponibles([]);
    setCarriersSeleccionados([]);
    try {
      const arrayBuffer = await obtenerArchivoReporte(id);
      if (!arrayBuffer) throw new Error('No se encontró el archivo en el almacén local.');
      const datos = parseTrackingArrayBuffer(arrayBuffer, carriersWhitelist);
      setRegistros(datos);
      setReporteNombre(reportesEmbarques.find((r) => r.id === id)?.nombreArchivo ?? '');
      const locations = extraerScanLocations(datos);
      setScanLocations(locations);
    } catch (err) {
      setErrorReporte(err.message);
    }
  }

  function handleScanLocationChange(valor) {
    setScanLocationSeleccionado(valor);
    const carriers = extraerCarriersPorLocation(registros, valor);
    setCarriersDisponibles(carriers);
    setCarriersSeleccionados(carriers);
  }

  function toggleCarrier(carrier) {
    setCarriersSeleccionados((prev) =>
      prev.includes(carrier) ? prev.filter((c) => c !== carrier) : [...prev, carrier]
    );
  }

  async function handleBuscar() {
    const items = registros.filter(
      (r) => r.scanLocation === scanLocationSeleccionado && carriersSeleccionados.includes(r.carrier)
    );

    setCargando(true);
    setProgreso({ hecho: 0, total: items.length });

    const { scrapeBatch } = getScraper(scraperMode);
    const resultados = await scrapeBatch(items, (hecho, total) => setProgreso({ hecho, total }));

    const id = `${scanLocationSeleccionado}-${Date.now()}`;
    const nuevaBusqueda = {
      id,
      scanLocation: scanLocationSeleccionado,
      carriers: [...carriersSeleccionados],
      resultados,
      hora: new Date().toLocaleTimeString('es-MX'),
    };
    setBusquedas((prev) => [...prev, nuevaBusqueda]);
    setActiveId(id);
    setCargando(false);
    setMostrarFormulario(false);
  }

  function handleCerrarTab(id) {
    setBusquedas((prev) => {
      const restantes = prev.filter((b) => b.id !== id);
      if (activeId === id) {
        setActiveId(restantes.length ? restantes[restantes.length - 1].id : null);
      }
      return restantes;
    });
  }

  async function handleActualizarArchivo(e) {
    const file = e.target.files?.[0];
    if (file) await actualizarArchivoExistente(file, busquedas);
    e.target.value = '';
  }

  function handleCambiarModo(valor) {
    setScraperModeState(setScraperMode(valor));
  }

  if (!puedeVer) {
    return <Card title="Revisión de Trackings (UPS)">No tienes permiso para ver esta sección.</Card>;
  }

  const busquedaActiva = busquedas.find((b) => b.id === activeId);

  return (
    <>
      <Toolbar>
        {puedeBuscar && (
          <button className="primary" onClick={() => setMostrarFormulario((v) => !v)}>
            {mostrarFormulario ? 'Cancelar' : '+ Nueva búsqueda'}
          </button>
        )}
        <div className="toolbar-separator" />

        {/* Selector de reporte de embarques */}
        {reportesEmbarques.length === 0 ? (
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #9ca3af)' }}>
            Sin reportes de embarques — carga uno en <strong>Reportes</strong>
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #6b7280)', whiteSpace: 'nowrap' }}>
              Reporte:
            </span>
            <select
              value={reporteSeleccionadoId}
              onChange={(e) => setReporteSeleccionadoId(e.target.value)}
              style={{ fontSize: '0.82rem', maxWidth: 260 }}
            >
              {reportesEmbarques.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatearFecha(r.fechaSubida)} — {r.nombreArchivo}
                </option>
              ))}
            </select>
            <button
              className="secondary"
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleCargarReporte(reporteSeleccionadoId)}
              disabled={!reporteSeleccionadoId}
            >
              Cargar
            </button>
            {reporteNombre && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)' }}>
                ✓ {registros.length} trackings
              </span>
            )}
          </div>
        )}

        <div className="toolbar-spacer" />
        {puedeConfigurarFuente ? (
          <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Fuente:
            <select value={scraperMode} onChange={(e) => handleCambiarModo(e.target.value)}>
              {MODOS_SCRAPER.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="hint">
            Fuente: {MODOS_SCRAPER.find((m) => m.value === scraperMode)?.label}
          </span>
        )}
        {puedeExportar && busquedas.length > 0 && (
          <>
            <div className="toolbar-separator" />
            <button className="primary" onClick={() => crearArchivoNuevo(busquedas)}>
              Descargar reporte del día (Excel)
            </button>
            <button className="secondary" onClick={() => inputArchivoRef.current?.click()}>
              Actualizar archivo existente
            </button>
            <input
              ref={inputArchivoRef}
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={handleActualizarArchivo}
            />
          </>
        )}
      </Toolbar>

      {mostrarFormulario && (
        <>
          {scraperMode === 'scraping' ? (
            <div className="warning-box">
              Fuente de datos: <strong>Scraping real (ups.com)</strong>. Cada búsqueda hace
              consultas reales al sitio de UPS vía la función serverless <code>/api/scrape</code>.
            </div>
          ) : (
            <div className="warning-box">
              Fuente de datos: <strong>Simulado</strong>. Sin salida a internet.
              Cambia a "Scraping real" en la barra para consultar ups.com.
            </div>
          )}

          {errorReporte && (
            <div className="warning-box" style={{ borderColor: '#b91c1c' }}>{errorReporte}</div>
          )}

          {registros.length === 0 && !errorReporte && (
            <Card>
              <p className="hint">
                Selecciona un reporte de embarques en la barra y presiona <strong>Cargar</strong>
                {' '}para extraer los trackings disponibles.
                {reportesEmbarques.length === 0 && (
                  <> Primero carga el archivo <code>*Rpt.xlsx</code> en la sección de <strong>Reportes</strong>.</>
                )}
              </p>
            </Card>
          )}

          <CarrierWhitelistEditor
            carriers={carriersWhitelist}
            onAdd={(c) => setCarriersWhitelist(addCarrier(c))}
            onRemove={(c) => setCarriersWhitelist(removeCarrier(c))}
          />

          {scanLocations.length > 0 && (
            <ScanLocationSelect
              opciones={scanLocations}
              valor={scanLocationSeleccionado}
              onChange={handleScanLocationChange}
            />
          )}
          <CarrierCheckboxes
            carriers={carriersDisponibles}
            seleccionados={carriersSeleccionados}
            onToggle={toggleCarrier}
            onBuscar={handleBuscar}
            cargando={cargando}
            puedeBuscar={puedeBuscar}
          />
          {cargando && progreso && (
            <Card>Procesando {progreso.hecho} de {progreso.total}...</Card>
          )}
        </>
      )}

      <TabBar
        tabs={busquedas.map((b) => ({
          id: b.id,
          label: b.scanLocation,
          sublabel: `${b.resultados.length} · ${b.hora}`,
          closable: true,
        }))}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={handleCerrarTab}
        emptyMessage="Todavía no se ha ejecutado ninguna búsqueda. Usa '+ Nueva búsqueda' arriba."
      />

      {busquedaActiva && (
        <ResultsReport
          key={busquedaActiva.id}
          resultados={busquedaActiva.resultados}
          scanLocation={busquedaActiva.scanLocation}
        />
      )}
    </>
  );
}
