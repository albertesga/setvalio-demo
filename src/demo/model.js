// Conversación breve de la demo WhatsApp + escritorio. Comparte el mundo y los
// cálculos del prototipo original; no se conecta a WhatsApp ni a contabilidad.
import { crearMundo, PERSONAS } from '../agentes/mundo.js'
import { reducir } from '../agentes/acciones.js'
import { totales, capitulo, desviaciones, tesoreria, impactoOrden, dossier, etiquetaPartida } from '../agentes/calculos.js'
import { eur, eurCents, eurSigned, pctSigned } from '../lib/format.js'
import { fecha } from '../agentes/texto.js'

const TICKET = 'G-004'
const HOTEL = 'OC-104'
const POR = PERSONAS.marta.nombre
const DESTINOS = {
  resumen: { section: 'resumen' },
  presupuesto: { section: 'presupuesto' },
  documentos: { section: 'documentos' },
  ticket: { section: 'documentos', docId: TICKET },
}

function hora(seq) {
  const minutos = 10 * 60 + 30 + Math.floor(seq / 2)
  return `${String(Math.floor(minutos / 60) % 24).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

function mensaje(s, rol, texto, extra = {}) {
  const seq = s.seq + 1
  return { ...s, seq, mensajes: [...s.mensajes, { id: `wa-${seq}`, rol, texto, hora: hora(s.seq), ...extra }] }
}

function anotar(s, texto, tipo, destino) {
  return {
    ...s,
    actividad: [{ id: `actividad-${s.seq}-${s.mundo.version}`, texto, tipo, hora: hora(s.seq), destino }, ...s.actividad],
  }
}

// Una llegada posterior a una decisión debe sobrevivir a «Deshacer».
function recibir(s, eventoId, texto, destino) {
  const accion = { tipo: 'evento/recibir', eventoId, por: 'Recepción de ejemplo' }
  const mundo = reducir(s.mundo, accion)
  if (mundo === s.mundo) return s
  let n = anotar({ ...s, mundo }, texto, 'recepcion', destino)
  if (s.undo) {
    n.undo = {
      ...s.undo,
      mundo: reducir(s.undo.mundo, accion),
      actividad: [n.actividad[0], ...s.undo.actividad],
    }
  }
  return n
}

export function crearDemo() {
  const mundo = crearMundo()
  return mensaje(
    { mundo, mensajes: [], seq: 0, undo: null, actividad: [] },
    'filmpilot',
    `Hola, Marta. Soy FilmPilot. Tengo a mano el presupuesto y los documentos de «${mundo.proyecto.titulo}». ¿Qué necesitas revisar?`,
  )
}

function resumen(s, informe = false) {
  const t = totales(s.mundo)
  const caja = tesoreria(s.mundo)
  const principal = desviaciones(s.mundo).items.find((c) => c.desviacion > 0)
  const introduccion = informe ? `Resumen preparado al ${fecha(s.mundo.corte.fecha)} para revisar ${s.mundo.periodo.etiqueta} (${s.mundo.periodo.fechas}). Las cifras reflejan el corte actual, no el cierre histórico de esa semana.` : `Vamos por la jornada ${s.mundo.proyecto.diaActual} de ${s.mundo.proyecto.diasRodaje}.`
  const texto = `${introduccion}\n\nPrevisión final: ${eur(t.cef)}. Son ${eurSigned(t.desviacion)} (${pctSigned(t.desviacionPct)}) frente al presupuesto.${principal ? `\nLa mayor desviación está en ${principal.nombre}: ${eurSigned(principal.desviacion)}.` : ''}\n\n${caja.minimo.saldo < 0 ? `Hay una falta de caja prevista de ${eur(Math.abs(caja.minimo.saldo))} en ${caja.minimo.fechas}.` : `El saldo mínimo previsto es ${eur(caja.minimo.saldo)} en ${caja.minimo.fechas}.`}`
  return mensaje(s, 'filmpilot', texto, { destino: DESTINOS.resumen })
}

function responderTicket(s) {
  const d = s.mundo.documentos[TICKET]
  if (d.estado === 'contabilizada') {
    return mensaje(s, 'filmpilot', `Este ticket ya está registrado en ${etiquetaPartida(s.mundo, d.partida)}. Su importe es ${eurCents(d.total)}; no lo duplicaré.`, { destino: DESTINOS.ticket })
  }
  return mensaje(s, 'filmpilot', `Veo ${eurCents(d.total)} de ${d.proveedor}: ${d.concepto.toLowerCase()}.\n\nLo asignaría a Construcción de decorados. ¿Lo confirmas o corresponde a Material fungible de rodaje?\n\nFaltan los datos fiscales de la productora. Aunque registres el gasto, habrá que completar ese justificante.`, {
    decision: 'ticket',
    acciones: [
      { id: 'ticket-arte', etiqueta: 'Confirmar decorados' },
      { id: 'ticket-produccion', etiqueta: 'Material de rodaje' },
    ],
    destino: DESTINOS.ticket,
  })
}

function ticket(s, adjuntar = true) {
  let n = recibir(s, 'EV-01', 'Recibidos el ticket de WhatsApp y las dos facturas de esta mañana.', DESTINOS.documentos)
  if (adjuntar) n = mensaje(n, 'usuario', 'Te paso este ticket de material para el rodaje.', { adjunto: TICKET })
  return responderTicket(n)
}

function hotel(s) {
  const n = recibir(s, 'EV-02', 'Recibida la ampliación de alojamiento de Hotel NH.', DESTINOS.presupuesto)
  const o = n.mundo.ordenes[HOTEL]
  if (o.estado !== 'Pendiente') {
    return mensaje(n, 'filmpilot', `La compra de ${o.proveedor} (${eur(o.importeAprobado ?? o.importe)}) está ${o.estado.toLowerCase()}. Puedes consultar su efecto en el presupuesto.`, { destino: DESTINOS.presupuesto })
  }
  const i = impactoOrden(n.mundo, HOTEL)
  return mensaje(n, 'filmpilot', `${o.proveedor} solicita ${eur(o.importe)} por la ampliación de alojamiento.\n\nAl aprobarla, el coste previsto subiría ${eur(i.exceso)}, hasta ${eur(i.totales.despues.cef)}. El resto ya estaba previsto.${i.caja ? `\nLa caja de ${i.caja.semana} quedaría en ${eur(i.caja.despues)}.` : ''}\n\n¿Aprobamos esta compra?`, {
    decision: 'hotel',
    acciones: [
      { id: 'hotel-aprobar', etiqueta: `Aprobar ${eur(o.importe)}` },
      { id: 'hotel-rechazar', etiqueta: 'Rechazar compra' },
    ],
    destino: DESTINOS.presupuesto,
  })
}

function preguntar(s, texto) {
  if (typeof texto !== 'string' || !texto.trim()) return s
  const limpio = texto.trim().slice(0, 2000)
  const normal = limpio.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  let n = mensaje(s, 'usuario', limpio)
  // Aprobaciones ambiguas por texto nunca cambian el mundo; los botones nombran
  // la compra o la clasificación concreta que la persona confirma.
  if (/\b(aprueba|aprobar|rechaza|rechazar|confirmo|confirma|paga|pagar|envia|enviar)\b/.test(normal)) {
    return mensaje(n, 'filmpilot', 'Para confirmar una decisión, utiliza el botón de su mensaje: así queda claro qué compra o gasto autorizas. En esta demo no se realizan pagos ni envíos.')
  }
  const capId = normal.match(/\bcapitulo\s+(\d{1,2})\b/)?.[1]?.padStart(2, '0')
  if (capId) {
    const c = capitulo(n.mundo, capId)
    if (!c) return mensaje(n, 'filmpilot', `No encuentro el capítulo ${capId} en este presupuesto. Puedes consultar los capítulos disponibles en el escritorio.`, { destino: DESTINOS.presupuesto })
    const causas = desviaciones(n.mundo).items.find((x) => x.id === capId)?.causas ?? []
    return mensaje(n, 'filmpilot', `${c.id} · ${c.nombre}\nPresupuesto: ${eur(c.presupuesto)}.\nPrevisión final: ${eur(c.cef)} (${eurSigned(c.desviacion)}).\n\n${causas.length ? `La desviación viene de estas partidas:\n${causas.map((p) => `• ${p.codigo} ${p.nombre}: ${eurSigned(p.desviacion)}`).join('\n')}` : 'Sus partidas no presentan desviaciones frente al presupuesto.'}`, { destino: DESTINOS.presupuesto })
  }
  if (/\b(hotel|alojamiento|compra|compras|oc-104)\b/.test(normal)) return hotel(n)
  if (/\b(ticket|g-004|tornillo)\b/.test(normal)) return ticket(n, false)
  const docId = limpio.toUpperCase().match(/\bF-\d{4}-\d{3}\b/)?.[0]
  if (docId) {
    const d = n.mundo.documentos[docId]
    if (!d || d.estado === 'por_llegar') return mensaje(n, 'filmpilot', 'No tengo ese documento recibido en esta demo. Puedes revisar los que están disponibles en el escritorio.', { destino: DESTINOS.documentos })
    return mensaje(n, 'filmpilot', `${d.id} · ${d.proveedor}\n${d.concepto}\n\nTotal: ${eurCents(d.total)}. ${d.estado === 'contabilizada' ? 'Registrada en costes' : 'Pendiente de revisión'}.\nPartida: ${etiquetaPartida(n.mundo, d.partida)}.`, { destino: { section: 'documentos', docId: d.id } })
  }
  if (/\b(caja|tesoreria|saldo|liquidez|cobro|cobros|pago|pagos|financiacion)\b/.test(normal)) {
    const c = tesoreria(n.mundo)
    return mensaje(n, 'filmpilot', `Hoy hay ${eur(c.saldoHoy)} en caja.\n\nEl saldo mínimo previsto es ${eur(c.minimo.saldo)} en ${c.minimo.fechas}. ${c.minimo.saldo < 0 ? `Necesitamos cubrir ${eur(Math.abs(c.minimo.saldo))} antes de esa semana.` : 'La previsión no baja de cero.'}\nPuedes ver cobros y pagos por semana en el escritorio.`, { destino: DESTINOS.resumen })
  }
  if (/\bgastos?\b/.test(normal) && /\b(revisar|revision|pendientes?)\b/.test(normal)) {
    const docs = Object.values(n.mundo.documentos).filter((d) => d.estado === 'en_bandeja')
    return mensaje(n, 'filmpilot', docs.length ? `Hay ${docs.length} gastos en la bandeja para revisar:\n${docs.map((d) => `• ${d.id} · ${d.proveedor}: ${eurCents(d.total)}`).join('\n')}\n\nPuedes consultar su origen, clasificación y motivo de revisión en el escritorio.` : 'La bandeja no tiene gastos pendientes de revisión. Puedes consultar los documentos registrados en el escritorio.', { destino: DESTINOS.documentos })
  }
  if (/\b(presupuesto|desviacion|desviaciones|capitulo|capitulos|coste|costes|gastado|gasto|gastos)\b/.test(normal) && !/\binforme\b/.test(normal)) {
    const t = totales(n.mundo)
    const mayores = desviaciones(n.mundo).items.filter((c) => c.desviacion > 0).slice(0, 3)
    return mensaje(n, 'filmpilot', `Presupuesto: ${eur(t.presupuesto)}.\nPrevisión final: ${eur(t.cef)} (${eurSigned(t.desviacion)}).\n\nLas mayores desviaciones:\n${mayores.map((c) => `• ${c.nombre}: ${eurSigned(c.desviacion)}`).join('\n')}\n\nTe dejo el desglose por capítulos y partidas.`, { destino: DESTINOS.presupuesto })
  }
  if (/\b(documento|documentos|dossier|justificante|justificantes|factura|facturas|fiscal|icaa)\b/.test(normal)) {
    const d = dossier(n.mundo)
    const pendientes = Object.values(n.mundo.documentos).filter((doc) => doc.estado === 'en_bandeja').length
    return mensaje(n, 'filmpilot', `Hay ${pendientes} documentos en la bandeja para revisar.\n\nEn el dossier siguen pendientes:\n${d.filter((x) => x.estado === 'Bloqueante').map((x) => `• ${x.documento} · ${fecha(x.deadline)}`).join('\n')}\n\nTienes cada documento, su origen y su estado en el escritorio.`, { destino: DESTINOS.documentos })
  }
  if (/\b(informe|resumen|vamos|produccion|rodaje|estado|hoy|hola|buenos|buenas)\b/.test(normal)) return resumen(n, /\binforme\b/.test(normal))
  return mensaje(n, 'filmpilot', 'Esta demo tiene respuestas preparadas para revisar el presupuesto, la caja, los documentos, un ticket y la compra del hotel. Prueba «¿Cómo vamos?» o «Revisa el hotel».')
}

const DECISIONES = {
  'ticket-arte': { tipo: 'documento/contabilizar', docId: TICKET, partida: '04.01', etiqueta: 'Confirmo Construcción de decorados', decision: 'ticket', destino: DESTINOS.ticket },
  'ticket-produccion': { tipo: 'documento/contabilizar', docId: TICKET, partida: '05.04', etiqueta: 'Confirmo Material fungible de rodaje', decision: 'ticket', destino: DESTINOS.ticket },
  'hotel-aprobar': { tipo: 'orden/aprobar', ocId: HOTEL, etiqueta: 'Apruebo la compra de Hotel NH', decision: 'hotel', destino: DESTINOS.presupuesto },
  'hotel-rechazar': { tipo: 'orden/rechazar', ocId: HOTEL, etiqueta: 'Rechazo la compra de Hotel NH', decision: 'hotel', destino: DESTINOS.presupuesto },
}

function decidir(s, id) {
  const config = DECISIONES[id]
  if (!config || !s.mensajes.some((m) => m.decision === config.decision)) return s
  const { etiqueta, decision, destino, ...accion } = config
  const mundo = reducir(s.mundo, { ...accion, por: POR })
  if (mundo === s.mundo) return s
  let n = mensaje({ ...s, mundo, undo: { mundo: s.mundo, actividad: s.actividad, etiqueta, id } }, 'usuario', etiqueta)
  let respuesta
  if (decision === 'ticket') {
    const d = mundo.documentos[TICKET]
    respuesta = `Registrado en ${etiquetaPartida(mundo, d.partida)}: ${eurCents(d.base)} de coste y ${eurCents(d.impuesto.importe)} de ${d.impuesto.tipo}. El escritorio ya refleja el cambio.\n\nSigue pendiente completar los datos fiscales del justificante.`
  } else if (id === 'hotel-aprobar') {
    respuesta = `Aprobación registrada. Quedan comprometidos ${eur(mundo.ordenes[HOTEL].importeAprobado)} para Hotel NH. La previsión final es ahora ${eur(totales(mundo).cef)}.\n\nNo se ha realizado ningún pago ni enviado ningún mensaje al proveedor.`
  } else {
    respuesta = 'Compra rechazada. El presupuesto y la previsión de caja se mantienen. No se ha enviado ningún mensaje al proveedor.'
  }
  n = mensaje(n, 'filmpilot', respuesta, { destino })
  return anotar(n, `${POR}: ${etiqueta.charAt(0).toLowerCase()}${etiqueta.slice(1)}.`, 'decision', destino)
}

export function reducirDemo(s, accion) {
  switch (accion?.tipo) {
    case 'preguntar': return preguntar(s, accion.texto)
    case 'ticket': return ticket(s)
    case 'decidir': return decidir(s, accion.id)
    case 'deshacer': {
      if (!s.undo) return s
      const { mundo, actividad, etiqueta } = s.undo
      const n = mensaje({ ...s, mundo, actividad, undo: null }, 'filmpilot', `He deshecho «${etiqueta}». El escritorio vuelve a mostrar las cifras anteriores a esa decisión.`, { destino: DESTINOS.resumen })
      return anotar(n, `Decisión deshecha: ${etiqueta.toLowerCase()}.`, 'deshacer', DESTINOS.resumen)
    }
    case 'reiniciar': return crearDemo()
    default: return s
  }
}
