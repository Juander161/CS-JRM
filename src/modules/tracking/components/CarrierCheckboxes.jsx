import React from 'react';
import Card from '../../../components/Card.jsx';

export default function CarrierCheckboxes({ carriers, seleccionados, onToggle, onBuscar, cargando, puedeBuscar }) {
  if (!carriers.length) return null;

  return (
    <Card title="3. Seleccionar carriers a procesar">
      <div className="carrier-list">
        {carriers.map((carrier) => (
          <label key={carrier} className="carrier-item">
            <input
              type="checkbox"
              checked={seleccionados.includes(carrier)}
              onChange={() => onToggle(carrier)}
            />
            {carrier}
          </label>
        ))}
      </div>
      <button
        className="primary"
        onClick={onBuscar}
        disabled={!puedeBuscar || cargando || seleccionados.length === 0}
      >
        {cargando ? 'Buscando...' : 'Buscar'}
      </button>
      {!puedeBuscar && <p className="hint">No tienes permiso para ejecutar la búsqueda.</p>}
    </Card>
  );
}
