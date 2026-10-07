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
import { CAPITULOS, CAPITULOS_TOTAL, TOTALES, CASHFLOW_PROYECTADO } from '../src/lib/data.js'
import { evaluarTerritorio } from '../src/lib/incentivos.js'
import { crearMundo, CORTE } from '../src/agentes/mundo.js'
import * as c from '../src/agentes/calculos.js'
import { reducir } from '../src/agentes/acciones.js'
import { detectarIntencion } from '../src/agentes/intenciones.js'
import { responder } from '../src/agentes/orquestador.js'
import { ESCENARIOS } from '../src/agentes/escenarios/index.js'
import { AGENTES, AUTONOMIA } from '../src/agentes/agentes.js'
import { CASOS, RECORRIDO, CASO_DE_INTENCION } from '../src/agentes/casos.js'
import { crearSesion, reducirSesion, estadoTour } from '../src/agentes/sesion.js'
import { esPlantilla, renderTexto } from '../src/agentes/texto.js'

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
  assert.ok(r.mundo.informes.R3, 'genera el informe')
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
  cerca(c.tesoreria(m).semanas.find((s) => s.semana === 'Rodaje 5').saldo, -60_400)
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
  assert.equal(c.informeDesactualizado(m, 'R3'), false)
  m = reducir(m, { tipo: 'orden/aprobar', ocId: 'OC-105' })
  assert.equal(c.informeDesactualizado(m, 'R3'), true)
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
    { tipo: 'orden/aprobar', ocId: 'OC-104' },
    { tipo: 'documento/contabilizar', docId: 'G-004' },
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
  assert.equal(RECORRIDO.length, 10)
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
  let s = crearSesion()
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
  s = correr(s, 25_000, 250)
  assert.ok(s.mensajes.some((m) => m.rol === 'novedad' && m.eventoId === 'EV-01'), 'llega EV-01')
  assert.equal(s.mundo.documentos['F-2026-078'].estado, 'contabilizada')
  s = reducirSesion(s, { tipo: 'pausarEventos', valor: true })
  s = correr(s, 60_000, 500)
  assert.ok(!s.mensajes.some((m) => m.eventoId === 'EV-02'), 'en pausa no llega EV-02')
})
test('aprobar desde la tarjeta y deshacer', () => {
  let s = crearSesion()
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

console.log(`\n${total - fallos}/${total} comprobaciones correctas`)
if (fallos) process.exit(1)
