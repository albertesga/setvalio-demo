// The conversational and desktop demo share the original scenario engine and
// the same world. This adapter changes presentation, never the calculations.
import { responder } from '../agentes/orquestador.js'
import { reducir } from '../agentes/acciones.js'
import { PERSONAS } from '../agentes/mundo.js'
import { estadoDecision, motivoInformeDesactualizado, ordenesPendientes } from '../agentes/calculos.js'
import { decisionesAbiertas } from '../agentes/pendientes.js'
import { agendaDelDia } from '../agentes/escenarios/saludo.js'
import { bloqueDocumento } from '../agentes/escenarios/comun.js'
import { evaluarRiesgos, PREGUNTA } from '../agentes/rodaje.js'
import { puedeDecidir } from '../agentes/politicas.js'
import { renderTexto } from '../agentes/texto.js'

const texto = (value) => typeof value === 'string' ? { tipo: 'texto', texto: value } : value

export const CASES = [
  { id: 'parte', title: 'Dossier diario', description: 'El rodaje de hoy, lo urgente y las decisiones pendientes.', pregunta: 'Ponme al día: prepara el dossier diario', entrada: { tipo: 'saludo' }, section: 'resumen' },
  { id: 'informe', title: 'Informe semanal', description: 'Preparar el informe de coste, revisarlo y aprobarlo.', pregunta: 'Prepárame el informe semanal de coste', entrada: texto('Prepárame el informe semanal de coste'), section: 'informes' },
  { id: 'facturas', title: 'Recepción de facturas', description: 'Correo, formulario y WhatsApp. Revisar e imputar lo dudoso.', pregunta: 'Enséñame cómo recibimos las facturas de hoy', entrada: { tipo: 'evento', eventoId: 'EV-01' }, section: 'documentos' },
  { id: 'cambios', title: 'Revisión de cambios', description: 'Hotel y otras compras: comparar su impacto antes de aprobar.', pregunta: 'Revisemos la ampliación del hotel y las compras pendientes', entrada: { tipo: 'evento', eventoId: 'EV-02' }, section: 'decisiones' },
  { id: 'riesgos', title: 'Riesgos de rodaje', description: 'Lluvia, horas extra y grúa: cambiar el plan o apartar dinero.', pregunta: '¿Qué riesgos hay para las próximas jornadas?', entrada: texto('¿Qué riesgos hay para las próximas jornadas?'), section: 'resumen' },
  { id: 'presupuesto', title: 'Creación de presupuesto', description: 'Itsasoa: primera propuesta, costes y alternativas de proveedores.', pregunta: 'Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa', entrada: texto('Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa'), section: 'presupuesto' },
  { id: 'dossier', title: 'Dossier fiscal', description: 'Documentación pendiente, borradores y revisión del fiscalista.', pregunta: '¿Qué bloquea el dossier fiscal?', entrada: texto('¿Qué bloquea el dossier fiscal?'), section: 'documentos' },
]

const DECISIONES = new Set(['documento/contabilizar', 'documento/aplazar', 'documento/revision', 'orden/aprobar', 'orden/rechazar', 'orden/escalar', 'partida/ajustarCef', 'informe/aprobar', 'borrador/editar', 'borrador/marcarListo', 'borrador/descartar', 'riesgo/mitigar', 'riesgo/reservar', 'riesgo/aceptar', 'propuesta/anadirLinea', 'propuesta/autorizarLlamadas', 'propuesta/noLlamar', 'propuesta/elegir'])
const CERRADOS = new Set(['aprobada', 'rechazada', 'preparada', 'mitigado', 'reservado', 'aceptado', 'desactualizada', 'por_llegar'])
const mismaAccion = (a, b) => a && b && JSON.stringify({ ...a, por: undefined }) === JSON.stringify({ ...b, por: undefined })

