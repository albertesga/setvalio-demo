// Sesión de conversación: parte de la mañana, mensajes, reproducción de los pasos
// de cada agente, novedades (por ahora ninguna llega sola), deshacer, historias en limpio y recorrido guiado.
//
// Es un reductor puro: el tiempo entra como acción ({ tipo: 'avanzar', ms }),
// así que se prueba en Node con un reloj falso.

import { crearMundo, PERSONAS } from './mundo.js'
import { responder, interpretar } from './orquestador.js'
import { reducirVarias, LLEGAN_CON_EV01 } from './acciones.js'
import { RECORRIDO, HISTORIAS, HISTORIAS_POR_ID, EPILOGO, entradaDeHistoria, CONVERSACIONES, CONVERSACIONES_POR_ID } from './casos.js'
import { DURACIONES, AGENTES } from './agentes.js'
import { estadoDecision } from './calculos.js'
import { renderTexto } from './texto.js'

// Contrato EVENTOS: novedades del mundo. { id, retrasoMs, agente, titulo, automatico, historia }.
// Por ahora la demo es reactiva: ninguna llega sola (automatico: false en todas) y cada una
// la trae su historia, una pregunta o un botón. Si alguna vuelve a ser automática, llega con
// la conversación parada (retrasoMs de inactividad) y solo si su historia aún no se ha visto.
export const EVENTOS = [
  { id: 'EV-01', retrasoMs: 16_000, agente: 'facturas', titulo: 'Han entrado tres facturas: por correo, formulario web y WhatsApp', automatico: false, historia: 'solo' },
  { id: 'EV-02', retrasoMs: 24_000, agente: 'excepciones', titulo: 'Producción ha enviado un pedido de hotel', automatico: false, historia: 'aprueba' },
  { id: 'EV-RIESGOS', retrasoMs: 8_000, agente: 'riesgos', titulo: 'Parte de riesgos de las próximas jornadas', automatico: false, historia: 'adelanta' },
  { id: 'EV-CITACION', retrasoMs: 12_000, agente: 'riesgos', titulo: 'La orden del día de mañana sigue sin publicar', automatico: false, historia: 'adelanta' },
  { id: 'EV-LLUVIA', retrasoMs: 16_000, agente: 'riesgos', titulo: 'Sube la probabilidad de lluvia de mañana', automatico: false, historia: 'adelanta' },
  { id: 'EV-03', retrasoMs: 30_000, agente: 'cumplimiento', titulo: 'Un documento del dossier vence esta semana', automatico: false, historia: 'equipo' },
]

const EVENTOS_POR_ID = Object.fromEntries(EVENTOS.map((e) => [e.id, e]))
const MUTAN_DESHACIBLE = new Set(['documento/contabilizar', 'documento/aplazar', 'documento/revision', 'orden/aprobar', 'orden/rechazar', 'orden/escalar', 'partida/ajustarCef', 'informe/aprobar', 'borrador/marcarListo', 'borrador/descartar', 'riesgo/mitigar', 'riesgo/reservar', 'riesgo/aceptar', 'propuesta/noLlamar', 'propuesta/elegir', 'propuesta/anadirLinea'])
// Acciones que deshacer siempre conserva: no invalidan el deshacer anterior.
const CONSERVADAS = new Set(['evento/recibir', 'borrador/crear'])

