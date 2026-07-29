import React, { useState } from 'react';
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
import { scrapeBatch } from './scrapers/mockScraper.js';
import { getCarriersWhitelist, addCarrier, removeCarrier } from './config/carriersConfig.js';
import { usePermission } from '../../context/PermissionsContext.jsx';

export default function TrackingPage() {
  const puedeVer = usePermission('tracking', 'view');
  const puedeBuscar = usePermission('tracking', 'search');
  const puedeExportar = usePermission('tracking', 'export');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
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
        <span className="hint">Modo de prueba: resultados simulados</span>
      </Toolbar>

      {mostrarFormulario && (
        <>
          <div className="warning-box">
            Modo de prueba: los resultados se simulan localmente. La consulta real contra
            UPS/FedEx/USPS se activará cuando se defina y autorice el mecanismo (API oficial
            del carrier o el enfoque de scraping vía función serverless ya documentado).
          </div>

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
          puedeExportar={puedeExportar}
        />
      )}
    </>
  );
}
