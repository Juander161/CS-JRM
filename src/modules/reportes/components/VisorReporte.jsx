import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../../components/Card.jsx';
import PanelEstadisticas from './PanelEstadisticas.jsx';
import { exportarFiltrado } from '../utils/exportarFiltrado.js';

const TAMANOS_PAGINA = [25, 50, 100, 250];

// ── Operadores por tipo de columna ──────────────────────────────────────────
const OPS_TEXTO = [
  { v: 'contiene', l: 'contiene' },
  { v: 'no_contiene', l: 'no contiene' },
  { v: 'es', l: 'es exactamente' },
  { v: 'empieza', l: 'empieza con' },
  { v: 'termina', l: 'termina con' },
  { v: 'vacio', l: 'está vacío' },
  { v: 'no_vacio', l: 'no está vacío' },
];
const OPS_NUM = [
  { v: 'igual_num', l: '=' },
  { v: 'diferente_num', l: '≠' },
  { v: 'mayor', l: '>' },
  { v: 'mayor_igual', l: '≥' },
  { v: 'menor', l: '<' },
  { v: 'menor_igual', l: '≤' },
];
const SIN_VALOR = new Set(['vacio', 'no_vacio']);

function esColNumericaEnDatos(filas, col) {
  const muestra = filas.slice(0, 80).map((f) => f[col]).filter((v) => v !== '' && v != null);
  if (!muestra.length) return false;
  return muestra.filter((v) => !isNaN(parseFloat(v))).length / muestra.length >= 0.7;
}

function opDefecto(col, filas) {
  return esColNumericaEnDatos(filas, col) ? 'mayor' : 'contiene';
}

function aplicarFiltroFila(fila, filtro) {
  const raw = fila[filtro.columna];
  const valor = String(raw ?? '').trim();
  const termino = filtro.valor?.trim() ?? '';
  const vl = valor.toLowerCase();
  const tl = termino.toLowerCase();
  switch (filtro.operador) {
    case 'contiene':      return vl.includes(tl);
    case 'no_contiene':   return !vl.includes(tl);
    case 'es':            return vl === tl;
    case 'empieza':       return vl.startsWith(tl);
    case 'termina':       return vl.endsWith(tl);
    case 'vacio':         return valor === '';
    case 'no_vacio':      return valor !== '';
    case 'igual_num':     return parseFloat(valor) === parseFloat(termino);
    case 'diferente_num': return parseFloat(valor) !== parseFloat(termino);
    case 'mayor':         return parseFloat(valor) > parseFloat(termino);
    case 'mayor_igual':   return parseFloat(valor) >= parseFloat(termino);
    case 'menor':         return parseFloat(valor) < parseFloat(termino);
    case 'menor_igual':   return parseFloat(valor) <= parseFloat(termino);
    default: return true;
  }
}

function icono(col, ordenColumna, ordenDir) {
  if (col !== ordenColumna) return <span style={{ color: '#cbd5e1', fontSize: 10 }}>↕</span>;
  return <span style={{ fontSize: 10 }}>{ordenDir === 'asc' ? '↑' : '↓'}</span>;
}

let _filtroId = 0;
function nuevoId() { return ++_filtroId; }

