import React, { useRef } from 'react';

function formatearFechaHora(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// Vive en el toolbar de Order Approval: deja subir el Excel de
// disponibilidad de hoy y elegir, de todo el historial ya subido, cuáles
// días se usan para la comparación actual (uno o varios a la vez — las
// cantidades de días distintos se suman, ver combinarInventarios()).
export default function InventoryFilesPicker({
  archivos,
  seleccionados,
  onSeleccionChange,
  onSubirArchivo,
  cargando,
  error,
}) {
  const inputRef = useRef(null);

  function handleChangeArchivo(e) {
    const file = e.target.files?.[0];
    if (file) onSubirArchivo(file);
    e.target.value = '';
  }

  function handleChangeSeleccion(e) {
    const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
    onSeleccionChange(ids);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <button className="secondary" onClick={() => inputRef.current?.click()} disabled={cargando}>
        {cargando ? 'Cargando...' : '+ Subir archivo de hoy'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleChangeArchivo}
      />

      {archivos.length > 0 && (
        <div>
          <select
            multiple
            size={Math.min(4, archivos.length)}
            value={seleccionados}
            onChange={handleChangeSeleccion}
            style={{ minWidth: 260 }}
            title="Ctrl/Cmd + clic para elegir varios días a la vez"
          >
            {archivos.map((a) => (
              <option key={a.id} value={a.id}>
                {formatearFechaHora(a.fechaSubida)} — {a.nombreArchivo}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <span className="hint" style={{ color: '#b91c1c' }}>{error}</span>}
    </div>
  );
}
