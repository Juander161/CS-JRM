import React from 'react';
import { usePermission } from '../../../context/PermissionsContext.jsx';

// Versión compacta para la barra de herramientas: tres inputs numéricos
// en línea sin envolver en Card.
export default function ThresholdConfig({
  umbral,
  onUmbralChange,
  margenDias,
  onMargenDiasChange,
  margenAmbar,
  onMargenAmbarChange,
}) {
  const puedeConfigurar = usePermission('orderApproval', 'configureThreshold');

  const inputStyle = { width: 52, textAlign: 'center' };
  const labelStyle = { fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={labelStyle}>Umbral %</span>
        <input
          type="number"
          min="1"
          max="100"
          value={umbral}
          disabled={!puedeConfigurar}
          style={inputStyle}
          title="Umbral de consumo para aprobar (%). Solicitado ÷ disponible por debajo de este % = Aprobado"
          onChange={(e) => onUmbralChange(Number(e.target.value))}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={labelStyle}>Zona ámbar %</span>
        <input
          type="number"
          min="0"
          max="30"
          value={margenAmbar}
          disabled={!puedeConfigurar}
          style={inputStyle}
          title="Puntos porcentuales antes del umbral que se clasifican como 'Revisar' en vez de 'Aprobado'"
          onChange={(e) => onMargenAmbarChange(Number(e.target.value))}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={labelStyle}>Días RDD</span>
        <input
          type="number"
          min="0"
          max="30"
          value={margenDias}
          disabled={!puedeConfigurar}
          style={inputStyle}
          title="RDD a menos de estos días del hoy = rechazo automático"
          onChange={(e) => onMargenDiasChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
