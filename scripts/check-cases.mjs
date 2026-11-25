import assert from 'node:assert/strict'
import { crearMundo } from '../src/agentes/mundo.js'
import { responder } from '../src/agentes/orquestador.js'
import { reducir } from '../src/agentes/acciones.js'
import { totales, impactoOrden, motivoInformeDesactualizado } from '../src/agentes/calculos.js'
import { totalesPropuesta } from '../src/agentes/propuesta.js'
import { PREGUNTA } from '../src/agentes/rodaje.js'
import { CASES, ejecutarCaso, accionesDeTurno, accionDisponible, resumirTurno, entradaParaActualizar } from '../src/demo/cases.js'

const iniciar = (id, mundo = crearMundo()) => ejecutarCaso(mundo, CASES.find((c) => c.id === id).entrada)
const acciones = (r) => accionesDeTurno(r.turno, r.mundo)
const decision = (r, tipo, filtro = () => true) => {
  const a = acciones(r).find((x) => x.entrada.accion?.tipo === tipo && filtro(x.entrada.accion) && !x.disabled)
  assert.ok(a, `Falta la decisión vigente ${tipo}`)
  return ejecutarCaso(r.mundo, a.entrada, r.contexto)
}
const preguntar = (r, texto) => ejecutarCaso(r.mundo, { tipo: 'texto', texto }, r.contexto)

assert.deepEqual(CASES.map((c) => c.id), ['parte', 'informe', 'facturas', 'cambios', 'riesgos', 'presupuesto', 'dossier'])
for (const c of CASES) {
  const mundo = crearMundo()
  const original = JSON.stringify(mundo)
  const r = iniciar(c.id, mundo)
  assert.equal(JSON.stringify(mundo), original, `${c.id}: no muta el mundo recibido`)
  assert.deepEqual(r.mundo, responder(mundo, c.entrada).mundo, `${c.id}: conserva todos los cálculos originales`)
  assert.ok(!['no_entendido', 'fuera_alcance'].includes(r.turno.intencion))
  const texto = resumirTurno(r.turno, r.mundo)
  assert.ok(texto.length > 35 && texto.length < 1300, `${c.id}: respuesta breve y sustancial`)
  assert.ok(!/\b(Orquestador|Conciliación|Facturas te|Riesgos lo|no un agente)\b/.test(texto))
  const ofrecidas = acciones(r)
  assert.ok(ofrecidas.length)
  assert.equal(new Set(ofrecidas.map((a) => a.id)).size, ofrecidas.length)
  for (const a of ofrecidas) {
    assert.ok(a.etiqueta && a.entrada.tipo && typeof a.disabled === 'boolean')
    if (a.entrada.tipo === 'accion' && !a.disabled) assert.ok(accionDisponible(r.mundo, a.entrada.accion, r.turno))
  }
}

// Invoice channels preserve automatic reconciliation, human classification,
// request-for-documentation and no-op protection against old decisions.
const recibidas = iniciar('facturas')
const partidaSeguimiento = preguntar(recibidas, '¿En qué partida?')
assert.equal(partidaSeguimiento.turno.intencion, 'revisar_gasto')
assert.equal(partidaSeguimiento.turno.entidades.documento, 'G-004')
assert.equal(recibidas.mundo.documentos['F-2026-078'].estado, 'contabilizada')
assert.equal(recibidas.mundo.documentos['F-2026-079'].estado, 'contabilizada')
assert.equal(recibidas.mundo.documentos['G-004'].estado, 'en_bandeja')
const ticket = decision(recibidas, 'documento/contabilizar', (a) => a.partida === '04.01')
assert.equal(ticket.mundo.documentos['G-004'].partida, '04.01')
assert.equal(ticket.mundo.historial.at(-1).por, 'Marta Cobo')
assert.ok(accionesDeTurno(recibidas.turno, ticket.mundo).filter((a) => a.entrada.accion?.tipo === 'documento/contabilizar').every((a) => a.disabled))
const vieja = acciones(recibidas).find((a) => a.entrada.accion?.tipo === 'documento/contabilizar')
assert.equal(ejecutarCaso(ticket.mundo, vieja.entrada).mundo, ticket.mundo)
const reabrir = iniciar('facturas', ticket.mundo)
assert.equal(reabrir.mundo, ticket.mundo)
assert.equal(reabrir.entrada.tipo, 'texto')
assert.equal(reabrir.mundo.historial.length, ticket.mundo.historial.length)
const pedir = acciones(recibidas).find((a) => /Pedir la factura completa/.test(a.etiqueta))
const solicitud = ejecutarCaso(ticket.mundo, pedir.entrada, ticket.contexto)
assert.ok(solicitud.turno.bloques.some((b) => b.tipo === 'borrador'))

