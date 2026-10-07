// Cálculos puros sobre el mundo de los agentes. Ninguna función muta su entrada.
//
// Reglas de previsión (se explican en la traza de cada respuesta):
// - Pendiente estimado de una partida = CEF − gastado − comprometido.
// - Un coste nuevo consume primero ese pendiente; el exceso sube el CEF.
// - El exceso de una orden aprobada se suma a los pagos de su semana de caja
//   (el pendiente ya está en la previsión de tesorería).
// - Coste = base imponible (sin IVA ni IGIC).

import { evaluarTerritorio } from '../lib/incentivos.js'
import { POLITICAS, nivelOrden, confianzaBaja, ROLES } from './politicas.js'
import { diasEntre } from './texto.js'

export const r2 = (n) => Math.round(n * 100) / 100

export function pendiente(p) {
  return r2(p.cef - p.gastado - p.comprometido)
}

function sumar(items, campo) {
  return r2(items.reduce((a, x) => a + x[campo], 0))
}

function agregar(base) {
  const desviacion = r2(base.cef - base.presupuesto)
  return {
    ...base,
    desviacion,
    desviacionPct: base.presupuesto ? desviacion / base.presupuesto : 0,
    disponible: r2(base.cef - base.gastado - base.comprometido),
    consolidado: r2(base.gastado + base.comprometido),
  }
}

export function capitulo(mundo, id) {
  const cap = mundo.capitulos.find((c) => c.id === id)
  if (!cap) return null
  const partidas = cap.partidas.map((c) => mundo.partidas[c])
  const a = agregar({
    id: cap.id,
    nombre: cap.nombre,
    presupuesto: sumar(partidas, 'presupuesto'),
    gastado: sumar(partidas, 'gastado'),
    comprometido: sumar(partidas, 'comprometido'),
    cef: sumar(partidas, 'cef'),
  })
  return {
    ...a,
    fueraRango: a.desviacionPct > POLITICAS.umbralDesviacion,
    margenUmbral: r2(POLITICAS.umbralDesviacion * a.presupuesto - a.desviacion),
  }
}

export function capitulos(mundo) {
  return mundo.capitulos.map((c) => capitulo(mundo, c.id))
}

/** Reservas de riesgos aprobadas: suben el coste estimado final sin tocar ningún capítulo. */
export function reservasTotal(mundo) {
  return r2(Object.values(mundo.reservas ?? {}).reduce((a, x) => a + x.importe, 0))
}

export function totales(mundo) {
  const caps = capitulos(mundo)
  const reservas = reservasTotal(mundo)
  const t = agregar({
    presupuesto: sumar(caps, 'presupuesto'),
    gastado: sumar(caps, 'gastado'),
    comprometido: sumar(caps, 'comprometido'),
    cef: r2(sumar(caps, 'cef') + reservas),
  })
  return { ...t, reservas, ejecucionPct: t.presupuesto ? t.gastado / t.presupuesto : 0, consolidadoPct: t.cef ? t.consolidado / t.cef : 0 }
}

export function nombreCapitulo(mundo, id) {
  return mundo.capitulos.find((c) => c.id === id)?.nombre ?? id
}

export function etiquetaPartida(mundo, codigo) {
  const p = mundo.partidas[codigo]
  return p ? `${codigo} ${p.nombre}` : codigo
}

