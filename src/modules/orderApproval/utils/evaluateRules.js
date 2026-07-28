// Reglas de negocio de Order Approval (ver documento "Order Approval —
// Estructura y Reglas"):
//
// 3.1 Regla de RDD: si la fecha RDD está a menos de N días (por defecto 3)
//     de la fecha actual, la solicitud se marca para rechazo automático.
// 3.2 Regla de comparación de inventario: % = cantidad solicitada / cantidad
//     disponible. Si el % es menor al umbral configurado -> Aprobado, si lo
//     supera -> Rechazado. El umbral es configurable (por defecto 30%).
//
// ⚠ Pendiente de confirmar: si el margen de días RDD depende del destino, y
// si el umbral debe considerar también la demanda/consumo reciente (10%
// mencionado en el proceso manual) en vez de (o además de) el disponible
// total. Mientras se confirma, ambas quedan como parámetros configurables
// y el % sobre demanda se muestra solo como dato informativo adicional.

const MS_POR_DIA = 1000 * 60 * 60 * 24;

export function diasHastaRdd(rddDate, hoy = new Date()) {
  if (!rddDate) return null;
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((rddDate.getTime() - hoyUTC) / MS_POR_DIA);
}

export function evaluarItem(item, inventario, { umbralPorcentaje, margenDiasRdd, rdd, ahora }) {
  const dias = diasHastaRdd(rdd, ahora);
  const rddEnRiesgo = dias !== null && dias < margenDiasRdd;

  const infoInventario = inventario.get(item.itemCode.toUpperCase());
  const disponible = infoInventario ? infoInventario.disponible : null;
  const demanda = infoInventario ? infoInventario.demanda : null;

  let porcentajeConsumo = null;
  let porcentajeSobreDemanda = null;
  let estado;
  let motivo = '';

  if (rddEnRiesgo) {
    estado = 'Rechazado';
    motivo = `RDD a ${dias} día(s) (mínimo requerido: ${margenDiasRdd})`;
  } else if (disponible === null) {
    estado = 'Sin dato';
    motivo = 'Item no encontrado en el Excel de disponibilidad';
  } else if (disponible === 0) {
    estado = 'Rechazado';
    motivo = 'Cantidad disponible es 0';
  } else {
    porcentajeConsumo = item.qty / disponible;
    if (demanda) porcentajeSobreDemanda = item.qty / demanda;
    if (porcentajeConsumo < umbralPorcentaje) {
      estado = 'Aprobado';
    } else {
      estado = 'Rechazado';
      motivo = `Consumo ${(porcentajeConsumo * 100).toFixed(1)}% supera el umbral (${(umbralPorcentaje * 100).toFixed(0)}%)`;
    }
  }

  return {
    ...item,
    descripcionInventario: infoInventario?.descripcion || '',
    disponible,
    demanda,
    porcentajeConsumo,
    porcentajeSobreDemanda,
    estado,
    motivo,
    diasHastaRdd: dias,
  };
}

export function evaluarSolicitud(solicitud, inventario, opciones) {
  const items = solicitud.items.map((item) =>
    evaluarItem(item, inventario, { ...opciones, rdd: solicitud.rdd })
  );
  return { ...solicitud, items };
}

export function evaluarSolicitudes(solicitudes, inventario, opciones) {
  return solicitudes.map((solicitud) => evaluarSolicitud(solicitud, inventario, opciones));
}
