import React, { useState } from 'react';
import Card from '../../components/Card.jsx';
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

  const [carriersWhitelist, setCarriersWhitelist] = useState(getCarriersWhitelist);
  const [fileName, setFileName] = useState('');
  const [registros, setRegistros] = useState([]);
  const [scanLocations, setScanLocations] = useState([]);
  const [scanLocationSeleccionado, setScanLocationSeleccionado] = useState('');
  const [carriersDisponibles, setCarriersDisponibles] = useState([]);
  const [carriersSeleccionados, setCarriersSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultados, setResultados] = useState([]);

  async function handleFileSelected(file) {
    setFileName(file.name);
    setResultados([]);
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
    setResultados([]);
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
    setResultados([]);

    const datos = await scrapeBatch(items, (hecho, total) => setProgreso({ hecho, total }));

    setResultados(datos);
    setCargando(false);
  }

  if (!puedeVer) {
    return <Card title="Revisión de Trackings (UPS)">No tienes permiso para ver esta sección.</Card>;
  }

  return (
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
      <ResultsReport
        resultados={resultados}
        scanLocation={scanLocationSeleccionado}
        puedeExportar={puedeExportar}
      />
    </>
  );
}
