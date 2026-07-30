import React, { useEffect, useState } from 'react';
import Card from '../../../components/Card.jsx';
import Badge from '../../../components/Badge.jsx';
import TabBar from '../../../components/TabBar.jsx';
import { construirResumenCopiable } from '../utils/buildCopySummary.js';

const TONE_POR_ESTADO = {
  Aprobado: 'success',
  Rechazado: 'danger',
  Revisar: 'warning',
  'Sin dato': 'neutral',
};

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatearPorcentaje(valor) {
  if (valor === null || valor === undefined) return '—';
  return `${(valor * 100).toFixed(1)}%`;
}

function BotonCopiar({ solicitud }) {
  const [copiado, setCopiado] = useState(false);

  async function handleClick() {
    const texto = construirResumenCopiable(solicitud);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.warn('No se pudo copiar al portapapeles', error);
    }
  }

  return (
    <button className="secondary" onClick={handleClick}>
      {copiado ? 'Copiado ✓' : 'Copiar resultado'}
    </button>
  );
}

function SolicitudPanel({ solicitud }) {
  return (
    <Card
      title={`BO# ${solicitud.bo} — ${solicitud.cliente}`}
      actions={<BotonCopiar solicitud={solicitud} />}
    >
      <p className="hint">
        RDD: {solicitud.rddRaw} ({formatearFecha(solicitud.rdd)}) · Rep: {solicitud.rep}
        {solicitud.eventDate && solicitud.eventDate !== 'N/A' && ` · Evento: ${solicitud.eventDate}`}
      </p>

      {solicitud.lineasNoReconocidas?.length > 0 && (
        <div className="warning-box">
          {solicitud.lineasNoReconocidas.length} línea(s) dentro de este BO# no se reconocieron
          como artículo y se ignoraron:
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {solicitud.lineasNoReconocidas.map((linea, idx) => (
              <li key={idx}><code>{linea}</code></li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Descripción</th>
              <th>Qty solicitada</th>
              <th>Cantidad disponible</th>
              <th>% consumo</th>
              <th>Estado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {solicitud.items.map((item, idx) => (
              <tr key={`${item.itemCode}-${idx}`}>
                <td>{item.itemCode}</td>
                <td>{item.descripcionInventario || item.descripcion}</td>
                <td>
                  {item.qty}
                  {item.duplicados > 1 && (
                    <span className="hint"> (combinado x{item.duplicados})</span>
                  )}
                </td>
                <td>{item.disponible === null ? '—' : item.disponible}</td>
                <td>{formatearPorcentaje(item.porcentajeConsumo)}</td>
                <td>
                  <Badge tone={TONE_POR_ESTADO[item.estado] || 'neutral'}>{item.estado}</Badge>
                </td>
                <td className="hint">{item.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Cada BO# evaluado se muestra como una pestaña (en vez de tarjetas
// apiladas), igual que abrir varios archivos en un editor de código.
// Cerrar una pestaña solo la oculta de esta vista; no borra nada.
export default function ResultsTabs({ solicitudes }) {
  const [activeId, setActiveId] = useState(null);
  const [descartados, setDescartados] = useState(() => new Set());

  useEffect(() => {
    setDescartados(new Set());
    setActiveId(solicitudes[0]?.bo ?? null);
  }, [solicitudes]);

  if (!solicitudes.length) return null;

  const visibles = solicitudes.filter((s) => !descartados.has(s.bo));
  const activa = visibles.find((s) => s.bo === activeId) || visibles[0];

  function handleClose(bo) {
    const nuevo = new Set(descartados);
    nuevo.add(bo);
    setDescartados(nuevo);
    if (activeId === bo) {
      const restante = visibles.find((s) => s.bo !== bo);
      setActiveId(restante ? restante.bo : null);
    }
  }

  return (
    <>
      <TabBar
        tabs={visibles.map((s) => ({ id: s.bo, label: `BO# ${s.bo}`, sublabel: s.cliente, closable: true }))}
        activeId={activa?.bo}
        onSelect={setActiveId}
        onClose={handleClose}
      />
      {activa && <SolicitudPanel solicitud={activa} />}
    </>
  );
}
