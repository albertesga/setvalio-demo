import assert from 'node:assert/strict'
import { crearDemo, reducirDemo } from '../src/demo/model.js'
import { totales, capitulo, desviaciones, tesoreria, impactoOrden, motivoInformeDesactualizado } from '../src/agentes/calculos.js'
import { CASES, accionesDeTurno } from '../src/demo/cases.js'
import { eur, eurSigned } from '../src/lib/format.js'

const inicial = crearDemo()
const original = JSON.stringify(inicial)
const preguntar = (s, texto) => reducirDemo(s, { tipo: 'preguntar', texto })
const decidir = (s, id) => reducirDemo(s, { tipo: 'decidir', id })
const ultimo = (s) => s.mensajes.at(-1)
const abrirCaso = (s, id) => reducirDemo(s, { tipo: 'caso', id })
const detalle = (s, id = s.detalleActual) => s.detalles[id]
const opciones = (s, id = s.detalleActual) => accionesDeTurno(detalle(s, id).turno, s.mundo)
const ejecutar = (s, opcion, id = s.detalleActual) => reducirDemo(s, {
  tipo: 'motor', entrada: opcion.entrada, sourceDetail: id, caseId: detalle(s, id).caseId, etiqueta: opcion.etiqueta,
})
const accionDe = (s, tipo, id = s.detalleActual, predicado = () => true) => {
  const opcion = opciones(s, id).find((a) => a.entrada.tipo === 'accion' && a.entrada.accion.tipo === tipo && predicado(a.entrada.accion))
  assert.ok(opcion, `Expected available control for ${tipo}`)
  return opcion
}

// Chat y escritorio calculan sobre el mismo mundo, también después de decidir.
const resumen = preguntar(inicial, '¿Cómo vamos?')
assert.equal(resumen.mundo, inicial.mundo)
assert.ok(ultimo(resumen).texto.includes(eur(totales(resumen.mundo).cef)))
assert.ok(ultimo(resumen).texto.includes(eurSigned(totales(resumen.mundo).desviacion)))
assert.equal(ultimo(resumen).destino.section, 'resumen')
const escenografia = ultimo(preguntar(inicial, 'Explícame las desviaciones del capítulo 04, Escenografía'))
const c04 = capitulo(inicial.mundo, '04')
assert.ok(escenografia.texto.includes(eur(c04.presupuesto)))
assert.ok(escenografia.texto.includes(eur(c04.cef)))
for (const causa of desviaciones(inicial.mundo).items.find((c) => c.id === '04').causas) {
  assert.ok(escenografia.texto.includes(causa.nombre))
  assert.ok(escenografia.texto.includes(eurSigned(causa.desviacion)))
}
assert.ok(!escenografia.texto.includes(eur(totales(inicial.mundo).presupuesto)), 'Chapter answer uses chapter totals')
assert.equal(escenografia.destino.section, 'presupuesto')
assert.ok(ultimo(preguntar(inicial, 'Explícame el capítulo 99')).texto.includes('No encuentro'))
assert.equal(ultimo(preguntar(inicial, '¿Qué documentos tengo que revisar?')).destino.section, 'documentos')
assert.equal(ultimo(preguntar(inicial, '¿Qué gastos tengo que revisar?')).destino.section, 'documentos')
const informePreparado = preguntar(inicial, 'Prepárame el informe semanal de coste')
const informe = ultimo(informePreparado)
assert.equal(informe.caseId, 'informe')
assert.equal(informe.destino.detailId, informePreparado.detalleActual)
const snapshot = informePreparado.mundo.informes.R1
assert.equal(snapshot.estado, 'borrador')
assert.deepEqual(snapshot.periodo, inicial.mundo.periodo)
assert.deepEqual(snapshot.totales, totales(informePreparado.mundo))
assert.equal(snapshot.resumen.cajaMinima.saldo, tesoreria(informePreparado.mundo).minimo.saldo)
assert.equal(motivoInformeDesactualizado(informePreparado.mundo, 'R1'), null)
assert.ok(informe.texto.includes('revisión') && informe.texto.includes('no se envía'))