/** Desviaciones por capítulo con sus causas por partida. */
export function desviaciones(mundo) {
  const caps = capitulos(mundo)
  const items = caps
    .filter((c) => Math.abs(c.desviacion) >= 0.5)
    .sort((a, b) => b.desviacion - a.desviacion)
    .map((c) => ({
      ...c,
      causas: mundo.capitulos
        .find((x) => x.id === c.id)
        .partidas.map((cod) => mundo.partidas[cod])
        .filter((p) => Math.abs(p.cef - p.presupuesto) >= 0.5)
        .map((p) => ({
          codigo: p.codigo,
          nombre: p.nombre,
          presupuesto: p.presupuesto,
          gastado: p.gastado,
          comprometido: p.comprometido,
          cef: p.cef,
          desviacion: r2(p.cef - p.presupuesto),
          desviacionPct: p.presupuesto ? (p.cef - p.presupuesto) / p.presupuesto : 0,
          pendiente: Math.max(0, pendiente(p)),
          consolidada: pendiente(p) <= 0,
        }))
        .sort((a, b) => b.desviacion - a.desviacion),
    }))
  const sobrecostes = r2(items.filter((c) => c.desviacion > 0).reduce((a, c) => a + c.desviacion, 0))
  const ahorros = r2(items.filter((c) => c.desviacion < 0).reduce((a, c) => a + c.desviacion, 0))
  const reservas = reservasTotal(mundo)
  return { items, resumen: { sobrecostes, ahorros, reservas, neto: r2(sobrecostes + ahorros + reservas) }, umbral: POLITICAS.umbralDesviacion }
}

/** Partidas cuyo gastado + comprometido supera el CEF (previsión incoherente). */
export function incoherenciasPrevision(mundo) {
  return Object.values(mundo.partidas)
    .filter((p) => pendiente(p) < -0.004 && !mundo.ajustesCef[p.codigo])
    .map((p) => ({ codigo: p.codigo, nombre: p.nombre, cef: p.cef, consolidado: r2(p.gastado + p.comprometido), exceso: r2(-pendiente(p)), cefPropuesto: r2(p.gastado + p.comprometido) }))
}

/** Partidas ya sin pendiente estimado: cualquier gasto nuevo sube el CEF. */
export function partidasSinMargen(mundo) {
  return Object.values(mundo.partidas)
    .filter((p) => pendiente(p) <= 0 && p.cef > p.gastado)
    .map((p) => ({ codigo: p.codigo, nombre: p.nombre, cef: p.cef }))
}

/** Efecto de un coste nuevo en una partida, sin aplicarlo. */
export function impactoNuevoCoste(mundo, codigo, importe, campo = 'comprometido') {
  const p = mundo.partidas[codigo]
  const etcAntes = Math.max(0, pendiente(p))
  const consume = Math.min(importe, etcAntes)
  const exceso = r2(importe - consume)
  const despues = { ...p, [campo]: r2(p[campo] + importe), cef: r2(p.cef + exceso) }
  const simulado = { ...mundo, partidas: { ...mundo.partidas, [codigo]: despues } }
  const capAntes = capitulo(mundo, p.capitulo)
  const capDespues = capitulo(simulado, p.capitulo)
  return {
    codigo,
    importe,
    etcAntes,
    consume,
    exceso,
    partida: { antes: p, despues },
    capitulo: { antes: capAntes, despues: capDespues },
    totales: { antes: totales(mundo), despues: totales(simulado) },
    cruzaUmbral: capAntes.desviacionPct <= POLITICAS.umbralDesviacion && capDespues.desviacionPct > POLITICAS.umbralDesviacion,
    superaUmbral: capDespues.desviacionPct > POLITICAS.umbralDesviacion,
  }
}

export function tesoreria(mundo, ajustesExtra = []) {
  const ajustes = [...mundo.tesoreria.ajustes, ...ajustesExtra]
  let saldo = mundo.tesoreria.saldoHoy
  const semanas = mundo.tesoreria.semanas.map((s) => {
    const extra = r2(ajustes.filter((a) => a.semana === s.semana).reduce((a, x) => a + x.pagos, 0))
    const pagos = r2(s.pagos + extra)
    const flujo = r2(s.cobros - pagos)
    saldo = r2(saldo + flujo)
    return { semana: s.semana, fechas: s.fechas, concepto: s.concepto, enCurso: !!s.enCurso, cobros: s.cobros, pagos, extra, flujo, saldo }
  })
  const negativas = semanas.filter((s) => s.saldo < 0)
  const minimo = semanas.reduce((m, s) => (s.saldo < m.saldo ? s : m), semanas[0])
  return { saldoHoy: mundo.tesoreria.saldoHoy, semanas, negativas, minimo }
}

