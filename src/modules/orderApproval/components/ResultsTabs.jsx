import React, { useEffect, useState } from 'react';
import Card from '../../../components/Card.jsx';
import Badge from '../../../components/Badge.jsx';
import TabBar from '../../../components/TabBar.jsx';
import { construirTablaHtml, construirTablaTexto } from '../utils/buildCopySummary.js';

const TONE_POR_ESTADO = {
  Aprobado:         'success',
  Rechazado:        'danger',
  Revisar:          'warning',
  'Sin dato':       'neutral',
  'N/A - Servicio': 'neutral',
};

function calcularEstadoGeneral(items) {
  if (items.some((i) => i.estado === 'Rechazado')) return 'Rechazado';
  if (items.some((i) => i.estado === 'Revisar'))   return 'Revisar';
  if (items.some((i) => i.estado === 'Sin dato'))  return 'Sin dato';
  return 'Aprobado';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatearPorcentaje(valor) {
  if (valor === null || valor === undefined) return '—';
  return `${(valor * 100).toFixed(1)}%`;
}

// Detecta solicitudes de tipo RENTAL/RENTL para mostrar aviso de reenvío.
// Revisa BO#, cliente, rep, event date y todas las descripciones de items.
const RENTAL_RE = /(rental|rentl)/i;
function esRental(solicitud) {
  return (
    RENTAL_RE.test(solicitud.bo || '')
    || RENTAL_RE.test(solicitud.cliente || '')
    || RENTAL_RE.test(solicitud.rep || '')
    || RENTAL_RE.test(solicitud.eventDate || '')
    || solicitud.items.some(
         (i) => RENTAL_RE.test(i.itemCode)
             || RENTAL_RE.test(i.descripcion || '')
             || RENTAL_RE.test(i.descripcionInventario || '')
       )
  );
}

// Copia la tabla como HTML rico (Outlook/Gmail la renderiza como tabla) con
// fallback a texto tabulado si el navegador no soporta ClipboardItem.
async function copiarTabla(solicitud) {
  const html  = construirTablaHtml(solicitud);
  const texto = construirTablaTexto(solicitud);
  try {
    if (typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html],  { type: 'text/html' }),
          'text/plain': new Blob([texto], { type: 'text/plain' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(texto);
    }
  } catch {
    await navigator.clipboard.writeText(texto).catch(() => {});
  }
}

function BotonCopiar({ solicitud }) {
  const [copiado, setCopiado] = useState(false);

  async function handleClick() {
    try {
      await copiarTabla(solicitud);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.warn('No se pudo copiar:', err);
    }
  }

  return (
    <button className="secondary" onClick={handleClick} title="Copia la tabla completa lista para pegar en un correo">
      {copiado ? 'Copiado ✓' : 'Copiar tabla'}
    </button>
  );
}

// Panel de detalle de un item seleccionado (se muestra debajo de la tabla).
function DetalleItem({ item, onCerrar }) {
  const tiles = [
    { label: 'Código',      value: item.itemCode },
    { label: 'Descripción (inventario)', value: item.descripcionInventario || '—' },
    { label: 'Descripción (solicitud)',  value: item.descripcion || '—' },
    { label: 'Qty solicitada', value: item.qty + (item.duplicados > 1 ? ` (combinado x${item.duplicados})` : '') },
    { label: 'Disponible',  value: item.disponible !== null ? item.disponible.toLocaleString('es-MX') : '—' },
    { label: 'Demanda',     value: item.demanda    !== null && item.demanda !== undefined ? item.demanda.toLocaleString('es-MX') : '—' },
    { label: '% consumo',   value: formatearPorcentaje(item.porcentajeConsumo) },
    { label: '% s/ demanda',value: formatearPorcentaje(item.porcentajeSobreDemanda) },
    { label: 'Días hasta RDD', value: item.diasHastaRdd !== null && item.diasHastaRdd !== undefined ? `${item.diasHastaRdd} día(s)` : '—' },
    { label: 'Estado',      value: item.estado, badge: true },
    { label: 'Motivo',      value: item.motivo || '—' },
  ];

  return (
    <div style={{
      border: '1px solid var(--color-border, #e2e8f0)',
      borderRadius: 8,
      padding: '14px 18px',
      marginTop: 12,
      background: 'var(--color-surface, #f8fafc)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: 13 }}>Detalle: {item.itemCode}</strong>
        <button
          onClick={onCerrar}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}
          title="Cerrar detalle"
        >×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 16px' }}>
        {tiles.map(({ label, value, badge }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>{label}</span>
            {badge
              ? <Badge tone={TONE_POR_ESTADO[value] || 'neutral'} style={{ width: 'fit-content' }}>{value}</Badge>
              : <span style={{ fontSize: 12, fontWeight: value === '—' ? 400 : 500, color: value === '—' ? '#94a3b8' : 'inherit' }}>{value}</span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function SolicitudPanel({ solicitud }) {
  const [itemDetalle, setItemDetalle] = useState(null);

  // Limpiar detalle al cambiar de solicitud
  useEffect(() => { setItemDetalle(null); }, [solicitud]);

  function handleItemClick(item) {
    setItemDetalle((prev) => prev?.itemCode === item.itemCode ? null : item);
  }

  const rental = esRental(solicitud);
  const sinDato = solicitud.items.filter((i) => i.estado === 'Sin dato');
  const estadoGeneral = calcularEstadoGeneral(solicitud.items);

  const titulo = solicitud.sinEncabezado
    ? `Consulta rápida — ${solicitud.items.length} item(s)`
    : `BO# ${solicitud.bo} — ${solicitud.cliente}`;

  const acciones = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Badge tone={TONE_POR_ESTADO[estadoGeneral] || 'neutral'}>{estadoGeneral}</Badge>
      <BotonCopiar solicitud={solicitud} />
    </div>
  );

  return (
    <Card title={titulo} actions={acciones}>

      {/* Encabezado de solicitud */}
      {solicitud.sinEncabezado ? (
        <p className="hint">Items consultados sin encabezado PRDF — la validación de RDD no aplica.</p>
      ) : (
        <p className="hint">
          RDD: {solicitud.rddRaw} ({formatearFecha(solicitud.rdd)}) · Rep: {solicitud.rep}
          {solicitud.eventDate && solicitud.eventDate !== 'N/A' && ` · Evento: ${solicitud.eventDate}`}
        </p>
      )}

      {/* Aviso RENTAL */}
      {rental && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6,
          padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <strong style={{ color: '#92400e' }}>Solicitud de tipo RENTAL</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78350f' }}>
              Esta solicitud debe ser reenviada al área de Rentas en lugar de procesarse aquí.
              Usa <strong>"Copiar tabla"</strong> para pegar el detalle en el correo de reenvío.
              <br />
              <span style={{ color: '#b45309' }}>Correo de Rentas: pendiente de configuración.</span>
            </p>
          </div>
        </div>
      )}

      {/* Items no encontrados en inventario */}
      {sinDato.length > 0 && (
        <div className="warning-box">
          <strong>{sinDato.length} item(s) no encontrado(s)</strong> en el reporte de inventario activo:{' '}
          {sinDato.map((i) => (
            <code key={i.itemCode} style={{ marginRight: 6 }}>{i.itemCode}</code>
          ))}
        </div>
      )}

      {/* Líneas no reconocidas */}
      {solicitud.lineasNoReconocidas?.length > 0 && (
        <div className="warning-box">
          {solicitud.lineasNoReconocidas.length} línea(s) no reconocidas como artículo:
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {solicitud.lineasNoReconocidas.map((linea, idx) => (
              <li key={idx}><code>{linea}</code></li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabla de items */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Descripción</th>
              <th>Qty solicitada</th>
              <th>Disponible</th>
              <th>% consumo</th>
              <th>Estado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {solicitud.items.map((item, idx) => {
              const seleccionado = itemDetalle?.itemCode === item.itemCode;
              return (
                <tr key={`${item.itemCode}-${idx}`} style={seleccionado ? { background: 'var(--color-primary-light, #eff6ff)' } : undefined}>
                  <td>
                    <button
                      onClick={() => handleItemClick(item)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-primary, #2563eb)', fontFamily: 'monospace',
                        fontSize: 'inherit', padding: 0, textDecoration: seleccionado ? 'underline' : 'none',
                        fontWeight: seleccionado ? 700 : 400,
                      }}
                      title="Ver detalles del item"
                    >
                      {item.itemCode}
                    </button>
                  </td>
                  <td>{item.descripcionInventario || item.descripcion}</td>
                  <td>
                    {item.qty}
                    {item.duplicados > 1 && <span className="hint"> (x{item.duplicados})</span>}
                  </td>
                  <td>{item.disponible === null ? '—' : item.disponible.toLocaleString('es-MX')}</td>
                  <td>{formatearPorcentaje(item.porcentajeConsumo)}</td>
                  <td><Badge tone={TONE_POR_ESTADO[item.estado] || 'neutral'}>{item.estado}</Badge></td>
                  <td className="hint">{item.motivo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Panel de detalle del item seleccionado */}
      {itemDetalle && (
        <DetalleItem item={itemDetalle} onCerrar={() => setItemDetalle(null)} />
      )}
    </Card>
  );
}

// Cada BO# evaluado se muestra como una pestaña (en vez de tarjetas apiladas).
// Cerrar una pestaña solo la oculta de esta vista; no borra nada del historial.
export default function ResultsTabs({ solicitudes }) {
  const [activeId, setActiveId]       = useState(null);
  const [descartados, setDescartados] = useState(() => new Set());

  useEffect(() => {
    setDescartados(new Set());
    setActiveId(solicitudes[0]?.bo ?? null);
  }, [solicitudes]);

  if (!solicitudes.length) return null;

  const visibles = solicitudes.filter((s) => !descartados.has(s.bo));
  const activa   = visibles.find((s) => s.bo === activeId) || visibles[0];

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
        tabs={visibles.map((s) => ({
          id:       s.bo,
          label:    s.sinEncabezado ? 'Consulta rápida' : `BO# ${s.bo}`,
          sublabel: s.sinEncabezado ? `${s.items.length} items` : s.cliente,
          closable: true,
          // Indicador visual de Rental en la pestaña
          ...(esRental(s) ? { label: `⚠ BO# ${s.bo}` } : {}),
        }))}
        activeId={activa?.bo}
        onSelect={setActiveId}
        onClose={handleClose}
      />
      {activa && <SolicitudPanel solicitud={activa} />}
    </>
  );
}
