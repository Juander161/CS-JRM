import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card.jsx';
import Toolbar from '../../components/Toolbar.jsx';
import RequestTextInput from './components/RequestTextInput.jsx';
import InventoryFilesPicker from './components/InventoryFilesPicker.jsx';
import ThresholdConfig from './components/ThresholdConfig.jsx';
import ResultsTabs from './components/ResultsTabs.jsx';
import BusquedaManual from './components/BusquedaManual.jsx';
import { parseRequestText } from './utils/parseRequestText.js';
import { parseInventoryArrayBuffer, combinarInventarios } from './utils/parseInventoryFile.js';
import { evaluarSolicitudes } from './utils/evaluateRules.js';
import { exportarHistorialExcel } from './utils/exportHistorialExcel.js';
import { usePermission } from '../../context/PermissionsContext.jsx';
import { loadSessionJSON, saveSessionJSON, removeSessionItem } from '../../services/storage/sessionStore.js';
import {
  listarReportesInventario,
  obtenerArchivoReporte,
} from '../../services/reporteHub.js';

const UMBRAL_DEFECTO = 30;
const MARGEN_DIAS_DEFECTO = 3;
const MARGEN_AMBAR_DEFECTO = 7;

const HISTORIAL_KEY = 'order-approval-historial';

export default function OrderApprovalPage() {
  const puedeVer = usePermission('orderApproval', 'view');
  const puedeEjecutar = usePermission('orderApproval', 'run');

  const [mostrarReglas, setMostrarReglas] = useState(false);
  const [textoSolicitud, setTextoSolicitud] = useState('');

  const [archivosInventario, setArchivosInventario] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [inventarioError, setInventarioError] = useState('');

  const [umbral, setUmbral] = useState(UMBRAL_DEFECTO);
  const [margenDias, setMargenDias] = useState(MARGEN_DIAS_DEFECTO);
  const [margenAmbar, setMargenAmbar] = useState(MARGEN_AMBAR_DEFECTO);
  const [resultado, setResultado] = useState([]);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    const archivos = listarReportesInventario();
    setArchivosInventario(archivos);
    if (archivos.length > 0) setSeleccionados([archivos[0].id]);
    setHistorial(loadSessionJSON(HISTORIAL_KEY, []));
  }, []);

  const { solicitudes: solicitudesParseadas, lineasNoReconocidas } = useMemo(
    () => parseRequestText(textoSolicitud),
    [textoSolicitud]
  );
  const totalItems = solicitudesParseadas.reduce((acc, s) => acc + s.items.length, 0);

  async function handleComparar() {
    if (!seleccionados.length || !solicitudesParseadas.length) return;
    setInventarioError('');
    try {
      const mapas = await Promise.all(
        seleccionados.map(async (id) => {
          const arrayBuffer = await obtenerArchivoReporte(id);
          if (!arrayBuffer) throw new Error(`Reporte con id ${id} no encontrado en el almacén local.`);
          return parseInventoryArrayBuffer(arrayBuffer);
        })
      );
      const inventarioCombinado = combinarInventarios(mapas);

      const evaluado = evaluarSolicitudes(solicitudesParseadas, inventarioCombinado, {
        umbralPorcentaje: umbral / 100,
        margenDiasRdd: margenDias,
        margenAmbarPorcentaje: margenAmbar / 100,
      });
      setResultado(evaluado);

      const hora = new Date().toLocaleTimeString('es-MX');
      const nuevoHistorial = [
        ...historial,
        ...evaluado.map((solicitud) => ({ hora, solicitud })),
      ];
      setHistorial(nuevoHistorial);
      saveSessionJSON(HISTORIAL_KEY, nuevoHistorial);
    } catch (error) {
      setInventarioError(error.message);
    }
  }

  function handleVaciarHistorial() {
    setHistorial([]);
    removeSessionItem(HISTORIAL_KEY);
  }

  // Inventario combinado en vivo para BusquedaManual en la toolbar
  const [inventarioVivo, setInventarioVivo] = useState(null);
  useEffect(() => {
    if (!seleccionados.length) { setInventarioVivo(null); return; }
    let cancelado = false;
    (async () => {
      try {
        const mapas = await Promise.all(
          seleccionados.map(async (id) => {
            const ab = await obtenerArchivoReporte(id);
            return ab ? parseInventoryArrayBuffer(ab) : new Map();
          })
        );
        if (!cancelado) setInventarioVivo(combinarInventarios(mapas));
      } catch { /* silencioso */ }
    })();
    return () => { cancelado = true; };
  }, [seleccionados]);

  if (!puedeVer) {
    return <Card title="Order Approval">No tienes permiso para ver esta sección.</Card>;
  }

  const puedeComparar = seleccionados.length > 0 && solicitudesParseadas.length > 0;

  return (
    <>
      <Toolbar>
        {puedeEjecutar && (
          <button
            className="secondary"
            onClick={() => { setTextoSolicitud(''); setInventarioError(''); }}
            title="Limpiar el cuadro de texto para iniciar una nueva comparación"
          >
            Limpiar
          </button>
        )}
        <div className="toolbar-separator" />
        <InventoryFilesPicker
          archivos={archivosInventario}
          seleccionados={seleccionados}
          onSeleccionChange={setSeleccionados}
        />
        <div className="toolbar-separator" />
        <button
          className="secondary"
          onClick={() => setMostrarReglas((v) => !v)}
          title="Configurar umbral de aprobación, zona ámbar y días RDD"
          style={{ fontSize: '0.8rem' }}
        >
          ⚙ Reglas
        </button>
        {mostrarReglas && (
          <>
            <div className="toolbar-separator" />
            <ThresholdConfig
              umbral={umbral}
              onUmbralChange={setUmbral}
              margenDias={margenDias}
              onMargenDiasChange={setMargenDias}
              margenAmbar={margenAmbar}
              onMargenAmbarChange={setMargenAmbar}
            />
          </>
        )}
        <div className="toolbar-spacer" />
        <BusquedaManual inventario={inventarioVivo} />
        {historial.length > 0 && (
          <>
            <div className="toolbar-separator" />
            <button className="secondary" onClick={() => exportarHistorialExcel(historial)}>
              Descargar historial (Excel)
            </button>
            <button className="danger" onClick={handleVaciarHistorial}>Vaciar historial</button>
          </>
        )}
      </Toolbar>

      {/* El formulario siempre está visible — no requiere abrir con un botón */}
      {puedeEjecutar && (
        <>
          <RequestTextInput valor={textoSolicitud} onChange={setTextoSolicitud} />

          {lineasNoReconocidas.length > 0 && (
            <div className="warning-box">
              {lineasNoReconocidas.length} línea(s) no reconocidas con el formato esperado:
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {lineasNoReconocidas.map((linea, idx) => (
                  <li key={idx}><code>{linea}</code></li>
                ))}
              </ul>
            </div>
          )}

          {inventarioError && (
            <div className="warning-box" style={{ borderColor: '#b91c1c' }}>
              {inventarioError}
            </div>
          )}

          <Card title="Comparar">
            <p className="hint">
              {solicitudesParseadas.length > 0
                ? <>
                    {solicitudesParseadas.length} solicitud(es) · {totalItems} artículo(s).
                    {seleccionados.length > 1 && <> Combinando <strong>{seleccionados.length} reportes</strong>.</>}
                  </>
                : 'Pega el texto de la solicitud arriba para continuar.'}
              {seleccionados.length === 0 && (
                <> <strong style={{ color: '#b91c1c' }}>Selecciona un reporte de inventario en la barra.</strong></>
              )}
            </p>
            <button
              className="primary"
              disabled={!puedeComparar}
              onClick={handleComparar}
            >
              Comparar contra disponibilidad
            </button>
          </Card>
        </>
      )}

      <ResultsTabs solicitudes={resultado} />
    </>
  );
}