const recibido = reducirDemo(inicial, { tipo: 'ticket' })
assert.equal(recibido.mundo.documentos['G-004'].estado, 'en_bandeja')
assert.equal(recibido.mundo.documentos['F-2026-078'].estado, 'en_bandeja')
assert.equal(recibido.mundo.documentos['F-2026-079'].estado, 'en_bandeja')
assert.deepEqual(totales(recibido.mundo), totales(inicial.mundo))
assert.ok(recibido.mensajes.some((m) => m.adjunto === 'G-004'))
const gastosRecibidos = ultimo(preguntar(recibido, '¿Qué gastos tengo que revisar?'))
assert.equal(gastosRecibidos.destino.section, 'documentos')
assert.ok(gastosRecibidos.texto.includes('G-004'))
assert.equal(ultimo(preguntar(recibido, 'Revisa el ticket G-004')).decision, 'ticket')
assert.equal(decidir(inicial, 'ticket-arte'), inicial, 'No decision before a specific prompt')
const arte = decidir(recibido, 'ticket-arte')
assert.equal(arte.mundo.documentos['G-004'].estado, 'contabilizada')
assert.equal(arte.mundo.documentos['G-004'].partida, '04.01')
assert.equal(totales(arte.mundo).gastado, totales(recibido.mundo).gastado + recibido.mundo.documentos['G-004'].base)
assert.equal(arte.mundo.historial.at(-1).por, 'Marta Cobo')
assert.equal(decidir(arte, 'ticket-arte'), arte, 'Repeated decisions are idempotent')
assert.equal(decidir(arte, 'ticket-produccion'), arte, 'A different old button cannot reclassify a recorded ticket')
const deshecho = reducirDemo(arte, { tipo: 'deshacer' })
assert.deepEqual(deshecho.mundo, recibido.mundo)
assert.equal(deshecho.undo, null)
assert.ok(deshecho.mensajes.length > arte.mensajes.length, 'Undo preserves conversation')
const produccion = decidir(deshecho, 'ticket-produccion')
assert.equal(produccion.mundo.documentos['G-004'].partida, '05.04')
assert.equal(totales(produccion.mundo).cef, totales(recibido.mundo).cef, 'Existing provision absorbs this alternative classification')

const compra = preguntar(inicial, 'Revisa el hotel')
const impacto = impactoOrden(compra.mundo, 'OC-104')
assert.equal(compra.mundo.ordenes['OC-104'].estado, 'Pendiente')
assert.ok(ultimo(compra).texto.includes(eur(impacto.exceso)))
assert.ok(ultimo(compra).texto.includes(eur(impacto.totales.despues.cef)))
const aprobado = decidir(compra, 'hotel-aprobar')
assert.deepEqual(totales(aprobado.mundo), impacto.totales.despues)
assert.equal(tesoreria(aprobado.mundo).minimo.saldo, impacto.caja.minimoDespues.saldo)
assert.equal(decidir(aprobado, 'hotel-aprobar'), aprobado)
assert.equal(decidir(aprobado, 'hotel-rechazar'), aprobado)
assert.ok(ultimo(preguntar(aprobado, '¿Cómo vamos?')).texto.includes(eur(totales(aprobado.mundo).cef)))
const compraRestaurada = reducirDemo(aprobado, { tipo: 'deshacer' })
assert.deepEqual(compraRestaurada.mundo, compra.mundo)
const rechazado = decidir(compraRestaurada, 'hotel-rechazar')
assert.equal(rechazado.mundo.ordenes['OC-104'].estado, 'Rechazada')
assert.deepEqual(totales(rechazado.mundo), totales(compra.mundo))
assert.deepEqual(tesoreria(rechazado.mundo), tesoreria(compra.mundo))

// Receiving new documents after a decision does not get erased by its undo.
const nuevosDocs = reducirDemo(aprobado, { tipo: 'ticket' })
const undoConRecepcion = reducirDemo(nuevosDocs, { tipo: 'deshacer' })
assert.equal(undoConRecepcion.mundo.ordenes['OC-104'].estado, 'Pendiente')
assert.equal(undoConRecepcion.mundo.documentos['G-004'].estado, 'en_bandeja')
assert.deepEqual(totales(undoConRecepcion.mundo), totales(inicial.mundo))

for (const texto of ['Dame una pizza', 'Apruébalo todo', 'Paga al proveedor', '¿Cómo va la caja?', 'Ver presupuesto', 'Documentos pendientes']) {
  const s = preguntar(inicial, texto)
  assert.equal(s.mundo, inicial.mundo, `Read or unsupported request must not mutate: ${texto}`)
}
for (const texto of ['Enviar el informe', 'Informe semanal']) {
  const s = preguntar(inicial, texto)
  assert.equal(s.mundo.informes.R1.estado, 'borrador', `${texto} prepares a draft, never an implicit approval`)
  assert.ok(!s.mundo.historial.some((h) => h.tipo === 'informe/aprobar'))
}

