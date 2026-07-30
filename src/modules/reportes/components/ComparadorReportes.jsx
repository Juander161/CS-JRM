import React, { useState } from 'react';
import Card from '../../../components/Card.jsx';
import { obtenerArchivoReporte } from '../utils/reportesStore.js';
import { parseGenericSheet } from '../utils/parseGenericSheet.js';
import { exportarFiltrado } from '../utils/exportarFiltrado.js';

// ── Utilidades ────────────────────────────────────────────────────────────────

function fmtNum(n, dec = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: dec });
}

function calcStatsNumericas(filas, col) {
  const vals = filas
    .map((f) => f[col])
    .filter((v) => v !== '' && v != null && !isNaN(parseFloat(v)))
    .map(Number);
  if (!vals.length || vals.length / filas.length < 0.4) return null;
  return { suma: vals.reduce((a, b) => a + b, 0), promedio: vals.reduce((a, b) => a + b, 0) / vals.length };
}

// Compara dos reportes con llave: devuelve soloA, soloB, cambios, sinCambios
function compararPorLlave(filasA, filasB, columnaLlave, colsComunes) {
  const mapaA = new Map(filasA.map((f) => [String(f[columnaLlave] ?? ''), f]));
  const mapaB = new Map(filasB.map((f) => [String(f[columnaLlave] ?? ''), f]));

  const soloA = filasA.filter((f) => !mapaB.has(String(f[columnaLlave] ?? '')));
  const soloB = filasB.filter((f) => !mapaA.has(String(f[columnaLlave] ?? '')));

  const cambios = [];
  const sinCambios = [];

  for (const [clave, rowA] of mapaA) {
    if (!mapaB.has(clave)) continue;
    const rowB = mapaB.get(clave);
    const colsDiff = colsComunes.filter(
      (c) => c !== columnaLlave && String(rowA[c] ?? '') !== String(rowB[c] ?? '')
    );
    if (colsDiff.length > 0) {
      cambios.push({ clave, rowA, rowB, colsDiff });
    } else {
      sinCambios.push({ clave, rowA });
    }
  }

  // Columnas que cambiaron en al menos una fila
  const colsCambiadas = [...new Set(cambios.flatMap((e) => e.colsDiff))];

  // Resumen de cambios por columna numérica
  const resumenNum = colsCambiadas
    .map((col) => {
      const deltas = cambios
        .map(({ rowA, rowB }) => {
          const a = parseFloat(rowA[col]), b = parseFloat(rowB[col]);
          return isNaN(a) || isNaN(b) ? null : b - a;
        })
        .filter((d) => d !== null);
      if (!deltas.length) return null;
      const aum = deltas.filter((d) => d > 0);
      const dec = deltas.filter((d) => d < 0);
      const totalDelta = deltas.reduce((a, b) => a + b, 0);
      return {
        col,
        totalDelta,
        nAumentos: aum.length,
        nDecrementos: dec.length,
        nIgual: deltas.filter((d) => d === 0).length,
        sumaAumentos: aum.reduce((a, b) => a + b, 0),
        sumaDecrementos: dec.reduce((a, b) => a + b, 0),
      };
    })
    .filter(Boolean);

  return { soloA, soloB, cambios, sinCambios, colsCambiadas, resumenNum };
}

// ── Celda de cambio (muestra A → B con delta si es numérico) ─────────────────
function CeldaCambio({ valA, valB, esLlave }) {
  const sA = String(valA ?? '');
  const sB = String(valB ?? '');
  if (esLlave) return <td><strong>{sA}</strong></td>;
  if (sA === sB) return <td style={{ color: '#94a3b8', fontSize: 12 }}>{sA}</td>;
  const nA = parseFloat(valA), nB = parseFloat(valB);
  const esNum = !isNaN(nA) && !isNaN(nB);
  const delta = esNum ? nB - nA : null;
  const color = delta != null ? (delta > 0 ? '#166534' : '#b91c1c') : '#92400e';
  return (
    <td style={{ color, fontWeight: 600 }}>
      {sA} → {sB}
      {delta != null && (
        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
          ({delta >= 0 ? '+' : ''}{fmtNum(delta, 2)})
        </span>
      )}
    </td>
  );
}