/** A stale button never acknowledges a decision that the reducer cannot apply. */
export function accionDisponible(mundo, accion, turno) {
  if (!accion || !DECISIONES.has(accion.tipo)) return false
  if (turno) {
    const candidatas = (turno.bloques ?? []).flatMap((b) => (b.acciones ?? []).filter((a) => mismaAccion(a.accion, accion)).map((a) => ({ a, b })))
    if (candidatas.length && !candidatas.some(({ a, b }) => (!a.rol || puedeDecidir(PERSONAS.marta.rol, a.rol)) && !CERRADOS.has(estadoDecision(mundo, b.ref).estado))) return false
  }
  if (accion.tipo === 'orden/aprobar' && accion.importe !== undefined && (!Number.isFinite(accion.importe) || accion.importe <= 0 || accion.importe > (mundo.ordenes[accion.ocId]?.importe ?? 0))) return false
  if (accion.tipo === 'documento/contabilizar' && accion.partida && !mundo.partidas[accion.partida]) return false
  if (accion.tipo === 'documento/revision' && !mundo.documentos[accion.docId] && !mundo.dossier?.some?.((d) => d.id === accion.docId)) return false
  if (accion.tipo === 'propuesta/anadirLinea' && !Number.isFinite(accion.linea?.importe)) return false
  // reducir is pure, including its no-op guards. It also checks current risk
  // amounts, report freshness, supplier quotes and already completed decisions.
  try { return reducir(mundo, accion) !== mundo } catch { return false }
}

/** Resolve every simulated step synchronously, using the caller's shared world. */
export function ejecutarCaso(mundo, entrada, contexto = {}) {
  let e = texto(entrada)
  if (e.tipo === 'consulta') return consultarExistente(mundo, e, contexto)
  if (e.tipo === 'accion') {
    if (!accionDisponible(mundo, e.accion)) return { mundo, contexto, turno: null, entrada: e }
    e = { ...e, accion: { ...e.accion, por: PERSONAS.marta.nombre } }
  }
  // Reopening the invoice case shows its current queue, without pretending the
  // same invoices have just arrived a second time.
  if (e.tipo === 'evento' && !mundo.entrantes.includes(e.eventoId)) {
    if (e.eventoId === 'EV-01') e = texto('¿Han llegado facturas nuevas?')
    if (e.eventoId === 'EV-02') e = texto('¿Qué órdenes de compra tengo pendientes?')
  }
  const resultado = responder(mundo, e, contexto)
  // Events do not pass through the text interpreter, so seed the same context
  // used by the original conversations for “¿en qué partida?” / “esta compra”.
  if (e.tipo === 'evento' && e.eventoId === 'EV-01' && resultado.mundo.documentos['G-004']?.estado === 'en_bandeja') resultado.contexto = { ultimaIntencion: 'revisar_gasto', ultimasEntidades: { documento: 'G-004' } }
  if (e.tipo === 'evento' && e.eventoId === 'EV-02') resultado.contexto = { ultimaIntencion: 'aprobar_oc', ultimasEntidades: { oc: 'OC-104' } }
  const informeId = resultado.turno.bloques.find((b) => b.tipo === 'informe')?.id
  const informe = informeId && resultado.mundo.informes[informeId]
  if (informe?.estado === 'aprobado') {
    let primero = true
    resultado.turno = { ...resultado.turno, bloques: resultado.turno.bloques.map((b) => {
      if (b.tipo === 'texto' && primero) {
        primero = false
        return { ...b, texto: `El informe de ${informe.periodo.etiqueta} (${informe.periodo.fechas}) sigue al día y aprobado${informe.aprobadoPor ? ` por ${informe.aprobadoPor}` : ''}. La aprobación queda registrada; no se ha enviado.` }
      }
      if (b.tipo === 'aprobacion' && b.ref?.tipo === 'informe') return { ...b, titulo: 'Aprobación registrada', resumen: 'El informe está aprobado. No se ha enviado.', acciones: [] }
      return b
    }) }
  }
  return { ...resultado, entrada: e }
}

