// Orquestador: interpreta la entrada, elige el guion, simula los pasos de cada
// agente sobre el mundo y compone la respuesta. Es determinista: la misma
// entrada sobre el mismo mundo da siempre el mismo turno.

import { ESCENARIOS } from './escenarios/index.js'
import { detectarIntencion } from './intenciones.js'
import { reducirVarias } from './acciones.js'
import { confianzaBaja } from './politicas.js'
import { AGENTES, DURACIONES } from './agentes.js'
import { CASO_DE_INTENCION } from './casos.js'
import { t, v } from './texto.js'

const EVENTOS = {
  'EV-01': 'factura_nueva',
  'EV-02': 'aprobar_oc',
  'EV-03': 'cumplimiento',
}

/** Entrada → detección: { intencion, entidades, eventoId?, accion?, texto? }. */
export function interpretar(mundo, entrada, contexto = {}) {
  if (entrada.tipo === 'evento') return { intencion: EVENTOS[entrada.eventoId] ?? 'no_entendido', entidades: {}, eventoId: entrada.eventoId }
  if (entrada.tipo === 'accion') return { intencion: 'accion', entidades: {}, accion: entrada.accion }
  const det = { ...detectarIntencion(entrada.texto, mundo, contexto), texto: entrada.texto }
  // Un documento dudoso o con IGIC va a su guion aunque se pida «procesar».
  const doc = det.entidades.documento && mundo.documentos[det.entidades.documento]
  if (doc && det.intencion === 'factura_nueva' && doc.estado === 'en_bandeja') {
    if (confianzaBaja(doc)) det.intencion = 'revisar_gasto'
    else if (doc.impuesto?.tipo === 'IGIC') det.intencion = 'cumplimiento'
  }
  return det
}

function listaAgentes(ids) {
  const nombres = ids.map((id) => AGENTES[id].nombre)
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

function pasoOrquestador(det, entrada, agentes) {
  let titulo
  if (entrada.tipo === 'evento') titulo = t('Detecta una novedad y la pasa a {lista}', { lista: v(listaAgentes(agentes)) })
  else if (entrada.tipo === 'accion') titulo = t('Pasa tu decisión a {lista}', { lista: v(listaAgentes(agentes)) })
  else if (agentes.length === 1) titulo = t('Pasa la petición a {lista}', { lista: v(listaAgentes(agentes)) })
  else titulo = t('Reparte la petición entre {lista}', { lista: v(listaAgentes(agentes)) })
  return { agente: 'orquestador', titulo, autonomia: 'ejecuta', duracionMs: DURACIONES.plan, acciones: [], salida: null, paralelo: false }
}

export function responder(mundo, entrada, contexto = {}) {
  const det = interpretar(mundo, entrada, contexto)
  const esc = ESCENARIOS[det.intencion] ?? ESCENARIOS.no_entendido
  const pasosGuion = esc.planificar(mundo, det, contexto)
  const agentes = [...new Set(pasosGuion.map((p) => p.agente))].filter((a) => a !== 'orquestador')
  const todos = agentes.length ? [pasoOrquestador(det, entrada, agentes), ...pasosGuion] : pasosGuion

  // Simula cada paso para fijar su salida y su calendario.
  let m = mundo
  let cursor = 0
  let inicioPrevio = 0
  const pasos = todos.map((p, i) => {
    const antes = m
    m = reducirVarias(m, p.acciones)
    const inicio = p.paralelo && i > 0 ? inicioPrevio : cursor
    const fin = inicio + p.duracionMs
    inicioPrevio = inicio
    cursor = Math.max(cursor, fin)
    return {
      id: i,
      agente: p.agente,
      titulo: p.titulo,
      autonomia: p.autonomia,
      acciones: p.acciones,
      salida: typeof p.salida === 'function' ? p.salida(antes, m) : p.salida,
      inicioMs: inicio,
      finMs: fin,
      paralelo: !!p.paralelo,
      muta: m !== antes,
    }
  })

  const comp = esc.componer({ antes: mundo, despues: m, det, contexto, pasos })
  const turno = {
    intencion: det.intencion,
    caso: CASO_DE_INTENCION[det.intencion] ?? null,
    titulo: esc.titulo,
    origen: entrada.tipo,
    entidades: det.entidades,
    motivo: det.motivo ?? null,
    pasos,
    duracionMs: cursor,
    agentes: [...new Set(pasos.map((p) => p.agente))],
    bloques: comp.bloques.map((b, i) => ({ ...b, clave: `${i}-${b.tipo}` })),
    sugerencias: comp.sugerencias ?? [],
    fuentes: comp.fuentes ?? [],
    reglas: comp.reglas ?? [],
    noHecho: comp.noHecho ?? [],
  }
  const nuevoContexto =
    entrada.tipo === 'texto' && det.intencion !== 'no_entendido' && det.intencion !== 'desambiguar'
      ? { ultimaIntencion: det.intencion, ultimasEntidades: det.entidades }
      : contexto
  return { turno, mundo: m, contexto: nuevoContexto }
}
