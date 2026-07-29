import React, { useRef, useState } from 'react';
import Card from '../../../components/Card.jsx';
import { getTiposReporte, addTipoReporte } from '../config/tiposReporte.js';
import { parseGenericSheet, validarEstructuraReporte } from '../utils/parseGenericSheet.js';
import { agregarReporte } from '../utils/reportesStore.js';

export default function SubirReporte({ subidoPor, onReporteSubido }) {
  const inputRef = useRef(null);
  const [tipos, setTipos] = useState(getTiposReporte);
  const [tipo, setTipo] = useState(tipos[0] || '');
  const [tipoNuevo, setTipoNuevo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  function handleSeleccionarArchivo(e) {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setError('');
    }
  }

  function handleAgregarTipo() {
    if (!tipoNuevo.trim()) return;
    const actualizados = addTipoReporte(tipoNuevo.trim());
    setTipos(actualizados);
    setTipo(tipoNuevo.trim());
    setTipoNuevo('');
  }

  async function handleSubir() {
    if (!archivo) return;
    setError('');
    setSubiendo(true);
    try {
      const arrayBuffer = await archivo.arrayBuffer();
      const resultado = parseGenericSheet(arrayBuffer);
      validarEstructuraReporte(resultado);

      await agregarReporte({
        tipo,
        nombreArchivo: archivo.name,
        descripcion,
        subidoPor,
        columnas: resultado.columnas,
        totalFilas: resultado.filas.length,
        tamanioBytes: archivo.size,
        arrayBuffer,
      });

      setArchivo(null);
      setDescripcion('');
      if (inputRef.current) inputRef.current.value = '';
      onReporteSubido?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <Card title="Cargar reporte manualmente">
      <p className="hint">
        Mientras la sincronización automática con Oracle no esté disponible, los reportes
        (de Oracle o generados a mano) se cargan aquí en vez de enviarse por correo. Se
        valida la estructura básica del archivo al momento de subirlo.
      </p>

      <div className="field-row">
        <div className="field">
          <label>Tipo de reporte</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Agregar tipo nuevo</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={tipoNuevo}
              onChange={(e) => setTipoNuevo(e.target.value)}
              placeholder="Ej. Comisiones"
            />
            <button type="button" className="secondary" onClick={handleAgregarTipo}>Agregar</button>
          </div>
        </div>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Descripción (opcional)</label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Corte de la tarde, sucursal X"
        />
      </div>

      <div className="dropzone" onClick={() => inputRef.current?.click()}>
        {archivo ? (
          <p>Archivo listo: <strong>{archivo.name}</strong> (clic para cambiar)</p>
        ) : (
          <p>Haz clic para seleccionar el archivo (Excel o CSV)</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleSeleccionarArchivo}
        />
      </div>

      {error && <p className="hint" style={{ color: '#b91c1c' }}>{error}</p>}

      <div style={{ marginTop: 12 }}>
        <button className="primary" disabled={!archivo || subiendo} onClick={handleSubir}>
          {subiendo ? 'Cargando...' : 'Cargar al historial'}
        </button>
      </div>
    </Card>
  );
}
