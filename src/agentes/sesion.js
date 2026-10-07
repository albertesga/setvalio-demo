// Sesión de conversación: mensajes, reproducción de los pasos de cada agente,
// novedades que llegan solas, deshacer y recorrido guiado.
//
// Es un reductor puro: el tiempo entra como acción ({ tipo: 'avanzar', ms }),
// así que se prueba en Node con un reloj falso.

import { crearMundo, PERSONAS } from './mundo.js'
import { responder } from './orquestador.js'
import { reducirVarias } from './acciones.js'
import { RECORRIDO } from './casos.js'
import { DURACIONES } from './agentes.js'
import { estadoDecision } from './calculos.js'
import { t, v } from './texto.js'

// Llegan en este orden y solo cuando la conversación está parada (retrasoMs de inactividad).
export const EVENTOS = [
  { id: 'EV-RIESGOS', retrasoMs: 8_000, agente: 'riesgos', titulo: 'Parte de riesgos de las próximas jornadas' },
  { id: 'EV-01', retrasoMs: 16_000, agente: 'facturas', titulo: 'Ha entrado una factura de Grúas y Cámaras del Sur' },
  { id: 'EV-CITACION', retrasoMs: 12_000, agente: 'riesgos', titulo: 'La orden del día de mañana sigue sin publicar' },
  { id: 'EV-02', retrasoMs: 24_000, agente: 'excepciones', titulo: 'Producción ha enviado una solicitud de compra' },
  { id: 'EV-LLUVIA', retrasoMs: 16_000, agente: 'riesgos', titulo: 'Sube la probabilidad de lluvia del miércoles' },
  { id: 'EV-03', retrasoMs: 30_000, agente: 'cumplimiento', titulo: 'Un documento del dossier vence esta semana' },
]

const EVENTOS_POR_ID = Object.fromEntries(EVENTOS.map((e) => [e.id, e]))
const MUTAN_DESHACIBLE = new Set(['documento/contabilizar', 'documento/aplazar', 'documento/revision', 'orden/aprobar', 'orden/rechazar', 'orden/escalar', 'partida/ajustarCef', 'informe/aprobar', 'borrador/marcarListo', 'borrador/descartar', 'riesgo/mitigar', 'riesgo/reservar', 'riesgo/aceptar'])
// Acciones que deshacer siempre conserva: no invalidan el deshacer anterior.
const CONSERVADAS = new Set(['evento/recibir', 'borrador/crear'])

