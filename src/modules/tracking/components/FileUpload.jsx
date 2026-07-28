import React, { useRef, useState } from 'react';
import Card from '../../../components/Card.jsx';

export default function FileUpload({ onFileSelected, fileName }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <Card title="1. Cargar archivo de trackings">
      <div
        className={`dropzone${dragOver ? ' dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {fileName ? (
          <p>Archivo cargado: <strong>{fileName}</strong> (clic para cambiar)</p>
        ) : (
          <p>Arrastra tu archivo Excel aquí, o haz clic para seleccionarlo</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
    </Card>
  );
}
