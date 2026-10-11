// Sesión de conversación: parte de la mañana, mensajes, reproducción de los pasos
// de cada agente, novedades que llegan solas, deshacer y recorrido guiado.
//
// Es un reductor puro: el tiempo entra como acción ({ tipo: 'avanzar', ms }),
// así que se prueba en Node con un reloj falso.

import { crearMundo, PERSONAS } from './mundo.js'
import { responder, interpretar } from './orquestador.js'
import { reducirVarias } from './acciones.js'
import { RECORRIDO, HISTORIAS, EPILOGO, entradaDeHistoria } from './casos.js'
import { DURACIONES } from './agentes.js'
import { estadoDecision } from './calculos.js'
import { renderTexto } from './texto.js'

// Contrato EVENTOS: novedades del mundo. { id, retrasoMs, agente, titulo, automatico, historia }.
// Solo las automáticas (EV-01 y EV-02) llegan solas, en este orden, con la conversación
// parada (retrasoMs de inactividad) y solo si su historia aún no se ha visto. Las demás
// las piden los guiones (la tarjeta, el parte) y las pruebas.
export const EVENTOS = [
  { id: 'EV-01', retrasoMs: 16_000, agente: 'facturas', titulo: 'Ha entrado una factura de Grúas y Cámaras del Sur', automatico: true, historia: 'solo' },
  { id: 'EV-02', retrasoMs: 24_000, agente: 'excepciones', titulo: 'Producción ha enviado una solicitud de compra', automatico: true, historia: 'aprueba' },
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
  }
}

export function personaDe(s) {
  return PERSONAS[s.persona] ?? PERSONAS.marta
}

function nuevoId(s, pref) {
  s.seq += 1
  return `${pref}-${s.seq}`
}