export function impactoOrden(mundo, ocId, importe) {
  const o = mundo.ordenes[ocId]
  if (!o) return null
  const imp = importe ?? o.importe
  const efecto = impactoNuevoCoste(mundo, o.partida, imp, 'comprometido')
  const pol = nivelOrden({ importe: imp, desviacionPctDespues: efecto.capitulo.despues.desviacionPct })
  const ajuste = efecto.exceso > 0 && o.semanaPago ? [{ semana: o.semanaPago, pagos: efecto.exceso, origen: o.id }] : []
  const cajaAntes = tesoreria(mundo)
  const cajaDespues = tesoreria(mundo, ajuste)
  const semAntes = cajaAntes.semanas.find((s) => s.semana === o.semanaPago)
  const semDespues = cajaDespues.semanas.find((s) => s.semana === o.semanaPago)
  return {
    orden: o,
    ...efecto,
    ...pol,
    caja: o.semanaPago
      ? { semana: o.semanaPago, antes: semAntes?.saldo, despues: semDespues?.saldo, minimoAntes: cajaAntes.minimo, minimoDespues: cajaDespues.minimo }
      : null,
  }
}

export function ordenesPendientes(mundo) {
  return Object.values(mundo.ordenes).filter((o) => o.estado === 'Pendiente')
}

export function conciliar(mundo, docId) {
  const d = mundo.documentos[docId]
  if (!d.oc) return { resultado: 'sin_oc', oc: null }
  const o = mundo.ordenes[d.oc]
  if (!o) return { resultado: 'oc_desconocida', oc: d.oc }
  if (o.estado !== 'Aprobada' && o.estado !== 'Facturada') return { resultado: 'oc_no_aprobada', oc: o.id, orden: o }
  const abierto = r2((o.importeAprobado ?? o.importe) - o.facturado)
  const diferencia = r2(d.base - abierto)
  const ok = Math.abs(diferencia) <= POLITICAS.toleranciaConciliacion * Math.max(abierto, 1)
  return { resultado: ok ? 'ok' : 'diferencia', oc: o.id, orden: o, abierto, diferencia }
}

/** Criterios de elegibilidad de src/screens/Elegibilidad.jsx: factura, pago, pedido o contrato, capítulo. */
export function elegibilidad(mundo, docId) {
  const d = mundo.documentos[docId]
  const criterios = [
    { id: 'factura', etiqueta: 'Factura completa', ok: d.tipo === 'factura', detalle: d.tipo === 'factura' ? 'Factura con datos fiscales' : 'Ticket simplificado: faltan los datos de la productora' },
    { id: 'pago', etiqueta: 'Pago trazable', ok: d.pago === 'pagado' ? true : d.pago === 'pendiente' ? null : false, detalle: d.pago === 'pagado' ? 'Pagado' : 'Pendiente de pago: se acredita al pagar' },
    { id: 'pedido', etiqueta: 'Pedido o contrato', ok: !!d.oc || d.contrato, detalle: d.oc ? `Pedido ${d.oc}` : d.contrato ? 'Contrato marco del proveedor' : 'Sin pedido ni contrato' },
    { id: 'capitulo', etiqueta: 'Capítulo ICAA coherente', ok: !!d.partida && d.partida.startsWith(d.capitulo), detalle: d.partida ? `Partida ${d.partida}` : 'Sin partida' },
  ]
  const territorial = d.impuesto?.tipo === 'IGIC'
  if (territorial) {
    const revisada = mundo.revisiones[d.id]
    criterios.push({ id: 'territorio', etiqueta: 'Validación territorial', ok: null, detalle: revisada ? 'Paquete preparado para el fiscalista' : 'IGIC: gasto en Canarias, lo valida el fiscalista' })
  }
  const estado = criterios.some((c) => c.ok === false) ? 'revisar' : criterios.some((c) => c.ok === null) ? 'condicionado' : 'elegible'
  return { criterios, estado, territorio: territorial ? 'canarias' : 'comun' }
}

