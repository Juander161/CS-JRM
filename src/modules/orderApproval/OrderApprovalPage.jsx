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
  listarInventarios,
  agregarInventario,
  obtenerArchivoInventario,
} from './utils/inventarioStore.js';

const UMBRAL_DEFECTO = 30;
const MARGEN_DIAS_DEFECTO = 3;
const MARGEN_AMBAR_DEFECTO = 7;

const HISTORIAL_KEY = 'order-approval-historial';

export default function OrderApprovalPage() {
  const puedeVer = usePermission('orderApproval', 'view');
  const puedeEjecutar = usePermission('orderApproval', 'run');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarReglas, setMostrarReglas] = useState(false);
  const [textoSolicitud, setTextoSolicitud] = useState('');

  // Historial de archivos de inventario guardados (metadata ligera)
  const [archivosInventario, setArchivosInventario] = useState([]);
  // IDs de los archivos seleccionados para la comparación actual
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [inventarioError, setInventarioError] = useState('');

  const [umbral, setUmbral] = useState(UMBRAL_DEFECTO);
  const [margenDias, setMargenDias] = useState(MARGEN_DIAS_DEFECTO);
  const [margenAmbar, setMargenAmbar] = useState(MARGEN_AMBAR_DEFECTO);
  const [resultado, setResultado] = useState([]);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    const archivos = listarInventarios();
    setArchivosInventario(archivos);
    // Pre-seleccionar el más reciente si existe
    if (archivos.length > 0) setSeleccionados([archivos[0].id]);
    setHistorial(loadSessionJSON(HISTORIAL_KEY, []));
  }, []);

  const { solicitudes: solicitudesParseadas, lineasNoReconocidas } = useMemo(
    () => parseRequestText(textoSolicitud),
    [textoSolicitud]
  );
  const totalItems = solicitudesParseadas.reduce((acc, s) => acc + s.items.length, 0);

  async function handleSubirArchivo(file) {
    setCargandoInventario(true);
    setInventarioError('');
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Validar que el archivo sea parseable antes de guardarlo
      parseInventoryArrayBuffer(arrayBuffer);
      const metadata = await agregarInventario({ nombreArchivo: file.name, arrayBuffer });
      const actualizados = listarInventarios();
      setArchivosInventario(actualizados);
      setSeleccionados([metadata.id]);
    } catch (error) {
      setInventarioError(error.message);
    } finally {
      setCargandoInventario(false);
    }
  }

  async function handleComparar() {
    if (!seleccionados.length || !solicitudesParseadas.length) return;
    setInventarioError('');
    try {
      const mapas = await Promise.all(
        seleccionados.map(async (id) => {
          const arrayBuffer = await obtenerArchivoInventario(id);
          if (!arrayBuffer) throw new Error(`No se encontró el archivo con id ${id} en la base de datos local.`);
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
      setMostrarFormulario(false);

      const hora = new Date().toLocaleTimeString('es-MX');
      const nuevoHistorial = [...historial, ...evaluado.map((solicitud) => ({ hora, solicitud }))];
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

  // Inventario combinado en vivo (solo para BusquedaManual, sin bloquear UI)
  const [inventarioVivo, setInventarioVivo] = useState(null);
  useEffect(() => {
    if (!seleccionados.length) { setInventarioVivo(null); return; }
    let cancelado = false;
    (async () => {
      try {
        const mapas = await Promise.all(
          seleccionados.map(async (id) => {
            const ab = await obtenerArchivoInventario(id);
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
          <button className="primary" onClick={() => setMostrarFormulario((v) => !v)}>
            {mostrarFormulario ? 'Cancelar' : '+ Nueva comparación'}
          </button>
        )}
        <div className="toolbar-separator" />
        <InventoryFilesPicker
          archivos={archivosInventario}
          seleccionados={seleccionados}
          onSeleccionChange={setSeleccionados}
          onSubirArchivo={handleSubirArchivo}
          cargando={cargandoInventario}
          error={inventarioError}
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
        {historial.length > 0 && (
          <>
            <button className="secondary" onClick={() => exportarHistorialExcel(historial)}>
              Descargar historial (Excel)
            </button>
            <button className="danger" onClick={handleVaciarHistorial}>Vaciar historial</button>
          </>
        )}
      </Toolbar>

      {mostrarFormulario && (
        <>
          <RequestTextInput valor={textoSolicitud} onChange={setTextoSolicitud} />

          {lineasNoReconocidas.length > 0 && (
            <div className="warning-box">
              {lineasNoReconocidas.length} línea(s) parecen encabezado o texto de solicitud pero no
              se reconocieron con el formato esperado (revisa mayúsculas/espacios, o avisa para
              ajustar el lector):
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {lineasNoReconocidas.map((linea, idx) => (
                  <li key={idx}><code>{linea}</code></li>
                ))}
              </ul>
            </div>
          )}

          <BusquedaManual inventario={inventarioVivo} />

          <Card title="Comparar">
            <p className="hint">
              {solicitudesParseadas.length} solicitud(es) detectada(s), {totalItems} artículo(s) en total.
              {seleccionados.length > 1 && (
                <> Comparando contra <strong>{seleccionados.length} archivos</strong> de disponibilidad combinados.</>
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
