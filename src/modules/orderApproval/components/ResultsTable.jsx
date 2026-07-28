import React from 'react';
import Card from '../../../components/Card.jsx';
import Badge from '../../../components/Badge.jsx';

const TONE_POR_ESTADO = {
  Aprobado: 'success',
  Rechazado: 'danger',
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

export default function ResultsTable({ solicitudes }) {
  if (!solicitudes.length) return null;

  return (
    <>
      {solicitudes.map((solicitud) => (
        <Card
          key={solicitud.bo}
          title={`BO# ${solicitud.bo} — ${solicitud.cliente}`}
        >
          <p className="hint">
            RDD: {solicitud.rddRaw} ({formatearFecha(solicitud.rdd)}) · Rep: {solicitud.rep}
            {solicitud.eventDate && solicitud.eventDate !== 'N/A' && ` · Evento: ${solicitud.eventDate}`}
          </p>
          <table>
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
                  <td>{item.qty}</td>
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
        </Card>
      ))}
    </>
  );
}
