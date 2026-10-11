// Piezas comunes de los guiones: pasos, bloques y sugerencias.

import { DURACIONES } from '../agentes.js'
import { t, v, esPlantilla } from '../texto.js'
import * as c from '../calculos.js'
import { POLITICAS } from '../politicas.js'

export { t, v, c, POLITICAS }

export function paso(agente, titulo, { autonomia = 'ejecuta', tipo = 'calculo', acciones = [], salida = null, paralelo = false } = {}) {
  return { agente, titulo, autonomia, duracionMs: DURACIONES[tipo] ?? DURACIONES.calculo, acciones, salida, paralelo }
}

export const sug = (texto) => ({ etiqueta: texto, texto })

// ── Nombres para la prosa ──────────────────────────────────────────────────
// Primero el nombre y, si hace falta, el código: «Construcción de decorados», no «04.01».

/** Nombre de una partida sin su código. */
export const nombrePartida = (m, codigo) => m.partidas[codigo]?.nombre ?? codigo

/** Nombre corto de un capítulo: «Viajes, hoteles y comidas» → «Viajes». */
export const nombreCorto = (nombre) => String(nombre ?? '').split(',')[0]

/** «08–14 jun» → «8 al 14 jun». */
export const semanaDel = (fechas) => String(fechas ?? '').replace('–', ' al ').replace(/\b0(\d)/g, '$1')

/** Primera letra en minúscula, para nombrar algo a mitad de frase; también dentro de una plantilla. */
export function minuscula(x) {
  if (esPlantilla(x)) return { ...x, plantilla: x.plantilla.charAt(0).toLowerCase() + x.plantilla.slice(1) }
  const s = String(x ?? '')
  return s.charAt(0).toLowerCase() + s.slice(1)
}

// Los cargos llevan artículo («el line producer»); los departamentos, no («producción ejecutiva»).
const CARGO = /^(line producer|jefe|fiscalista|director)\b/

/** Artículo de un rol: 'el' para un cargo, '' para un departamento. Va en la plantilla, fuera del valor resaltado. */
export const articulo = (s) => (CARGO.test(minuscula(s)) ? 'el' : '')

/** Rol o solicitante a mitad de frase: «el line producer», «producción ejecutiva». */
export const quien = (s) => (articulo(s) ? `el ${minuscula(s)}` : minuscula(s))

/** Con «a» delante, con la contracción: «al line producer», «a producción ejecutiva». */
export const aQuien = (s) => quien(s).replace(/^el /, 'al ').replace(/^(?!al )/, 'a ')

// ── Bloques ─────────────────────────────────────────────────────────────────

export const texto = (tx) => ({ tipo: 'texto', texto: tx })

export function aviso(tono, titulo, tx) {
  return { tipo: 'aviso', tono, titulo, texto: tx }
}

export function lista(titulo, items, nivel) {
  return { tipo: 'lista', titulo, nivel, items }
}

/** KPIs del proyecto. Si se pasa `antes`, cada cifra que cambie muestra su valor previo. */
export function kpisProyecto(m, antes, { claves = ['presupuesto', 'gastado', 'comprometido', 'cef'] } = {}) {
  const ahora = c.totales(m)
  const prev = antes ? c.totales(antes) : null
  const def = {
    presupuesto: { etiqueta: 'Presupuesto', formato: 'eur' },
    gastado: { etiqueta: 'Gastado', formato: 'eur', sub: t('{p} del presupuesto', { p: v(ahora.ejecucionPct, 'pct') }) },
    comprometido: { etiqueta: 'Comprometido', formato: 'eur' },
    // Sin la celda «Desviación», el coste estimado final la lleva debajo: cuatro cifras llenan una fila.
    cef: { etiqueta: 'Coste estimado final', formato: 'eur', sub: claves.includes('desviacion') ? undefined : t('{d} ({p}) sobre presupuesto', { d: v(ahora.desviacion, 'eurSigned'), p: v(ahora.desviacionPct, 'pctSigned') }) },
    desviacion: { etiqueta: 'Desviación', formato: 'eurSigned', sub: t('{p} sobre presupuesto', { p: v(ahora.desviacionPct, 'pctSigned') }) },
    disponible: { etiqueta: 'Por gastar', formato: 'eur', sub: t('Lo que falta según la previsión') },
    consolidado: { etiqueta: 'Ya firme', formato: 'eur', sub: t('Gastado o comprometido: {p} del coste estimado final', { p: v(ahora.consolidadoPct, 'pct') }) },
  }
  return {
    tipo: 'kpis',
    items: claves.map((k) => {
      const cambio = prev && Math.abs(prev[k] - ahora[k]) > 0.004
      return { id: k, ...def[k], valor: ahora[k], antes: cambio ? prev[k] : undefined }
    }),
  }
}

