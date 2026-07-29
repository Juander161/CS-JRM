import React, { useRef, useState } from 'react';
import Card from '../../components/Card.jsx';
import Toolbar from '../../components/Toolbar.jsx';
import TabBar from '../../components/TabBar.jsx';
import FileUpload from './components/FileUpload.jsx';
import ScanLocationSelect from './components/ScanLocationSelect.jsx';
import CarrierCheckboxes from './components/CarrierCheckboxes.jsx';
import ResultsReport from './components/ResultsReport.jsx';
import CarrierWhitelistEditor from './components/CarrierWhitelistEditor.jsx';
import {
  parseTrackingFile,
  extraerScanLocations,
  extraerCarriersPorLocation,
} from './utils/parseFile.js';
import { getScraper } from './scrapers/index.js';
import { getCarriersWhitelist, addCarrier, removeCarrier } from './config/carriersConfig.js';
import { getScraperMode, setScraperMode, MODOS_SCRAPER } from './config/scraperModeConfig.js';
import { crearArchivoNuevo, actualizarArchivoExistente } from './utils/exportExcelStyled.js';
import { usePermission } from '../../context/PermissionsContext.jsx';

export default function TrackingPage() {
  const puedeVer = usePermission('tracking', 'view');
  const puedeBuscar = usePermission('tracking', 'search');
  const puedeExportar = usePermission('tracking', 'export');
  const puedeConfigurarFuente = usePermission('tracking', 'configureSource');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [scraperMode, setScraperModeState] = useState(getScraperMode);
  const [carriersWhitelist, setCarriersWhitelist] = useState(getCarriersWhitelist);
  const [fileName, setFileName] = useState('');
  const [registros, setRegistros] = useState([]);
  const [scanLocations, setScanLocations] = useState([]);
  const [scanLocationSeleccionado, setScanLocationSeleccionado] = useState('');
  const [carriersDisponibles, setCarriersDisponibles] = useState([]);
  const [carriersSeleccionados, setCarriersSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [busquedas, setBusquedas] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const inputArchivoRef = useRef(null);

  async function handleFileSelected(file) {
    setFileName(file.name);
    const datos = await parseTrackingFile(file, carriersWhitelist);
    setRegistros(datos);
    const locations = extraerScanLocations(datos);
    setScanLocations(locations);
    setScanLocationSeleccionado('');
    setCarriersDisponibles([]);
    setCarriersSeleccionados([]);
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
        <span className="hint">
          Archivo de trackings: {fileName ? <strong>{fileName}</strong> : 'ninguno cargado'}
        </span>
        <div className="toolbar-spacer" />
        {puedeConfigurarFuente ? (
          <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Fuente de datos:
            <select value={scraperMode} onChange={(e) => handleCambiarModo(e.target.value)}>
              {MODOS_SCRAPER.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="hint">
            Fuente de datos: {MODOS_SCRAPER.find((m) => m.value === scraperMode)?.label}
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
              consultas reales al sitio de UPS (vía la función serverless <code>/api/scrape</code>)
              mientras la API oficial no esté autorizada; puede ser más lento y fallar si UPS
              cambia su página o limita las consultas. Cuando la API oficial se autorice, se
              podrá cambiar de fuente aquí mismo sin tocar el resto del flujo.
            </div>
          ) : (
            <div className="warning-box">
              Fuente de datos: <strong>Simulado</strong>. Los resultados se generan localmente,
              sin salir a internet. Cambia a "Scraping real" arriba para consultar ups.com de
              verdad (mientras se autoriza la API oficial del carrier).
            </div>
          )}

          <CarrierWhitelistEditor
            carriers={carriersWhitelist}
            onAdd={(c) => setCarriersWhitelist(addCarrier(c))}
            onRemove={(c) => setCarriersWhitelist(removeCarrier(c))}
          />

          <FileUpload onFileSelected={handleFileSelected} fileName={fileName} />
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
