import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '../../components/Card.jsx';
import Toolbar from '../../components/Toolbar.jsx';
import RequestTextInput from './components/RequestTextInput.jsx';
import InventoryFilesPicker from './components/InventoryFilesPicker.jsx';
import ThresholdConfig from './components/ThresholdConfig.jsx';
import EmailIntegrationPanel from './components/EmailIntegrationPanel.jsx';
import FolderWatchPanel from './components/FolderWatchPanel.jsx';
import ResultsTabs from './components/ResultsTabs.jsx';
import BusquedaManual from './components/BusquedaManual.jsx';
import { parseRequestText } from './utils/parseRequestText.js';
import { parseInventoryArrayBuffer, combinarInventarios } from './utils/parseInventoryFile.js';
import { evaluarSolicitudes } from './utils/evaluateRules.js';
import { exportarHistorialExcel } from './utils/exportHistorialExcel.js';
import { usePermission } from '../../context/PermissionsContext.jsx';
import { loadSessionJSON, saveSessionJSON, removeSessionItem } from '../../services/storage/sessionStore.js';
import { loadJSON, saveJSON } from '../../services/storage/localStore.js';
import {
  listarReportesInventario,
  obtenerArchivoReporte,
} from '../../services/reporteHub.js';

const UMBRAL_DEFECTO        = 30;
const MARGEN_DIAS_DEFECTO   = 3;
const MARGEN_AMBAR_DEFECTO  = 7;
const CANTIDAD_MAX_DEFECTO  = 0;
const CANTIDAD_MIN_DEFECTO  = 0;
// Debounce solo para el parseo de texto (mientras el usuario termina de pegar).
// La evaluación en sí es síncrona y no necesita debounce largo.
const DEBOUNCE_MS = 150;

const HISTORIAL_KEY = 'order-approval-historial';
const REGLAS_KEY    = 'order-approval-reglas';