// Every pending order can be reviewed; partial approval uses the original
// financial impact and cannot later be followed by full approval/rejection.
const hotel = iniciar('cambios')
const hotelSeguimiento = preguntar(hotel, 'La apruebo')
assert.equal(hotelSeguimiento.turno.entidades.oc, 'OC-104')
assert.equal(hotelSeguimiento.mundo.ordenes['OC-104'].estado, 'Pendiente', 'El seguimiento muestra la aprobación concreta, sin decidir por texto ambiguo')
const previsto = impactoOrden(hotel.mundo, 'OC-104').consume
const parcial = decision(hotel, 'orden/aprobar', (a) => a.importe === previsto)
assert.equal(parcial.mundo.ordenes['OC-104'].importeAprobado, previsto)
assert.equal(totales(parcial.mundo).cef, totales(hotel.mundo).cef)
assert.ok(accionesDeTurno(hotel.turno, parcial.mundo).filter((a) => a.entrada.tipo === 'accion').every((a) => a.disabled))
const compras = preguntar(hotel, '¿Qué órdenes de compra tengo pendientes?')
for (const id of ['OC-104', 'OC-105', 'OC-106']) assert.ok(acciones(compras).some((a) => a.entrada.accion?.ocId === id))
const otra = decision(compras, 'orden/rechazar', (a) => a.ocId === 'OC-105')
assert.equal(otra.mundo.ordenes['OC-105'].estado, 'Rechazada')

// Report freshness is checked against the same world that the UI displays.
const informe = iniciar('informe', hotel.mundo)
const modificado = ejecutarCaso(informe.mundo, { tipo: 'accion', accion: { tipo: 'orden/aprobar', ocId: 'OC-104' } })
assert.ok(motivoInformeDesactualizado(modificado.mundo, informe.mundo.periodo.id))
const botonesViejos = accionesDeTurno(informe.turno, modificado.mundo)
assert.ok(botonesViejos.find((a) => a.entrada.accion?.tipo === 'informe/aprobar').disabled)
assert.ok(botonesViejos.find((a) => a.etiqueta === 'Regenerar informe'))
const regenerado = preguntar(modificado, 'Regenera el informe semanal de coste')
const compartible = decision(regenerado, 'informe/aprobar')
assert.equal(compartible.mundo.informes[compartible.mundo.periodo.id].estado, 'aprobado')
assert.ok(resumirTurno(compartible.turno, compartible.mundo).includes('no se descarga ni se envía'))
const informeReabierto = iniciar('informe', compartible.mundo)
assert.equal(informeReabierto.mundo, compartible.mundo)
assert.ok(resumirTurno(informeReabierto.turno, informeReabierto.mundo).includes('ya está aprobado'))
assert.ok(!resumirTurno(informeReabierto.turno, informeReabierto.mundo).includes('espera tu revisión'))
assert.ok(informeReabierto.turno.bloques.find((b) => b.tipo === 'texto').texto.includes('sigue al día y aprobado'))
assert.ok(!acciones(informeReabierto).some((a) => a.entrada.accion?.tipo === 'informe/aprobar'))

// All risk branches retain their exact plan/cost effects and remain idempotent.
const riesgos = iniciar('riesgos')
for (const id of ['RG-1', 'RG-5', 'RG-7']) {
  const detalle = preguntar(riesgos, PREGUNTA[id])
  for (const tipo of ['riesgo/mitigar', 'riesgo/reservar', 'riesgo/aceptar']) {
    const a = acciones(detalle).find((x) => x.entrada.accion?.tipo === tipo)
    assert.ok(a && !a.disabled, `${id}: ${tipo}`)
    const hecho = ejecutarCaso(detalle.mundo, a.entrada, detalle.contexto)
    assert.ok(hecho.mundo.decisionesRiesgo[id])
    assert.equal(ejecutarCaso(hecho.mundo, a.entrada).mundo, hecho.mundo)
  }
}
const lluviaAsumida = decision(preguntar(riesgos, PREGUNTA['RG-1']), 'riesgo/aceptar')
const cambioPosterior = decision(lluviaAsumida, 'riesgo/mitigar')
assert.equal(cambioPosterior.mundo.decisionesRiesgo['RG-1'].estado, 'mitigado')
assert.ok(Object.keys(cambioPosterior.mundo.borradores).some((id) => id.startsWith('BOR-CAMBIO')))

// Itsasoa has its own proposal and calls, without changing the active film's
// budget. Supplier commitments only follow explicit authorization and choice.
const propuesta = iniciar('presupuesto', ticket.mundo)
assert.equal(propuesta.mundo, ticket.mundo)
assert.ok(resumirTurno(propuesta.turno, propuesta.mundo).includes('Itsasoa · Gau Films'))
const optimizada = preguntar(propuesta, 'Optimiza los proveedores de la propuesta')
assert.equal(Object.keys(optimizada.mundo.propuesta.llamadas).length, 0)
const rechazadas = decision(optimizada, 'propuesta/noLlamar')
assert.equal(Object.keys(rechazadas.mundo.propuesta.llamadas).length, 0)
const retomada = preguntar(rechazadas, 'Optimiza los proveedores de la propuesta')
const llamadas = decision(retomada, 'propuesta/autorizarLlamadas')
assert.equal(Object.keys(llamadas.mundo.propuesta.llamadas).length, 4)
const elegida = decision(llamadas, 'propuesta/elegir', (a) => !!a.altId)
assert.ok(totalesPropuesta(elegida.mundo).total < totalesPropuesta(llamadas.mundo).total)
assert.deepEqual(totales(elegida.mundo), totales(propuesta.mundo))
const ampliada = preguntar(elegida, 'Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €')
assert.equal(ampliada.mundo.propuesta.lineas.length, elegida.mundo.propuesta.lineas.length + 1)
assert.deepEqual(totales(ampliada.mundo), totales(propuesta.mundo))