function iniciar(s0, entrada) {
  const s = { ...s0, mensajes: [...s0.mensajes], snapshots: { ...s0.snapshots } }
  const hora = horaDe(s.reloj)
  const persona = personaDe(s)
  let ent = entrada

  if (entrada.tipo === 'texto') {
    s.mensajes.push({ id: nuevoId(s, 'u'), rol: 'usuario', texto: entrada.texto, hora })
  } else if (entrada.tipo === 'accion') {
    ent = { ...entrada, accion: { ...entrada.accion, por: persona.nombre } }
    s.mensajes.push({ id: nuevoId(s, 'd'), rol: 'decision', texto: entrada.etiqueta ?? 'Decisión', por: persona.nombre, rolPersona: persona.rol, hora })
  } else if (entrada.tipo === 'saludo') {
    // El parte de la mañana no lo pide nadie: lo traen los agentes al abrir.
    ent = { ...entrada, persona: s.persona }
  } else if (entrada.tipo === 'evento') {
    const ev = EVENTOS_POR_ID[entrada.eventoId]
    s.mensajes.push({ id: nuevoId(s, 's'), rol: 'novedad', eventoId: entrada.eventoId, agente: ev?.agente, titulo: ev?.titulo ?? 'Novedad', hora })
  }
  // { tipo: 'cierreRecorrido' }: el resumen final lo trae el Orquestador, sin mensaje de la persona.

  const r = responder(s.mundo, ent, s.contexto)
  const id = nuevoId(s, 'a')
  s.snapshots[id] = s.mundo
  s.contexto = r.contexto
  s.mensajes.push({
    id,
    rol: 'agentes',
    turno: r.turno,
    estadoPasos: r.turno.pasos.map(() => 'en_cola'),
    bloquesVisibles: 0,
    estado: 'en_curso',
    hora,
    origen: entrada.tipo,
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
    if ((msg.origen === 'accion' || msg.origen === 'evento') && acciones.some((a) => MUTAN_DESHACIBLE.has(a.tipo))) {
      s.ultimaMutacion = { mensajeId: msg.id }
    } else if (acciones.some((a) => !CONSERVADAS.has(a.tipo))) {
      // Cualquier otro cambio del mundo invalida el deshacer anterior.
      if (turno.pasos.some((p) => p.muta)) s.ultimaMutacion = null
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

/** ¿Ha pedido o decidido algo la persona? El parte de la mañana llega solo y no cuenta. */
export function conversacionIniciada(s) {
  return s.mensajes.some((m) => m.rol === 'agentes' && m.origen !== 'saludo')
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

/** La próxima novedad que llegaría sola: automática, aún por llegar y con su historia sin ver. */
export function proximaNovedad(s) {
  return EVENTOS.find((e) => e.automatico && s.mundo.entrantes.includes(e.id) && !s.casosVistos.includes(e.historia)) ?? null
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
  const ultimo = [...s.mensajes].reverse().find((m) => m.rol === 'agentes')
  if (!ultimo || ultimo.estado === 'en_curso') return []
  // Tras una acción propuesta/* el caso es null, pero el turno sigue en Itsasoa (turno.proyecto).
  const enEpilogo = ultimo.turno.caso === EPILOGO.id || !!ultimo.turno.proyecto
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
  const sig = s.tour ? null : siguienteHistoria(s)
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
      if (a.entrada.tipo === 'evento' && (!s.mundo.entrantes.includes(a.entrada.eventoId) || s.cola.some((e) => e.eventoId === a.entrada.eventoId) || s.mensajes.some((m) => m.rol === 'novedad' && m.eventoId === a.entrada.eventoId))) return s
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
      if (n.inactivo >= evento.retrasoMs) return iniciar(n, { tipo: 'evento', eventoId: evento.id })
      return n
    }

    case 'saltar':
      return s.activo ? progresar(s, Infinity) : s

    case 'detener': {
      if (!s.activo) return { ...s, cola: [] }
      const mensajes = s.mensajes.map((m) =>
        m.id === s.activo.id ? { ...m, estado: 'detenido', estadoPasos: m.estadoPasos.map((e) => (e === 'hecho' ? e : 'detenido')) } : m,
      )
      return { ...s, mensajes, activo: null, cola: [] }
    }

    case 'deshacer': {
      if (s.activo || s.ultimaMutacion?.mensajeId !== a.mensajeId) return s
      const idx = s.mensajes.findIndex((m) => m.id === a.mensajeId)
      const msg = s.mensajes[idx]
      const previo = s.snapshots[a.mensajeId]
      if (!msg || !previo) return s
      // Se deshace solo lo que se decidió o contabilizó en ese turno. Las novedades
      // recibidas y los borradores redactados después se conservan.
      const conservar = (m) => m.turno.pasos.flatMap((p) => p.acciones)
      const propias = conservar(msg).filter((x) => x.tipo === 'evento/recibir')
      const posteriores = s.mensajes
        .slice(idx + 1)
        .filter((m) => m.rol === 'agentes')
        .flatMap(conservar)
        .filter((x) => x.tipo === 'evento/recibir' || x.tipo === 'borrador/crear')
      const mundo = reducirVarias(previo, [...propias, ...posteriores])
      const persona = personaDe(s)
      const decision = [...s.mensajes.slice(0, idx)].reverse().find((m) => m.rol === 'decision' || m.rol === 'novedad')
      // Lo que un agente hizo solo se cita por su resumen («Conciliación contabilizó sola…»).
      const texto =
        decision?.rol === 'decision'
          ? `${persona.nombre} ha deshecho «${decision.texto}». Todo vuelve a como estaba.`
          : msg.turno.resumen
            ? `${persona.nombre} ha deshecho «${renderTexto(msg.turno.resumen)}». Todo vuelve a como estaba.`
            : `${persona.nombre} ha deshecho «${msg.turno.titulo}». Todo vuelve a como estaba.`
      const n = { ...s, mundo, ultimaMutacion: null, mensajes: s.mensajes.map((m) => (m.id === a.mensajeId ? { ...m, deshecho: true } : m)) }
      n.mensajes.push({ id: nuevoId(n, 'x'), rol: 'nota', texto, hora: horaDe(n.reloj) })
      return n
    }

    case 'persona': {
      if (!PERSONAS[a.persona] || a.persona === s.persona) return s
      const p = PERSONAS[a.persona]
      const n = { ...s, persona: a.persona, mensajes: [...s.mensajes] }
      n.mensajes.push({ id: nuevoId(n, 'x'), rol: 'nota', texto: `Ahora ves la demo como ${p.nombre} (${p.rol}).`, hora: horaDe(n.reloj) })
      return n
    }

    case 'pausarEventos':
      return { ...s, eventosPausados: !!a.valor, inactivo: 0 }

    case 'saludar':
      return saludar(s, { instantaneo: !!a.instantaneo })

    case 'tour/iniciar': {
      // El recorrido parte de la demo recién abierta (con su parte de la mañana ya
      // leído) para que cada paso cuente lo que pasa. Solo avisa si había algo que cerrar.
      const limpia = saludar(crearSesion({ persona: s.persona }), { instantaneo: true })
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

    case 'reiniciar':
      return crearSesion({ persona: s.persona })

    default:
      return s
  }
}
