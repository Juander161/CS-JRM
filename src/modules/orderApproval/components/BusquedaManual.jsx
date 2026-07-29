import React, { useState } from 'react';
import Card from '../../../components/Card.jsx';

// Consulta rápida "código de Item -> disponible" para casos que no vienen
// en el formato de correo (preguntas sueltas, verificaciones puntuales),
// usando el mismo Excel de disponibilidad ya cargado arriba.
export default function BusquedaManual({ inventario }) {
  const [codigo, setCodigo] = useState('');

  if (!inventario) return null;

  const resultado = codigo.trim() ? inventario.get(codigo.trim().toUpperCase()) : null;

  return (
    <Card title="Búsqueda manual de disponibilidad">
      <p className="hint">
        Consulta rápida de un código de Item contra el Excel de disponibilidad ya cargado,
        sin necesidad de pegar una solicitud completa.
      </p>
      <div className="field-row">
        <div className="field">
          <label>Código de Item</label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej. 2000097477"
          />
        </div>
      </div>
      {codigo.trim() && (
        resultado ? (
          <table>
            <thead>
              <tr>
                <th>Item</th><th>Descripción</th><th>Cantidad disponible</th><th>Demanda/Consumo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{resultado.itemCode}</td>
                <td>{resultado.descripcion || '—'}</td>
                <td>{resultado.disponible}</td>
                <td>{resultado.demanda ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="hint">No se encontró el código "{codigo.trim()}" en el Excel cargado.</p>
        )
      )}
    </Card>
  );
}