// Every restored entry opens a usable desktop detail linked from its short reply.
assert.deepEqual(CASES.map((c) => c.id), ['parte', 'informe', 'facturas', 'cambios', 'riesgos', 'presupuesto', 'dossier'])
for (const caso of CASES) {
  const base = crearDemo()
  const s = abrirCaso(base, caso.id)
  const d = detalle(s)
  assert.equal(s.casoActivo, caso.id, `Opened ${caso.id}`)
  assert.equal(d.caseId, caso.id)
  assert.equal(ultimo(s).detailId, d.id)
  assert.deepEqual(ultimo(s).destino, { section: 'caso', detailId: d.id })
  assert.ok(d.turno.bloques.length > 0)
  assert.ok(ultimo(s).texto.trim())
  assert.equal(d.version, s.revision, `New ${caso.id} detail matches the world's revision`)
  assert.equal(s.revision, s.mundo === base.mundo ? base.revision : base.revision + 1)
  assert.ok(opciones(s).some((a) => !a.disabled), `${caso.id} exposes its next step`)
}
assert.equal(reducirDemo(inicial, { tipo: 'caso', id: 'unknown' }), inicial)
assert.equal(reducirDemo(inicial, { tipo: 'refrescarDetalle', id: 'unknown' }), inicial)

// The restored invoice case reconciles matching invoices, then asks about the ticket.
const facturas = abrirCaso(crearDemo(), 'facturas')
assert.equal(facturas.mundo.documentos['F-2026-078'].estado, 'contabilizada')
assert.equal(facturas.mundo.documentos['F-2026-079'].estado, 'contabilizada')
assert.equal(facturas.mundo.documentos['G-004'].estado, 'en_bandeja')
const facturasOtraVez = abrirCaso(facturas, 'facturas')
assert.deepEqual(totales(facturasOtraVez.mundo), totales(facturas.mundo), 'Reopening invoices never counts them twice')
const ticketDetalle = facturas.detalleActual
const imputar = accionDe(facturas, 'documento/contabilizar', ticketDetalle, (a) => a.partida === '04.01')
const ticketRegistrado = ejecutar(facturas, imputar, ticketDetalle)
assert.equal(ticketRegistrado.revision, facturas.revision + 1)
assert.equal(ticketRegistrado.mundo.documentos['G-004'].partida, '04.01')
assert.equal(totales(ticketRegistrado.mundo).gastado, totales(facturas.mundo).gastado + facturas.mundo.documentos['G-004'].base)
assert.equal(ejecutar(ticketRegistrado, imputar, ticketDetalle), ticketRegistrado)
assert.ok(opciones(ticketRegistrado, ticketDetalle).filter((a) => a.entrada.accion?.tipo === 'documento/contabilizar').every((a) => a.disabled))
const ticketRestaurado = reducirDemo(ticketRegistrado, { tipo: 'deshacer' })
assert.deepEqual(ticketRestaurado.mundo, facturas.mundo)
assert.equal(ticketRestaurado.revision, ticketRegistrado.revision + 1, 'Undo advances revision instead of making old details current')
assert.ok(detalle(ticketRestaurado, ticketDetalle).version < ticketRestaurado.revision)

