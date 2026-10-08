// Plantillas de texto de los agentes.
//
// Toda frase que escribe el motor es una plantilla SIN cifras: los importes,
// porcentajes, fechas e identificadores viajan como valores y se formatean con
// src/lib/format.js. Así se puede comprobar (scripts/check-agentes.mjs) que
// ninguna cifra está escrita a mano en un guion.

import { eur, eurCents, eurSigned, pct, pctSigned, num } from '../lib/format.js'

/** Valor con formato: v(2433000, 'eur'). */
export function v(valor, formato = 'texto') {
  return { valor, formato }
}

/** Plantilla: t('El CEF queda en {cef}', { cef: v(2433000, 'eur') }). */
export function t(plantilla, valores = {}) {
  return { plantilla, valores }
}

export function esPlantilla(x) {
  return !!x && typeof x === 'object' && typeof x.plantilla === 'string'
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** '2026-06-05' → '05/06/2026'. */
export function fecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** '2026-06-05' → '5 jun'. */
export function fechaCorta(iso) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MESES[Number(m) - 1]}`
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** '2026-06-05' → 'viernes 5 de junio'. */
export function fechaDia(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-').map(Number)
  return `${DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} de ${MESES_LARGOS[m - 1]}`
}

/** Días naturales entre dos fechas ISO (b − a). */
export function diasEntre(a, b) {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

/** 'dd/mm/aaaa' → 'aaaa-mm-dd'. */
export function isoDesde(ddmmaaaa) {
  const [d, m, a] = ddmmaaaa.split('/')
  return `${a}-${m}-${d}`
}

const FORMATOS = {
  eur,
  eurCents,
  eurSigned,
  pct: (n) => pct(n, 1),
  pct0: (n) => pct(n, 0),
  pctSigned: (n) => pctSigned(n, 1),
  num,
  fecha,
  fechaCorta,
  dia: fechaDia,
  dias: (n) => (Math.abs(n) === 1 ? `${num(n)} día` : `${num(n)} días`),
  texto: (s) => String(s ?? ''),
  id: (s) => String(s ?? ''),
}

export function formatear(valor, formato = 'texto') {
  const f = FORMATOS[formato] || FORMATOS.texto
  return f(valor)
}

/** Divide una plantilla en segmentos para que la interfaz resalte los valores. */
export function segmentos(tx) {
  if (tx == null) return []
  if (!esPlantilla(tx)) return [{ texto: String(tx), esValor: false }]
  const out = []
  const re = /\{(\w+)\}/g
  let last = 0
  let m
  while ((m = re.exec(tx.plantilla))) {
    if (m.index > last) out.push({ texto: tx.plantilla.slice(last, m.index), esValor: false })
    const val = tx.valores[m[1]]
    if (val === undefined) throw new Error(`Falta el valor «${m[1]}» en «${tx.plantilla}»`)
    // Una plantilla dentro de otra: se integran sus segmentos.
    if (esPlantilla(val)) {
      out.push(...segmentos(val))
      last = re.lastIndex
      continue
    }
    const valor = val && typeof val === 'object' && 'formato' in val ? val : v(val)
    const esNumero = ['eur', 'eurCents', 'eurSigned', 'pct', 'pct0', 'pctSigned', 'num'].includes(valor.formato)
    out.push({ texto: formatear(valor.valor, valor.formato), esValor: true, esNumero })
    last = re.lastIndex
  }
  if (last < tx.plantilla.length) out.push({ texto: tx.plantilla.slice(last), esValor: false })
  return out
}

/** Texto plano (para aria-label, copiar un borrador o comparar en las pruebas). */
export function renderTexto(tx) {
  return segmentos(tx).map((s) => s.texto).join('')
}

/** Une plantillas con un separador sin perder los valores. Las claves se renombran
 *  con letras (a, b, c…): una plantilla nunca lleva cifras. */
export function unir(partes, sep = ' ') {
  const valores = {}
  const textos = partes.filter(Boolean).map((p, i) => {
    if (!esPlantilla(p)) return String(p)
    return p.plantilla.replace(/\{(\w+)\}/g, (_, k) => {
      const clave = `${k}_${String.fromCharCode(97 + i)}`
      valores[clave] = p.valores[k]
      return `{${clave}}`
    })
  })
  return t(textos.join(sep), valores)
}

/** Cantidad con su sustantivo: cuenta(1, 'capítulo', 'capítulos') → «1 capítulo». */
export function cuenta(n, singular, plural) {
  return v(`${formatear(n, 'num')} ${n === 1 ? singular : plural}`)
}
