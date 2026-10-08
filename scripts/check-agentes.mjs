// Comprobaciones del prototipo conversacional de agentes (Node, sin navegador).
//
//   npm run check:agentes
//
// 1. Semilla: el mundo cuadra con src/lib/data.js y no lo muta.
// 2. Intenciones: frases de ejemplo → intención y entidades.
// 3. Cifras: lo que dicen los agentes sale de src/lib.
// 4. Transiciones: el reductor es puro, idempotente y mueve lo que debe.
// 5. Invariantes: ninguna plantilla lleva cifras escritas a mano.
// 6. Sesión: reproducción, novedades, deshacer y recorrido con un reloj falso.

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { CAPITULOS, CAPITULOS_TOTAL, TOTALES, CASHFLOW_PROYECTADO, SALDO_HOY } from '../src/lib/data.js'
import { evaluarTerritorio } from '../src/lib/incentivos.js'
import { crearMundo, CORTE } from '../src/agentes/mundo.js'
import * as c from '../src/agentes/calculos.js'
import { reducir } from '../src/agentes/acciones.js'
import { detectarIntencion } from '../src/agentes/intenciones.js'
import { responder } from '../src/agentes/orquestador.js'
import { ESCENARIOS } from '../src/agentes/escenarios/index.js'
import { AGENTES, AUTONOMIA, FAMILIAS, ORDEN_FAMILIAS, ORDEN_AGENTES, agentesDeFamilia } from '../src/agentes/agentes.js'
import { CASOS, RECORRIDO, CASO_DE_INTENCION } from '../src/agentes/casos.js'
import { crearSesion, reducirSesion, estadoTour, conversacionIniciada } from '../src/agentes/sesion.js'
import { agendaDelDia, PREGUNTAS_PARTE } from '../src/agentes/escenarios/saludo.js'
import { esPlantilla, renderTexto } from '../src/agentes/texto.js'
import { totalesPropuesta, ALTERNATIVAS, optimizacion } from '../src/agentes/propuesta.js'
import { evaluarRiesgos, riesgo as riesgoDe, JORNADAS, HECHAS, LOCALIZACIONES, decisionesRiesgos, PREGUNTA } from '../src/agentes/rodaje.js'
import { puedeDecidir } from '../src/agentes/politicas.js'
import { CASHFLOW } from '../src/lib/data.js'
import { diasEntre } from '../src/agentes/texto.js'
import { eur } from '../src/lib/format.js'

