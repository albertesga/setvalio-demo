// Piezas comunes de los guiones: pasos, bloques y sugerencias.

import { DURACIONES } from '../agentes.js'
import { t, v } from '../texto.js'
import * as c from '../calculos.js'
import { POLITICAS } from '../politicas.js'

export { t, v, c, POLITICAS }

export function paso(agente, titulo, { autonomia = 'ejecuta', tipo = 'calculo', acciones = [], salida = null, paralelo = false } = {}) {
  return { agente, titulo, autonomia, duracionMs: DURACIONES[tipo] ?? DURACIONES.calculo, acciones, salida, paralelo }
}

export const sug = (texto) => ({ etiqueta: texto, texto })

// ── Bloques ─────────────────────────────────────────────────────────────────

export const texto = (tx) => ({ tipo: 'texto', texto: tx })

export function aviso(tono, titulo, tx) {
  return { tipo: 'aviso', tono, titulo, texto: tx }
}

export function lista(titulo, items, nivel) {
  return { tipo: 'lista', titulo, nivel, items }
}

/** KPIs del proyecto. Si se pasa `antes`, cada cifra que cambie muestra su valor previo. */
export function kpisProyecto(m, antes, { claves = ['presupuesto', 'gastado', 'comprometido', 'cef', 'desviacion'] } = {}) {
  const ahora = c.totales(m)
  const prev = antes ? c.totales(antes) : null
  const def = {
    presupuesto: { etiqueta: 'Presupuesto', formato: 'eur' },
    gastado: { etiqueta: 'Gastado', formato: 'eur', sub: t('{p} del presupuesto', { p: v(ahora.ejecucionPct, 'pct') }) },
    comprometido: { etiqueta: 'Comprometido', formato: 'eur' },
    cef: { etiqueta: 'Coste estimado final', formato: 'eur' },
    desviacion: { etiqueta: 'Desviación', formato: 'eurSigned', sub: t('{p} sobre presupuesto', { p: v(ahora.desviacionPct, 'pctSigned') }), tono: ahora.desviacionPct > 0 ? 'warning' : 'neutral' },
    disponible: { etiqueta: 'Pendiente estimado', formato: 'eur', sub: t('Lo que falta por gastar según la previsión') },
    consolidado: { etiqueta: 'Consolidado', formato: 'eur', sub: t('{p} del coste estimado final', { p: v(ahora.consolidadoPct, 'pct') }) },
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
    titulo: `${codigo} · ${d.nombre}`,
    items: [fila('gastado', 'Gastado'), fila('comprometido', 'Comprometido'), fila('cef', 'Coste estimado final'), { id: 'pendiente', etiqueta: 'Pendiente estimado', formato: 'eur', valor: Math.max(0, c.pendiente(d)), antes: Math.abs(c.pendiente(a) - c.pendiente(d)) > 0.004 ? Math.max(0, c.pendiente(a)) : undefined }],
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
    // Causas: solo las que empujan hacia arriba; con conCausas = 'fuera', solo de capítulos fuera de umbral.
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
      { id: 'cef', etiqueta: 'CEF', formato: 'eur', alinear: 'right' },
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
    titulo: `Partidas del capítulo ${capId}`,
    columnas: [
      { id: 'partida', etiqueta: 'Partida' },
      { id: 'presupuesto', etiqueta: 'Presupuesto', formato: 'eur', alinear: 'right' },
      { id: 'consolidado', etiqueta: 'Gastado + comprometido', formato: 'eur', alinear: 'right' },
      { id: 'pendiente', etiqueta: 'Pendiente', formato: 'eur', alinear: 'right' },
      { id: 'cef', etiqueta: 'CEF', formato: 'eur', alinear: 'right' },
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
    nota: 'Filmpilot prepara la documentación. El fiscalista revisa y firma.',
  }
}

/** Tarjeta de aprobación de una orden de compra con su impacto. */
export function aprobacionOrden(m, ocId) {
  const imp = c.impactoOrden(m, ocId)
  const o = imp.orden
  const capA = imp.capitulo.antes
  const capD = imp.capitulo.despues
  const filas = [
    { etiqueta: `Capítulo ${capD.id} · coste estimado final`, antes: capA.cef, despues: capD.cef, formato: 'eur' },
    { etiqueta: `Capítulo ${capD.id} · desviación`, antes: capA.desviacionPct, despues: capD.desviacionPct, formato: 'pctSigned', alerta: capD.desviacionPct > POLITICAS.umbralDesviacion },
    { etiqueta: 'Proyecto · coste estimado final', antes: imp.totales.antes.cef, despues: imp.totales.despues.cef, formato: 'eur' },
  ]
  if (imp.caja && Math.abs(imp.caja.despues - imp.caja.antes) > 0.004) {
    filas.push({ etiqueta: `Caja · saldo ${imp.caja.semana}`, antes: imp.caja.antes, despues: imp.caja.despues, formato: 'eur', alerta: imp.caja.despues < 0 })
  }
  const motivos = []
  if (imp.motivos.includes('importe')) motivos.push(t('supera el importe que requiere aprobación ({u})', { u: v(POLITICAS.umbralImporteOc, 'eur') }))
  if (imp.motivos.includes('umbral')) motivos.push(t('deja el capítulo por encima del umbral del {u}', { u: v(POLITICAS.umbralDesviacion, 'pct0') }))

  const resumen =
    imp.exceso > 0
      ? t('Consume {consume} que la previsión ya tenía para {partida} y suma {exceso} al coste estimado final.', { consume: v(imp.consume, 'eur'), partida: v(o.partida, 'id'), exceso: v(imp.exceso, 'eur') })
      : t('Cabe en lo que la previsión ya tenía para {partida}: el coste estimado final no cambia.', { partida: v(o.partida, 'id') })

  const acciones = [
    { id: 'aprobar', etiqueta: 'Aprobar', variante: 'primary', accion: { tipo: 'orden/aprobar', ocId }, rol: imp.rol },
  ]
  if (imp.exceso > 0 && imp.consume > 0) {
    acciones.push({ id: 'parcial', etiqueta: `Aprobar solo lo previsto`, detalle: t('{n}, sin subir el coste estimado final', { n: v(imp.consume, 'eur') }), variante: 'secondary', accion: { tipo: 'orden/aprobar', ocId, importe: imp.consume }, rol: imp.rol })
  }
  acciones.push({ id: 'rechazar', etiqueta: 'Rechazar', variante: 'secondary', accion: { tipo: 'orden/rechazar', ocId }, rol: imp.rol })
  acciones.push({ id: 'escalar', etiqueta: 'Pedir aprobación', variante: 'secondary', accion: { tipo: 'orden/escalar', ocId, a: imp.rol }, soloSinPermiso: true })

  return {
    tipo: 'aprobacion',
    id: `ap-${ocId}`,
    ref: { tipo: 'orden', id: ocId },
    agente: 'excepciones',
    nivel: imp.nivel,
    rol: imp.rol,
    titulo: t('{oc} · {prov} · {importe}', { oc: v(o.id, 'id'), prov: v(o.proveedor), importe: v(o.importe, 'eur') }),
    subtitulo: `${o.concepto} · partida ${o.partida} · solicita ${o.solicitante}`,
    resumen,
    motivos,
    impacto: filas,
    recomendacion: imp.nivel === 'propone' ? t('Recomiendo aprobarla: no mueve el coste estimado final del capítulo.') : null,
    acciones,
  }
}
