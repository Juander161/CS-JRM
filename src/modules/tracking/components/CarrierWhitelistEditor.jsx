import React, { useState } from 'react';
import Card from '../../../components/Card.jsx';

export default function CarrierWhitelistEditor({ carriers, onAdd, onRemove }) {
  const [nuevo, setNuevo] = useState('');

  function handleAgregar(e) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    onAdd(nuevo.trim());
    setNuevo('');
  }

  return (
    <Card title="Lista blanca de carriers (editable)">
      <div className="carrier-list">
        {carriers.map((c) => (
          <span key={c} className="carrier-item">
            {c}
            <button className="danger" style={{ marginLeft: 6 }} onClick={() => onRemove(c)}>×</button>
          </span>
        ))}
      </div>
      <form onSubmit={handleAgregar} className="field-row" style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder="Ej. UPS-4D"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        <button className="secondary" type="submit">Agregar carrier</button>
      </form>
    </Card>
  );
}