/** Hora simulada: la sesión empieza a las 10:30 del día del corte. */
export function horaDe(relojMs) {
  const min = 10 * 60 + 30 + Math.floor(relojMs / 60_000)
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

export function crearSesion({ persona = 'marta' } = {}) {
  return {
    mundo: crearMundo(),
    contexto: {},
    mensajes: [],
    seq: 0,
    activo: null,
    cola: [],
    reloj: 0,
    inactivo: 0,
    eventosPausados: false,
    persona,
    casosVistos: [],
    tour: null,
    snapshots: {},
    ultimaMutacion: null,
    // Conversaciones (como en un chat): metadatos por id; los mensajes van en `mensajes`
    // con su `conv`, y cada conversación tiene su contexto en `contextos`.
    conversaciones: {},
    actual: null,
    contextos: {},
  }
}

export function personaDe(s) {
  return PERSONAS[s.persona] ?? PERSONAS.marta
}

function nuevoId(s, pref) {
  s.seq += 1
  return `${pref}-${s.seq}`
}

/** Título de una conversación nueva a partir de la primera pregunta: corto y cortado por palabra. */
function tituloDe(texto, max = 34) {
  const limpio = String(texto ?? '').replace(/^[¿¡\s]+|[?!.\s]+$/g, '').trim()
  if (limpio.length <= max) return limpio.charAt(0).toUpperCase() + limpio.slice(1)
  const corte = limpio.slice(0, max).replace(/\s+\S*$/, '')
  return `${corte.charAt(0).toUpperCase()}${corte.slice(1)}…`
}

function iniciar(s0, entrada0) {
  const s = { ...s0, mensajes: [...s0.mensajes], snapshots: { ...s0.snapshots } }
  const persona = personaDe(s)
  // `sola`: la novedad ha llegado sin que nadie la pida (no la ha traído una historia ni una pregunta).
  // `conv`: la conversación a la que va (por defecto, la abierta). `apertura`: lo que el agente
  // ya ha escrito al abrir la demo (sin burbuja de la persona ni línea de novedad, con su hora).
  const { sola = false, conv: convEntrada, apertura = false, hora: horaApertura, deshacible = false, ...entrada } = entrada0
  const conv = convEntrada ?? s.actual ?? null
  const hora = horaApertura ?? horaDe(s.reloj)
  let ent = entrada

  if (entrada.tipo === 'texto' && !apertura) {
    s.mensajes.push({ id: nuevoId(s, 'u'), rol: 'usuario', texto: entrada.texto, hora, conv })
    // La primera pregunta de una conversación nueva le da título provisional.
    const cv = conv && s.conversaciones?.[conv]
    if (cv?.nueva && !cv.titulo) s.conversaciones = { ...s.conversaciones, [conv]: { ...cv, titulo: tituloDe(entrada.texto) } }
  } else if (entrada.tipo === 'accion') {
    ent = { ...entrada, accion: { ...entrada.accion, por: persona.nombre } }
    s.mensajes.push({ id: nuevoId(s, 'd'), rol: 'decision', texto: entrada.etiqueta ?? 'Decisión', por: persona.nombre, rolPersona: persona.rol, hora, conv })
  } else if (entrada.tipo === 'saludo') {
    // El parte de la mañana no lo pide nadie: lo traen los agentes al abrir.
    ent = { ...entrada, persona: s.persona }
  } else if (entrada.tipo === 'evento' && !apertura) {
    const ev = EVENTOS_POR_ID[entrada.eventoId]
    s.mensajes.push({ id: nuevoId(s, 's'), rol: 'novedad', eventoId: entrada.eventoId, agente: ev?.agente, titulo: ev?.titulo ?? 'Novedad', llegoSola: sola, hora, conv })
  }
  // { tipo: 'cierreRecorrido' }: el resumen final lo trae el Orquestador, sin mensaje de la persona.

  // Cada conversación recuerda su propio contexto («apruébala» habla de lo de esa conversación).
  const ctx = conv ? (s.contextos?.[conv] ?? {}) : s.contexto
  const r = responder(s.mundo, ent, ctx)
  const id = nuevoId(s, 'a')
  s.snapshots[id] = s.mundo
  if (conv) s.contextos = { ...s.contextos, [conv]: r.contexto }
  if (!conv || conv === s.actual) s.contexto = r.contexto
  s.mensajes.push({
    id,
    rol: 'agentes',
    turno: r.turno,
    estadoPasos: r.turno.pasos.map(() => 'en_cola'),
    bloquesVisibles: 0,
    estado: 'en_curso',
    hora,
    conv,
    apertura,
    deshacible,
    // Lo que se decidió (la burbuja), para la nota de deshacer.
    decisionTexto: entrada.tipo === 'accion' ? (entrada.etiqueta ?? 'Decisión') : undefined,
    origen: entrada.tipo,
    eventoId: entrada.tipo === 'evento' ? entrada.eventoId : undefined,
    // Solo lo que llegó solo se pliega en una línea; lo que pide una historia se enseña entero.
    llegoSola: sola,
    // Si este turno estrena su historia y se detiene, la historia vuelve a «sin ver».
    casoNuevo: !!r.turno.caso && !s.casosVistos.includes(r.turno.caso),
  })
  if (r.turno.caso && !s.casosVistos.includes(r.turno.caso)) s.casosVistos = [...s.casosVistos, r.turno.caso]
  s.activo = { id, transcurrido: 0 }
  s.inactivo = 0
  return s
}

function progresar(s0, ms) {
  if (!s0.activo) return s0
  const s = { ...s0, mensajes: [...s0.mensajes] }
  const idx = s.mensajes.findIndex((m) => m.id === s.activo.id)
  if (idx < 0) return { ...s, activo: null }
  const msg = { ...s.mensajes[idx], estadoPasos: [...s.mensajes[idx].estadoPasos] }
  const turno = msg.turno
  const totalBloques = turno.bloques.length
  const fin = turno.duracionMs + totalBloques * DURACIONES.bloque
  const tr = Math.min(s.activo.transcurrido + ms, fin)

  turno.pasos.forEach((p, i) => {
    if (msg.estadoPasos[i] === 'hecho') return
    if (tr >= p.finMs) {
      s.mundo = reducirVarias(s.mundo, p.acciones)
      msg.estadoPasos[i] = 'hecho'
    } else if (tr >= p.inicioMs) {
      msg.estadoPasos[i] = 'en_curso'
    }
  })

  if (tr >= turno.duracionMs) {
    msg.bloquesVisibles = Math.min(totalBloques, Math.floor((tr - turno.duracionMs) / DURACIONES.bloque) + 1)
  }
  s.mensajes[idx] = msg

  if (tr >= fin && msg.estadoPasos.every((e) => e === 'hecho')) {
    msg.bloquesVisibles = totalBloques
    msg.estado = 'hecho'
    s.activo = null
    const acciones = turno.pasos.flatMap((p) => p.acciones)
    if (msg.apertura) {
      // Lo que ya estaba escrito al abrir no toca el deshacer, salvo lo que hizo un agente solo.
      if (msg.deshacible && acciones.some((a) => MUTAN_DESHACIBLE.has(a.tipo))) s.ultimaMutacion = { mensajeId: msg.id }
    } else if ((msg.origen === 'accion' || msg.origen === 'evento') && acciones.some((a) => MUTAN_DESHACIBLE.has(a.tipo))) {
      s.ultimaMutacion = { mensajeId: msg.id }
    } else if (acciones.some((a) => !CONSERVADAS.has(a.tipo))) {
      // Cualquier otro cambio del mundo invalida el deshacer anterior.
      if (turno.pasos.some((p) => p.muta)) s.ultimaMutacion = null
    }
    // Una conversación nueva toma la etiqueta y el título de su primera respuesta.
    const cv = msg.conv && s.conversaciones?.[msg.conv]
    if (cv?.nueva && !cv.etiquetada) {
      const agente = turno.agentes?.find((a) => a !== 'orquestador') ?? 'orquestador'
      const titulo = typeof turno.titulo === 'string' && turno.titulo.length <= 34 && !['Sin entender', 'No te he entendido'].includes(turno.titulo) ? turno.titulo : cv.titulo
      s.conversaciones = { ...s.conversaciones, [msg.conv]: { ...cv, agente, etiqueta: AGENTES[agente]?.etiqueta ?? 'Equipo', titulo, etiquetada: true } }
    }
    if (s.cola.length) {
      const [sig, ...resto] = s.cola
      return iniciar({ ...s, cola: resto }, sig)
    }
    return s
  }
  s.activo = { ...s.activo, transcurrido: tr }
  return s
}

function puedeAvanzarTour(s) {
  if (!s.tour || s.activo || s.cola.length) return false
  const paso = RECORRIDO[s.tour.paso]
  if (!paso?.espera) return true
  const e = estadoDecision(s.mundo, paso.espera).estado
  return e !== 'pendiente' && e !== 'por_llegar'
}

export function estadoTour(s) {
  if (!s.tour) return null
  const paso = RECORRIDO[s.tour.paso]
  return { indice: s.tour.paso, total: RECORRIDO.length, paso, puedeAvanzar: puedeAvanzarTour(s), ultimo: s.tour.paso === RECORRIDO.length - 1 }
}

/**
 * Un paso del recorrido. Contrato del mensaje rol 'guia': { indice, total, titulo, arco,
 * historia }; la nota vive en la barra del recorrido (estadoTour(s).paso.nota).
 * Un paso con entrada null (el parte, que ya está en pantalla) no encola nada.
 */
function pasoTour(s0, indice) {
  const paso = RECORRIDO[indice]
  const s = { ...s0, tour: { paso: indice }, mensajes: [...s0.mensajes] }
  s.mensajes.push({
    id: nuevoId(s, 'g'),
    rol: 'guia',
    indice,
    total: RECORRIDO.length,
    titulo: paso.titulo,
    arco: paso.arco,
    historia: paso.historia,
    hora: horaDe(s.reloj),
  })
  if (!paso.entrada) return s
  // Si la novedad ya llegó, el paso pregunta con el texto de su historia.
  const h = HISTORIAS.find((x) => x.id === paso.historia)
  return encolar(s, entradaDeHistoria({ ...h, entrada: paso.entrada }, s.mundo))
}

function encolar(s, entrada) {
  if (s.activo) return { ...s, cola: [...s.cola, entrada] }
  return iniciar(s, entrada)
}

/** ¿Ha pedido o decidido algo la persona? El parte y lo que ya estaba escrito al abrir no cuentan. */
export function conversacionIniciada(s) {
  return s.mensajes.some((m) => m.rol === 'agentes' && m.origen !== 'saludo' && !m.apertura)
}

/** Termina al momento lo que esté en marcha y lo que espera en cola (al cambiar de conversación). */
function terminarTodo(s0) {
  let s = s0
  for (let i = 0; i < 50 && (s.activo || s.cola.length); i++) {
    if (s.activo) s = progresar(s, Infinity)
    else {
      const [sig, ...resto] = s.cola
      s = iniciar({ ...s, cola: resto }, sig)
    }
  }
  return s
}

const seqDe = (id) => Number(String(id).split('-')[1]) || 0

/** Mensajes de una conversación (todos si no hay conversaciones). */
export function mensajesDe(s, conv = s.actual) {
  return conv ? s.mensajes.filter((m) => m.conv === conv) : s.mensajes
}

/**
 * Lista de conversaciones para la pantalla, de la más reciente a la más antigua.
 * [{ id, titulo, etiqueta, agente, capacidad, ultimo (mensaje), hora, noLeida, nueva }]
 */
export function listaConversaciones(s) {
  const ultimos = {}
  for (const m of s.mensajes) if (m.conv) ultimos[m.conv] = m
  return Object.values(s.conversaciones)
    .map((c) => {
      const ultimo = ultimos[c.id] ?? null
      const seq = ultimo ? seqDe(ultimo.id) : seqDe(c.creada ?? '')
      return { ...c, capacidad: CONVERSACIONES_POR_ID[c.id]?.capacidad, ultimo, seq, hora: ultimo?.hora ?? null, noLeida: c.id !== s.actual && seq > (c.leidaHasta ?? 0) }
    })
    .sort((a, b) => b.seq - a.seq)
}

// A qué conversación de la demo va lo que se pide desde un botón (la intención y su entidad).
const CONV_RIESGO = { 'RG-1': 'lluvia', 'RG-5': 'horas', 'RG-7': 'grua' }
const CONV_EVENTO = { 'EV-01': 'facturas', 'EV-02': 'hotel', 'EV-LLUVIA': 'lluvia', 'EV-03': 'dossier' }
const INTENCIONES_ITSASOA = new Set(['presupuesto_nuevo', 'anadir_coste', 'optimizar_proveedores'])

function convDe(det, entrada) {
  if (entrada.tipo === 'evento') return CONV_EVENTO[entrada.eventoId] ?? null
  const e = det.entidades ?? {}
  switch (det.intencion) {
    case 'saludo':
      return 'parte'
    case 'riesgos':
      return CONV_RIESGO[e.riesgo] ?? null
    case 'aprobar_oc':
      return e.oc === 'OC-104' ? 'hotel' : null
    case 'cumplimiento':
      return 'dossier'
    case 'informe_semanal':
      return 'informe'
    case 'factura_nueva':
    case 'revisar_gasto':
      return !e.documento || LLEGAN_CON_EV01.includes(e.documento) ? 'facturas' : null
    default:
      return INTENCIONES_ITSASOA.has(det.intencion) ? 'itsasoa' : null
  }
}

const mismaPeticion = (a, b) => a.intencion === b.intencion && ['riesgo', 'oc', 'dossierPaso'].every((k) => (a.entidades?.[k] ?? null) === (b.entidades?.[k] ?? null))

/**
 * Contrato: a qué conversación de la demo va una entrada pedida desde un botón o un enlace,
 * o null si se responde en la abierta. { conv, esApertura }: con `esApertura`, la conversación
 * ya enseña eso (su primer mensaje) y basta con abrirla.
 */
export function conversacionPara(s, entrada) {
  if (!entrada) return null
  const det = interpretar(s.mundo, entrada, {})
  const conv = convDe(det, entrada)
  if (!conv || !s.conversaciones[conv]) return null
  const ap = CONVERSACIONES_POR_ID[conv]?.apertura
  const e = det.entidades ?? {}
  // Lo que ya enseña su primer mensaje: la misma pregunta, la novedad que la abrió, la OC-104
  // en la del hotel o lo que ha entrado hoy en la de facturas.
  const esApertura =
    !!ap &&
    ((ap.tipo === 'evento' && entrada.tipo === 'evento' && ap.eventoId === entrada.eventoId) ||
      (ap.tipo === 'saludo' && det.intencion === 'saludo') ||
      (ap.tipo === 'texto' && entrada.tipo === 'texto' && mismaPeticion(interpretar(s.mundo, ap, {}), det)) ||
      (conv === 'hotel' && det.intencion === 'aprobar_oc' && e.oc === 'OC-104') ||
      (conv === 'facturas' && det.intencion === 'factura_nueva' && !e.documento))
  return { conv, esApertura }
}

/** Contrato: ids de HISTORIAS vistas, en el orden del arco (el epílogo no cuenta: ver epilogoVisto). */
export function vistosDe(s) {
  return HISTORIAS.filter((h) => s.casosVistos.includes(h.id)).map((h) => h.id)
}

export function epilogoVisto(s) {
  return s.casosVistos.includes(EPILOGO.id)
}

/** Contrato: la primera historia del arco sin ver, o null. Nunca el epílogo. */
export function siguienteHistoria(s) {
  return HISTORIAS.find((h) => !s.casosVistos.includes(h.id)) ?? null
}

/** La próxima novedad que llegaría sola: automática y aún por llegar (hoy ninguna lo es). */
export function proximaNovedad(s) {
  return EVENTOS.find((e) => e.automatico && s.mundo.entrantes.includes(e.id)) ?? null
}

// Entidades que distinguen dos sugerencias de la misma intención («¿Va a llover…?» y «¿Tiene billete…?»).
const CLAVES_SUGERENCIA = ['oc', 'documento', 'riesgo', 'jornada', 'capitulo', 'partida', 'territorio']
const INTENCIONES_EPILOGO = new Set(EPILOGO.intenciones)

// Dos sugerencias se repiten si piden lo mismo: misma intención y, si las dos nombran una
// entidad, la misma. Una genérica («¿Qué órdenes tengo pendientes?») repite a una concreta (OC-104).
function repiten(a, b) {
  if (a.intencion !== b.intencion) return false
  if (!a.entidad || !b.entidad) return true
  return a.entidad === b.entidad
}

/**
 * Contrato: sugerencias del pie tras el último turno, tres como mucho.
 * [{ etiqueta, texto, entrada?, historia? }]: si trae `entrada`, la pantalla la envía tal
 * cual (puede ser una novedad); si no, envía `texto`.
 * Primero la siguiente historia sin ver («Siguiente: Te lo propone»; no durante el
 * recorrido, que ya tiene su barra); después, las del turno. Sin dos que pidan lo mismo
 * (ver repiten) y nunca a otro proyecto desde «La última función».
 */
export function sugerenciasDe(s) {
  const ultimo = [...mensajesDe(s)].reverse().find((m) => m.rol === 'agentes')
  if (!ultimo || ultimo.estado === 'en_curso') return []
  // Tras una acción propuesta/* el turno sigue en Itsasoa (turno.proyecto).
  const enEpilogo = ultimo.turno.caso === EPILOGO.id || INTENCIONES_ITSASOA.has(ultimo.turno.intencion) || !!ultimo.turno.proyecto
  const clave = (texto) => {
    const det = interpretar(s.mundo, { tipo: 'texto', texto }, s.contexto)
    return { intencion: det.intencion, entidad: CLAVES_SUGERENCIA.map((k) => det.entidades?.[k] ?? '').join('|').replace(/^\|+$/, '') }
  }
  const out = []
  const vistas = []
  const anadir = (sg) => {
    const k = clave(sg.texto)
    if (vistas.some((x) => repiten(x, k))) return
    if (!enEpilogo && INTENCIONES_EPILOGO.has(k.intencion)) return
    vistas.push(k)
    out.push(sg)
  }
  // Con conversaciones, la lista ya es el camino: sin «Siguiente».
  const sig = s.tour || s.actual ? null : siguienteHistoria(s)
  if (sig) anadir({ etiqueta: `Siguiente: ${sig.arco}`, texto: sig.prompt, entrada: entradaDeHistoria(sig, s.mundo), historia: sig.id })
  for (const sg of ultimo.turno.sugerencias ?? []) anadir(sg)
  return out.slice(0, 3)
}

/** El parte de la mañana abre la conversación una sola vez; instantáneo, sin reproducir los pasos. */
function saludar(s, { instantaneo = false } = {}) {
  if (s.mensajes.length || s.activo || s.tour) return s
  const n = iniciar(s, { tipo: 'saludo' })
  return instantaneo ? progresar(n, Infinity) : n
}

export function reducirSesion(s, a) {
  switch (a.tipo) {
    case 'enviar':
      if (a.entrada.tipo === 'texto' && !String(a.entrada.texto ?? '').trim()) return s
      // Una novedad solo llega una vez: ni si ya llegó, ni si está en la cola, ni si se está
      // reproduciendo (la recibe un paso del turno, así que sigue en mundo.entrantes un rato).
      // Una novedad detenida antes de recibirse puede volver a pedirse.
      if (a.entrada.tipo === 'evento' && (!s.mundo.entrantes.includes(a.entrada.eventoId) || s.cola.some((e) => e.eventoId === a.entrada.eventoId) || s.mensajes.some((m) => m.rol === 'novedad' && m.eventoId === a.entrada.eventoId && !m.detenida))) return s
      // Una misma petición no se encola dos veces.
      if (s.cola.some((e) => JSON.stringify(e) === JSON.stringify(a.entrada))) return s
      return encolar({ ...s, inactivo: 0 }, a.entrada)

    case 'actividad':
      return s.inactivo ? { ...s, inactivo: 0 } : s

    case 'editarBorrador': {
      const mundo = reducirVarias(s.mundo, [{ tipo: 'borrador/editar', id: a.id, asunto: a.asunto, cuerpo: a.cuerpo }])
      return mundo === s.mundo ? s : { ...s, mundo }
    }

    case 'avanzar': {
      const ms = Math.max(0, a.ms ?? 0)
      let n = { ...s, reloj: s.reloj + (Number.isFinite(ms) ? ms : 0) }
      if (n.activo) return progresar(n, ms)
      if (n.cola.length) {
        const [sig, ...resto] = n.cola
        return iniciar({ ...n, cola: resto }, sig)
      }
      // Novedades: solo las automáticas con su historia sin ver, con la conversación
      // empezada (el parte de la mañana no cuenta), sin recorrido y sin pausa.
      const evento = proximaNovedad(n)
      if (!evento || n.tour || n.eventosPausados || !conversacionIniciada(n)) return n
      n = { ...n, inactivo: n.inactivo + ms }
      if (n.inactivo >= evento.retrasoMs) return iniciar(n, { tipo: 'evento', eventoId: evento.id, sola: true })
      return n
    }

    case 'saltar':
      return s.activo ? progresar(s, Infinity) : s

    case 'detener': {
      if (!s.activo) return { ...s, cola: [] }
      const actual = s.mensajes.find((m) => m.id === s.activo.id)
      // Una novedad que no llegó a recibirse se puede volver a pedir.
      const sinRecibir = actual?.eventoId && s.mundo.entrantes.includes(actual.eventoId)
      const mensajes = s.mensajes.map((m) => {
        if (m.id === s.activo.id) return { ...m, estado: 'detenido', estadoPasos: m.estadoPasos.map((e) => (e === 'hecho' ? e : 'detenido')) }
        if (sinRecibir && m.rol === 'novedad' && m.eventoId === actual.eventoId) return { ...m, detenida: true }
        return m
      })
      const n = { ...s, mensajes, activo: null, cola: [] }
      // La historia que estrenaba este turno no se ha llegado a ver.
      if (actual?.casoNuevo) n.casosVistos = s.casosVistos.filter((c) => c !== actual.turno.caso)
      // Si lo detenido ya cambió el mundo, deshacer lo anterior también lo revertiría: se invalida.
      const hechas = actual ? actual.turno.pasos.flatMap((p, i) => (actual.estadoPasos[i] === 'hecho' ? p.acciones : [])) : []
      if (hechas.some((x) => !CONSERVADAS.has(x.tipo))) n.ultimaMutacion = null
      return n
    }

    case 'deshacer': {
      if (s.activo || s.ultimaMutacion?.mensajeId !== a.mensajeId) return s
      const idx = s.mensajes.findIndex((m) => m.id === a.mensajeId)
      const msg = s.mensajes[idx]
      const previo = s.snapshots[a.mensajeId]
      if (!msg || !previo) return s
      // Se deshace solo lo que se decidió o contabilizó en ese turno. Las novedades
      // recibidas y los borradores redactados después se conservan.
      // Solo cuentan los pasos que llegaron a hacerse (un turno detenido no aplicó los demás).
      const conservar = (m) => m.turno.pasos.flatMap((p, i) => (m.estadoPasos[i] === 'hecho' ? p.acciones : []))
      const propias = conservar(msg).filter((x) => x.tipo === 'evento/recibir')
      // De lo posterior (en cualquier conversación) se conserva lo que llega y se redacta; de lo
      // que ya estaba escrito al abrir, todo lo que hizo (también el informe, por ejemplo).
      const posteriores = s.mensajes
        .slice(idx + 1)
        .filter((m) => m.rol === 'agentes')
        .flatMap((m) => conservar(m).filter((x) => m.apertura || x.tipo === 'evento/recibir' || x.tipo === 'borrador/crear'))
      let mundo = reducirVarias(previo, [...propias, ...posteriores])
      // Las ediciones de un borrador que sigue existiendo no se pierden.
      for (const [bid, b] of Object.entries(s.mundo.borradores ?? {})) {
        if (mundo.borradores?.[bid] && (b.textoAsunto != null || b.textoCuerpo != null)) mundo = { ...mundo, borradores: { ...mundo.borradores, [bid]: { ...mundo.borradores[bid], textoAsunto: b.textoAsunto, textoCuerpo: b.textoCuerpo } } }
      }
      // Lo que Conciliación contabilizó sola y se deshace queda en la bandeja para que lo revises tú.
      const solas = msg.origen === 'evento' || msg.deshacible ? conservar(msg).filter((x) => x.tipo === 'documento/contabilizar' && x.por === 'Conciliación').map((x) => x.docId) : []
      for (const id of solas) {
        if (mundo.documentos[id]?.estado === 'en_bandeja') mundo = { ...mundo, documentos: { ...mundo.documentos, [id]: { ...mundo.documentos[id], revisionManual: true } } }
      }
      const persona = personaDe(s)
      // Lo que se decidió se cita por su burbuja; lo que un agente hizo solo, por su resumen.
      const texto =
        msg.decisionTexto
          ? `${persona.nombre} ha deshecho «${msg.decisionTexto}». Todo vuelve a como estaba.`
          : msg.turno.resumen
            ? `${persona.nombre} ha deshecho «${renderTexto(msg.turno.resumen)}».${solas.length === 1 ? ` ${solas[0]} queda en la bandeja para que la revises tú.` : solas.length ? ` ${solas.slice(0, -1).join(', ')} y ${solas.at(-1)} quedan en la bandeja para que las revises tú.` : ' Todo vuelve a como estaba.'}`
            : `${persona.nombre} ha deshecho «${msg.turno.titulo}». Todo vuelve a como estaba.`
      // Qué decisiones deshace (para «Volver a decidir»): las entradas de historial que añadió el turno.
      const deshechoRefs = reducirVarias(previo, conservar(msg)).historial.slice(previo.historial.length).map((h) => h.ref).filter(Boolean)
      const n = { ...s, mundo, ultimaMutacion: null, mensajes: s.mensajes.map((m) => (m.id === a.mensajeId ? { ...m, deshecho: true, deshechoRefs } : m)) }
      n.mensajes.push({ id: nuevoId(n, 'x'), rol: 'nota', texto, hora: horaDe(n.reloj), conv: msg.conv ?? null })
      return n
    }

    case 'persona': {
      if (!PERSONAS[a.persona] || a.persona === s.persona) return s
      const p = PERSONAS[a.persona]
      const n = { ...s, persona: a.persona, mensajes: [...s.mensajes] }
      n.mensajes.push({ id: nuevoId(n, 'x'), rol: 'nota', texto: `Ahora ves la demo como ${p.nombre} (${p.rol}).`, hora: horaDe(n.reloj), conv: s.actual })
      return n
    }

    case 'pausarEventos':
      return { ...s, eventosPausados: !!a.valor, inactivo: 0 }

    case 'saludar':
      return saludar(s, { instantaneo: !!a.instantaneo })

    case 'tour/iniciar': {
      // El recorrido parte de la demo recién abierta (con su parte de la mañana ya
      // leído) para que cada paso cuente lo que pasa. Solo avisa si había algo que cerrar.
      // seq sigue contando: ningún mensaje nuevo hereda la clave (y lo plegado) de uno anterior.
      const limpia = saludar({ ...crearSesion({ persona: s.persona }), seq: s.seq }, { instantaneo: true })
      if (conversacionIniciada(s)) limpia.mensajes.push({ id: nuevoId(limpia, 'x'), rol: 'nota', texto: 'El recorrido empieza con la demo recién abierta: se han cerrado la conversación y las decisiones anteriores.', hora: horaDe(0) })
      return pasoTour(limpia, 0)
    }

    case 'tour/siguiente': {
      if (!puedeAvanzarTour(s)) return s
      const sig = s.tour.paso + 1
      if (sig >= RECORRIDO.length) return reducirSesion(s, { tipo: 'tour/salir', completo: true })
      return pasoTour(s, sig)
    }

    case 'tour/salir': {
      if (!s.tour) return s
      const n = { ...s, tour: null, mensajes: [...s.mensajes], inactivo: 0 }
      // Al terminar, el Orquestador resume lo visto (contrato: entrada { tipo: 'cierreRecorrido' }).
      if (a.completo) return encolar(n, { tipo: 'cierreRecorrido' })
      n.mensajes.push({ id: nuevoId(n, 'x'), rol: 'nota', texto: 'Has salido del recorrido guiado.', hora: horaDe(n.reloj) })
      return n
    }

    case 'historia/abrir': {
      // Una historia se ve sola: la conversación anterior se cierra (el mundo y lo decidido
      // se quedan) y arriba queda la historia, lo que se pide y la respuesta.
      const h = HISTORIAS_POR_ID[a.historia]
      if (!h || s.activo) return s
      const n = { ...s, mensajes: [], cola: [], snapshots: {}, ultimaMutacion: null, contexto: {}, tour: null, inactivo: 0 }
      const indice = HISTORIAS.findIndex((x) => x.id === h.id)
      n.mensajes.push({
        id: nuevoId(n, 'h'),
        rol: 'historia',
        historia: h.id,
        arco: h.arco,
        titulo: h.titulo,
        unaLinea: h.unaLinea,
        capacidad: h.capacidad,
        indice: indice >= 0 ? indice : null,
        total: HISTORIAS.length,
        hora: horaDe(n.reloj),
      })
      return encolar(n, entradaDeHistoria(h, n.mundo))
    }

    case 'conversaciones/iniciar': {
      // Lo que los agentes ya han escrito al abrir la demo, conversación a conversación y en
      // orden de hora. Idempotente: si ya están, no hace nada.
      if (Object.keys(s.conversaciones).length) return s
      let n = terminarTodo({ ...s, conversaciones: {}, contextos: { ...s.contextos } })
      for (const c of CONVERSACIONES) {
        n = { ...n, conversaciones: { ...n.conversaciones, [c.id]: { id: c.id, titulo: c.titulo, etiqueta: c.etiqueta, agente: c.agente, leidaHasta: 0 } } }
        n = progresar(iniciar(n, { ...c.apertura, conv: c.id, apertura: true, hora: c.hora, deshacible: !!c.deshacible }), Infinity)
      }
      const actual = a.actual && n.conversaciones[a.actual] ? a.actual : 'parte'
      return { ...n, actual, contexto: n.contextos[actual] ?? {}, conversaciones: { ...n.conversaciones, [actual]: { ...n.conversaciones[actual], leidaHasta: n.seq } }, inactivo: 0 }
    }

    case 'conversacion/abrir': {
      if (!s.conversaciones[a.id]) return s
      if (a.id === s.actual && !s.activo && !s.cola.length) return s
      const n = terminarTodo(s)
      const convs = { ...n.conversaciones }
      const prev = n.actual
      // La que dejas queda leída; una nueva que se quedó vacía desaparece.
      if (prev && prev !== a.id && convs[prev]) {
        if (convs[prev].nueva && !n.mensajes.some((m) => m.conv === prev)) delete convs[prev]
        else convs[prev] = { ...convs[prev], leidaHasta: n.seq }
      }
      convs[a.id] = { ...convs[a.id], leidaHasta: n.seq }
      return { ...n, actual: a.id, contexto: n.contextos[a.id] ?? {}, conversaciones: convs, inactivo: 0 }
    }

    case 'conversacion/nueva': {
      const n = terminarTodo(s)
      const convs = { ...n.conversaciones }
      const prev = n.actual
      // Ya hay una nueva vacía abierta: se usa esa.
      if (prev && convs[prev]?.nueva && !n.mensajes.some((m) => m.conv === prev)) return n === s ? s : n
      if (prev && convs[prev]) convs[prev] = { ...convs[prev], leidaHasta: n.seq }
      const m = { ...n, conversaciones: convs }
      const id = nuevoId(m, 'c')
      m.conversaciones = { ...m.conversaciones, [id]: { id, titulo: null, etiqueta: 'Equipo', agente: 'orquestador', leidaHasta: m.seq, nueva: true, creada: id } }
      return { ...m, actual: id, contexto: {}, contextos: { ...m.contextos, [id]: {} }, inactivo: 0 }
    }

    case 'reiniciar':
      return { ...crearSesion({ persona: s.persona }), seq: s.seq }

    default:
      return s
  }
}