let fallos = 0
let total = 0
function test(nombre, fn) {
  total += 1
  try {
    fn()
    console.log(`  ✓ ${nombre}`)
  } catch (e) {
    fallos += 1
    console.log(`  ✗ ${nombre}\n    ${e.message.split('\n').join('\n    ')}`)
  }
}
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg ?? ''} esperado ${b}, obtenido ${a}`)

function congelar(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    Object.values(o).forEach(congelar)
  }
  return o
}

// ── 1. Semilla ───────────────────────────────────────────────────────────────
console.log('Semilla')
const capitulosAntes = JSON.stringify(CAPITULOS)

test('los totales del mundo son TOTALES de data.js', () => {
  const t = c.totales(crearMundo())
  for (const k of ['presupuesto', 'gastado', 'comprometido', 'cef', 'desviacion', 'disponible']) cerca(t[k], TOTALES[k], k)
})
test('cada capítulo cuadra con CAPITULOS_TOTAL', () => {
  const m = crearMundo()
  for (const ref of CAPITULOS_TOTAL) {
    const x = c.capitulo(m, ref.id)
    for (const k of ['presupuesto', 'gastado', 'comprometido', 'cef', 'desviacion']) cerca(x[k], ref[k], `${ref.id}.${k}`)
  }
})
test('ninguna fecha ocurrida es posterior al corte', () => {
  const m = crearMundo()
  for (const d of Object.values(m.documentos)) {
    assert.ok(d.fecha <= CORTE.fecha, `${d.id} fecha ${d.fecha}`)
    if (d.recibida) assert.ok(d.recibida <= CORTE.fecha, `${d.id} recibida ${d.recibida}`)
  }
  for (const o of Object.values(m.ordenes)) assert.ok(o.fecha <= CORTE.fecha, `${o.id} fecha ${o.fecha}`)
})
test('un solo esquema de pedidos (OC-NNN) y cada documento apunta a un pedido existente', () => {
  const m = crearMundo()
  for (const id of Object.keys(m.ordenes)) assert.match(id, /^OC-\d{3}$/)
  for (const d of Object.values(m.documentos)) if (d.oc) assert.ok(m.ordenes[d.oc], `${d.id} → ${d.oc}`)
})
test('lo pendiente de facturar de los pedidos aprobados cabe en el comprometido de su partida', () => {
  const m = crearMundo()
  const abierto = {}
  for (const o of Object.values(m.ordenes)) if (o.estado === 'Aprobada') abierto[o.partida] = (abierto[o.partida] ?? 0) + o.importe - o.facturado
  for (const [p, imp] of Object.entries(abierto)) assert.ok(imp <= m.partidas[p].comprometido, `${p}: ${imp} > ${m.partidas[p].comprometido}`)
})
test('solo 01.03 tiene la previsión por debajo de lo comprometido', () => {
  assert.deepEqual(c.incoherenciasPrevision(crearMundo()).map((x) => x.codigo), ['01.03'])
})
test('crearMundo devuelve copias independientes y no toca data.js', () => {
  const a = crearMundo()
  const b = crearMundo()
  a.partidas['04.01'].cef = 1
  assert.notEqual(b.partidas['04.01'].cef, 1)
  assert.equal(JSON.stringify(CAPITULOS), capitulosAntes)
})

// ── 2. Intenciones ───────────────────────────────────────────────────────────
console.log('Intenciones')
const FRASES = [
  ['Prepárame el informe semanal de coste', 'informe_semanal'],
  ['prepara el informe semanal', 'informe_semanal'],
  ['PREPARAME EL INFORME SEMANAL DE COSTE', 'informe_semanal'],
  ['hazme el cost report', 'informe_semanal'],
  ['Regenera el informe semanal de coste', 'informe_semanal'],
  ['envía el informe semanal a producción', 'informe_semanal', { quiereEnviar: true }],
  ['¿Por qué se desvía Escenografía?', 'explicar_desviacion', { capitulo: '04' }],
  ['por que se desvia escenografia', 'explicar_desviacion', { capitulo: '04' }],
  ['¿Y el 07?', 'explicar_desviacion', { capitulo: '07' }, { ultimaIntencion: 'explicar_desviacion' }],
  ['explica la desviación del capítulo 7', 'explicar_desviacion', { capitulo: '07' }],
  ['¿Qué capítulos están fuera de rango?', 'explicar_desviacion'],
  ['¿por qué nos pasamos en decorados?', 'explicar_desviacion', { capitulo: '04' }],
  ['sobrecoste en viajes y hoteles', 'explicar_desviacion', { capitulo: '07' }],
  ['¿Qué órdenes de compra tengo pendientes?', 'aprobar_oc'],
  ['aprueba la OC-104', 'aprobar_oc', { oc: 'OC-104' }],
  ['¿qué pasa si apruebo la oc 105?', 'aprobar_oc', { oc: 'OC-105' }],
  ['PO-2026-021', 'aprobar_oc', { oc: 'OC-101' }],
  ['impacto de la orden de compra del Hotel NH', 'aprobar_oc', { oc: 'OC-104' }],
  ['¿Cómo cerraremos el proyecto?', 'prevision'],
  ['¿Llegamos con la caja?', 'prevision'],
  ['previsión de coste final', 'prevision'],
  ['¿hay semanas con la caja en negativo?', 'prevision'],
  ['¿Han llegado facturas nuevas?', 'factura_nueva'],
  ['procesa la F-2026-078', 'factura_nueva', { documento: 'F-2026-078' }],
  ['Ha llegado una factura de Grúas y Cámaras del Sur', 'factura_nueva', { documento: 'F-2026-078' }],
  ['¿Qué gastos tengo que revisar?', 'revisar_gasto'],
  ['revisa el ticket de la ferretería', 'revisar_gasto', { documento: 'G-004' }],
  ['procesa el G-004', 'revisar_gasto', { documento: 'G-004' }],
  ['Pide a Ferretería El Tornillo la factura completa', 'pedir_documentacion', { documento: 'G-004' }],
  ['Pide a Hotel Cristina la documentación que falta', 'pedir_documentacion', { documento: 'F-2026-072' }],
  ['redacta un correo a la gestoría', 'pedir_documentacion', { documento: 'F-2026-069' }],
  ['envía el correo al hotel Cristina', 'pedir_documentacion', { quiereEnviar: true }],
  ['¿Qué bloquea el dossier fiscal?', 'cumplimiento'],
  ['revisa el IGIC de la factura de Las Palmas', 'cumplimiento', { documento: 'F-2026-072' }],
  ['procesa la factura F-2026-072', 'cumplimiento', { documento: 'F-2026-072' }],
  ['¿cuándo vence el certificado cultural?', 'cumplimiento'],
  ['¿Cuánto supondría llegar al 50 % de gasto en Canarias?', 'incentivo', { porcentaje: 0.5, territorio: 'canarias' }],
  ['¿cuánto podemos recuperar de deducción fiscal?', 'incentivo'],
  ['tax credit', 'incentivo'],
  ['¿Qué puedes hacer?', 'ayuda'],
  ['¿qué agentes hay?', 'ayuda'],
  ['¿Cómo vamos?', 'resumen'],
  ['Activa el Production Rescue', 'fuera_alcance', { motivo: 'fase_posterior' }],
  ['paga la factura de Grúas', 'fuera_alcance', { motivo: 'pagos' }],
  ['haz la transferencia al hotel', 'fuera_alcance', { motivo: 'pagos' }],
  ['¿qué tiempo hará mañana?', 'no_entendido'],
  ['¿Qué riesgos ves en las próximas jornadas?', 'riesgos'],
  ['¿Va a llover en la jornada 8?', 'riesgos', { riesgo: 'RG-1', jornada: 8 }],
  ['¿Está publicada la orden de rodaje de mañana?', 'riesgos', { riesgo: 'RG-4' }],
  ['¿Tiene billete la actriz de la jornada 11?', 'riesgos', { riesgo: 'RG-2' }],
  ['¿Cómo va el permiso de vía pública de Canarias?', 'riesgos', { riesgo: 'RG-3' }],
  ['¿Qué riesgo hay con las horas extra de noche?', 'riesgos', { riesgo: 'RG-5' }],
  ['Prepara el aviso a transportes por el cambio de localización de la jornada 10', 'riesgos', { riesgo: 'RG-6' }],
  ['previsión del tiempo para el miércoles', 'riesgos', { riesgo: 'RG-1' }],
  ['¿y la jornada 13?', 'riesgos', { jornada: 13 }, { ultimaIntencion: 'riesgos' }],
  ['envía el informe de riesgos a producción', 'riesgos', { quiereEnviar: true }],
  ['aprueba las horas extra de Eléctricos Prado', 'aprobar_oc', { oc: 'OC-106' }],
  ['¿Tengo que dar permiso para llamar?', 'optimizar_proveedores'],
  ['¿hay algún riesgo fiscal?', 'cumplimiento'],
  ['¿Qué riesgos fiscales tenemos?', 'cumplimiento'],
  ['Pide a la agencia la factura del billete', 'pedir_documentacion'],
  ['¿Cuánto llevamos gastado en billetes de avión?', 'resumen'],
  ['¿Cómo va el permiso de rodaje?', 'riesgos', { riesgo: 'RG-3' }],
  ['¿Cómo va lo de las horas extra?', 'riesgos', { riesgo: 'RG-5' }],
  ['¿Hay que avisar a transportes?', 'riesgos', { riesgo: 'RG-6' }],
  ['¿Hay previsión de tormenta?', 'riesgos', { riesgo: 'RG-1' }],
  ['¿Hay permiso de rodaje en Las Palmas?', 'riesgos', { riesgo: 'RG-3' }],
  ['envía el informe de coste a producción', 'informe_semanal', {}, { ultimaIntencion: 'riesgos', ultimasEntidades: { riesgo: 'RG-1' } }],
  ['manda la solicitud de compra a Marta', 'aprobar_oc', {}, { ultimaIntencion: 'riesgos', ultimasEntidades: { riesgo: 'RG-1' } }],
  ['manda el aviso', 'riesgos', { quiereEnviar: true }, { ultimaIntencion: 'riesgos', ultimasEntidades: { riesgo: 'RG-4' } }],
  ['Buenos días', 'saludo'],
  ['hola', 'saludo'],
  ['Ponme al día', 'saludo'],
  ['¿Qué está pasando?', 'saludo'],
  ['Buenos días, prepárame el informe semanal', 'informe_semanal'],
  ['', 'no_entendido'],
]
const mundoBase = crearMundo()
for (const [frase, esperada, ent = {}, ctx = {}] of FRASES) {
  test(`«${frase}» → ${esperada}`, () => {
    const det = { ...detectarIntencion(frase, mundoBase, ctx) }
    let intencion = det.intencion
    // El orquestador redirige documentos dudosos o con IGIC; se comprueba igual que en la app.
    const r = responder(mundoBase, { tipo: 'texto', texto: frase }, ctx)
    intencion = r.turno.intencion
    assert.equal(intencion, esperada)
    for (const [k, val] of Object.entries(ent)) {
      if (k === 'motivo') assert.equal(det.motivo, val)
      else assert.equal(r.turno.entidades[k], val, `entidad ${k}`)
    }
  })
}
test('cada caso de uso y cada ejemplo de guion se resuelven a su intención', () => {
  for (const caso of CASOS) {
    const r = responder(mundoBase, { tipo: 'texto', texto: caso.prompt })
    assert.equal(r.turno.caso, caso.id, caso.prompt)
  }
  for (const e of Object.values(ESCENARIOS)) {
    for (const ej of e.ejemplos) assert.equal(responder(mundoBase, { tipo: 'texto', texto: ej }).turno.intencion, e.id, ej)
  }
})

// ── 3. Cifras ────────────────────────────────────────────────────────────────
console.log('Cifras')
test('desviaciones: sobrecostes, ahorros y neto', () => {
  const d = c.desviaciones(mundoBase).resumen
  const sobre = CAPITULOS_TOTAL.filter((x) => x.desviacion > 0).reduce((a, x) => a + x.desviacion, 0)
  const ahorro = CAPITULOS_TOTAL.filter((x) => x.desviacion < 0).reduce((a, x) => a + x.desviacion, 0)
  cerca(d.sobrecostes, sobre)
  cerca(d.ahorros, ahorro)
  cerca(d.neto, TOTALES.desviacion)
})
test('solo Escenografía está fuera del umbral al empezar', () => {
  assert.deepEqual(c.capitulos(mundoBase).filter((x) => x.fueraRango).map((x) => x.id), ['04'])
})
test('la caja coincide con CASHFLOW_PROYECTADO', () => {
  const tes = c.tesoreria(mundoBase)
  tes.semanas.forEach((s, i) => cerca(s.saldo, CASHFLOW_PROYECTADO[i].saldo, s.semana))
})
test('el incentivo sale del motor V2 de incentivos.js', () => {
  const coste = mundoBase.proyecto.presupuesto
  cerca(c.incentivo(mundoBase, { territorio: 'comun' }).deduccionNeta, evaluarTerritorio('comun', { coste, pctGasto: 0.65 }).deduccionNeta)
  cerca(c.incentivo(mundoBase, { territorio: 'canarias' }).deduccionNeta, evaluarTerritorio('canarias', { coste, pctGasto: 0.35 }).deduccionNeta)
  cerca(c.incentivo(mundoBase, { territorio: 'canarias', pctGasto: 0.5 }).deduccionNeta, 1_170_000)
  cerca(c.incentivo(mundoBase, { territorio: 'canarias', pctGasto: 0.5, ayudaIcaa: true }).deduccionNeta, 800_000)
})
test('el informe semanal cuenta lo que dice data.js', () => {
  const r = responder(mundoBase, { tipo: 'texto', texto: 'Prepárame el informe semanal de coste' })
  const t = c.totales(r.mundo)
  cerca(t.cef, TOTALES.cef)
  cerca(t.gastado, TOTALES.gastado + mundoBase.documentos['F-2026-067'].base)
  assert.ok(r.mundo.informes.R1, 'genera el informe')
  const kpis = r.turno.bloques.find((b) => b.tipo === 'kpis')
  cerca(kpis.items.find((k) => k.id === 'cef').valor, TOTALES.cef)
})

// ── 4. Transiciones ──────────────────────────────────────────────────────────
console.log('Transiciones')
const frio = congelar(crearMundo())
test('el reductor no muta su entrada (mundo congelado)', () => {
  let m = frio
  for (const a of [
    { tipo: 'evento/recibir', eventoId: 'EV-01' },
    { tipo: 'evento/recibir', eventoId: 'EV-02' },
    { tipo: 'documento/contabilizar', docId: 'F-2026-078' },
    { tipo: 'orden/aprobar', ocId: 'OC-104' },
    { tipo: 'orden/rechazar', ocId: 'OC-105' },
    { tipo: 'partida/ajustarCef', codigo: '01.03', cef: 12_000 },
    { tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' },
    { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 30_240 },
    { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' },
    { tipo: 'riesgo/aceptar', riesgoId: 'RG-5' },
    { tipo: 'informe/generar' },
  ]) m = reducir(m, a)
  assert.equal(c.totales(frio).cef, TOTALES.cef)
})
test('aprobar OC-104 sube el CEF solo por el exceso y mueve la caja de su semana', () => {
  let m = reducir(frio, { tipo: 'evento/recibir', eventoId: 'EV-02' })
  m = reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-104' })
  assert.equal(m.partidas['07.02'].comprometido, 30_400)
  assert.equal(m.partidas['07.02'].cef, 62_400)
  assert.equal(c.capitulo(m, '07').desviacion, 18_400)
  assert.ok(c.capitulo(m, '07').fueraRango)
  cerca(c.totales(m).cef, 2_439_400)
  cerca(c.tesoreria(m).semanas.find((s) => s.semana === 'Rodaje 3').saldo, -60_400)
  assert.equal(reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-104' }), m, 'idempotente')
})
test('aprobar solo lo previsto de OC-104 no mueve el CEF', () => {
  let m = reducir(frio, { tipo: 'evento/recibir', eventoId: 'EV-02' })
  m = reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-104', importe: c.impactoOrden(m, 'OC-104').consume })
  cerca(c.totales(m).cef, TOTALES.cef)
})
test('rechazar no cambia cifras', () => {
  const m = reducir(frio, { tipo: 'orden/rechazar', ocId: 'OC-105' })
  assert.equal(m.ordenes['OC-105'].estado, 'Rechazada')
  cerca(c.totales(m).cef, TOTALES.cef)
})
test('la factura de Grúas casa con OC-101 y no cambia la previsión', () => {
  let m = reducir(frio, { tipo: 'evento/recibir', eventoId: 'EV-01' })
  assert.equal(c.conciliar(m, 'F-2026-078').resultado, 'ok')
  m = reducir(m, { tipo: 'documento/contabilizar', docId: 'F-2026-078' })
  assert.deepEqual([m.partidas['06.02'].gastado, m.partidas['06.02'].comprometido, m.partidas['06.02'].cef], [54_000, 12_000, 70_000])
  assert.equal(m.ordenes['OC-101'].estado, 'Facturada')
})
test('el ticket en 04.01 (sin margen) sube el CEF; en 05.04 no', () => {
  const a = reducir(frio, { tipo: 'documento/contabilizar', docId: 'G-004', partida: '04.01' })
  cerca(a.partidas['04.01'].cef, 140_127.44)
  const b = reducir(frio, { tipo: 'documento/contabilizar', docId: 'G-004', partida: '05.04' })
  cerca(c.totales(b).cef, TOTALES.cef)
})
test('ajustar la previsión de 01.03 deja la desviación total en +35.000 €', () => {
  const m = reducir(frio, { tipo: 'partida/ajustarCef', codigo: '01.03', cef: 12_000 })
  cerca(c.totales(m).desviacion, 35_000)
  assert.equal(c.incoherenciasPrevision(m).length, 0)
})
test('el informe queda desactualizado si cambian las cifras', () => {
  let m = reducir(frio, { tipo: 'informe/generar' })
  assert.equal(c.informeDesactualizado(m, 'R1'), false)
  m = reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-105' })
  assert.equal(c.informeDesactualizado(m, 'R1'), true)
})
test('acciones que no proceden devuelven el mismo mundo', () => {
  assert.equal(reducir(frio, { tipo: 'orden/aprobar', ocId: 'OC-104' }), frio, 'OC-104 aún no ha llegado')
  assert.equal(reducir(frio, { tipo: 'documento/contabilizar', docId: 'F-2026-041' }), frio, 'ya contabilizada')
  assert.equal(reducir(frio, { tipo: 'nada' }), frio)
})

// ── 5. Invariantes de los turnos ─────────────────────────────────────────────
console.log('Invariantes')
function plantillas(x, out = []) {
  if (Array.isArray(x)) x.forEach((y) => plantillas(y, out))
  else if (esPlantilla(x)) out.push(x)
  else if (x && typeof x === 'object') Object.values(x).forEach((y) => plantillas(y, out))
  return out
}
function revisarTurno(turno, etiqueta) {
  for (const p of plantillas([turno.pasos.map((p) => [p.titulo, p.salida]), turno.bloques, turno.reglas, turno.noHecho])) {
    assert.ok(!/\d/.test(p.plantilla), `${etiqueta}: cifra escrita a mano en «${p.plantilla}»`)
    for (const val of Object.values(p.valores)) {
      const valor = val && typeof val === 'object' && 'formato' in val ? val.valor : val
      if (typeof valor === 'number') assert.ok(Number.isFinite(valor), `${etiqueta}: valor no finito en «${p.plantilla}»`)
    }
    renderTexto(p)
  }
  for (const p of turno.pasos) {
    assert.ok(AGENTES[p.agente], `${etiqueta}: agente desconocido ${p.agente}`)
    assert.ok(AUTONOMIA[p.autonomia], `${etiqueta}: autonomía desconocida ${p.autonomia}`)
  }
  for (const b of turno.bloques.filter((b) => b.tipo === 'aprobacion')) assert.ok(b.acciones.length >= 1 && b.ref, `${etiqueta}: aprobación sin acciones o sin referencia`)
  assert.ok(turno.duracionMs <= 9000, `${etiqueta}: ${turno.duracionMs} ms`)
}
const entradasInvariantes = [
  ...Object.values(ESCENARIOS).flatMap((e) => e.ejemplos.map((texto) => ({ tipo: 'texto', texto }))),
  ...FRASES.map(([texto]) => ({ tipo: 'texto', texto })),
  { tipo: 'evento', eventoId: 'EV-01' },
  { tipo: 'evento', eventoId: 'EV-02' },
  { tipo: 'evento', eventoId: 'EV-03' },
  { tipo: 'evento', eventoId: 'EV-RIESGOS' },
  { tipo: 'evento', eventoId: 'EV-CITACION' },
  { tipo: 'evento', eventoId: 'EV-LLUVIA' },
  { tipo: 'saludo', persona: 'marta' },
]
test('ninguna plantilla lleva cifras escritas a mano (mundo inicial)', () => {
  for (const e of entradasInvariantes) revisarTurno(responder(mundoBase, e).turno, e.texto ?? e.eventoId)
})
test('ni tras recibir todo, aprobar y contabilizar (mundo avanzado)', () => {
  let m = mundoBase
  for (const a of [
    { tipo: 'evento/recibir', eventoId: 'EV-01' },
    { tipo: 'evento/recibir', eventoId: 'EV-02' },
    { tipo: 'evento/recibir', eventoId: 'EV-03' },
    { tipo: 'evento/recibir', eventoId: 'EV-RIESGOS' },
    { tipo: 'evento/recibir', eventoId: 'EV-CITACION' },
    { tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' },
    { tipo: 'orden/aprobar', ocId: 'OC-104' },
    { tipo: 'documento/contabilizar', docId: 'G-004' },
    { tipo: 'riesgo/reservar', riesgoId: 'RG-5', importe: 6_333 },
    { tipo: 'informe/generar' },
  ]) m = reducir(m, a)
  for (const e of entradasInvariantes.filter((x) => x.tipo === 'texto')) revisarTurno(responder(m, e).turno, `avanzado: ${e.texto}`)
})
test('las decisiones de cada tarjeta producen un turno válido', () => {
  let m = reducir(mundoBase, { tipo: 'evento/recibir', eventoId: 'EV-02' })
  const turnos = ['Prepárame el informe semanal de coste', '¿Qué órdenes de compra tengo pendientes?', '¿Qué gastos tengo que revisar?', '¿Cómo cerraremos el proyecto?', '¿Qué bloquea el dossier fiscal?', 'Procesa la factura F-2026-069'].map((texto) => responder(m, { tipo: 'texto', texto }))
  for (const r of turnos) {
    for (const b of r.turno.bloques.filter((x) => x.tipo === 'aprobacion')) {
      for (const a of b.acciones) {
        const base = r.mundo
        const res = responder(base, { tipo: 'accion', accion: { ...a.accion, por: 'Prueba' } })
        revisarTurno(res.turno, `${b.id}/${a.id}`)
      }
    }
  }
})
test('los casos de uso tienen intención y los del recorrido existen', () => {
  for (const caso of CASOS) assert.ok(Object.values(CASO_DE_INTENCION).includes(caso.id), caso.id)
  assert.equal(RECORRIDO.length, 13)
})

// ── 6. Sesión con reloj falso ────────────────────────────────────────────────
console.log('Sesión')
function correr(s, ms = 20_000, paso = 100) {
  for (let t = 0; t < ms; t += paso) s = reducirSesion(s, { tipo: 'avanzar', ms: paso })
  return s
}
test('un turno se reproduce paso a paso y termina con el mismo mundo que el orquestador', () => {
  let s = crearSesion()
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'texto', texto: 'Prepárame el informe semanal de coste' } })
  const esperado = responder(crearSesion().mundo, { tipo: 'texto', texto: 'Prepárame el informe semanal de coste' }).mundo
  const msg = () => s.mensajes.find((m) => m.rol === 'agentes')
  assert.equal(msg().estado, 'en_curso')
  s = reducirSesion(s, { tipo: 'avanzar', ms: 700 })
  assert.equal(msg().estadoPasos[0], 'hecho')
  assert.ok(msg().estadoPasos.includes('en_cola'))
  s = correr(s, 10_000)
  assert.equal(msg().estado, 'hecho')
  assert.equal(msg().bloquesVisibles, msg().turno.bloques.length)
  assert.deepEqual(c.totales(s.mundo), c.totales(esperado))
  assert.ok(s.casosVistos.includes('informe'))
})
test('mientras un turno corre, lo siguiente espera en cola', () => {
  let s = reducirSesion(crearSesion(), { tipo: 'pausarEventos', valor: true })
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'texto', texto: '¿Cómo vamos?' } })
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'texto', texto: '¿Qué puedes hacer?' } })
  assert.equal(s.cola.length, 1)
  s = correr(s, 15_000)
  assert.equal(s.mensajes.filter((m) => m.rol === 'agentes' && m.estado === 'hecho').length, 2)
})
test('las novedades llegan solas tras empezar la conversación, y se pueden pausar', () => {
  let s = crearSesion()
  s = correr(s, 40_000, 500)
  assert.equal(s.mensajes.length, 0, 'sin conversación no llega nada')
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'texto', texto: '¿Cómo vamos?' } })
  s = correr(s, 15_000, 250)
  assert.ok(s.mensajes.some((m) => m.rol === 'novedad' && m.eventoId === 'EV-RIESGOS'), 'llega primero el parte de riesgos')
  s = correr(s, 30_000, 250)
  assert.ok(s.mensajes.some((m) => m.rol === 'novedad' && m.eventoId === 'EV-01'), 'después, la factura')
  assert.equal(s.mundo.documentos['F-2026-078'].estado, 'contabilizada')
  s = reducirSesion(s, { tipo: 'pausarEventos', valor: true })
  s = correr(s, 90_000, 500)
  assert.ok(!s.mensajes.some((m) => m.eventoId === 'EV-CITACION' || m.eventoId === 'EV-02'), 'en pausa no llega nada más')
})
test('aprobar desde la tarjeta y deshacer', () => {
  let s = reducirSesion(crearSesion(), { tipo: 'pausarEventos', valor: true })
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'evento', eventoId: 'EV-02' } })
  s = correr(s, 8_000)
  const tarjeta = s.mensajes.find((m) => m.rol === 'agentes').turno.bloques.find((b) => b.tipo === 'aprobacion')
  const aprobar = tarjeta.acciones.find((a) => a.id === 'aprobar')
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'accion', accion: aprobar.accion, etiqueta: 'Aprobar OC-104' } })
  s = correr(s, 8_000)
  cerca(c.totales(s.mundo).cef, 2_439_400)
  assert.equal(c.estadoDecision(s.mundo, { tipo: 'orden', id: 'OC-104' }).por, 'Marta Cobo')
  const decision = s.mensajes.filter((m) => m.rol === 'agentes').at(-1)
  assert.equal(s.ultimaMutacion?.mensajeId, decision.id)
  s = reducirSesion(s, { tipo: 'deshacer', mensajeId: decision.id })
  cerca(c.totales(s.mundo).cef, TOTALES.cef)
  assert.equal(s.mundo.ordenes['OC-104'].estado, 'Pendiente', 'vuelve a pendiente, no a «por llegar»')
})
test('el recorrido guiado completa los diez pasos y espera la decisión', () => {
  let s = reducirSesion(crearSesion(), { tipo: 'tour/iniciar' })
  for (let i = 0; i < RECORRIDO.length; i++) {
    s = correr(s, 12_000)
    const et = estadoTour(s)
    assert.equal(et.indice, i)
    if (RECORRIDO[i].espera) {
      assert.equal(et.puedeAvanzar, false, 'espera la decisión')
      const tarjeta = s.mensajes.filter((m) => m.rol === 'agentes').at(-1).turno.bloques.find((b) => b.tipo === 'aprobacion')
      s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'accion', accion: tarjeta.acciones.find((a) => a.id === 'rechazar').accion, etiqueta: 'Rechazar' } })
      s = correr(s, 8_000)
    }
    assert.equal(estadoTour(s).puedeAvanzar, true, `paso ${i + 1}`)
    s = reducirSesion(s, { tipo: 'tour/siguiente' })
  }
  assert.equal(s.tour, null)
  for (const caso of CASOS) assert.ok(s.casosVistos.includes(caso.id), `visto ${caso.id}`)
})
test('el personaje sin permiso no puede decidir y la sesión lo anota', () => {
  let s = reducirSesion(crearSesion(), { tipo: 'persona', persona: 'alvaro' })
  assert.equal(s.persona, 'alvaro')
  assert.ok(s.mensajes.at(-1).texto.includes('Álvaro Ferrer'))
})

// ── 7. Regresiones de la revisión ─────────────────────────────────────────────
console.log('Regresiones')
test('una orden pedida a producción ejecutiva sigue abierta y Marta la puede aprobar', () => {
  let m = reducir(mundoBase, { tipo: 'evento/recibir', eventoId: 'EV-02' })
  m = reducir(m, { tipo: 'orden/escalar', ocId: 'OC-104', a: 'Producción ejecutiva', por: 'Álvaro Ferrer' })
  const ed = c.estadoDecision(m, { tipo: 'orden', id: 'OC-104' })
  assert.equal(ed.estado, 'pendiente')
  assert.equal(ed.escaladaA, 'Producción ejecutiva')
  m = reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-104', por: 'Marta Cobo' })
  assert.equal(c.estadoDecision(m, { tipo: 'orden', id: 'OC-104' }).estado, 'aprobada')
})
test('dejar un gasto en revisión no lo bloquea: se puede contabilizar después', () => {
  let m = reducir(mundoBase, { tipo: 'documento/aplazar', docId: 'G-004' })
  assert.equal(c.estadoDecision(m, { tipo: 'documento', id: 'G-004' }).estado, 'pendiente')
  m = reducir(m, { tipo: 'documento/contabilizar', docId: 'G-004', partida: '05.04' })
  assert.equal(m.documentos['G-004'].estado, 'contabilizada')
})
test('una aprobación parcial se cuenta como parcial en las respuestas', () => {
  let m = reducir(mundoBase, { tipo: 'evento/recibir', eventoId: 'EV-02' })
  m = reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-104', importe: 12_000, por: 'Marta Cobo' })
  const txt = responder(m, { tipo: 'texto', texto: 'Revisa la orden de compra OC-104' }).turno.bloques.filter((b) => b.tipo === 'texto').map((b) => renderTexto(b.texto)).join(' ')
  assert.match(txt, /aprobada por 12\.000\s€ de 18\.400\s€/)
})
test('pedir otra vez el informe con las mismas cifras no borra su aprobación', () => {
  let m = responder(mundoBase, { tipo: 'texto', texto: 'Prepárame el informe semanal de coste' }).mundo
  m = reducir(m, { tipo: 'informe/aprobar', informeId: 'R1', por: 'Marta Cobo' })
  const r = responder(m, { tipo: 'texto', texto: 'informe semanal' })
  assert.equal(r.mundo.informes.R1.estado, 'aprobado')
  assert.equal(r.mundo.informes.R1.edicion, 1)
})
test('«¿Han llegado facturas nuevas?» no presenta como nueva una factura anterior', () => {
  const r = responder(mundoBase, { tipo: 'texto', texto: '¿Han llegado facturas nuevas?' })
  assert.equal(r.mundo.documentos['F-2026-067'].estado, 'en_bandeja')
  assert.ok(r.turno.bloques.some((b) => b.tipo === 'acciones'), 'ofrece simular la llegada')
})
test('no se pide documentación de una factura que casa con su pedido', () => {
  const r = responder(mundoBase, { tipo: 'texto', texto: 'escribe al proveedor de la factura F-2026-067' })
  assert.equal(Object.keys(r.mundo.borradores).length, 0)
})
test('el ticket ya contabilizado sigue pudiendo pedir su factura completa', () => {
  const m = reducir(mundoBase, { tipo: 'documento/contabilizar', docId: 'G-004', partida: '04.01' })
  const r = responder(m, { tipo: 'texto', texto: 'Pide a Ferretería El Tornillo la factura completa' })
  assert.ok(r.mundo.borradores['BOR-G-004'])
})
test('la salida de Previsión tras contabilizar el ticket coincide con la partida', () => {
  const r = responder(mundoBase, { tipo: 'accion', accion: { tipo: 'documento/contabilizar', docId: 'G-004', partida: '04.01', por: 'Marta Cobo' } })
  const salida = renderTexto(r.turno.pasos.find((p) => p.agente === 'prevision').salida)
  assert.match(salida, /\+127\s€/)
})
test('una novedad no llega dos veces', () => {
  let s = crearSesion()
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'evento', eventoId: 'EV-01' } })
  s = correr(s, 8_000)
  const n = s.mensajes.length
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'evento', eventoId: 'EV-01' } })
  assert.equal(s.mensajes.length, n)
})
test('deshacer conserva el borrador redactado después', () => {
  let s = crearSesion()
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'accion', accion: { tipo: 'orden/aprobar', ocId: 'OC-106' }, etiqueta: 'Aprobar OC-106' } })
  s = correr(s, 6_000)
  const decision = s.mensajes.filter((m) => m.rol === 'agentes').at(-1)
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'texto', texto: 'Pide a Ferretería El Tornillo la factura completa' } })
  s = correr(s, 6_000)
  s = reducirSesion(s, { tipo: 'deshacer', mensajeId: decision.id })
  assert.equal(s.mundo.ordenes['OC-106'].estado, 'Pendiente')
  assert.ok(s.mundo.borradores['BOR-G-004'], 'el borrador sigue')
})

// ── 8. Primera propuesta de presupuesto ──────────────────────────────────────
console.log('Propuesta de presupuesto')
test('la propuesta parte de los costes aportados y el reparto ICAA de Itsasoa', () => {
  const t0 = totalesPropuesta(mundoBase)
  assert.equal(t0.objetivo, 1_200_000)
  cerca(t0.detallado, 212_500)
  cerca(t0.total, 1_204_100)
})
test('cada guion de llamada dice el mismo precio final que su ficha', () => {
  for (const a of ALTERNATIVAS.filter((x) => x.llamada)) {
    const dicho = a.llamada.guion.map(([, txt]) => txt).join(' ')
    assert.ok(dicho.includes(eur(a.llamada.precioFinal).replace(/\u00a0/g, ' ')) || dicho.includes(eur(a.llamada.precioFinal)), `${a.proveedor}: ${eur(a.llamada.precioFinal)}`)
    const extras = a.llamada.extras.reduce((x, e) => x + e.importe, 0)
    assert.equal(a.referencia + extras, a.llamada.precioFinal, `${a.proveedor}: referencia + extras`)
  }
})
test('optimizar: descarta por ficha, pide permiso y no llama sin él', () => {
  const r = responder(mundoBase, { tipo: 'texto', texto: 'Optimiza los proveedores de la propuesta' })
  assert.equal(r.mundo.propuesta.autorizacion, 'pendiente')
  assert.equal(Object.keys(r.mundo.propuesta.llamadas).length, 0)
  assert.deepEqual(optimizacion(r.mundo).filter((a) => a.descartada).map((a) => a.id), ['A2', 'A4'])
  assert.ok(r.turno.bloques.some((b) => b.tipo === 'aprobacion' && b.ref.tipo === 'llamadas'))
})
test('autorizar → cuatro llamadas → elegir las tres mejores deja la propuesta por debajo del objetivo', () => {
  let m = responder(mundoBase, { tipo: 'texto', texto: 'Optimiza los proveedores de la propuesta' }).mundo
  const r = responder(m, { tipo: 'accion', accion: { tipo: 'propuesta/autorizarLlamadas', por: 'Prueba' } })
  revisarTurno(r.turno, 'autorizar llamadas')
  m = r.mundo
  assert.equal(Object.keys(m.propuesta.llamadas).length, 4)
  assert.equal(m.propuesta.llamadas.A3.cumple, false)
  const tarjetas = r.turno.bloques.filter((b) => b.tipo === 'aprobacion')
  assert.equal(tarjetas.length, 3)
  assert.equal(r.turno.bloques.filter((b) => b.tipo === 'llamada').length, 4)
  for (const tj of tarjetas) {
    const res = responder(m, { tipo: 'accion', accion: { ...tj.acciones.find((x) => x.id === 'aprobar').accion, por: 'Prueba' } })
    revisarTurno(res.turno, tj.id)
    m = res.mundo
  }
  cerca(totalesPropuesta(m).total, 1_199_600)
  assert.ok(totalesPropuesta(m).diferencia < 0)
})
test('añadir un coste escrito sustituye lo estimado de su capítulo', () => {
  const r = responder(mundoBase, { tipo: 'texto', texto: 'Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €' })
  assert.equal(r.turno.intencion, 'anadir_coste')
  const l = r.mundo.propuesta.lineas.at(-1)
  assert.equal(l.partida, '06.02')
  assert.equal(l.importe, 3_200)
  assert.equal(l.proveedor, 'Dron Services Madrid')
  // El capítulo 06 ya no tenía estimación por detallar: el total sube.
  cerca(totalesPropuesta(r.mundo).total, 1_207_300)
  revisarTurno(r.turno, 'añadir coste')
})

// ── 9. Riesgos de producción (exploratorio) ──────────────────────────────────
console.log('Riesgos de producción')
test('plan: hoy es la jornada 7, solo laborables, semanas de la caja y la 20 cierra', () => {
  const m = crearMundo()
  const js = m.rodaje.jornadas
  assert.equal(js[0].n, m.proyecto.diaActual)
  assert.equal(m.proyecto.diaActual, 7)
  assert.equal(HECHAS.length, m.proyecto.diaActual - 1, 'van seis hechas')
  assert.ok(HECHAS.every((j, i) => j.n === i + 1 && j.fecha < CORTE.fecha), 'las hechas, antes de hoy y en orden')
  assert.equal(js[0].fecha, CORTE.fecha)
  assert.equal(js.at(-1).n, m.proyecto.diasRodaje)
  for (const j of js) {
    const dia = new Date(`${j.fecha}T12:00:00Z`).getUTCDay()
    assert.ok(dia >= 1 && dia <= 5, `J${j.n} cae en laborable`)
    assert.ok(CASHFLOW.some((s) => s.semana === j.semana), `J${j.n} semana ${j.semana}`)
    assert.ok(LOCALIZACIONES.includes(j.localizacion), `J${j.n} localización`)
  }
  const a = crearMundo()
  a.rodaje.jornadas[1].tipo = 'INT'
  assert.equal(crearMundo().rodaje.jornadas[1].tipo, 'EXT', 'copias independientes')
  assert.equal(JORNADAS[1].tipo, 'EXT')
})
test('cifras de los riesgos y severidad inicial', () => {
  const r = Object.fromEntries(evaluarRiesgos(mundoBase).map((x) => [x.id, x]))
  cerca(r['RG-1'].exposicion, 33_600)
  cerca(r['RG-1'].reserva, 26_880)
  cerca(r['RG-2'].exposicion, 79_200)
  // OC-106 pagó tres noches; quedan dos: 9.800 / 3 × 2 = 6.533,33 €, menos los 200 € de margen de 03.03.
  cerca(r['RG-5'].reserva, 6_333)
  assert.equal(r['RG-3'].exposicion, null)
  assert.deepEqual(evaluarRiesgos(mundoBase).filter((x) => x.severidad === 'alta').map((x) => x.id), ['RG-1'])
  assert.deepEqual(decisionesRiesgos(mundoBase).map((d) => d.ref.id), ['RG-1', 'RG-5'])
})
test('reservar RG-1: sube el CEF sin tocar capítulos ni caja, y el neto cuadra', () => {
  const m = reducir(frio, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880, por: 'Marta Cobo' })
  cerca(c.totales(m).cef, TOTALES.cef + 26_880)
  for (const ref of CAPITULOS_TOTAL) cerca(c.capitulo(m, ref.id).cef, ref.cef, ref.id)
  cerca(c.desviaciones(m).resumen.neto, c.totales(m).desviacion)
  c.tesoreria(m).semanas.forEach((s, i) => cerca(s.saldo, CASHFLOW_PROYECTADO[i].saldo, s.semana))
  const tarjeta = responder(mundoBase, { tipo: 'texto', texto: '¿Va a llover en la jornada 8?' }).turno.bloques.find((b) => b.tipo === 'aprobacion')
  const reservar = tarjeta.acciones.find((a) => a.id === 'reservar')
  assert.equal(reservar.rol, 'Producción ejecutiva')
  assert.equal(puedeDecidir('Line producer', reservar.rol), false)
})
test('cambiar el orden de jornadas: J8 pasa a interior, cifras iguales e idempotente', () => {
  const m = reducir(frio, { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' })
  assert.equal(m.rodaje.jornadas.find((j) => j.n === 8).tipo, 'INT')
  assert.equal(m.rodaje.jornadas.find((j) => j.n === 8).fecha, '2026-06-03')
  cerca(c.totales(m).cef, TOTALES.cef)
  assert.equal(riesgoDe(m, 'RG-1').estado, 'mitigado')
  assert.equal(reducir(m, { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' }), m)
  let r = reducir(frio, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880 })
  r = reducir(r, { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' })
  cerca(c.totales(r).cef, TOTALES.cef, 'mitigar libera la reserva')
})
test('la lluvia sube al 90 %: propone 30.240 €; tras el cambio de orden ya no afecta', () => {
  const m = reducir(frio, { tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' })
  cerca(riesgoDe(m, 'RG-1').reserva, 30_240)
  let mit = reducir(frio, { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' })
  const r = responder(mit, { tipo: 'evento', eventoId: 'EV-LLUVIA' })
  assert.ok(!r.turno.bloques.some((b) => b.tipo === 'aprobacion'))
  assert.match(r.turno.bloques.filter((b) => b.tipo === 'texto').map((b) => renderTexto(b.texto)).join(' '), /no afecta/)
  // Con reserva aprobada, la tarjeta nueva vuelve a estar abierta para ajustarla.
  let res = reducir(frio, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880 })
  const r2 = responder(res, { tipo: 'evento', eventoId: 'EV-LLUVIA' })
  const tj = r2.turno.bloques.find((b) => b.tipo === 'aprobacion')
  assert.equal(c.estadoDecision(r2.mundo, tj.ref).estado, 'pendiente')
  res = reducir(r2.mundo, { ...tj.acciones.find((a) => a.id === 'reservar').accion })
  cerca(c.totales(res).cef, TOTALES.cef + 30_240)
})
test('la alerta de la orden del día hace RG-4 alto y deja su borrador', () => {
  const r = responder(mundoBase, { tipo: 'evento', eventoId: 'EV-CITACION' })
  assert.equal(riesgoDe(r.mundo, 'RG-4').severidad, 'alta')
  assert.ok(r.mundo.borradores['BOR-RG-4'])
})
test('acciones de riesgo que no proceden devuelven el mismo mundo', () => {
  const m = reducir(frio, { tipo: 'riesgo/aceptar', riesgoId: 'RG-5' })
  assert.equal(reducir(m, { tipo: 'riesgo/aceptar', riesgoId: 'RG-5' }), m)
  assert.equal(reducir(m, { tipo: 'riesgo/reservar', riesgoId: 'RG-5', importe: 6_333 }), m)
  assert.equal(reducir(frio, { tipo: 'riesgo/mitigar', riesgoId: 'RG-3' }), frio)
  assert.equal(reducir(frio, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 0 }), frio)
})
test('borradores y radar sin cifras escritas a mano; turnos con «Exploratorio» y sin envíos', () => {
  const mundos = [mundoBase]
  let m = reducir(mundoBase, { tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' })
  m = reducir(m, { tipo: 'evento/recibir', eventoId: 'EV-CITACION' })
  mundos.push(m, reducir(m, { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' }))
  for (const mm of mundos) {
    for (const r of evaluarRiesgos(mm)) for (const p of plantillas(r)) assert.ok(!/\d/.test(p.plantilla), `radar: «${p.plantilla}»`)
  }
  for (const texto of ['¿Qué riesgos hay para las próximas jornadas?', '¿Tiene billete la actriz de la jornada 11?', '¿Cómo va el permiso de vía pública de Canarias?', 'Prepara el aviso a transportes por el cambio de localización de la jornada 10', '¿Está publicada la orden de rodaje de mañana?']) {
    const r = responder(mundoBase, { tipo: 'texto', texto })
    revisarTurno(r.turno, texto)
    assert.equal(r.turno.bloques[0].tipo, 'aviso', `${texto}: empieza con el aviso`)
    assert.equal(r.turno.bloques[0].tono, 'exploratorio')
    assert.ok(r.turno.noHecho.some((n) => /No ha enviado/.test(renderTexto(n))))
    for (const b of Object.values(r.mundo.borradores)) for (const p of plantillas(b)) assert.ok(!/\d/.test(p.plantilla), `borrador: «${p.plantilla}»`)
  }
  const dec = responder(mundoBase, { tipo: 'accion', accion: { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar', por: 'Prueba' } })
  revisarTurno(dec.turno, 'mitigar RG-1')
  assert.ok(dec.mundo.borradores['BOR-CAMBIO-EQUIPO'] && dec.mundo.borradores['BOR-CAMBIO-TRANSPORTE'], 'avisa al equipo y a transportes')
  for (const id of ['BOR-CAMBIO-EQUIPO', 'BOR-CAMBIO-TRANSPORTE']) for (const p of plantillas(dec.mundo.borradores[id])) assert.ok(!/\d/.test(p.plantilla), `aviso de cambio: «${p.plantilla}»`)
})
test('si se pregunta antes, el parte no vuelve a llegar solo', () => {
  const r = responder(mundoBase, { tipo: 'texto', texto: '¿Qué riesgos hay para las próximas jornadas?' })
  assert.ok(!r.mundo.entrantes.includes('EV-RIESGOS'))
})
test('deshacer el cambio de orden restaura el plan y conserva la lluvia posterior', () => {
  let s = reducirSesion(crearSesion(), { tipo: 'pausarEventos', valor: true })
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'accion', accion: { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' }, etiqueta: 'Cambiar el orden' } })
  s = correr(s, 8_000)
  const decision = s.mensajes.filter((m) => m.rol === 'agentes').at(-1)
  assert.equal(s.ultimaMutacion?.mensajeId, decision.id)
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'evento', eventoId: 'EV-LLUVIA' } })
  s = correr(s, 8_000)
  assert.equal(s.ultimaMutacion?.mensajeId, decision.id, 'la novedad no borra el deshacer')
  s = reducirSesion(s, { tipo: 'deshacer', mensajeId: decision.id })
  assert.equal(s.mundo.rodaje.jornadas.find((j) => j.n === 8).tipo, 'EXT')
  assert.equal(s.mundo.rodaje.meteo['2026-06-03'], 0.9)
  assert.ok(!s.mundo.borradores['BOR-CAMBIO-EQUIPO'] && !s.mundo.borradores['BOR-CAMBIO-TRANSPORTE'], 'los avisos del cambio se van con el cambio')
})

// ── 10. Regresiones de la revisión del agente de riesgos ─────────────────────
console.log('Riesgos · regresiones')
test('con una reserva aprobada, la tarjeta nueva enseña el coste final que de verdad queda', () => {
  let m = reducir(mundoBase, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880 })
  const r = responder(m, { tipo: 'evento', eventoId: 'EV-LLUVIA' })
  m = r.mundo
  const tj = r.turno.bloques.find((b) => b.tipo === 'aprobacion')
  const fila = (txt) => tj.impacto.find((f) => f.etiqueta.startsWith(txt))
  const tras = (accion) => c.totales(reducir(m, accion)).cef
  cerca(fila('Reservar').despues, tras(tj.acciones.find((a) => a.id === 'reservar').accion))
  cerca(fila('Cambiar').despues, tras(tj.acciones.find((a) => a.id === 'aprobar').accion))
  cerca(fila('Asumir').despues, tras(tj.acciones.find((a) => a.id === 'rechazar').accion))
})
test('la tarjeta del parte caduca cuando cambia la previsión y no deja volver a un importe antiguo', () => {
  const parte = responder(mundoBase, { tipo: 'texto', texto: '¿Qué riesgos hay para las próximas jornadas?' })
  const vieja = parte.turno.bloques.find((b) => b.tipo === 'aprobacion' && b.ref.id === 'RG-1')
  let m = reducir(parte.mundo, { tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' })
  assert.equal(c.estadoDecision(m, vieja.ref).estado, 'desactualizada')
  assert.equal(reducir(m, vieja.acciones.find((a) => a.id === 'reservar').accion), m, 'no reserva un importe caducado')
  m = reducir(m, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 30_240 })
  assert.equal(c.estadoDecision(m, vieja.ref).estado, 'desactualizada')
})
test('una reserva que se queda corta es una decisión abierta y el detalle deja ajustarla', () => {
  let m = reducir(mundoBase, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880 })
  m = reducir(m, { tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' })
  assert.ok(decisionesRiesgos(m).some((d) => d.ref.id === 'RG-1'))
  const r = responder(m, { tipo: 'texto', texto: '¿Va a llover en la jornada 8?' })
  const tj = r.turno.bloques.find((b) => b.tipo === 'aprobacion')
  assert.ok(tj && tj.acciones.some((a) => a.id === 'reservar'))
})
test('asumir con reserva la libera; tras asumir se puede cambiar el plan; asumido no es «controlado»', () => {
  let m = reducir(mundoBase, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880 })
  m = reducir(m, { tipo: 'riesgo/aceptar', riesgoId: 'RG-1' })
  cerca(c.totales(m).cef, TOTALES.cef)
  assert.equal(riesgoDe(m, 'RG-1').severidad, 'alta')
  assert.ok(evaluarRiesgos(m).some((x) => x.id === 'RG-1' && x.estado === 'aceptado'))
  const r = responder(m, { tipo: 'evento', eventoId: 'EV-LLUVIA' })
  const tj = r.turno.bloques.find((b) => b.tipo === 'aprobacion')
  assert.deepEqual(tj.acciones.map((a) => a.id), ['aprobar'])
  assert.equal(c.estadoDecision(r.mundo, tj.ref).estado, 'pendiente')
  m = reducir(r.mundo, tj.acciones[0].accion)
  assert.equal(riesgoDe(m, 'RG-1').estado, 'mitigado')
})
test('tras cambiar el orden, RG-1 sigue hablando de la jornada 8 y dice que está resuelto', () => {
  const m = reducir(mundoBase, { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar' })
  const r = riesgoDe(m, 'RG-1')
  assert.deepEqual(r.jornadas, [8])
  assert.match(renderTexto(r.respuesta), /Orden cambiado/)
  const txt = responder(reducir(mundoBase, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880 }), { tipo: 'accion', accion: { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar', por: 'Prueba' } })
  assert.match(txt.turno.bloques.filter((b) => b.tipo === 'texto').map((b) => renderTexto(b.texto)).join(' '), /Se libera la reserva/)
})
test('el informe se desactualiza con reservas o riesgos altos nuevos, y las desviaciones nombran la reserva', () => {
  let m = responder(mundoBase, { tipo: 'texto', texto: 'Prepárame el informe semanal de coste' }).mundo
  assert.equal(c.informeDesactualizado(m, 'R1'), false)
  const conReserva = reducir(m, { tipo: 'riesgo/reservar', riesgoId: 'RG-1', importe: 26_880 })
  assert.equal(c.informeDesactualizado(conReserva, 'R1'), true)
  const citacion = reducir(m, { tipo: 'evento/recibir', eventoId: 'EV-CITACION' })
  assert.equal(c.informeDesactualizado(citacion, 'R1'), true)
  const d = responder(conReserva, { tipo: 'texto', texto: '¿Qué capítulos están fuera de rango?' })
  assert.match(d.turno.bloques.filter((b) => b.tipo === 'texto').map((b) => renderTexto(b.texto)).join(' '), /reservas de riesgos/)
})
test('preguntas por jornadas: la que tiene riesgo, una sin riesgo, una ya rodada y una fuera del plan', () => {
  const sin = responder(mundoBase, { tipo: 'texto', texto: '¿Va a llover en la jornada 19?' })
  assert.match(renderTexto(sin.turno.bloques.find((b) => b.tipo === 'texto').texto), /Jornada 19.*No veo riesgos/)
  const hecha = responder(mundoBase, { tipo: 'texto', texto: '¿Qué pasa con la jornada 4?' }, { ultimaIntencion: 'riesgos' })
  assert.match(renderTexto(hecha.turno.bloques.find((b) => b.tipo === 'texto').texto), /ya se rodó/)
  const fuera = responder(mundoBase, { tipo: 'texto', texto: '¿Qué pasa con la jornada 25?' }, { ultimaIntencion: 'riesgos' })
  assert.match(renderTexto(fuera.turno.bloques.find((b) => b.tipo === 'texto').texto), /fuera del plan/)
  const con = responder(mundoBase, { tipo: 'texto', texto: '¿y la jornada 13?' }, { ultimaIntencion: 'riesgos' })
  assert.ok(con.turno.bloques.some((b) => b.tipo === 'borrador'), 'la 13 es el permiso: prepara el aviso')
})
test('un aviso descartado se puede volver a preparar', () => {
  let m = responder(mundoBase, { tipo: 'texto', texto: '¿Está publicada la orden de rodaje de mañana?' }).mundo
  m = reducir(m, { tipo: 'borrador/descartar', id: 'BOR-RG-4' })
  assert.equal(riesgoDe(m, 'RG-4').estado, 'abierto')
  m = responder(m, { tipo: 'texto', texto: '¿Está publicada la orden de rodaje de mañana?' }).mundo
  assert.equal(m.borradores['BOR-RG-4'].estado, 'borrador')
})
test('ningún guion de riesgos pasa números escritos a mano como valor', () => {
  const dir = new URL('../src/agentes/escenarios/', import.meta.url)
  const ficheros = [...readdirSync(dir).map((f) => new URL(f, dir)), new URL('../src/agentes/rodaje.js', import.meta.url)].filter((u) => /riesgos|decisiones|rodaje/.test(u.pathname))
  for (const u of ficheros) {
    const src = readFileSync(u, 'utf8')
    const malos = src.match(/\bv\(\s*\d[\d_]*\s*[,)]/g)
    assert.ok(!malos, `${u.pathname.split('/').pop()}: ${malos}`)
  }
})
test('cada agente pertenece a una familia de la marca y el Orquestador a ninguna', () => {
  assert.deepEqual(Object.keys(FAMILIAS).sort(), [...ORDEN_FAMILIAS].sort())
  for (const id of ORDEN_AGENTES) {
    const f = AGENTES[id].familia
    if (id === 'orquestador') assert.equal(f, null, 'el Orquestador lleva el símbolo, no un glifo')
    else assert.ok(FAMILIAS[f], `${id}: familia desconocida ${f}`)
  }
  assert.equal(ORDEN_FAMILIAS.flatMap(agentesDeFamilia).length, ORDEN_AGENTES.length - 1, 'todo agente sale en el carril, salvo el Orquestador')
  for (const f of ORDEN_FAMILIAS) assert.ok(agentesDeFamilia(f).length > 0, `${f}: familia vacía`)
})
test('ni la portada ni los agentes mencionan la marca anterior ni la demo clásica', () => {
  const dir = new URL('../src/', import.meta.url)
  const ficheros = readdirSync(dir, { recursive: true }).filter((f) => /\.(js|jsx|css)$/.test(f))
  for (const f of ficheros) {
    const src = readFileSync(new URL(f, dir), 'utf8')
    assert.ok(!/SetValio/i.test(src), `${f} menciona SetValio`)
    assert.ok(!/demo cl[aá]sica/i.test(src), `${f} menciona la demo clásica`)
  }
})
test('la portada enseña las cifras del agente de riesgos', () => {
  const src = readFileSync(new URL('../src/screens/Landing.jsx', import.meta.url), 'utf8')
  const rs = evaluarRiesgos(crearMundo())
  const enJuego = rs.reduce((s, r) => s + (r.exposicion ?? 0), 0)
  const lluvia = rs.find((r) => r.id === 'RG-1')
  assert.ok(src.includes(`const RIESGO = { enJuego: ${enJuego}, ahorrado: ${lluvia.reserva} }`), `en juego ${enJuego}, ahorrado ${lluvia.reserva}`)
  assert.ok(src.includes(`${Math.round(lluvia.probabilidad * 100)} % de lluvia en el exterior de la jornada ${lluvia.jornadas[0]}: propone cambiarla por la ${lluvia.intercambio}`))
  assert.ok(src.includes(`pregunta: '${PREGUNTA['RG-1']}'`))
  assert.equal(responder(crearMundo(), { tipo: 'texto', texto: PREGUNTA['RG-1'] }).turno.intencion, 'riesgos')
})

// ── 11. Parte de la mañana ───────────────────────────────────────────────────
console.log('Parte de la mañana')
const textoDe = (b) => renderTexto(b.texto)
test('saludar abre la conversación con el parte, una sola vez, y se reproduce como cualquier turno', () => {
  let s = reducirSesion(crearSesion(), { tipo: 'saludar' })
  assert.equal(s.mensajes.length, 1)
  const msg = () => s.mensajes[0]
  assert.equal(msg().origen, 'saludo')
  assert.equal(msg().turno.intencion, 'saludo')
  assert.equal(msg().estado, 'en_curso')
  assert.deepEqual([msg().turno.entidades.dia, msg().turno.entidades.total, msg().turno.entidades.persona], [7, 20, 'marta'])
  assert.equal(reducirSesion(s, { tipo: 'saludar' }), s, 'no saluda dos veces')
  assert.ok(msg().turno.duracionMs <= 9000)
  s = correr(s, 8_000)
  assert.equal(msg().estado, 'hecho')
  assert.equal(msg().bloquesVisibles, msg().turno.bloques.length)
  assert.ok(!s.mundo.entrantes.includes('EV-RIESGOS'), 'el parte ya cuenta los riesgos: el parte de riesgos no llega solo')
  const inst = reducirSesion(crearSesion(), { tipo: 'saludar', instantaneo: true })
  assert.equal(inst.mensajes[0].estado, 'hecho')
  assert.equal(inst.activo, null)
})
test('el parte no cuenta como conversación: las novedades esperan a que pidas algo', () => {
  let s = reducirSesion(crearSesion(), { tipo: 'saludar' })
  s = correr(s, 60_000, 500)
  assert.equal(s.mensajes.length, 1, 'solo el parte')
  assert.equal(conversacionIniciada(s), false)
  s = reducirSesion(s, { tipo: 'enviar', entrada: { tipo: 'texto', texto: '¿Cómo vamos?' } })
  s = correr(s, 30_000, 250)
  assert.ok(conversacionIniciada(s))
  assert.ok(s.mensajes.some((m) => m.rol === 'novedad' && m.eventoId === 'EV-01'), 'la primera novedad es la factura')
  assert.ok(!s.mensajes.some((m) => m.rol === 'novedad' && m.eventoId === 'EV-RIESGOS'))
})
test('el recorrido empieza con el parte ya leído y Álvaro recibe su propio saludo', () => {
  const s = reducirSesion(crearSesion(), { tipo: 'tour/iniciar' })
  assert.equal(s.mensajes[0].origen, 'saludo')
  assert.equal(s.mensajes[0].estado, 'hecho')
  assert.equal(s.mensajes[1].rol, 'guia')
  const a = reducirSesion(crearSesion({ persona: 'alvaro' }), { tipo: 'saludar' })
  assert.equal(a.mensajes[0].turno.entidades.persona, 'alvaro')
})
test('el parte cuenta el día 7 de 20 con las cifras del mundo', () => {
  const r = responder(mundoBase, { tipo: 'saludo', persona: 'marta' })
  revisarTurno(r.turno, 'parte de la mañana')
  const lead = r.turno.bloques.find((b) => b.tipo === 'texto' && b.destacado)
  const txt = textoDe(lead)
  assert.match(txt, /jornada 7 en Madrid centro/)
  assert.match(txt, /van 6 de 20/)
  assert.match(txt, /viernes 19 de junio/)
  assert.ok(txt.includes(eur(TOTALES.cef)), 'coste estimado final')
  assert.match(txt, /Escenografía es el único capítulo/)
  assert.match(txt, /jornada 8 de mañana, un exterior con un 80\s%/)
  const kpis = Object.fromEntries(r.turno.bloques.find((b) => b.tipo === 'kpis').items.map((k) => [k.id, k.valor]))
  cerca(kpis.cef, TOTALES.cef)
  cerca(kpis.gastado, TOTALES.gastado)
  cerca(kpis.caja, SALDO_HOY)
  assert.equal(kpis.revisar, 8)
  for (const tipo of ['tira', 'agenda', 'semana', 'equipo']) assert.ok(r.turno.bloques.some((b) => b.tipo === tipo), `bloque ${tipo}`)
  assert.equal(r.turno.bloques.find((b) => b.tipo === 'semana').semana, 'Rodaje 2')
})
test('«Para hoy»: lluvia de mañana, avisos, compras y certificado, en ese orden', () => {
  const ag = agendaDelDia(mundoBase)
  assert.deepEqual(ag.items.map((i) => i.id), ['riesgo-RG-1', 'avisos', 'compras', 'dossier-DOS-01'])
  assert.deepEqual(ag.items[1].subitems.map((s) => s.id), ['RG-4', 'RG-6', 'RG-2'])
  assert.deepEqual(ag.items[2].subitems.map((s) => s.id), ['OC-105', 'OC-106'])
  assert.match(renderTexto(ag.items[0].cuando), /antes de publicar su orden del día/)
  assert.match(renderTexto(ag.items[3].detalle), /620\.000\s€/)
  assert.equal(ag.resto, 5)
})
test('cada botón del parte lleva a un guion que lo resuelve', () => {
  const ag = agendaDelDia(mundoBase)
  const entradas = ag.items.flatMap((i) => [...(i.acciones ?? []).map((a) => a.entrada), ...(i.subitems ?? []).map((s) => s.entrada), i.entrada])
  for (const e of [...new Set(entradas), ...Object.values(PREGUNTAS_PARTE)]) {
    const r = responder(mundoBase, { tipo: 'texto', texto: e })
    assert.ok(!['no_entendido', 'desambiguar'].includes(r.turno.intencion), `${e} → ${r.turno.intencion}`)
  }
  assert.equal(responder(mundoBase, { tipo: 'texto', texto: 'Revisa la orden de compra OC-106' }).turno.entidades.oc, 'OC-106')
})
test('lo decidido sale de «Para hoy» y el parte se rehace con lo que queda', () => {
  let m = reducir(mundoBase, { tipo: 'riesgo/mitigar', riesgoId: 'RG-1', opcion: 'permutar', por: 'Marta Cobo' })
  m = reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-105', por: 'Marta Cobo' })
  m = reducir(m, { tipo: 'orden/rechazar', ocId: 'OC-106', por: 'Marta Cobo' })
  const ag = agendaDelDia(m)
  assert.ok(!ag.items.some((i) => i.id === 'riesgo-RG-1' || i.id === 'compras'))
  assert.equal(ag.items[0].id, 'avisos')
  const r = responder(m, { tipo: 'texto', texto: 'Ponme al día' })
  revisarTurno(r.turno, 'parte pedido')
  assert.equal(r.turno.intencion, 'saludo')
  assert.match(textoDe(r.turno.bloques[0]), /El parte del día 7 de rodaje/)
  assert.match(textoDe(r.turno.bloques.find((b) => b.destacado)), /Lo primero hoy: preparar 3 avisos/)
})

console.log(`\n${total - fallos}/${total} comprobaciones correctas`)
if (fallos) process.exit(1)
