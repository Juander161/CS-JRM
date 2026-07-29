import React, { useRef } from 'react';

function formatearFechaHora(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// Selector de archivos de inventario para el toolbar.
// Muestra los archivos ya guardados (vendrán de Outlook/Oracle en el futuro)
// y ofrece un enlace discreto para subir manualmente si el correo no llegó
// o el archivo fue modificado fuera del flujo automático.
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

  const etiquetaSeleccion =
    seleccionados.length === 0
      ? 'Sin archivo seleccionado'
      : seleccionados.length === 1
      ? archivos.find((a) => a.id === seleccionados[0])?.nombreArchivo ?? '1 archivo'
      : `${seleccionados.length} archivos`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Selector compacto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #6b7280)', whiteSpace: 'nowrap' }}>
          Disponibilidad
        </span>
        {archivos.length === 0 ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #9ca3af)' }}>
            Sin archivos
          </span>
        ) : (
          <select
            multiple
            size={1}
            value={seleccionados}
            onChange={handleChangeSeleccion}
            style={{ minWidth: 200, maxWidth: 300, fontSize: '0.82rem' }}
            title="Ctrl/Cmd + clic para comparar contra varios días a la vez"
          >
            {archivos.map((a) => (
              <option key={a.id} value={a.id}>
                {formatearFechaHora(a.fechaSubida)} — {a.nombreArchivo}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Enlace discreto para subida manual */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleChangeArchivo}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={cargando}
        style={{
          background: 'none',
          border: 'none',
          padding: '2px 0',
          cursor: cargando ? 'default' : 'pointer',
          fontSize: '0.75rem',
          color: 'var(--color-primary, #2563eb)',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
          opacity: cargando ? 0.5 : 1,
        }}
        title="Sube un Excel manual si el archivo no llegó por correo o fue modificado"
      >
        {cargando ? 'Cargando…' : '↑ Subir manual'}
      </button>

      {error && (
        <span style={{ fontSize: '0.75rem', color: '#b91c1c', maxWidth: 200 }}>{error}</span>
      )}
    </div>
  );
}
