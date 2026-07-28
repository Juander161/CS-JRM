// Arma un texto corto y listo para pegar (como respuesta de correo o nota
// en Oracle) con el resultado de una solicitud ya evaluada.
export function construirResumenCopiable(solicitud) {
  const total = solicitud.items.length;
  const conteos = {};
  solicitud.items.forEach((item) => {
    conteos[item.estado] = (conteos[item.estado] || 0) + 1;
  });

  let estadoGeneral;
  if (conteos.Rechazado) estadoGeneral = 'Rechazado';
  else if (conteos.Revisar) estadoGeneral = 'Revisar manualmente';
  else if (conteos['Sin dato'] && !conteos.Aprobado) estadoGeneral = 'Sin dato';
  else estadoGeneral = 'Aprobado';

  const partes = [];
  if (conteos.Aprobado) partes.push(`${conteos.Aprobado} aprobado(s)`);
  if (conteos.Rechazado) partes.push(`${conteos.Rechazado} rechazado(s)`);
  if (conteos.Revisar) partes.push(`${conteos.Revisar} a revisar`);
  if (conteos['Sin dato']) partes.push(`${conteos['Sin dato']} sin dato de inventario`);

  let texto = `BO# ${solicitud.bo} (${solicitud.cliente}) — ${estadoGeneral}. ${total} item(s): ${partes.join(', ')}.`;

  const conMotivo = solicitud.items.filter((item) => item.estado !== 'Aprobado' && item.motivo);
  if (conMotivo.length) {
    const detalle = conMotivo.map((item) => `${item.itemCode} [${item.estado}]: ${item.motivo}`).join(' | ');
    texto += ` Detalle: ${detalle}`;
  }

  return texto;
}