export function kpisPartida(antes, despues, codigo) {
  const a = antes.partidas[codigo]
  const d = despues.partidas[codigo]
  const fila = (id, etiqueta) => ({ id, etiqueta, formato: 'eur', valor: d[id], antes: Math.abs(a[id] - d[id]) > 0.004 ? a[id] : undefined })
  return {
    tipo: 'kpis',
    titulo: d.nombre,
    items: [fila('gastado', 'Gastado'), fila('comprometido', 'Comprometido'), fila('cef', 'Coste estimado final'), { id: 'pendiente', etiqueta: 'Por gastar', formato: 'eur', valor: Math.max(0, c.pendiente(d)), antes: Math.abs(c.pendiente(a) - c.pendiente(d)) > 0.004 ? Math.max(0, c.pendiente(a)) : undefined }],
  }
}

export function bloqueDesviaciones(m, { capitulos = null, conCausas = true } = {}) {
  const d = c.desviaciones(m)
  const items = (capitulos ? d.items.filter((x) => capitulos.includes(x.id)) : d.items).map((x) => ({
    id: x.id,
    nombre: x.nombre,
    presupuesto: x.presupuesto,
    cef: x.cef,
    desviacion: x.desviacion,
    desviacionPct: x.desviacionPct,
    fueraRango: x.fueraRango,
    margenUmbral: x.margenUmbral,
    // Causas: solo las que empujan hacia arriba; con conCausas = 'fuera', solo de capítulos que se pasan del límite.
    causas: !conCausas || (conCausas === 'fuera' && !x.fueraRango) || (!capitulos && x.desviacion < 0) ? [] : x.causas.filter((p) => (x.desviacion > 0 ? p.desviacion > 0 : true)),
  }))
  return { tipo: 'desviaciones', umbral: d.umbral, items, resumen: capitulos ? null : d.resumen }
}

export function tablaCapitulos(m) {
  const caps = c.capitulos(m)
  const tot = c.totales(m)
  return {
    tipo: 'tabla',
    titulo: 'Coste por capítulo',
    columnas: [
      { id: 'capitulo', etiqueta: 'Capítulo' },
      { id: 'presupuesto', etiqueta: 'Presupuesto', formato: 'eur', alinear: 'right' },
      { id: 'gastado', etiqueta: 'Gastado', formato: 'eur', alinear: 'right' },
      { id: 'comprometido', etiqueta: 'Comprometido', formato: 'eur', alinear: 'right' },
      { id: 'cef', etiqueta: 'Coste estimado final', formato: 'eur', alinear: 'right' },
      { id: 'desviacion', etiqueta: 'Desviación', formato: 'eurSigned', alinear: 'right', tono: true },
    ],
    filas: caps.map((x) => ({ id: x.id, capitulo: `${x.id} ${x.nombre}`, presupuesto: x.presupuesto, gastado: x.gastado, comprometido: x.comprometido, cef: x.cef, desviacion: x.desviacion, alerta: x.fueraRango })),
    total: { capitulo: 'Total', presupuesto: tot.presupuesto, gastado: tot.gastado, comprometido: tot.comprometido, cef: tot.cef, desviacion: tot.desviacion },
    visibles: 6,
  }
}