// Reports keep their original numbers while later decisions change the production.
const informeDetalle = informePreparado.detalleActual
const snapshotAntes = JSON.stringify(snapshot)
const aprobarInforme = accionDe(informePreparado, 'informe/aprobar', informeDetalle)
const cambios = abrirCaso(informePreparado, 'cambios')
const cambioDetalle = cambios.detalleActual
const aprobarHotel = accionDe(cambios, 'orden/aprobar', cambioDetalle, (a) => a.importe === undefined && a.ocId === 'OC-104')
const cambioAplicado = ejecutar(cambios, aprobarHotel, cambioDetalle)
assert.equal(JSON.stringify(cambioAplicado.mundo.informes.R1), snapshotAntes, 'A report is a snapshot, not a live reference')
assert.equal(motivoInformeDesactualizado(cambioAplicado.mundo, 'R1'), 'cifras')
assert.equal(ejecutar(cambioAplicado, aprobarHotel, cambioDetalle), cambioAplicado)
assert.equal(ejecutar(cambioAplicado, aprobarInforme, informeDetalle), cambioAplicado, 'An outdated report cannot be approved')
assert.ok(opciones(cambioAplicado, informeDetalle).find((a) => a.entrada.accion?.tipo === 'informe/aprobar').disabled)
const regenerar = opciones(cambioAplicado, informeDetalle).find((a) => a.etiqueta === 'Regenerar informe')
assert.ok(regenerar && !regenerar.disabled)
const informeActual = ejecutar(cambioAplicado, regenerar, informeDetalle)
assert.equal(motivoInformeDesactualizado(informeActual.mundo, 'R1'), null)
assert.ok(informeActual.mundo.informes.R1.edicion > snapshot.edicion)
assert.deepEqual(informeActual.mundo.informes.R1.totales, totales(informeActual.mundo))
assert.equal(informeActual.mundo.informes.R1.estado, 'borrador')
assert.equal(ejecutar(informeActual, aprobarInforme, informeDetalle), informeActual, 'An old report button cannot approve its regenerated replacement')
const informeActualId = informeActual.detalleActual
const aprobarActual = accionDe(informeActual, 'informe/aprobar')
const informeAprobado = ejecutar(informeActual, aprobarActual)
assert.equal(informeAprobado.mundo.informes.R1.estado, 'aprobado')
assert.equal(ejecutar(informeAprobado, aprobarActual, informeActualId), informeAprobado)
const informeSinAprobacion = reducirDemo(informeAprobado, { tipo: 'deshacer' })
assert.equal(informeSinAprobacion.mundo.informes.R1.estado, 'borrador')
assert.deepEqual(informeSinAprobacion.mundo.informes.R1.totales, informeActual.mundo.informes.R1.totales)

// Draft editing updates its detail revision; reviewed drafts are closed to edits.
const fiscal = abrirCaso(crearDemo(), 'dossier')
const prepararSolicitud = opciones(fiscal).find((a) => a.etiqueta === 'Preparar la solicitud')
assert.ok(prepararSolicitud)
const borrador = ejecutar(fiscal, prepararSolicitud)
const borradorId = 'BOR-DOS-01'
assert.equal(borrador.mundo.borradores[borradorId].estado, 'borrador')
const borradorDetalle = borrador.detalleActual
const editar = { tipo: 'editarBorrador', id: borradorId, detailId: borradorDetalle, asunto: 'Solicitud revisada de certificado cultural', cuerpo: 'Adjuntamos la información de La última función para su revisión.' }
const editado = reducirDemo(borrador, editar)
assert.equal(editado.mundo.borradores[borradorId].estado, 'borrador')
assert.equal(editado.mundo.borradores[borradorId].textoAsunto, editar.asunto)
assert.equal(editado.mundo.borradores[borradorId].textoCuerpo, editar.cuerpo)
assert.equal(editado.revision, borrador.revision + 1)
assert.equal(detalle(editado, borradorDetalle).version, editado.revision, 'The open editor remains current after its own edits')
assert.equal(detalle(editado, fiscal.detalleActual).version, detalle(fiscal).version, 'Editing does not rewrite other detail versions')
assert.equal(editado.undo, null, 'Draft edits cannot be erased by undoing an unrelated earlier decision')
assert.equal(reducirDemo(editado, editar), editado, 'Saving identical text is a no-op')
const marcarRevisado = accionDe(editado, 'borrador/marcarListo')
const revisado = ejecutar(editado, marcarRevisado)
assert.equal(revisado.mundo.borradores[borradorId].estado, 'listo')
assert.equal(ejecutar(revisado, marcarRevisado, borradorDetalle), revisado)
assert.equal(reducirDemo(revisado, { ...editar, cuerpo: 'Un texto posterior a la revisión.' }), revisado, 'Reviewed drafts cannot be edited')
assert.ok(ultimo(borrador).texto.includes('No se ha enviado'))

// A refreshed detail points at today's revision without rewriting older messages.
const mensajeAnterior = JSON.stringify(ultimo(cambios))
const actualizado = reducirDemo(cambioAplicado, { tipo: 'refrescarDetalle', id: cambioDetalle })
assert.notEqual(actualizado.detalleActual, cambioDetalle)
assert.equal(detalle(actualizado).version, actualizado.revision)
assert.equal(JSON.stringify(actualizado.mensajes.find((m) => m.id === ultimo(cambios).id)), mensajeAnterior)

assert.equal(preguntar(inicial, '  '), inicial)
assert.equal(reducirDemo(inicial, { tipo: 'deshacer' }), inicial)
assert.deepEqual(reducirDemo(aprobado, { tipo: 'reiniciar' }), crearDemo())
assert.equal(JSON.stringify(inicial), original, 'Reducers never mutate previous state')
console.log('Workspace: shared figures, 7 restored cases, report snapshots, stale approvals, draft review, idempotence, revision and undo verified.')