// Fiscal follow-ups create reviewable documents and never send a message.
const fiscal = iniciar('dossier')
const preparar = acciones(fiscal).find((a) => a.etiqueta === 'Preparar la solicitud')
const borrador = ejecutarCaso(fiscal.mundo, preparar.entrada, fiscal.contexto)
const revisado = decision(borrador, 'borrador/marcarListo')
assert.ok(Object.values(revisado.mundo.borradores).some((b) => b.estado === 'listo'))
assert.ok(resumirTurno(revisado.turno, revisado.mundo).includes('No se ha enviado'))
const expediente = decision(fiscal, 'documento/revision')
assert.ok(expediente.mundo.revisiones['F-2026-072'])
assert.ok(!accionesDeTurno(fiscal.turno, borrador.mundo).some((a) => a.etiqueta === 'Preparar la solicitud'))

// Refresh resolves a specific analysis independently of subsequent chat context,
// and never replays cost additions, supplier calls or previous human decisions.
const dronEntrada = { tipo: 'texto', texto: 'Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €' }
const dronRefresh = entradaParaActualizar(ampliada.turno, dronEntrada)
assert.equal(ejecutarCaso(ampliada.mundo, dronRefresh).mundo, ampliada.mundo)
assert.ok(!dronRefresh.texto.includes('Añade'))
const lluviaDetalle = preguntar(riesgos, PREGUNTA['RG-1'])
const lluviaRefresh = entradaParaActualizar(lluviaDetalle.turno, { tipo: 'texto', texto: '¿Y mañana?' })
const lluviaActualizada = ejecutarCaso(lluviaDetalle.mundo, lluviaRefresh, { ultimaIntencion: 'riesgos', ultimasEntidades: { riesgo: 'RG-7' } })
assert.equal(lluviaActualizada.turno.entidades.riesgo, 'RG-1')
assert.equal(lluviaActualizada.mundo, lluviaDetalle.mundo)
const hotelRefresh = entradaParaActualizar(hotelSeguimiento.turno, { tipo: 'texto', texto: 'La apruebo' })
const hotelActualizado = ejecutarCaso(hotelSeguimiento.mundo, hotelRefresh, { ultimaIntencion: 'aprobar_oc', ultimasEntidades: { oc: 'OC-106' } })
assert.equal(hotelActualizado.turno.entidades.oc, 'OC-104')
assert.equal(hotelActualizado.mundo, hotelSeguimiento.mundo)
const caja = preguntar(riesgos, '¿Cuánto nos costará al final y llegamos de caja?')
const cajaActualizada = ejecutarCaso(caja.mundo, entradaParaActualizar(caja.turno, { tipo: 'texto', texto: '¿Y la caja?' }))
assert.equal(cajaActualizada.turno.intencion, 'prevision')
assert.equal(cajaActualizada.mundo, caja.mundo)
const descartado = decision(borrador, 'borrador/descartar')
const borradorId = borrador.turno.bloques.find((b) => b.tipo === 'borrador').id
const borradorRefresh = entradaParaActualizar(descartado.turno, { tipo: 'accion', accion: { tipo: 'borrador/descartar', id: borradorId } }, preparar.entrada)
const borradorActualizado = ejecutarCaso(descartado.mundo, borradorRefresh)
assert.equal(borradorActualizado.mundo, descartado.mundo)
assert.equal(borradorActualizado.mundo.borradores[borradorId].estado, 'descartado')
assert.ok(borradorActualizado.turno.bloques.some((b) => b.tipo === 'borrador'))
const soloLlegada = reducir(crearMundo(), { tipo: 'evento/recibir', eventoId: 'EV-01' })
const documentoRefresh = entradaParaActualizar(ticket.turno, { tipo: 'accion', accion: { tipo: 'documento/contabilizar', docId: 'F-2026-078' } })
const documentoActualizado = ejecutarCaso(soloLlegada, documentoRefresh)
assert.equal(documentoActualizado.mundo, soloLlegada)
assert.equal(documentoActualizado.mundo.documentos['F-2026-078'].estado, 'en_bandeja')
assert.ok(documentoActualizado.turno.bloques.some((b) => b.docId === 'F-2026-078'))

console.log('✓ Casos completos: dossier diario, informe, facturas, compras, riesgos, Itsasoa y dossier fiscal; decisiones vigentes y un único mundo compartido.')