export function tablaPartidas(m, capId) {
  const cap = m.capitulos.find((x) => x.id === capId)
  return {
    tipo: 'tabla',
    titulo: `Partidas de ${cap.nombre}`,
    columnas: [
      { id: 'partida', etiqueta: 'Partida' },
      { id: 'presupuesto', etiqueta: 'Presupuesto', formato: 'eur', alinear: 'right' },
      { id: 'consolidado', etiqueta: 'Ya firme', formato: 'eur', alinear: 'right' },
      { id: 'pendiente', etiqueta: 'Por gastar', formato: 'eur', alinear: 'right' },
      { id: 'cef', etiqueta: 'Coste estimado final', formato: 'eur', alinear: 'right' },
      { id: 'desviacion', etiqueta: 'Desviación', formato: 'eurSigned', alinear: 'right', tono: true },
    ],
    filas: cap.partidas.map((cod) => {
      const p = m.partidas[cod]
      return { id: cod, partida: `${cod} ${p.nombre}`, presupuesto: p.presupuesto, consolidado: c.r2(p.gastado + p.comprometido), pendiente: c.pendiente(p), cef: p.cef, desviacion: c.r2(p.cef - p.presupuesto) }
    }),
  }
}

export function bloqueDocumento(m, docId, { conciliacion = true, elegibilidad = false } = {}) {
  const d = m.documentos[docId]
  const conf = d.confianza || {}
  const campos = [
    { etiqueta: 'Proveedor', valor: d.proveedor, confianza: conf.proveedor ?? null },
    { etiqueta: 'Importe', valor: d.total, formato: 'eurCents', confianza: conf.importe ?? null },
    { etiqueta: 'Partida', valor: `${d.partida} ${m.partidas[d.partida]?.nombre ?? ''}`, confianza: conf.partida ?? null },
  ]
  return {
    tipo: 'documento',
    docId,
    campos,
    conciliacion: conciliacion ? c.conciliar(m, docId) : null,
    elegibilidad: elegibilidad ? c.elegibilidad(m, docId) : null,
  }
}

export function bloqueCaja(m, antes) {
  const ahora = c.tesoreria(m)
  const prev = antes ? c.tesoreria(antes) : null
  return {
    tipo: 'caja',
    saldoHoy: ahora.saldoHoy,
    semanas: ahora.semanas.map((s, i) => ({ ...s, antes: prev && Math.abs(prev.semanas[i].saldo - s.saldo) > 0.004 ? prev.semanas[i].saldo : undefined })),
    minimo: ahora.minimo,
  }
}

export function bloqueDossier(m) {
  return {
    tipo: 'checklist',
    titulo: 'Bloqueantes del dossier fiscal',
    items: c.dossier(m).map((d) => ({ id: d.id, documento: d.documento, responsable: d.responsable, deadline: d.deadline, dias: d.dias, estado: d.estado, evidencia: d.pendientes ? `${d.pendientes} ${d.evidencia.toLowerCase()}` : d.evidencia, razon: d.razon })),
  }
}

/**
 * Tarjeta de aprobación de una orden de compra con su impacto. Con `conMotivos: false`,
 * la tarjeta no repite por qué pide aprobación (cuando la frase de encima ya lo dice).
 */