// Refreshing a document or draft must not process an invoice again, recreate a
// discarded draft, or repeat an approval. Reuse its existing renderer as a read.
function consultarExistente(mundo, entrada, contexto) {
  const bor = mundo.borradores[entrada.borradorId]
  const doc = mundo.documentos[entrada.documentoId]
  const bloques = []
  let titulo = 'Documento'
  if (bor) {
    titulo = `Borrador · ${bor.para}`
    const estado = bor.estado === 'listo' ? 'revisado' : bor.estado === 'descartado' ? 'descartado' : 'pendiente de revisión'
    bloques.push({ tipo: 'texto', texto: `El borrador para ${bor.para} está ${estado}. No se ha enviado.` }, { tipo: 'borrador', id: bor.id })
  } else if (doc) {
    titulo = `${doc.tipo === 'ticket' ? 'Ticket' : 'Factura'} ${doc.id}`
    const estado = doc.estado === 'contabilizada' ? 'contabilizado' : doc.estado === 'por_llegar' ? 'todavía sin recibir' : 'pendiente de revisión'
    bloques.push({ tipo: 'texto', texto: `${doc.id} · ${doc.proveedor}: ${estado}.` }, bloqueDocumento(mundo, doc.id, { elegibilidad: true }))
    if (doc.estado === 'en_bandeja') bloques.push({ tipo: 'acciones', acciones: [{ id: 'revisar', etiqueta: `Revisar ${doc.id}`, entrada: texto(`Procesa la factura ${doc.id}`) }] })
  } else bloques.push({ tipo: 'texto', texto: 'Este documento ya no está en el estado actual. Puedes volver al recorrido para prepararlo.' })
  return { mundo, contexto, entrada, turno: { intencion: 'consulta', titulo, origen: 'consulta', entidades: entrada.documentoId ? { documento: entrada.documentoId } : {}, pasos: [], duracionMs: 0, agentes: [], bloques: bloques.map((b, i) => ({ ...b, clave: `${i}-${b.tipo}` })), sugerencias: [], fuentes: ['Documentos del proyecto'], reglas: [], noHecho: ['Solo consulta: no ha registrado gastos, creado borradores ni enviado mensajes.'], resumen: null, proyecto: null } }
}

/** A contextual reopening, with all writes from the original request removed.
 * `anterior` is the source detail's already-safe refresh entry, when available.
 */
export function entradaParaActualizar(turno, entrada, anterior = null) {
  const e = texto(entrada)
  const ent = turno?.entidades ?? {}
  const a = e?.tipo === 'accion' ? e.accion : null
  if (e?.tipo === 'consulta') return e
  if (a?.tipo.startsWith('borrador/')) return { tipo: 'consulta', borradorId: a.id }
  if (a?.tipo.startsWith('documento/')) return { tipo: 'consulta', documentoId: a.docId }
  if (a?.riesgoId || ent.riesgo) return texto(PREGUNTA[a?.riesgoId ?? ent.riesgo] ?? CASES.find((c) => c.id === 'riesgos').pregunta)
  if (a?.ocId || ent.oc) return texto(`Revisa la orden de compra ${a?.ocId ?? ent.oc}`)
  if (a?.tipo.startsWith('propuesta/') || ['anadir_coste', 'presupuesto_nuevo', 'optimizar_proveedores'].includes(turno?.intencion)) return texto('Enséñame la propuesta de Itsasoa')
  if (a?.tipo === 'informe/aprobar' || turno?.intencion === 'informe_semanal') return texto('Prepárame el informe semanal de coste')
  const borrador = turno?.bloques?.find((b) => b.tipo === 'borrador')
  if (borrador) return { tipo: 'consulta', borradorId: borrador.id }
  if (ent.documento) return { tipo: 'consulta', documentoId: ent.documento }
  if (a?.codigo || turno?.intencion === 'explicar_desviacion') {
    const codigo = a?.codigo ?? ent.partida
    return texto(codigo ? `Explícame la desviación de la partida ${codigo}` : ent.capitulo ? `Explícame la desviación del capítulo ${ent.capitulo}` : '¿Por qué nos desviamos del presupuesto?')
  }
  if (turno?.intencion === 'prevision') return texto('¿Cuánto nos costará al final y llegamos de caja?')
  if (turno?.intencion === 'riesgos') return CASES.find((c) => c.id === 'riesgos').entrada
  if (turno?.intencion === 'saludo' || e?.tipo === 'saludo') return { tipo: 'saludo' }
  if (e?.tipo === 'evento') return e.eventoId === 'EV-02' ? texto('Revisa la orden de compra OC-104') : e.eventoId === 'EV-01' ? texto('¿Han llegado facturas nuevas?') : texto('¿Qué bloquea el dossier fiscal?')
  if (['cumplimiento', 'pedir_documentacion'].includes(turno?.intencion)) return texto('¿Qué bloquea el dossier fiscal?')
  if (turno?.intencion === 'revisar_gasto') return texto('¿Qué gastos tengo que revisar?')
  if (turno?.intencion === 'factura_nueva') return texto('¿Han llegado facturas nuevas?')
  if (turno?.intencion === 'resumen') return texto('¿Cómo vamos?')
  // Remaining recognized text intents are informational (e.g. incentive
  // scenarios); an unrecognized or action entry falls back to its safe parent.
  return e?.tipo === 'texto' && turno?.intencion !== 'accion' ? e : anterior ?? { tipo: 'saludo' }
}

