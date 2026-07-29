import React, { useMemo, useState } from 'react';
import Card from '../../../components/Card.jsx';
import { obtenerArchivoReporte, eliminarReporte } from '../utils/reportesStore.js';
import { descargarArchivo } from '../utils/descargarArchivo.js';

function formatearTamano(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-MX');
}

export default function HistorialReportes({
  reportes,
  onVerReporte,
  onReporteEliminado,
  puedeExportar,
  puedeEliminar,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const tipos = useMemo(() => [...new Set(reportes.map((r) => r.tipo))].sort(), [reportes]);

  const filtrados = reportes.filter((r) => {
    const coincideTexto = busqueda
      ? `${r.nombreArchivo} ${r.descripcion}`.toLowerCase().includes(busqueda.toLowerCase())
      : true;
    const coincideTipo = filtroTipo ? r.tipo === filtroTipo : true;
    return coincideTexto && coincideTipo;
  });

  async function handleVer(reporte) {
    const arrayBuffer = await obtenerArchivoReporte(reporte.id);
    if (arrayBuffer) onVerReporte(reporte, arrayBuffer);
  }

  async function handleDescargar(reporte) {
    const arrayBuffer = await obtenerArchivoReporte(reporte.id);
    if (arrayBuffer) descargarArchivo(reporte.nombreArchivo, arrayBuffer);
  }

  async function handleEliminar(reporte) {
    await eliminarReporte(reporte.id);
    onReporteEliminado?.();
  }

  if (!reportes.length) {
    return (
      <Card title="Historial de reportes">
        <p className="hint">Todavía no se ha cargado ningún reporte.</p>
      </Card>
    );
  }

  return (
    <Card title="Historial de reportes">
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Archivo</th>
            <th>Descripción</th>
            <th>Filas</th>
            <th>Tamaño</th>
            <th>Subido por</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((r) => (
            <tr key={r.id}>
              <td>{r.tipo}</td>
              <td>{r.nombreArchivo}</td>
              <td className="hint">{r.descripcion || '—'}</td>
              <td>{r.totalFilas}</td>
              <td>{formatearTamano(r.tamanioBytes)}</td>
              <td>{r.subidoPor}</td>
              <td>{formatearFecha(r.fechaSubida)}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="secondary" onClick={() => handleVer(r)}>Ver</button>
                  {puedeExportar && (
                    <button className="secondary" onClick={() => handleDescargar(r)}>Descargar</button>
                  )}
                  {puedeEliminar && (
                    <button className="danger" onClick={() => handleEliminar(r)}>Eliminar</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">{filtrados.length} de {reportes.length} reporte(s) mostrados.</p>
    </Card>
  );
}