export function aprobacionOrden(m, ocId, { conMotivos = true } = {}) {
  const imp = c.impactoOrden(m, ocId)
  const o = imp.orden
  const capA = imp.capitulo.antes
  const capD = imp.capitulo.despues
  const cap = nombreCorto(capD.nombre)
  const filas = [
    { etiqueta: `${cap} · coste estimado final`, antes: capA.cef, despues: capD.cef, formato: 'eur' },
    { etiqueta: `${cap} · desviación`, antes: capA.desviacionPct, despues: capD.desviacionPct, formato: 'pctSigned', alerta: capD.desviacionPct > POLITICAS.umbralDesviacion, alertaTexto: 'se pasa del límite' },
    { etiqueta: 'Película · coste estimado final', antes: imp.totales.antes.cef, despues: imp.totales.despues.cef, formato: 'eur' },
  ]
  if (imp.caja && Math.abs(imp.caja.despues - imp.caja.antes) > 0.004) {
    const fechas = m.tesoreria.semanas.find((s) => s.semana === imp.caja.semana)?.fechas
    filas.push({ etiqueta: fechas ? `Caja de la semana del ${semanaDel(fechas)}` : `Caja · ${imp.caja.semana}`, antes: imp.caja.antes, despues: imp.caja.despues, formato: 'eur', alerta: imp.caja.despues < 0, alertaTexto: 'caja en negativo' })
  }
  const motivos = []
  if (imp.motivos.includes('importe')) motivos.push(t('pasa de {u}', { u: v(POLITICAS.umbralImporteOc, 'eur') }))
  if (imp.motivos.includes('umbral')) motivos.push(t('deja {cap} por encima del límite del {u}', { cap: v(cap), u: v(POLITICAS.umbralDesviacion, 'pct0') }))

  const partida = nombrePartida(m, o.partida)
  const resumen =
    imp.exceso > 0 && imp.consume > 0
      ? t('{consume} ya estaban previstos en {partida}; los otros {exceso} suben el coste estimado final.', { consume: v(imp.consume, 'eur'), partida: v(partida), exceso: v(imp.exceso, 'eur') })
      : imp.exceso > 0
        ? t('{partida} ya no tiene nada por gastar: los {exceso} suben el coste estimado final.', { partida: v(partida), exceso: v(imp.exceso, 'eur') })
        : t('Cabe en lo previsto para {partida}: el coste estimado final no cambia.', { partida: v(partida) })

  // `burbuja`: lo que dice la persona en el hilo al pulsar, en primera persona.
  const acciones = [
    { id: 'aprobar', etiqueta: 'Aprobar', burbuja: `Apruebo la compra ${ocId}`, variante: 'primary', accion: { tipo: 'orden/aprobar', ocId }, rol: imp.rol },
  ]
  if (imp.exceso > 0 && imp.consume > 0) {
    acciones.push({ id: 'parcial', etiqueta: `Aprobar solo lo previsto`, burbuja: `Apruebo solo lo previsto de ${ocId}`, detalle: t('aprueba {n}, lo que ya estaba previsto; los {resto} restantes quedan sin aprobar y habría que pedirlos aparte', { n: v(imp.consume, 'eur'), resto: v(o.importe - imp.consume, 'eur') }), variante: 'secondary', accion: { tipo: 'orden/aprobar', ocId, importe: imp.consume }, rol: imp.rol })
  }
  acciones.push({ id: 'rechazar', etiqueta: 'Rechazar', burbuja: `Rechazo la compra ${ocId}`, variante: 'secondary', accion: { tipo: 'orden/rechazar', ocId }, rol: imp.rol })
  acciones.push({ id: 'escalar', etiqueta: 'Pedir aprobación', burbuja: `Pido ${aQuien(imp.rol)} que apruebe ${ocId}`, variante: 'secondary', accion: { tipo: 'orden/escalar', ocId, a: imp.rol }, soloSinPermiso: true })

  return {
    tipo: 'aprobacion',
    id: `ap-${ocId}`,
    ref: { tipo: 'orden', id: ocId },
    agente: 'excepciones',
    nivel: imp.nivel,
    rol: imp.rol,
    titulo: t('{concepto} · {prov} · {importe}', { concepto: v(o.concepto), prov: v(o.proveedor), importe: v(o.importe, 'eur') }),
    subtitulo: `Pedido ${o.id} · lo pide ${quien(o.solicitante)}`,
    resumen,
    motivos: conMotivos ? motivos : [],
    impacto: filas,
    // El resumen ya dice qué pasa con el coste: la recomendación solo dice por qué basta tu sí.
    recomendacion: imp.nivel === 'propone' ? t('Te proponemos aprobarla: no pasa ningún límite.') : null,
    acciones,
  }
}
