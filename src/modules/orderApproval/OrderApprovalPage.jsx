import React, { useMemo, useState } from 'react';
import Card from '../../components/Card.jsx';
import RequestTextInput from './components/RequestTextInput.jsx';
import InventoryUpload from './components/InventoryUpload.jsx';
import ThresholdConfig from './components/ThresholdConfig.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import { parseRequestText } from './utils/parseRequestText.js';
import { parseInventoryFile } from './utils/parseInventoryFile.js';
import { evaluarSolicitudes } from './utils/evaluateRules.js';
import { usePermission } from '../../context/PermissionsContext.jsx';

const UMBRAL_DEFECTO = 30;
const MARGEN_DIAS_DEFECTO = 3;

export default function OrderApprovalPage() {
  const puedeVer = usePermission('orderApproval', 'view');
  const puedeEjecutar = usePermission('orderApproval', 'run');

  const [textoSolicitud, setTextoSolicitud] = useState('');
  const [inventario, setInventario] = useState(null);
  const [inventoryFileName, setInventoryFileName] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [umbral, setUmbral] = useState(UMBRAL_DEFECTO);
  const [margenDias, setMargenDias] = useState(MARGEN_DIAS_DEFECTO);
  const [resultado, setResultado] = useState([]);

  const solicitudesParseadas = useMemo(() => parseRequestText(textoSolicitud), [textoSolicitud]);
  const totalItems = solicitudesParseadas.reduce((acc, s) => acc + s.items.length, 0);

  async function handleInventoryFile(file) {
    setInventoryError('');
    try {
      const mapa = await parseInventoryFile(file);
      setInventario(mapa);
      setInventoryFileName(file.name);
    } catch (error) {
      setInventario(null);
      setInventoryFileName('');
      setInventoryError(error.message);
    }
  }

  function handleComparar() {
    if (!inventario || !solicitudesParseadas.length) return;
    const evaluado = evaluarSolicitudes(solicitudesParseadas, inventario, {
      umbralPorcentaje: umbral / 100,
      margenDiasRdd: margenDias,
    });
    setResultado(evaluado);
  }

  if (!puedeVer) {
    return <Card title="Order Approval">No tienes permiso para ver esta sección.</Card>;
  }

  return (
    <>
      <RequestTextInput valor={textoSolicitud} onChange={setTextoSolicitud} />
      <InventoryUpload
        fileName={inventoryFileName}
        onFileSelected={handleInventoryFile}
        error={inventoryError}
      />
      <ThresholdConfig
        umbral={umbral}
        onUmbralChange={setUmbral}
        margenDias={margenDias}
        onMargenDiasChange={setMargenDias}
      />

      <Card title="4. Comparar">
        <p className="hint">
          {solicitudesParseadas.length} solicitud(es) detectada(s), {totalItems} artículo(s) en total.
        </p>
        <button
          className="primary"
          disabled={!puedeEjecutar || !inventario || !solicitudesParseadas.length}
          onClick={handleComparar}
        >
          Comparar contra disponibilidad
        </button>
        {!puedeEjecutar && <p className="hint">No tienes permiso para ejecutar la comparación.</p>}
      </Card>

      <ResultsTable solicitudes={resultado} />
    </>
  );
}