export default function VisorReporte({ reporte, columnas, filas, puedeExportar, onDescargar }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState([]);
  const [ordenColumna, setOrdenColumna] = useState('');
  const [ordenDir, setOrdenDir] = useState('ninguno');
  const [pagina, setPagina] = useState(0);
  const [tamPagina, setTamPagina] = useState(50);
  const [mostrarStats, setMostrarStats] = useState(false);

  // Resetear al cambiar de reporte
  useEffect(() => {
    setBusqueda('');
    setFiltros([]);
    setOrdenColumna('');
    setOrdenDir('ninguno');
    setPagina(0);
    setMostrarStats(false);
  }, [reporte?.id]);

  // Resetear paginación cuando cambia el filtro/búsqueda/orden
  useEffect(() => { setPagina(0); }, [busqueda, filtros, ordenColumna, ordenDir]);

  const filasFiltradas = useMemo(() => {
    let result = filas;

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      result = result.filter((f) => columnas.some((c) => String(f[c] ?? '').toLowerCase().includes(q)));
    }

    for (const filtro of filtros) {
      if (!filtro.columna) continue;
      if (!SIN_VALOR.has(filtro.operador) && filtro.valor?.trim() === '') continue;
      result = result.filter((f) => aplicarFiltroFila(f, filtro));
    }

    if (ordenColumna && ordenDir !== 'ninguno') {
      result = [...result].sort((a, b) => {
        const va = a[ordenColumna], vb = b[ordenColumna];
        const na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return ordenDir === 'asc' ? na - nb : nb - na;
        const sa = String(va ?? '').toLowerCase();
        const sb = String(vb ?? '').toLowerCase();
        const cmp = sa.localeCompare(sb, 'es');
        return ordenDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [filas, columnas, busqueda, filtros, ordenColumna, ordenDir]);

  const totalPaginas = Math.ceil(filasFiltradas.length / tamPagina) || 1;
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const filasVisibles = filasFiltradas.slice(paginaActual * tamPagina, (paginaActual + 1) * tamPagina);

  const hayFiltros = busqueda.trim() || filtros.some((f) => f.columna && (SIN_VALOR.has(f.operador) || f.valor?.trim()));

  function agregarFiltro() {
    const col = columnas[0] || '';
    setFiltros((prev) => [...prev, { id: nuevoId(), columna: col, operador: opDefecto(col, filas), valor: '' }]);
  }

  function actualizarFiltro(id, campo, valor) {
    setFiltros((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const upd = { ...f, [campo]: valor };
      if (campo === 'columna') {
        upd.operador = opDefecto(valor, filas);
        upd.valor = '';
      }
      return upd;
    }));
  }

  function quitarFiltro(id) { setFiltros((prev) => prev.filter((f) => f.id !== id)); }

  function limpiarTodo() {
    setBusqueda('');
    setFiltros([]);
    setOrdenColumna('');
    setOrdenDir('ninguno');
    setPagina(0);
  }

  function handleHeaderClick(col) {
    if (ordenColumna !== col) { setOrdenColumna(col); setOrdenDir('asc'); }
    else if (ordenDir === 'asc') { setOrdenDir('desc'); }
    else { setOrdenColumna(''); setOrdenDir('ninguno'); }
  }

  function handleExportarFiltrado() {
    exportarFiltrado(reporte.nombreArchivo, columnas, filasFiltradas);
  }

  if (!reporte) return null;

  return (
    <Card
      title={`${reporte.nombreArchivo} — ${reporte.tipo}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {puedeExportar && (
            <>
              {hayFiltros && filasFiltradas.length < filas.length && (
                <button className="secondary" onClick={handleExportarFiltrado} title="Exportar solo las filas visibles">
                  ↓ Exportar filtrado ({filasFiltradas.length.toLocaleString('es-MX')})
                </button>
              )}
              <button className="secondary" onClick={onDescargar}>Descargar original</button>
            </>
          )}
        </div>
      }
    >
      {reporte.descripcion && <p className="hint">{reporte.descripcion}</p>}

      {/* ── Barra de búsqueda y controles ── */}
      <div className="visor-barra">
        <input
          type="text"
          placeholder="Buscar en todas las columnas…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="secondary" onClick={agregarFiltro} title="Agregar filtro de columna">
          + Filtro
        </button>
        <button
          className={mostrarStats ? 'primary' : 'secondary'}
          onClick={() => setMostrarStats((v) => !v)}
          title="Panel de estadísticas de columna"
        >
          📊 Estadísticas
        </button>
        {hayFiltros && (
          <button className="danger" onClick={limpiarTodo} title="Quitar todos los filtros y orden">
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ── Filtros activos ── */}
      {filtros.length > 0 && (
        <div className="filtros-avanzados">
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Filtros de columna</span>
          {filtros.map((filtro) => {
            const esNum = esColNumericaEnDatos(filas, filtro.columna);
            const ops = esNum ? OPS_NUM : OPS_TEXTO;
            return (
              <div key={filtro.id} className="filtro-fila">
                <select value={filtro.columna} onChange={(e) => actualizarFiltro(filtro.id, 'columna', e.target.value)}>
                  {columnas.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filtro.operador} onChange={(e) => actualizarFiltro(filtro.id, 'operador', e.target.value)}>
                  {ops.map((op) => <option key={op.v} value={op.v}>{op.l}</option>)}
                </select>
                {!SIN_VALOR.has(filtro.operador) && (
                  <input
                    type={esNum ? 'number' : 'text'}
                    value={filtro.valor}
                    onChange={(e) => actualizarFiltro(filtro.id, 'valor', e.target.value)}
                    placeholder="valor…"
                  />
                )}
                <button className="danger" onClick={() => quitarFiltro(filtro.id)} title="Quitar filtro">×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Panel de estadísticas ── */}
      {mostrarStats && <PanelEstadisticas columnas={columnas} filas={filasFiltradas} />}

      {/* ── Paginación ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <button className="secondary" onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={paginaActual === 0}>
          Anterior
        </button>
        <span className="hint">
          Pág {paginaActual + 1} de {totalPaginas} — {filasFiltradas.length.toLocaleString('es-MX')} de {filas.length.toLocaleString('es-MX')} fila(s)
        </span>
        <button className="secondary" onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={paginaActual >= totalPaginas - 1}>
          Siguiente
        </button>
        <select
          value={tamPagina}
          onChange={(e) => { setTamPagina(Number(e.target.value)); setPagina(0); }}
          style={{ fontSize: 13 }}
          title="Filas por página"
        >
          {TAMANOS_PAGINA.map((t) => <option key={t} value={t}>{t} por pág.</option>)}
        </select>
        {ordenColumna && (
          <span className="hint">
            Ordenado por <strong>{ordenColumna}</strong> {ordenDir === 'asc' ? '(A→Z)' : '(Z→A)'}
            <button
              onClick={() => { setOrdenColumna(''); setOrdenDir('ninguno'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, marginLeft: 4 }}
              title="Quitar orden"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {/* ── Tabla ── */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {columnas.map((c) => (
                <th
                  key={c}
                  onClick={() => handleHeaderClick(c)}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  title={`Ordenar por ${c}`}
                >
                  {c} {icono(c, ordenColumna, ordenDir)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map((fila, idx) => (
              <tr key={idx}>
                {columnas.map((c) => <td key={c}>{String(fila[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filasFiltradas.length === 0 && (
        <p className="hint" style={{ textAlign: 'center', padding: '20px 0' }}>
          Sin resultados con los filtros actuales.
        </p>
      )}
    </Card>
  );
}
