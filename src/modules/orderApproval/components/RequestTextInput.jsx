import React from 'react';
import Card from '../../../components/Card.jsx';

export default function RequestTextInput({ valor, onChange }) {
  return (
    <Card title="1. Pegar solicitud(es) del correo">
      <p className="hint">
        Pega aquí el texto tal como viene del correo de Order Approval. Puedes pegar
        varias solicitudes (varios BO#) juntas; cada una se procesa por separado.
      </p>
      <textarea
        rows={10}
        style={{ width: '100%' }}
        placeholder="PRDF: RDD 24-JUL-26, Event Date N/A, SLADE JAN, Rep SLADE JAN, BO# 95637276&#10;Item [2000097477]    Qty [1]    Description [SERVICE: RETURN.ALTERATION.]"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </Card>
  );
}