/** Cola de decisiones pendientes que Excepciones lleva a cada responsable. */
export function excepciones(mundo) {
  const out = []
  for (const d of Object.values(mundo.documentos)) {
    if (d.estado !== 'en_bandeja') continue
    if (confianzaBaja(d)) {
      out.push({ id: `ex-${d.id}`, tipo: 'confianza', ref: { tipo: 'documento', id: d.id }, nivel: 'propone', rol: ROLES.revisionHumana, aplazado: !!d.aplazado, importe: d.base, titulo: `${d.proveedor}: partida dudosa`, entrada: '¿Qué gastos tengo que revisar?' })
    } else if (d.impuesto?.tipo === 'IGIC') {
      if (!mundo.revisiones[d.id]) out.push({ id: `ex-${d.id}`, tipo: 'fiscal', ref: { tipo: 'revision', id: d.id }, nivel: 'aprueba', rol: ROLES.fiscalista, importe: d.base, titulo: `${d.proveedor}: IGIC por validar`, entrada: `Revisa el IGIC de la factura ${d.id}` })
    } else if (!d.oc) {
      out.push({ id: `ex-${d.id}`, tipo: 'sin_pedido', ref: { tipo: 'documento', id: d.id }, nivel: 'aprueba', rol: ROLES.lineProducer, aplazado: !!d.aplazado, importe: d.base, titulo: `${d.proveedor}: factura sin pedido`, entrada: `Procesa la factura ${d.id}` })
    }
  }
  for (const o of ordenesPendientes(mundo)) {
    const imp = impactoOrden(mundo, o.id)
    out.push({ id: `ex-${o.id}`, tipo: 'orden', ref: { tipo: 'orden', id: o.id }, nivel: imp.nivel, rol: imp.rol, importe: o.importe, titulo: `${o.id} · ${o.proveedor}`, entrada: `Revisa la orden de compra ${o.id}` })
  }
  for (const inc of incoherenciasPrevision(mundo)) {
    out.push({ id: `ex-cef-${inc.codigo}`, tipo: 'prevision', ref: { tipo: 'cef', id: inc.codigo }, nivel: 'propone', rol: ROLES.lineProducer, importe: inc.exceso, titulo: `Previsión de ${inc.codigo} por debajo de lo comprometido`, entrada: '¿Cómo cerraremos el proyecto?' })
  }
  const peso = { aprueba: 0, propone: 1 }
  return out.sort((a, b) => peso[a.nivel] - peso[b.nivel] || b.importe - a.importe)
}

export function dossier(mundo) {
  return mundo.dossier.map((d) => ({ ...d, dias: diasEntre(mundo.corte.fecha, d.deadline) }))
}

/** Estimación de deducción con el motor V2 (src/lib/incentivos.js). Exploratorio. */
export function incentivo(mundo, { territorio = 'comun', pctGasto, ayudaIcaa = false } = {}) {
  const pr = mundo.proyecto
  const ayuda = mundo.financiacion.find((f) => f.tipo === 'Subvención' && /ICAA/.test(f.fuente))
  const subvenciones = ayudaIcaa && ayuda ? [{ importe: ayuda.importe }] : []
  const pct = pctGasto ?? (pr.pctGastoTerritorio[territorio] ?? 100) / 100
  const ev = evaluarTerritorio(territorio, { coste: pr.presupuesto, pctGasto: pct, subvenciones, coproduccionUE: pr.coproduccionUE, obraDificil: pr.obraDificil })
  return { ...ev, pctGasto: pct, ayuda: ayudaIcaa ? ayuda : null }
}

