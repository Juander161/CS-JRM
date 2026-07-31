import React from 'react';
import Card from '../../../components/Card.jsx';

export default function RequestTextInput({ valor, onChange }) {
  return (
    <Card title="1. Pegar solicitud(es) del correo">
      <p className="hint">
        Acepta dos formatos:
        <br />
        <strong>Completo</strong> — encabezado PRDF + items (como viene del correo de Order Approval). Puedes pegar varios BO# juntos.
        <br />
        <strong>Solo items</strong> — pega únicamente las líneas <code>Item [...]</code> sin encabezado; se consultan contra el inventario sin validar RDD.
      </p>
      <textarea
        rows={10}
        style={{ width: '100%' }}
        placeholder={
          'Formato completo:\nPRDF: RDD 24-JUL-26, Event Date N/A, SLADE JAN, Rep SLADE JAN, BO# 95637276\nItem [2000097477]    Qty [1]    Description [SERVICE: RETURN.ALTERATION.]\n\nO solo items:\nItem [2000097477]    Qty [1]    Description [SERVICE: RETURN.ALTERATION.]\nItem [1012010779]    Qty [13]   Description [PRODUCT PACKAGE: ...]'
        }
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </Card>
  );
}
