import React, { useMemo, useState } from 'react';
import Card from '../../../components/Card.jsx';

const TAMANO_PAGINA = 100;
const MAX_VALORES_FILTRO = 20;

export default function VisorReporte({ reporte, columnas, filas, puedeExportar, onDescargar }) {
  const [busqueda, setBusqueda] = useState('');
  const [columnaFiltro, setColumnaFiltro] = useState('');
  const [valorFiltro, setValorFiltro] = useState('');
  const [pagina, setPagina] = useState(0);

  const valoresColumnaFiltro = useMemo(() => {
    if (!columnaFiltro) return [];
    const valores = [...new Set(filas.map((f) => String(f[columnaFiltro])))].sort();
    return valores.length <= MAX_VALORES_FILTRO ? valores : [];
  }, [columnaFiltro, filas]);

  const filasFiltradas = useMemo(() => {
    return filas.filter((fila) => {
      const coincideBusqueda = busqueda
        ? columnas.some((c) => String(fila[c]).toLowerCase().includes(busqueda.toLowerCase()))
        : true;
      const coincideFiltro =
        columnaFiltro && valorFiltro ? String(fila[columnaFiltro]) === valorFiltro : true;
      return coincideBusqueda && coincideFiltro;
    });
  }, [filas, columnas, busqueda, columnaFiltro, valorFiltro]);

  const totalPaginas = Math.ceil(filasFiltradas.length / TAMANO_PAGINA) || 1;
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual * TAMANO_PAGINA;
  const filasVisibles = filasFiltradas.slice(inicio, inicio + TAMANO_PAGINA);

  if (!reporte) return null;

  return (
    <Card
      title={`${reporte.nombreArchivo} — ${reporte.tipo}`}
      actions={
        puedeExportar && (
          <button className="secondary" onClick={onDescargar}>Descargar</button>
        )
      }
    >
      {reporte.descripcion && <p className="hint">{reporte.descripcion}</p>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar en cualquier columna..."
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          value={columnaFiltro}
          onChange={(e) => { setColumnaFiltro(e.target.value); setValorFiltro(''); setPagina(0); }}
          style={{ maxWidth: 200 }}
        >
          <option value="">Filtrar por columna...</option>
          {columnas.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {columnaFiltro && (
          valoresColumnaFiltro.length > 0 ? (
            <select
              value={valorFiltro}
              onChange={(e) => { setValorFiltro(e.target.value); setPagina(0); }}
              style={{ maxWidth: 200 }}
            >
              <option value="">Todos los valores</option>
              {valoresColumnaFiltro.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <span className="hint">Esta columna tiene demasiados valores distintos para filtrar por lista; usa la búsqueda.</span>
          )
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="secondary" onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={paginaActual === 0}>
          Anterior
        </button>
        <span className="hint">Página {paginaActual + 1} de {totalPaginas} ({filasFiltradas.length} de {filas.length} filas)</span>
        <button className="secondary" onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={paginaActual >= totalPaginas - 1}>
          Siguiente
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>{columnas.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filasVisibles.map((fila, idx) => (
              <tr key={idx}>
                {columnas.map((c) => <td key={c}>{String(fila[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