// ── Tabla de filas con scroll ─────────────────────────────────────────────────
function TablaMuestra({ filas, columnas, max = 150 }) {
  if (!filas.length) return <p className="hint">Sin registros.</p>;
  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 320 }}>
          <thead><tr>{columnas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filas.slice(0, max).map((f, i) => (
              <tr key={i}>{columnas.map((c) => <td key={c}>{String(f[c] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length > max && (
        <p className="hint">{max} de {filas.length.toLocaleString('es-MX')} mostrados.</p>
      )}
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ComparadorReportes({ reportes, tipoFiltrado }) {
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [columnaLlave, setColumnaLlave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('cambios');

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

      // Stats numéricas globales (sin clave)
      const statsComp = colsComunes
        .map((col) => ({ col, stA: calcStatsNumericas(filasA, col), stB: calcStatsNumericas(filasB, col) }))
        .filter((x) => x.stA || x.stB);

      let porLlave = null;
      if (columnaLlave && colsA.includes(columnaLlave) && colsB.includes(columnaLlave)) {
        porLlave = compararPorLlave(filasA, filasB, columnaLlave, colsComunes);
      }

      setResultado({ filasA, filasB, colsA, colsB, colsComunes, statsComp, porLlave });
      setTab(porLlave ? 'cambios' : 'stats');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function exportarTab(filas, cols, nombre) {
    exportarFiltrado(`comparacion-${nombre}`, cols, filas);
  }

  return (
    <Card title={`Comparador de reportes${tipoFiltrado ? ` — ${tipoFiltrado}` : ''}`}>
      <p className="hint" style={{ marginBottom: 12 }}>
        Selecciona dos reportes del mismo tipo para ver qué cambió. A = base (día anterior) → B = nuevo (hoy).
      </p>

      {/* Selección */}
      <div className="field-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field">
          <label>Reporte A — base / anterior</label>
          <select value={idA} onChange={(e) => { setIdA(e.target.value); setResultado(null); setColumnaLlave(''); }}>
            <option value="">Selecciona…</option>
            {reportes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombreArchivo}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Reporte B — nuevo / hoy</label>
          <select value={idB} onChange={(e) => { setIdB(e.target.value); setResultado(null); setColumnaLlave(''); }}>
            <option value="">Selecciona…</option>
            {reportes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombreArchivo}</option>
            ))}
          </select>
        </div>
        {columnasComunes.length > 0 && (
          <div className="field">
            <label>Columna clave (p.ej. Item Code)</label>
            <select value={columnaLlave} onChange={(e) => setColumnaLlave(e.target.value)}>
              <option value="">Solo estadísticas globales</option>
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
          {/* ── Resumen de filas ── */}
          <div className="comparador-resumen">
            <div className="stat-tile">
              <span className="stat-label">Filas A</span>
              <span className="stat-value">{resultado.filasA.length.toLocaleString('es-MX')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Filas B</span>
              <span className="stat-value">{resultado.filasB.length.toLocaleString('es-MX')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Δ filas</span>
              <span className="stat-value" style={{ color: resultado.filasB.length >= resultado.filasA.length ? '#166534' : '#b91c1c' }}>
                {resultado.filasB.length >= resultado.filasA.length ? '+' : ''}{(resultado.filasB.length - resultado.filasA.length).toLocaleString('es-MX')}
              </span>
            </div>
            {resultado.porLlave && (
              <>
                <div className="stat-tile">
                  <span className="stat-label">Con cambios</span>
                  <span className="stat-value" style={{ color: resultado.porLlave.cambios.length > 0 ? '#b45309' : '#166534' }}>
                    {resultado.porLlave.cambios.length.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Registros nuevos</span>
                  <span className="stat-value" style={{ color: resultado.porLlave.soloB.length > 0 ? '#166534' : '#94a3b8' }}>
                    +{resultado.porLlave.soloB.length.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Eliminados</span>
                  <span className="stat-value" style={{ color: resultado.porLlave.soloA.length > 0 ? '#b91c1c' : '#94a3b8' }}>
                    -{resultado.porLlave.soloA.length.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Sin cambios</span>
                  <span className="stat-value" style={{ color: '#94a3b8' }}>
                    {resultado.porLlave.sinCambios.length.toLocaleString('es-MX')}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── Resumen numérico por columna cambiada ── */}
          {resultado.porLlave?.resumenNum?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Resumen de cambios numéricos</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Columna</th>
                      <th>Δ total</th>
                      <th>▲ Aumentaron</th>
                      <th>▼ Disminuyeron</th>
                      <th>Suma aumentos</th>
                      <th>Suma decrementos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.porLlave.resumenNum.map(({ col, totalDelta, nAumentos, nDecrementos, sumaAumentos, sumaDecrementos }) => (
                      <tr key={col}>
                        <td><strong>{col}</strong></td>
                        <td style={{ fontWeight: 700, color: totalDelta >= 0 ? '#166534' : '#b91c1c' }}>
                          {totalDelta >= 0 ? '+' : ''}{fmtNum(totalDelta)}
                        </td>
                        <td style={{ color: '#166534' }}>{nAumentos.toLocaleString('es-MX')} ítem(s)</td>
                        <td style={{ color: '#b91c1c' }}>{nDecrementos.toLocaleString('es-MX')} ítem(s)</td>
                        <td style={{ color: '#166534' }}>+{fmtNum(sumaAumentos)}</td>
                        <td style={{ color: '#b91c1c' }}>{fmtNum(sumaDecrementos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tabs de detalle ── */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {resultado.porLlave && (
              <>
                <button
                  className={tab === 'cambios' ? 'primary' : 'secondary'}
                  onClick={() => setTab('cambios')}
                >
                  🔄 Cambios ({resultado.porLlave.cambios.length})
                </button>
                <button
                  className={tab === 'soloB' ? 'primary' : 'secondary'}
                  onClick={() => setTab('soloB')}
                >
                  ↗ Nuevos en B ({resultado.porLlave.soloB.length})
                </button>
                <button
                  className={tab === 'soloA' ? 'primary' : 'secondary'}
                  onClick={() => setTab('soloA')}
                >
                  ↙ Eliminados de A ({resultado.porLlave.soloA.length})
                </button>
                <button
                  className={tab === 'sinCambios' ? 'primary' : 'secondary'}
                  onClick={() => setTab('sinCambios')}
                >
                  ✓ Sin cambios ({resultado.porLlave.sinCambios.length})
                </button>
              </>
            )}
            <button
              className={tab === 'stats' ? 'primary' : 'secondary'}
              onClick={() => setTab('stats')}
            >
              📊 Estadísticas globales
            </button>
          </div>

          {/* ── Contenido del tab activo ── */}

          {tab === 'cambios' && resultado.porLlave && (() => {
            const { cambios, colsCambiadas, colsA } = resultado.porLlave;
            if (!cambios.length) return <p className="hint">No se detectaron cambios en los registros coincidentes.</p>;
            // Columnas a mostrar: llave + solo las que cambiaron
            const colsMostrar = [columnaLlave, ...colsCambiadas];
            return (
              <>
                <p className="hint" style={{ marginBottom: 8 }}>
                  Celdas en <span style={{ color: '#166534', fontWeight: 600 }}>verde</span> = aumentaron ·{' '}
                  <span style={{ color: '#b91c1c', fontWeight: 600 }}>rojo</span> = disminuyeron ·{' '}
                  <span style={{ color: '#92400e', fontWeight: 600 }}>ámbar</span> = cambio de texto ·{' '}
                  <span style={{ color: '#94a3b8' }}>gris</span> = sin cambio
                </p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button
                    className="secondary"
                    style={{ fontSize: 12 }}
                    onClick={() => exportarTab(cambios.map((e) => ({ ...e.rowB, [`${columnaLlave}_anterior`]: e.rowA[columnaLlave] })), colsA, 'cambios')}
                  >
                    ↓ Exportar cambios
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 400 }}>
                    <thead>
                      <tr>
                        {colsMostrar.map((c) => <th key={c}>{c}</th>)}
                        <th className="hint"># cols. modificadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cambios.slice(0, 200).map(({ clave, rowA, rowB, colsDiff }) => (
                        <tr key={clave}>
                          {colsMostrar.map((c) => (
                            <CeldaCambio
                              key={c}
                              valA={rowA[c]}
                              valB={rowB[c]}
                              esLlave={c === columnaLlave}
                            />
                          ))}
                          <td className="hint" style={{ textAlign: 'center' }}>{colsDiff.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cambios.length > 200 && (
                  <p className="hint">200 de {cambios.length.toLocaleString('es-MX')} registros mostrados.</p>
                )}
              </>
            );
          })()}

          {tab === 'soloB' && resultado.porLlave && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button className="secondary" style={{ fontSize: 12 }}
                  onClick={() => exportarTab(resultado.porLlave.soloB, resultado.colsB, 'nuevos-en-B')}>
                  ↓ Exportar
                </button>
              </div>
              <TablaMuestra filas={resultado.porLlave.soloB} columnas={resultado.colsB} />
            </>
          )}

          {tab === 'soloA' && resultado.porLlave && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button className="secondary" style={{ fontSize: 12 }}
                  onClick={() => exportarTab(resultado.porLlave.soloA, resultado.colsA, 'eliminados-de-A')}>
                  ↓ Exportar
                </button>
              </div>
              <TablaMuestra filas={resultado.porLlave.soloA} columnas={resultado.colsA} />
            </>
          )}

          {tab === 'sinCambios' && resultado.porLlave && (
            <TablaMuestra
              filas={resultado.porLlave.sinCambios.map((e) => e.rowA)}
              columnas={resultado.colsA}
            />
          )}

          {tab === 'stats' && (
            <>
              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Comparación de totales por columna numérica
                </p>
                {resultado.statsComp.length === 0 && (
                  <p className="hint">No hay columnas numéricas en común entre los dos reportes.</p>
                )}
              </div>
              {resultado.statsComp.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 540 }}>
                    <thead>
                      <tr>
                        <th>Columna</th>
                        <th>Suma A</th><th>Suma B</th><th>Δ Suma</th>
                        <th>Promedio A</th><th>Promedio B</th><th>Δ Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.statsComp.map(({ col, stA, stB }) => {
                        const dSuma = stA && stB ? stB.suma - stA.suma : null;
                        const dProm = stA && stB ? stB.promedio - stA.promedio : null;
                        const pctSuma = stA?.suma ? (dSuma / Math.abs(stA.suma)) * 100 : null;
                        return (
                          <tr key={col}>
                            <td><strong>{col}</strong></td>
                            <td>{stA ? fmtNum(stA.suma) : '—'}</td>
                            <td>{stB ? fmtNum(stB.suma) : '—'}</td>
                            <td style={{ fontWeight: 600, color: dSuma != null ? (dSuma >= 0 ? '#166534' : '#b91c1c') : undefined }}>
                              {dSuma != null ? `${dSuma >= 0 ? '+' : ''}${fmtNum(dSuma)}${pctSuma != null ? ` (${pctSuma >= 0 ? '+' : ''}${pctSuma.toFixed(1)}%)` : ''}` : '—'}
                            </td>
                            <td>{stA ? fmtNum(stA.promedio) : '—'}</td>
                            <td>{stB ? fmtNum(stB.promedio) : '—'}</td>
                            <td style={{ fontWeight: 600, color: dProm != null ? (dProm >= 0 ? '#166534' : '#b91c1c') : undefined }}>
                              {dProm != null ? `${dProm >= 0 ? '+' : ''}${fmtNum(dProm)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {reportes.length < 2 && (
        <p className="hint" style={{ marginTop: 8 }}>
          Necesitas al menos dos reportes cargados para comparar.
        </p>
      )}
    </Card>
  );
}