function pasoHecho(m, h) {
  return !!h && (h.borrador ? !!m.borradores[h.borrador] && m.borradores[h.borrador].estado !== 'descartado' : h.revision ? !!m.revisiones[h.revision] : false)
}

/** All decisions and next steps, without reimplementing scenario rules in JSX. */
export function accionesDeTurno(turno, mundo) {
  if (!turno) return []
  const out = []
  const add = (id, etiqueta, entrada, extra = {}) => {
    const e = texto(entrada)
    if (!e) return
    const disabled = e.tipo === 'accion' ? !accionDisponible(mundo, e.accion, turno) : e.tipo === 'evento' ? !mundo.entrantes.includes(e.eventoId) : false
    out.push({ id, etiqueta: renderTexto(etiqueta), entrada: e, disabled, motivo: disabled ? 'Esta decisión ya no está pendiente. Consulta el estado actual.' : null, ...extra })
  }
  for (const [i, b] of (turno.bloques ?? []).entries()) {
    const key = b.id ?? b.clave ?? `${i}-${b.tipo}`
    const grupo = renderTexto(b.titulo)
    if (b.tipo === 'aprobacion' || b.tipo === 'acciones') {
      const sinPermiso = (b.acciones ?? []).some((a) => a.rol && !a.soloSinPermiso) && !(b.acciones ?? []).some((a) => !a.soloSinPermiso && (!a.rol || puedeDecidir(PERSONAS.marta.rol, a.rol)))
      for (const [j, a] of (b.acciones ?? []).entries()) {
        if (a.posponer || (a.soloSinPermiso && (!sinPermiso || estadoDecision(mundo, b.ref).escaladaA))) continue
        const etiqueta = b.ref?.tipo === 'orden' ? `${renderTexto(a.etiqueta)} · ${b.ref.id}` : a.etiqueta
        add(`${key}:${a.id ?? j}`, etiqueta, a.entrada ?? (a.accion && { tipo: 'accion', accion: a.accion }), { ref: b.ref, grupo, burbuja: renderTexto(a.burbuja), detalle: renderTexto(a.detalle), rol: a.rol })
      }
      if (b.ref?.tipo === 'informe' && motivoInformeDesactualizado(mundo, b.ref.id)) add(`${key}:actualizar`, 'Regenerar informe', 'Regenera el informe semanal de coste', { grupo })
      if (b.entradaActual && estadoDecision(mundo, b.ref).estado === 'desactualizada') add(`${key}:actualizar`, 'Revisar previsión actual', b.entradaActual, { grupo })
    }
    if (b.tipo === 'lista' || b.tipo === 'pasos') {
      for (const [j, it] of (b.items ?? []).entries()) if (!pasoHecho(mundo, it.hecho)) add(`${key}:${it.id ?? j}`, it.etiqueta ?? it.texto, it.entrada, { grupo })
    }
    if (b.tipo === 'agenda') {
      const agenda = agendaDelDia(mundo)
      for (const it of agenda.items) {
        if (it.subitems?.length) for (const sub of it.subitems) add(`agenda:${sub.id}`, `Revisar ${sub.id}`, sub.entrada, { grupo: renderTexto(it.titulo), ref: sub.ref })
        else add(`agenda:${it.id}`, it.acciones?.[0]?.etiqueta ?? it.titulo, it.entrada ?? it.acciones?.[0]?.entrada, { grupo: renderTexto(it.titulo), ref: it.ref })
      }
      if (agenda.avisos?.entrada) add('agenda:avisos', agenda.avisos.titulo, agenda.avisos.entrada, { grupo: 'Avisos al equipo' })
      if (agenda.resto) add('agenda:resto', 'Ver el resto de decisiones', '¿Cómo vamos?', { grupo: 'Pendiente' })
    }
    if (b.tipo === 'decisiones') for (const it of decisionesAbiertas(mundo)) add(`decision:${it.id}`, it.titulo, it.entrada, { ref: it.ref, grupo: 'Por decidir' })
    if (b.tipo === 'riesgos') for (const r of evaluarRiesgos(mundo)) add(`riesgo:${r.id}`, r.titulo, PREGUNTA[r.id], { grupo: 'Riesgos de rodaje' })
    if (b.tipo === 'borrador') {
      const bor = mundo.borradores[b.id]
      if (bor) {
        add(`${key}:revisado`, 'Marcar borrador como revisado', { tipo: 'accion', accion: { tipo: 'borrador/marcarListo', id: b.id } }, { grupo: bor.para, ref: { tipo: 'borrador', id: b.id } })
        add(`${key}:descartar`, 'Descartar borrador', { tipo: 'accion', accion: { tipo: 'borrador/descartar', id: b.id } }, { grupo: bor.para, ref: { tipo: 'borrador', id: b.id } })
      }
    }
  }
  if (turno.intencion === 'aprobar_oc' && ordenesPendientes(mundo).length > 1) add('compras:resto', 'Ver todas las compras pendientes', '¿Qué órdenes de compra tengo pendientes?', { grupo: 'Otras compras' })
  for (const [i, s] of (turno.sugerencias ?? []).entries()) add(`sugerencia:${i}`, s.etiqueta, s.texto, { grupo: 'Sugerencias' })
  // The same next step may occur in a list and as a suggestion; keep its first,
  // more contextual label. Include disabled decisions so old messages explain it.
  const vistos = new Set()
  return out.filter((a) => { const k = JSON.stringify(a.entrada); if (vistos.has(k)) return false; vistos.add(k); return true })
}