export default function OrderApprovalPage() {
  const puedeVer = usePermission('orderApproval', 'view');
  const puedeEjecutar = usePermission('orderApproval', 'run');

  const [textoSolicitud, setTextoSolicitud] = useState('');

  const [archivosInventario, setArchivosInventario] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [inventarioError, setInventarioError] = useState('');

  // Reglas: se persisten en localStorage para sobrevivir recargas.
  const reglasPersistidas = loadJSON(REGLAS_KEY, {});
  const [umbral,           setUmbralRaw]           = useState(reglasPersistidas.umbral          ?? UMBRAL_DEFECTO);
  const [margenDias,       setMargenDiasRaw]       = useState(reglasPersistidas.margenDias      ?? MARGEN_DIAS_DEFECTO);
  const [margenAmbar,      setMargenAmbarRaw]      = useState(reglasPersistidas.margenAmbar     ?? MARGEN_AMBAR_DEFECTO);
  const [cantidadMaxima,   setCantidadMaximaRaw]   = useState(reglasPersistidas.cantidadMaxima  ?? CANTIDAD_MAX_DEFECTO);
  const [cantidadMinima,   setCantidadMinimaRaw]   = useState(reglasPersistidas.cantidadMinima  ?? CANTIDAD_MIN_DEFECTO);
  const [codigosExcluidos, setCodigosExcluidosRaw] = useState(reglasPersistidas.codigosExcluidos ?? []);

  function guardarReglas(patch) {
    const actuales = loadJSON(REGLAS_KEY, {});
    saveJSON(REGLAS_KEY, { ...actuales, ...patch });
  }
  function setUmbral(v)           { setUmbralRaw(v);           guardarReglas({ umbral: v }); }
  function setMargenDias(v)       { setMargenDiasRaw(v);       guardarReglas({ margenDias: v }); }
  function setMargenAmbar(v)      { setMargenAmbarRaw(v);      guardarReglas({ margenAmbar: v }); }
  function setCantidadMaxima(v)   { setCantidadMaximaRaw(v);   guardarReglas({ cantidadMaxima: v }); }
  function setCantidadMinima(v)   { setCantidadMinimaRaw(v);   guardarReglas({ cantidadMinima: v }); }
  function setCodigosExcluidos(v) { setCodigosExcluidosRaw(v); guardarReglas({ codigosExcluidos: v }); }

  const [resultado, setResultado] = useState([]);
  const [historial, setHistorial] = useState([]);
  // Rastrea qué solicitudes ya están en el historial para no duplicarlas
  // cuando el usuario solo cambia reglas (umbral/días) sin cambiar el texto.
  const solicitudesEnHistorialRef = useRef(null);

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

  // ── Efecto 1: carga el inventario UNA SOLA VEZ cuando cambian los archivos
  // seleccionados. El resultado queda en memoria y es compartido por la
  // evaluación y la búsqueda manual — no se vuelve a leer IndexedDB al
  // cambiar texto ni reglas.
  const [inventarioCombinado, setInventarioCombinado] = useState(null);
  useEffect(() => {
    if (!seleccionados.length) {
      setInventarioCombinado(null);
      setInventarioError('');
      return;
    }
    let cancelado = false;
    setInventarioError('');
    (async () => {
      try {
        const mapas = await Promise.all(
          seleccionados.map(async (id) => {
            const ab = await obtenerArchivoReporte(id);
            if (!ab) throw new Error(`Reporte ${id} no encontrado en el almacén local.`);
            return parseInventoryArrayBuffer(ab);
          })
        );
        if (!cancelado) setInventarioCombinado(combinarInventarios(mapas));
      } catch (err) {
        if (!cancelado) setInventarioError(err.message);
      }
    })();
    return () => { cancelado = true; };
  }, [seleccionados]);

  // ── Efecto 2: evaluación pura (sin I/O) — usa el inventario ya en memoria.
  // Se dispara al cambiar texto, reglas o cuando el inventario termina de
  // cargarse. El debounce corto solo absorbe el tiempo de pegado de texto.
  useEffect(() => {
    if (!solicitudesParseadas.length) { setResultado([]); return; }
    if (!inventarioCombinado) return;

    const timer = setTimeout(() => {
      const evaluado = evaluarSolicitudes(solicitudesParseadas, inventarioCombinado, {
        umbralPorcentaje:      umbral / 100,
        margenDiasRdd:         margenDias,
        margenAmbarPorcentaje: margenAmbar / 100,
        cantidadMaxima,
        cantidadMinima,
        codigosExcluidos,
      });
      setResultado(evaluado);
      // Solo agregar al historial cuando cambia el texto (no al ajustar reglas).
      if (solicitudesParseadas !== solicitudesEnHistorialRef.current) {
        solicitudesEnHistorialRef.current = solicitudesParseadas;
        const hora = new Date().toLocaleTimeString('es-MX');
        setHistorial((prev) => {
          const nuevo = [...prev, ...evaluado.map((solicitud) => ({ hora, solicitud }))];
          saveSessionJSON(HISTORIAL_KEY, nuevo);
          return nuevo;
        });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [solicitudesParseadas, inventarioCombinado, umbral, margenDias, margenAmbar, cantidadMaxima, cantidadMinima, codigosExcluidos]);

  const handleNuevoEmail = useCallback((cuerpo) => {
    setTextoSolicitud((prev) => {
      const sep = prev.trim() ? '\n\n' : '';
      return prev + sep + cuerpo;
    });
  }, []);

  function handleVaciarHistorial() {
    setHistorial([]);
    removeSessionItem(HISTORIAL_KEY);
  }

  if (!puedeVer) {
    return <Card title="Order Approval">No tienes permiso para ver esta sección.</Card>;
  }

  const totalItems = solicitudesParseadas.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <>
      <Toolbar>
        {/* ── Grupo: Solicitud ── */}
        {puedeEjecutar && (
          <div className="ribbon-group">
            <div className="ribbon-group-body">
              <button
                className="btn-ribbon"
                onClick={() => { setTextoSolicitud(''); setInventarioError(''); setResultado([]); }}
                title="Limpiar el cuadro para iniciar una nueva comparación"
              >
                <span className="btn-ribbon-icon">✕</span>
                <span className="btn-ribbon-label">Limpiar</span>
              </button>
            </div>
            <div className="ribbon-group-label">Solicitud</div>
          </div>
        )}

        {/* ── Grupo: Inventario ── */}
        <div className="ribbon-group">
          <div className="ribbon-group-body">
            <InventoryFilesPicker
              archivos={archivosInventario}
              seleccionados={seleccionados}
              onSeleccionChange={setSeleccionados}
            />
          </div>
          <div className="ribbon-group-label">Inventario</div>
        </div>

        {/* ── Grupo: Reglas ── */}
        <div className="ribbon-group">
          <div className="ribbon-group-body">
            <ThresholdConfig
              umbral={umbral}               onUmbralChange={setUmbral}
              margenDias={margenDias}       onMargenDiasChange={setMargenDias}
              margenAmbar={margenAmbar}     onMargenAmbarChange={setMargenAmbar}
              cantidadMaxima={cantidadMaxima}   onCantidadMaximaChange={setCantidadMaxima}
              cantidadMinima={cantidadMinima}   onCantidadMinimaChange={setCantidadMinima}
              codigosExcluidos={codigosExcluidos} onCodigosExcluidosChange={setCodigosExcluidos}
            />
          </div>
          <div className="ribbon-group-label">Reglas</div>
        </div>

        <div className="toolbar-spacer" />

        {/* ── Grupo: Búsqueda ── */}
        <div className="ribbon-group">
          <div className="ribbon-group-body">
            <BusquedaManual inventario={inventarioCombinado} />
          </div>
          <div className="ribbon-group-label">Búsqueda rápida</div>
        </div>

        {/* ── Grupo: Correos (modo automático carpeta + Microsoft Graph API) ── */}
        <div className="ribbon-group">
          <div className="ribbon-group-body">
            <FolderWatchPanel onNuevoEmail={handleNuevoEmail} />
            <EmailIntegrationPanel
              onCorreosProcesados={(texto) => setTextoSolicitud(texto)}
            />
          </div>
          <div className="ribbon-group-label">Correos</div>
        </div>

        {/* ── Grupo: Historial ── */}
        {historial.length > 0 && (
          <div className="ribbon-group">
            <div className="ribbon-group-body">
              <button
                className="btn-ribbon"
                onClick={() => exportarHistorialExcel(historial)}
                title="Descargar historial como Excel"
              >
                <span className="btn-ribbon-icon">📊</span>
                <span className="btn-ribbon-label">Excel</span>
              </button>
              <button
                className="btn-ribbon danger"
                onClick={handleVaciarHistorial}
                title="Vaciar todo el historial de esta sesión"
              >
                <span className="btn-ribbon-icon">🗑</span>
                <span className="btn-ribbon-label">Vaciar</span>
              </button>
            </div>
            <div className="ribbon-group-label">Historial</div>
          </div>
        )}
      </Toolbar>

      {puedeEjecutar && (
        <>
          <RequestTextInput valor={textoSolicitud} onChange={setTextoSolicitud} />

          {lineasNoReconocidas.length > 0 && (
            <div className="warning-box">
              {lineasNoReconocidas.length} línea(s) no reconocidas:
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

          {solicitudesParseadas.length > 0 && (
            <p className="hint" style={{ padding: '4px 0' }}>
              {solicitudesParseadas.length} solicitud(es) · {totalItems} artículo(s)
              {seleccionados.length > 1 && <> · combinando <strong>{seleccionados.length} reportes</strong></>}
            </p>
          )}

          {seleccionados.length === 0 && textoSolicitud.trim() && (
            <div className="warning-box">
              Selecciona al menos un reporte de inventario en la barra para comparar.
            </div>
          )}
        </>
      )}

      <ResultsTabs solicitudes={resultado} />
    </>
  );
}
