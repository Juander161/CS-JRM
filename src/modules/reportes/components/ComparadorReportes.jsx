import React, { useState } from 'react';
import Card from '../../../components/Card.jsx';
import { obtenerArchivoReporte } from '../utils/reportesStore.js';
import { parseGenericSheet } from '../utils/parseGenericSheet.js';
import { exportarFiltrado } from '../utils/exportarFiltrado.js';

function fmtNum(n, dec = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: dec });
}

function calcStatsNumericas(filas, col) {
  const vals = filas
    .map((f) => f[col])
    .filter((v) => v !== '' && v != null && !isNaN(parseFloat(v)))
    .map(Number);
  if (!vals.length || vals.length / filas.length < 0.5) return null;
  const suma = vals.reduce((a, b) => a + b, 0);
  return { suma, promedio: suma / vals.length, n: vals.length };
}

function CeldaDif({ a, b }) {
  if (a == null || b == null) return <td>—</td>;
  const d = b - a;
  const pct = a !== 0 ? (d / Math.abs(a)) * 100 : null;
  const color = d > 0 ? '#166534' : d < 0 ? '#b91c1c' : '#475569';
  return (
    <td style={{ color, fontWeight: 600 }}>
      {d >= 0 ? '+' : ''}{fmtNum(d)}
      {pct != null && <span style={{ fontSize: 11, marginLeft: 4, fontWeight: 400 }}>({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>}
    </td>
  );
}

function TablaMuestra({ filas, columnas, maxFilas = 100, etiqueta }) {
  if (!filas.length) {
    return <p className="hint">Sin registros en {etiqueta}.</p>;
  }
  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 320 }}>
          <thead><tr>{columnas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filas.slice(0, maxFilas).map((fila, idx) => (
              <tr key={idx}>{columnas.map((c) => <td key={c}>{String(fila[c] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length > maxFilas && (
        <p className="hint">Mostrando {maxFilas} de {filas.length.toLocaleString('es-MX')} registros.</p>
      )}
    </>
  );
}

export default function ComparadorReportes({ reportes }) {
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [columnaLlave, setColumnaLlave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('soloA');

  const metaA = reportes.find((r) => r.id === idA);
  const metaB = reportes.find((r) => r.id === idB);
  const columnasComunes = metaA && metaB
    ? (metaA.columnas || []).filter((c) => (metaB.columnas || []).includes(c))
    : [];

  async function handleComparar() {
    if (!idA || !idB || idA === idB) return;
    setCargando(true);
    setError('');
    setResultado(null);
    try {
      const [abA, abB] = await Promise.all([
        obtenerArchivoReporte(idA),
        obtenerArchivoReporte(idB),
      ]);
      if (!abA || !abB) throw new Error('No se pudo obtener el archivo de uno o ambos reportes.');
      const { columnas: colsA, filas: filasA } = parseGenericSheet(abA);
      const { columnas: colsB, filas: filasB } = parseGenericSheet(abB);

      const colsComunes = colsA.filter((c) => colsB.includes(c));

      // Stats numéricas por columna común
      const statsComp = colsComunes
        .map((col) => ({
          col,
          stA: calcStatsNumericas(filasA, col),
          stB: calcStatsNumericas(filasB, col),
        }))
        .filter((x) => x.stA || x.stB);

      // Comparación por clave
      let porClave = null;
      if (columnaLlave && colsA.includes(columnaLlave) && colsB.includes(columnaLlave)) {
        const clavesB = new Set(filasB.map((f) => String(f[columnaLlave] ?? '')));
        const clavesA = new Set(filasA.map((f) => String(f[columnaLlave] ?? '')));
        porClave = {
          soloA: filasA.filter((f) => !clavesB.has(String(f[columnaLlave] ?? ''))),
          soloB: filasB.filter((f) => !clavesA.has(String(f[columnaLlave] ?? ''))),
          ambos: filasA.filter((f) => clavesB.has(String(f[columnaLlave] ?? ''))),
          colsA,
          colsB,
        };
      }

      setResultado({ filasA, filasB, colsA, colsB, colsComunes, statsComp, porClave });
      setTab('soloA');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function handleExportar(filas, cols, etiqueta) {
    exportarFiltrado(`comparacion-${etiqueta}`, cols, filas);
  }

  return (
    <Card title="Comparador de reportes">
      {/* Selección de reportes */}
      <div className="field-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field">
          <label>Reporte A</label>
          <select
            value={idA}
            onChange={(e) => { setIdA(e.target.value); setResultado(null); setColumnaLlave(''); }}
          >
            <option value="">Selecciona…</option>
            {reportes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombreArchivo} — {r.tipo}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Reporte B</label>
          <select
            value={idB}
            onChange={(e) => { setIdB(e.target.value); setResultado(null); setColumnaLlave(''); }}
          >
            <option value="">Selecciona…</option>
            {reportes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombreArchivo} — {r.tipo}</option>
            ))}
          </select>
        </div>
        {columnasComunes.length > 0 && (
          <div className="field">
            <label>Columna clave para coincidencias</label>
            <select value={columnaLlave} onChange={(e) => setColumnaLlave(e.target.value)}>
              <option value="">Solo comparar estadísticas</option>
              {columnasComunes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <button
          className="primary"
          disabled={!idA || !idB || idA === idB || cargando}
          onClick={handleComparar}
        >
          {cargando ? 'Comparando…' : 'Comparar'}
        </button>
      </div>

      {idA === idB && idA && (
        <p className="hint" style={{ color: '#b91c1c' }}>Selecciona dos reportes diferentes.</p>
      )}
      {error && <p className="hint" style={{ color: '#b91c1c' }}>{error}</p>}

      {resultado && (
        <>
          {/* ── Resumen ── */}
          <div className="comparador-resumen">
            <div className="stat-tile">
              <span className="stat-label">Filas — A</span>
              <span className="stat-value">{resultado.filasA.length.toLocaleString('es-MX')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Filas — B</span>
              <span className="stat-value">{resultado.filasB.length.toLocaleString('es-MX')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Diferencia filas</span>
              <span className="stat-value" style={{ color: resultado.filasB.length >= resultado.filasA.length ? '#166534' : '#b91c1c' }}>
                {resultado.filasB.length >= resultado.filasA.length ? '+' : ''}{(resultado.filasB.length - resultado.filasA.length).toLocaleString('es-MX')}
              </span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Columnas A</span>
              <span className="stat-value">{resultado.colsA.length}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Columnas B</span>
              <span className="stat-value">{resultado.colsB.length}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Columnas comunes</span>
              <span className="stat-value">{resultado.colsComunes.length}</span>
            </div>
            {resultado.porClave && (
              <>
                <div className="stat-tile">
                  <span className="stat-label">Solo en A</span>
                  <span className="stat-value" style={{ color: resultado.porClave.soloA.length > 0 ? '#b91c1c' : '#166534' }}>
                    {resultado.porClave.soloA.length.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Solo en B</span>
                  <span className="stat-value" style={{ color: resultado.porClave.soloB.length > 0 ? '#92400e' : '#166534' }}>
                    {resultado.porClave.soloB.length.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Coincidentes</span>
                  <span className="stat-value" style={{ color: '#166534' }}>
                    {resultado.porClave.ambos.length.toLocaleString('es-MX')}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── Columnas numéricas ── */}
          {resultado.statsComp.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Comparación de columnas numéricas</h3>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th>Columna</th>
                      <th>Suma A</th><th>Suma B</th><th>Δ Suma</th>
                      <th>Promedio A</th><th>Promedio B</th><th>Δ Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.statsComp.map(({ col, stA, stB }) => (
                      <tr key={col}>
                        <td><strong>{col}</strong></td>
                        <td>{stA ? fmtNum(stA.suma) : '—'}</td>
                        <td>{stB ? fmtNum(stB.suma) : '—'}</td>
                        <CeldaDif a={stA?.suma} b={stB?.suma} />
                        <td>{stA ? fmtNum(stA.promedio) : '—'}</td>
                        <td>{stB ? fmtNum(stB.promedio) : '—'}</td>
                        <CeldaDif a={stA?.promedio} b={stB?.promedio} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Comparación por clave ── */}
          {resultado.porClave && (
            <>
              <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>
                Comparación por registros — clave: <strong>{columnaLlave}</strong>
              </h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'soloA', label: `Solo en A (${resultado.porClave.soloA.length})`, cols: resultado.porClave.colsA, filas: resultado.porClave.soloA },
                  { id: 'soloB', label: `Solo en B (${resultado.porClave.soloB.length})`, cols: resultado.porClave.colsB, filas: resultado.porClave.soloB },
                  { id: 'ambos', label: `En ambos (${resultado.porClave.ambos.length})`, cols: resultado.porClave.colsA, filas: resultado.porClave.ambos },
                ].map(({ id, label, cols, filas }) => (
                  <div key={id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      className={tab === id ? 'primary' : 'secondary'}
                      onClick={() => setTab(id)}
                    >
                      {label}
                    </button>
                    {filas.length > 0 && (
                      <button
                        className="secondary"
                        onClick={() => handleExportar(filas, cols, id)}
                        title={`Exportar ${label} a Excel`}
                        style={{ fontSize: 12, padding: '6px 8px' }}
                      >
                        ↓
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {tab === 'soloA' && (
                <TablaMuestra filas={resultado.porClave.soloA} columnas={resultado.porClave.colsA} etiqueta="A" />
              )}
              {tab === 'soloB' && (
                <TablaMuestra filas={resultado.porClave.soloB} columnas={resultado.porClave.colsB} etiqueta="B" />
              )}
              {tab === 'ambos' && (
                <TablaMuestra filas={resultado.porClave.ambos} columnas={resultado.porClave.colsA} etiqueta="ambos" />
              )}
            </>
          )}
        </>
      )}

      {reportes.length < 2 && (
        <p className="hint" style={{ marginTop: 8 }}>
          Necesitas al menos dos reportes cargados para comparar. Usa "Cargar reporte" en la barra.
        </p>
      )}
    </Card>
  );
}