function vozChat(s) {
  return s.replace(/\bConciliación ha contabilizado/g, 'He contabilizado').replace(/\bConciliación contabilizó/g, 'He contabilizado').replace(/\bHe contabilizado sola/g, 'He contabilizado').replace(/\bFacturas te propone/g, 'te propongo').replace(/\bRiesgos lo sigue vigilando/g, 'Seguimos vigilándolo').replace(/\bProveedores las compara/g, 'puedo compararlas').replace(/\bProveedores no llamará/g, 'No se iniciarán las llamadas').replace(/\by, con tu permiso, llama/g, 'y, con tu permiso, simular las llamadas').replace(/lo decide el fiscalista, no un agente/g, 'requiere la revisión del fiscalista')
}

/** Brief WhatsApp prose, retaining the source templates and project identity. */
export function resumirTurno(turno, mundo) {
  if (!turno) return 'Esta decisión ya no está pendiente. Puedes consultar el estado actual en el escritorio.'
  const bloques = turno.bloques ?? []
  const textos = bloques.filter((b) => b.tipo === 'texto').map((b) => renderTexto(b.texto))
  const partes = [textos[0] || renderTexto(turno.resumen) || renderTexto(turno.titulo)]
  if (turno.intencion === 'saludo') {
    const destacados = agendaDelDia(mundo).items.slice(0, 3).map((it) => `• ${renderTexto(it.titulo)}`)
    if (destacados.length) partes.push(destacados.join('\n'))
  } else {
    const ap = bloques.find((b) => b.tipo === 'aprobacion')
    if (ap?.resumen && !partes[0].includes(renderTexto(ap.resumen))) partes.push(renderTexto(ap.resumen))
    else if (textos[1] && textos[1].length < 320) partes.push(textos[1])
  }
  if (turno.proyecto?.titulo) partes.unshift(`${turno.proyecto.titulo} · ${turno.proyecto.productora}. En exploración: datos y llamadas simulados.`)
  else if (turno.intencion === 'riesgos') partes.unshift('Riesgos de rodaje · escenario en exploración.')
  if (bloques.some((b) => b.tipo === 'borrador')) partes.push('El borrador está en el escritorio para revisarlo. No se ha enviado.')
  const informe = bloques.find((b) => b.tipo === 'informe')
  if (informe) {
    const actual = mundo.informes[informe.id]
    if (actual?.estado === 'aprobado') partes.splice(0, partes.length, `El informe de ${actual.periodo.etiqueta} (${actual.periodo.fechas}) ya está aprobado${actual.aprobadoPor ? ` por ${actual.aprobadoPor}` : ''}. Puedes consultar sus cifras en el escritorio. En la demo no se envía.`)
    else partes.push('El informe espera tu revisión y aprobación. En la demo no se envía.')
  }
  return vozChat(partes.filter(Boolean).join('\n\n'))
}