/** Hora simulada: la sesión empieza a las 10:30 del día del corte. */
export function horaDe(relojMs) {
  const min = 10 * 60 + 30 + Math.floor(relojMs / 60_000)
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function actividadInicial(mundo) {
  return Object.values(mundo.documentos)
    .filter((d) => d.estado === 'contabilizada')
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .map((d) => ({
      id: `prev-${d.id}`,
      previa: true,
      fecha: d.fecha,
      agente: 'conciliacion',
      autonomia: 'ejecuta',
      texto: t('Contabilizó {id} de {prov}, casada con {oc}', { id: v(d.id, 'id'), prov: v(d.proveedor), oc: v(d.oc, 'id') }),
    }))
}

export function crearSesion({ persona = 'marta' } = {}) {
  const mundo = crearMundo()
  return {
    mundo,
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
    actividad: actividadInicial(mundo),
    novedades: 0,
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
  const s = { ...s0, mensajes: [...s0.mensajes], actividad: [...s0.actividad], snapshots: { ...s0.snapshots } }
  const hora = horaDe(s.reloj)
  const persona = personaDe(s)
  let ent = entrada

  if (entrada.tipo === 'texto') {
    s.mensajes.push({ id: nuevoId(s, 'u'), rol: 'usuario', texto: entrada.texto, hora })
  } else if (entrada.tipo === 'accion') {
    ent = { ...entrada, accion: { ...entrada.accion, por: persona.nombre } }
    s.mensajes.push({ id: nuevoId(s, 'd'), rol: 'decision', texto: entrada.etiqueta ?? 'Decisión', por: persona.nombre, rolPersona: persona.rol, hora })
    s.actividad.unshift({ id: nuevoId(s, 'act'), hora, persona: persona.nombre, autonomia: null, texto: t('{por} decide: {que}', { por: v(persona.nombre), que: v(entrada.etiqueta ?? 'decisión') }) })
  } else if (entrada.tipo === 'evento') {
    const ev = EVENTOS_POR_ID[entrada.eventoId]
    s.mensajes.push({ id: nuevoId(s, 's'), rol: 'novedad', eventoId: entrada.eventoId, agente: ev?.agente, titulo: ev?.titulo ?? 'Novedad', hora })
    s.actividad.unshift({ id: nuevoId(s, 'act'), hora, agente: ev?.agente, autonomia: null, evento: true, texto: t('{titulo}', { titulo: v(ev?.titulo ?? 'Novedad') }) })
    s.novedades = s.novedades + 1
  }

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
  const s = { ...s0, mensajes: [...s0.mensajes], actividad: [...s0.actividad] }
  const idx = s.mensajes.findIndex((m) => m.id === s.activo.id)
  if (idx < 0) return { ...s, activo: null }
  const msg = { ...s.mensajes[idx], estadoPasos: [...s.mensajes[idx].estadoPasos] }
  const turno = msg.turno
  const totalBloques = turno.bloques.length
  const fin = turno.duracionMs + totalBloques * DURACIONES.bloque
  const tr = Math.min(s.activo.transcurrido + ms, fin)
  const hora = horaDe(s.reloj)

  turno.pasos.forEach((p, i) => {
    if (msg.estadoPasos[i] === 'hecho') return
    if (tr >= p.finMs) {
      s.mundo = reducirVarias(s.mundo, p.acciones)
      msg.estadoPasos[i] = 'hecho'
      if (p.muta) s.actividad.unshift({ id: `act-${msg.id}-${i}`, hora, agente: p.agente, autonomia: p.autonomia, texto: p.titulo, salida: p.salida, mensajeId: msg.id })
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

function pasoTour(s0, indice) {
  const paso = RECORRIDO[indice]
  const s = { ...s0, tour: { paso: indice }, mensajes: [...s0.mensajes] }
  s.mensajes.push({ id: nuevoId(s, 'g'), rol: 'guia', indice, total: RECORRIDO.length, titulo: paso.titulo, nota: paso.nota, hora: horaDe(s.reloj) })
  return encolar(s, paso.entrada)
}

function encolar(s, entrada) {
  if (s.activo) return { ...s, cola: [...s.cola, entrada] }
  return iniciar(s, entrada)
}

export function reducirSesion(s, a) {
  switch (a.tipo) {
    case 'enviar':
      if (a.entrada.tipo === 'texto' && !String(a.entrada.texto ?? '').trim()) return s
      // Una novedad solo llega una vez.
      if (a.entrada.tipo === 'evento' && (!s.mundo.entrantes.includes(a.entrada.eventoId) || s.cola.some((e) => e.eventoId === a.entrada.eventoId))) return s
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
      // Novedades: solo con la conversación empezada, sin recorrido y sin pausa.
      const conversacionEmpezada = n.mensajes.some((m) => m.rol === 'agentes')
      const evento = EVENTOS.find((e) => n.mundo.entrantes.includes(e.id))
      if (!evento || n.tour || n.eventosPausados || !conversacionEmpezada) return n
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

    case 'simularEvento': {
      const evento = EVENTOS.find((e) => s.mundo.entrantes.includes(e.id))
      return evento ? encolar({ ...s, inactivo: 0 }, { tipo: 'evento', eventoId: evento.id }) : s
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
      const que = decision?.rol === 'decision' ? decision.texto : msg.turno.titulo
      const n = { ...s, mundo, ultimaMutacion: null, mensajes: s.mensajes.map((m) => (m.id === a.mensajeId ? { ...m, deshecho: true } : m)), actividad: [...s.actividad] }
      n.mensajes.push({ id: nuevoId(n, 'x'), rol: 'nota', texto: `${persona.nombre} ha deshecho «${que}». Todo vuelve a como estaba.`, hora: horaDe(n.reloj) })
      n.actividad.unshift({ id: nuevoId(n, 'act'), hora: horaDe(n.reloj), persona: persona.nombre, texto: t('{por} deshace: {que}', { por: v(persona.nombre), que: v(que) }) })
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

    case 'leerNovedades':
      return s.novedades ? { ...s, novedades: 0 } : s

    case 'tour/iniciar': {
      // El recorrido parte de la demo recién abierta para que cada paso cuente lo que pasa.
      const limpia = crearSesion({ persona: s.persona })
      if (s.mensajes.length) limpia.mensajes.push({ id: nuevoId(limpia, 'x'), rol: 'nota', texto: 'El recorrido empieza con la demo recién abierta: la conversación anterior se ha cerrado.', hora: horaDe(0) })
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
      n.mensajes.push({ id: nuevoId(n, 'x'), rol: 'nota', texto: a.completo ? 'Recorrido terminado. Puedes seguir preguntando con tus palabras.' : 'Has salido del recorrido guiado.', hora: horaDe(n.reloj) })
      return n
    }

    case 'reiniciar':
      return crearSesion({ persona: s.persona })

    default:
      return s
  }
}
