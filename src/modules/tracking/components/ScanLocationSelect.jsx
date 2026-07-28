import React from 'react';
import Card from '../../../components/Card.jsx';

export default function ScanLocationSelect({ opciones, valor, onChange }) {
  return (
    <Card title="2. Seleccionar Scan Location">
      <select value={valor || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>-- Selecciona una ubicación --</option>
        {opciones.map((op) => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
    </Card>
  );
}
