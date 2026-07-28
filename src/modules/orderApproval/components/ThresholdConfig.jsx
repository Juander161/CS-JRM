import React from 'react';
import Card from '../../../components/Card.jsx';
import { usePermission } from '../../../context/PermissionsContext.jsx';

export default function ThresholdConfig({
  umbral,
  onUmbralChange,
  margenDias,
  onMargenDiasChange,
  margenAmbar,
  onMargenAmbarChange,
}) {
  const puedeConfigurar = usePermission('orderApproval', 'configureThreshold');

  return (
    <Card title="3. Reglas de aprobación">
      <div className="field-row">
        <div className="field">
          <label>Umbral de consumo para aprobar (%)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={umbral}
            disabled={!puedeConfigurar}
            onChange={(e) => onUmbralChange(Number(e.target.value))}
          />
          <span className="hint">Solicitado ÷ disponible por debajo de este % = Aprobado</span>
        </div>
        <div className="field">
          <label>Zona ámbar antes del umbral (puntos %)</label>
          <input
            type="number"
            min="0"
            max="30"
            value={margenAmbar}
            disabled={!puedeConfigurar}
            onChange={(e) => onMargenAmbarChange(Number(e.target.value))}
          />
          <span className="hint">
            Ej. con umbral 30% y zona 7: de 23% a 30% = Revisar en vez de Aprobado directo
          </span>
        </div>
        <div className="field">
          <label>Días mínimos antes del RDD</label>
          <input
            type="number"
            min="0"
            max="30"
            value={margenDias}
            disabled={!puedeConfigurar}
            onChange={(e) => onMargenDiasChange(Number(e.target.value))}
          />
          <span className="hint">RDD a menos de estos días = rechazo automático</span>
        </div>
      </div>
      {!puedeConfigurar && (
        <p className="hint">No tienes permiso para modificar estas reglas (ver Administración).</p>
      )}
    </Card>
  );
}
