import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card.jsx';
import RequestTextInput from './components/RequestTextInput.jsx';
import InventoryUpload from './components/InventoryUpload.jsx';
import ThresholdConfig from './components/ThresholdConfig.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import BusquedaManual from './components/BusquedaManual.jsx';
import { parseRequestText } from './utils/parseRequestText.js';
import { parseInventoryArrayBuffer } from './utils/parseInventoryFile.js';
import { evaluarSolicitudes } from './utils/evaluateRules.js';
import { exportarHistorialExcel } from './utils/exportHistorialExcel.js';
import { usePermission } from '../../context/PermissionsContext.jsx';
import { loadSessionJSON, saveSessionJSON, removeSessionItem } from '../../services/storage/sessionStore.js';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../services/storage/binaryEncoding.js';

const UMBRAL_DEFECTO = 30;
const MARGEN_DIAS_DEFECTO = 3;
const MARGEN_AMBAR_DEFECTO = 7;

const INVENTARIO_KEY = 'order-approval-inventario';
const HISTORIAL_KEY = 'order-approval-historial';

export default function OrderApprovalPage() {
  const puedeVer = usePermission('orderApproval', 'view');
  const puedeEjecutar = usePermission('orderApproval', 'run');

  const [textoSolicitud, setTextoSolicitud] = useState('');
  const [inventario, setInventario] = useState(null);
  const [inventoryFileName, setInventoryFileName] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [umbral, setUmbral] = useState(UMBRAL_DEFECTO);
  const [margenDias, setMargenDias] = useState(MARGEN_DIAS_DEFECTO);
  const [margenAmbar, setMargenAmbar] = useState(MARGEN_AMBAR_DEFECTO);
  const [resultado, setResultado] = useState([]);
  const [historial, setHistorial] = useState([]);

  // Al montar: recupera el Excel de disponibilidad y el historial de la
  // pestaña/sesión actual (si los hay), para no perderlos ante un refresh
  // mientras se procesan varios correos seguidos contra el mismo archivo.
  useEffect(() => {
    const inventarioGuardado = loadSessionJSON(INVENTARIO_KEY, null);
    if (inventarioGuardado) {
      try {
        const arrayBuffer = base64ToArrayBuffer(inventarioGuardado.base64);
        setInventario(parseInventoryArrayBuffer(arrayBuffer));
        setInventoryFileName(inventarioGuardado.nombre);
      } catch (error) {
        console.warn('No se pudo restaurar el Excel de disponibilidad de la sesión', error);
      }
    }
    setHistorial(loadSessionJSON(HISTORIAL_KEY, []));
  }, []);

  const { solicitudes: solicitudesParseadas, lineasNoReconocidas } = useMemo(
    () => parseRequestText(textoSolicitud),
    [textoSolicitud]
  );
  const totalItems = solicitudesParseadas.reduce((acc, s) => acc + s.items.length, 0);

  async function handleInventoryFile(file) {
    setInventoryError('');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mapa = parseInventoryArrayBuffer(arrayBuffer);
      setInventario(mapa);
      setInventoryFileName(file.name);
      saveSessionJSON(INVENTARIO_KEY, {
        nombre: file.name,
        base64: arrayBufferToBase64(arrayBuffer),
      });
    } catch (error) {
      setInventario(null);
      setInventoryFileName('');
      setInventoryError(error.message);
    }
  }

  function handleComparar() {
    if (!inventario || !solicitudesParseadas.length) return;
    const evaluado = evaluarSolicitudes(solicitudesParseadas, inventario, {
      umbralPorcentaje: umbral / 100,
      margenDiasRdd: margenDias,
      margenAmbarPorcentaje: margenAmbar / 100,
    });
    setResultado(evaluado);

    const hora = new Date().toLocaleTimeString('es-MX');
    const nuevoHistorial = [...historial, ...evaluado.map((solicitud) => ({ hora, solicitud }))];
    setHistorial(nuevoHistorial);
    saveSessionJSON(HISTORIAL_KEY, nuevoHistorial);
  }

  function handleVaciarHistorial() {
    setHistorial([]);
    removeSessionItem(HISTORIAL_KEY);
  }

  if (!puedeVer) {
    return <Card title="Order Approval">No tienes permiso para ver esta sección.</Card>;
  }

  return (
    <>
      <RequestTextInput valor={textoSolicitud} onChange={setTextoSolicitud} />

      {lineasNoReconocidas.length > 0 && (
        <div className="warning-box">
          {lineasNoReconocidas.length} línea(s) parecen encabezado o texto de solicitud pero no se
          reconocieron con el formato esperado (revisa mayúsculas/espacios, o avisa para ajustar el
          lector):
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {lineasNoReconocidas.map((linea, idx) => (
              <li key={idx}><code>{linea}</code></li>
            ))}
          </ul>
        </div>
      )}

      <InventoryUpload
        fileName={inventoryFileName}
        onFileSelected={handleInventoryFile}
        error={inventoryError}
      />

      <BusquedaManual inventario={inventario} />

      <ThresholdConfig
        umbral={umbral}
        onUmbralChange={setUmbral}
        margenDias={margenDias}
        onMargenDiasChange={setMargenDias}
        margenAmbar={margenAmbar}
        onMargenAmbarChange={setMargenAmbar}
      />

      <Card title="4. Comparar">
        <p className="hint">
          {solicitudesParseadas.length} solicitud(es) detectada(s), {totalItems} artículo(s) en total.
        </p>
        <button
          className="primary"
          disabled={!puedeEjecutar || !inventario || !solicitudesParseadas.length}
          onClick={handleComparar}
        >
          Comparar contra disponibilidad
        </button>
        {!puedeEjecutar && <p className="hint">No tienes permiso para ejecutar la comparación.</p>}
      </Card>

      <ResultsTable solicitudes={resultado} />

      {historial.length > 0 && (
        <Card
          title="Historial del día"
          actions={
            <>
              <button className="primary" onClick={() => exportarHistorialExcel(historial)}>
                Descargar historial (Excel)
              </button>
              <button className="danger" onClick={handleVaciarHistorial}>Vaciar historial</button>
            </>
          }
        >
          <p className="hint">
            {historial.length} solicitud(es) evaluada(s) en esta sesión de trabajo (se guarda
            mientras la pestaña siga abierta, como respaldo de qué se aprobó/rechazó y por qué).
          </p>
        </Card>
      )}
    </>
  );
}
