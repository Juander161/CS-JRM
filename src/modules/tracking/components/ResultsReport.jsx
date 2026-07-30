import React, { useMemo, useState } from 'react';
import Card from '../../../components/Card.jsx';
import Badge from '../../../components/Badge.jsx';

const TAMANO_PAGINA = 100;

function construirResumenPorCarrier(resultados) {
  const grupos = {};
  resultados.forEach((r) => {
    if (!grupos[r.carrier]) grupos[r.carrier] = [];
    grupos[r.carrier].push(r);
  });

  return Object.entries(grupos)
    .map(([carrier, items]) => {
      const total = items.length;
      const procesados = items.filter((r) => r.deliveryDate).length;
      const noProcesados = total - procesados;
      return {
        carrier, total, procesados, noProcesados,
        porcentajeProcesado: ((procesados / total) * 100).toFixed(1),
        porcentajeNoProcesado: ((noProcesados / total) * 100).toFixed(1),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export default function ResultsReport({ resultados, scanLocation }) {
  const [pagina, setPagina] = useState(0);
  const [busquedaWaybill, setBusquedaWaybill] = useState('');
  const [filtroCarrier, setFiltroCarrier] = useState('');

  const resumenPorCarrier = useMemo(() => construirResumenPorCarrier(resultados), [resultados]);
  const carriersDisponibles = useMemo(
    () => [...new Set(resultados.map((r) => r.carrier))].sort(), [resultados]
  );

  const resultadosFiltrados = useMemo(() => {
    return resultados.filter((r) => {
      const coincideWaybill = busquedaWaybill
        ? String(r.waybill).toLowerCase().includes(busquedaWaybill.toLowerCase())
        : true;
      const coincideCarrier = filtroCarrier ? r.carrier === filtroCarrier : true;
      return coincideWaybill && coincideCarrier;
    });
  }, [resultados, busquedaWaybill, filtroCarrier]);

  const totalPaginas = Math.ceil(resultadosFiltrados.length / TAMANO_PAGINA) || 1;
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual * TAMANO_PAGINA;
  const filasVisibles = resultadosFiltrados.slice(inicio, inicio + TAMANO_PAGINA);

  function handleFiltroChange(setter) {
    return (valor) => { setter(valor); setPagina(0); };
  }

  if (!resultados.length) return null;

  return (
    <Card title={`Estado general de los envíos — ${scanLocation}`}>
      <p className="hint">{resultados.length} trackings procesados en total</p>

      <h3>Resumen por Carrier</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 480 }}>
          <thead>
            <tr>
              <th>Carrier</th><th>Total</th><th>Procesados</th>
              <th>% Procesado</th><th>No Procesados</th><th>% No Procesado</th>
            </tr>
          </thead>
          <tbody>
            {resumenPorCarrier.map((r) => (
              <tr key={r.carrier}>
                <td>{r.carrier}</td><td>{r.total}</td><td>{r.procesados}</td>
                <td><Badge tone="success">{r.porcentajeProcesado}%</Badge></td>
                <td>{r.noProcesados}</td>
                <td><Badge tone="danger">{r.porcentajeNoProcesado}%</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Detalle de trackings</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Buscar por waybill..." value={busquedaWaybill}
          onChange={(e) => handleFiltroChange(setBusquedaWaybill)(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          value={filtroCarrier} onChange={(e) => handleFiltroChange(setFiltroCarrier)(e.target.value)}
          style={{ maxWidth: 220 }}
        >
          <option value="">Todos los carriers</option>
          {carriersDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="secondary" onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={paginaActual === 0}>
          Anterior
        </button>
        <span className="hint">Página {paginaActual + 1} de {totalPaginas} ({resultadosFiltrados.length} resultados)</span>
        <button className="secondary" onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={paginaActual >= totalPaginas - 1}>
          Siguiente
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 480 }}>
          <thead>
            <tr><th>Waybill</th><th>Carrier</th><th>Estado</th><th>Fecha de entrega</th><th>Procesado</th></tr>
          </thead>
          <tbody>
            {filasVisibles.map((r) => (
              <tr key={r.waybill}>
                <td>{r.waybill}</td><td>{r.carrier}</td><td>{r.status}</td><td>{r.deliveryDate || '—'}</td>
                <td><Badge tone={r.deliveryDate ? 'success' : 'danger'}>{r.deliveryDate ? 'Sí' : 'No'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