/** Estado de una decisión a partir del mundo (la tarjeta y el panel leen lo mismo). */
export function estadoDecision(mundo, ref) {
  if (!ref) return { estado: 'pendiente' }
  const ultimo = [...mundo.historial].reverse().find((h) => h.ref && h.ref.tipo === ref.tipo && h.ref.id === ref.id)
  const por = ultimo?.por ?? null
  switch (ref.tipo) {
    case 'orden': {
      const o = mundo.ordenes[ref.id]
      if (!o) return { estado: 'pendiente' }
      if (o.estado === 'Aprobada' || o.estado === 'Facturada') return { estado: 'aprobada', por, importe: o.importeAprobado }
      if (o.estado === 'Rechazada') return { estado: 'rechazada', por }
      if (o.estado === 'Por llegar') return { estado: 'por_llegar' }
      // Pedir aprobación no cierra la decisión: la sigue teniendo quien tiene el rol.
      if (o.escaladaA) return { estado: 'pendiente', escaladaA: o.escaladaA, por }
      return { estado: 'pendiente' }
    }
    case 'documento': {
      const d = mundo.documentos[ref.id]
      if (d?.estado === 'contabilizada') return { estado: 'aprobada', por, partida: d.partida }
      // Dejar en revisión tampoco la cierra: se puede decidir más tarde.
      if (d?.aplazado) return { estado: 'pendiente', aplazado: true, por }
      return { estado: 'pendiente' }
    }
    case 'revision':
      return mundo.revisiones[ref.id] ? { estado: 'preparada', por: mundo.revisiones[ref.id].por } : { estado: 'pendiente' }
    case 'cef':
      return mundo.ajustesCef[ref.id] ? { estado: 'aprobada', por: mundo.ajustesCef[ref.id].por } : { estado: 'pendiente' }
    case 'informe': {
      const inf = mundo.informes[ref.id]
      if (inf?.estado === 'aprobado') return { estado: 'aprobada', por: inf.aprobadoPor }
      return { estado: 'pendiente' }
    }
    case 'llamadas': {
      const a = mundo.propuesta?.autorizacion
      if (a === 'autorizada') return { estado: 'aprobada', por: mundo.propuesta.autorizadaPor }
      if (a === 'rechazada') return { estado: 'rechazada', por }
      return { estado: 'pendiente' }
    }
    case 'eleccion': {
      const e = mundo.propuesta?.elecciones[ref.id]
      if (!e) return { estado: 'pendiente' }
      return { estado: e.altId ? 'aprobada' : 'rechazada', por: e.por }
    }
    case 'riesgo': {
      const d = mundo.decisionesRiesgo?.[ref.id]
      if (!d) return { estado: 'pendiente' }
      // Una tarjeta nueva con otra reserva (la previsión cambió) vuelve a estar abierta.
      if (d.estado === 'reservado' && ref.reserva !== undefined && Math.abs(d.importe - ref.reserva) > 0.5) return { estado: 'pendiente', reservaActual: d.importe, por: d.por }
      return { estado: d.estado, por: d.por, importe: d.importe }
    }
    case 'borrador': {
      const b = mundo.borradores[ref.id]
      if (b?.estado === 'listo') return { estado: 'aprobada', por: b.listoPor }
      if (b?.estado === 'descartado') return { estado: 'rechazada' }
      return { estado: 'pendiente' }
    }
    default:
      return { estado: 'pendiente' }
  }
}

/** ¿Ha cambiado el coste desde que se redactó el informe? */
export function informeDesactualizado(mundo, id) {
  const inf = mundo.informes[id]
  if (!inf) return false
  const ahora = totales(mundo)
  if (['gastado', 'comprometido', 'cef'].some((k) => Math.abs(ahora[k] - inf.totales[k]) > 0.004)) return true
  if (!inf.resumen) return false
  const ex = excepciones(mundo)
  if (ex.length !== inf.resumen.decisiones || ex.filter((e) => e.nivel === 'aprueba').length !== inf.resumen.conAprobacion) return true
  return Math.abs(tesoreria(mundo).minimo.saldo - inf.resumen.cajaMinima.saldo) > 0.004
}
