// Motor de cálculo del incentivo fiscal a la producción (estimación).
//
// Base legal de referencia:
//  - Península / Baleares: art. 36.1 Ley 27/2014 del Impuesto sobre Sociedades.
//      30 % sobre el primer 1.000.000 € de base · 25 % sobre el exceso.
//      Límite de la deducción: 20.000.000 € por obra.
//  - Canarias: Régimen Económico y Fiscal (REF), tipos incrementados.
//      54 % sobre el primer 1.000.000 € · 45 % sobre el exceso.
//      Límite de la deducción: 36.000.000 € por obra.
//
// Es una estimación de planificación, no asesoramiento fiscal.

export const TRAMO_UMBRAL = 1_000_000

export const TIPOS = {
  peninsula: { bajo: 0.3, alto: 0.25, umbral: TRAMO_UMBRAL, limite: 20_000_000, etiqueta: 'Península' },
  canarias: { bajo: 0.54, alto: 0.45, umbral: TRAMO_UMBRAL, limite: 36_000_000, etiqueta: 'Canarias' },
}

/** Aplica el doble tramo a una base y devuelve el desglose. */
export function calcularTramos(base, tipo) {
  const t = TIPOS[tipo]
  const baseBaja = Math.min(base, t.umbral)
  const baseAlta = Math.max(0, base - t.umbral)
  const deduccionBaja = baseBaja * t.bajo
  const deduccionAlta = baseAlta * t.alto
  const deduccionBruta = deduccionBaja + deduccionAlta
  const deduccion = Math.min(deduccionBruta, t.limite)
  return {
    tipo,
    etiqueta: t.etiqueta,
    base,
    baseBaja,
    baseAlta,
    tipoBajo: t.bajo,
    tipoAlto: t.alto,
    deduccionBaja,
    deduccionAlta,
    deduccion,
    topado: deduccionBruta > t.limite,
    efectivo: base > 0 ? deduccion / base : 0,
  }
}

/**
 * Escenario completo en función de cómo se territorializa el gasto elegible.
 * (Usado por el Panel; se mantiene por compatibilidad.)
 * @param {number} baseTotal  base de deducción (coste de producción elegible)
 * @param {number} pctCanarias  porcentaje de la base imputable a Canarias (0–100)
 */
export function calcularEscenario(baseTotal, pctCanarias) {
  const fraccion = Math.max(0, Math.min(100, pctCanarias)) / 100
  const baseCanarias = baseTotal * fraccion
  const basePeninsula = baseTotal - baseCanarias

  const peninsula = calcularTramos(basePeninsula, 'peninsula')
  const canarias = calcularTramos(baseCanarias, 'canarias')
  const total = peninsula.deduccion + canarias.deduccion

  // Referencia: la misma producción íntegramente en península.
  const refPeninsula = calcularTramos(baseTotal, 'peninsula').deduccion
  const beneficioCanarias = total - refPeninsula

  return {
    baseTotal,
    pctCanarias: fraccion * 100,
    baseCanarias,
    basePeninsula,
    peninsula,
    canarias,
    total,
    efectivoTotal: baseTotal > 0 ? total / baseTotal : 0,
    refPeninsula,
    beneficioCanarias,
  }
}

/** Doble tramo genérico: `lo` hasta el umbral, `hi` sobre el exceso. */
export function tramos(base, lo, hi, umbral = TRAMO_UMBRAL) {
  const baseBaja = Math.min(base, umbral)
  const baseAlta = Math.max(0, base - umbral)
  return baseBaja * lo + baseAlta * hi
}

export const REF_BASE = 2_400_000

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZADOR V2 — los inputs del formulario mueven el cálculo.
// Spec: docs/reglas-optimizador-v2.md
//
// Tipos por territorio PARAMETRIZADOS (no hard-codeados por escenario). El tope
// de intensidad de ayuda se CALCULA (es lo que convierte el 60 % nominal del País
// Vasco en ~50 % efectivo) y las subvenciones minoran la base y entran en el tope.
//
// ⚠️ A verificar con el fiscalista (docs §9): tramos forales exactos por % de gasto,
// umbral de gasto en Canarias, condiciones de Navarra 40 %, copias+P&P / tope 80 %.
// ═══════════════════════════════════════════════════════════════════════════

const EUR0 = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  useGrouping: 'always',
})
const eur0 = (n) => EUR0.format(Math.round(n))
const tipoTxt = (n) => `${Math.round(n * 100)} %`

// Cap de intensidad por defecto sobre el coste; 60 % en coproducción UE (docs §5).
export const INTENSIDAD = { general: 0.5, coproduccionUE: 0.6 }

// docs §3.2 — tope de la base sobre el coste. Se deja DESACTIVADO por defecto:
// con base = coste, el ejemplo clave de §5 (País Vasco 60 % → 50 % efectivo por el
// tope de intensidad) solo se cumple si la base ≈ coste. Activar cuando el
// fiscalista confirme el tratamiento de copias + P&P (docs §9).
export const TOPE_BASE_PCT = 0.8

/**
 * Configuración por territorio (docs §2). `tipoBajoMin/AltoMin` = tipo aplicable
 * si NO se cumple el requisito territorial de % de gasto.
 */
export const TERRITORIOS = [
  {
    id: 'comun', territorio: 'Territorio común',
    tipoBajo: 0.3, tipoAlto: 0.25, tipoBajoMin: 0.3, tipoAltoMin: 0.25,
    limite: 20_000_000, euskeraBonus: false, requisitoPct: 0, requisitoLabel: null,
    nota: 'Máx. 20 M€ (10 M€/episodio).',
  },
  {
    id: 'canarias', territorio: 'Canarias',
    tipoBajo: 0.54, tipoAlto: 0.45, tipoBajoMin: 0.3, tipoAltoMin: 0.25,
    limite: 36_000_000, euskeraBonus: false, requisitoPct: 0.5, requisitoLabel: 'gasto en Canarias ≥ 50 %',
    nota: '54 % / 45 % si se alcanza el gasto mínimo en Canarias; si no, tipos comunes.',
  },
  {
    id: 'bizkaia', territorio: 'Bizkaia',
    tipoBajo: 0.6, tipoAlto: 0.6, tipoBajoMin: 0.35, tipoAltoMin: 0.35,
    limite: Infinity, euskeraBonus: true, requisitoPct: 0.5, requisitoLabel: 'gasto en Bizkaia ≥ 50 %',
    nota: 'Foral 35–60 % (70 % euskera); sin límite, sujeto al tope de intensidad.',
  },
  {
    id: 'alava_gipuzkoa', territorio: 'Álava / Gipuzkoa',
    tipoBajo: 0.6, tipoAlto: 0.6, tipoBajoMin: 0.5, tipoAltoMin: 0.5,
    limite: 10_000_000, euskeraBonus: true, requisitoPct: 0.5, requisitoLabel: 'gasto en País Vasco ≥ 50 %',
    nota: 'Foral 50–60 % (70 % euskera); máx. 10 M€.',
  },
  {
    id: 'navarra', territorio: 'Navarra',
    tipoBajo: 0.35, tipoAlto: 0.35, tipoBajoMin: 0.35, tipoAltoMin: 0.35,
    limite: 5_000_000, euskeraBonus: false, especial: true, requisitoPct: 0.4, requisitoLabel: 'gasto en Navarra ≥ 40 %',
    nota: '35 % (40 % obra novel / documental / animación); máx. 5 M€.',
  },
]

const AYUDAS_POR_TERRITORIO = {
  comun: ['ICAA Generales', 'MEDIA / Creative Europe', 'Ayuda autonómica'],
  canarias: ['Canary Islands Film', 'ICAA Generales', 'Ayuda autonómica'],
  bizkaia: ['Incentivo foral', 'Zineuskadi', 'ICAA Generales'],
  alava_gipuzkoa: ['Incentivo foral', 'Zineuskadi', 'ICAA Generales'],
  navarra: ['Gobierno de Navarra', 'ICAA Generales'],
}

// El formulario ofrece álava y gipuzkoa por separado; el régimen es común.
function normalizarId(id) {
  return id === 'alava' || id === 'gipuzkoa' ? 'alava_gipuzkoa' : id
}
function cfgDe(id) {
  return TERRITORIOS.find((t) => t.id === normalizarId(id)) || TERRITORIOS[0]
}

/** Tipos efectivos del territorio según euskera, % de gasto y tipología (docs §4). */
export function tiposTerritorio(cfg, { euskera = false, pctGasto = 1, tipologia, novel = false } = {}) {
  const cumpleRequisito = pctGasto >= (cfg.requisitoPct ?? 0)
  let bajo = cumpleRequisito ? cfg.tipoBajo : cfg.tipoBajoMin
  let alto = cumpleRequisito ? cfg.tipoAlto : cfg.tipoAltoMin

  // Navarra: 40 % en casos especiales (novel/documental/animación/euskera) si cumple gasto.
  if (cfg.especial) {
    const especial = cumpleRequisito && (novel || tipologia === 'Documental' || tipologia === 'Animación' || euskera)
    bajo = alto = especial ? 0.4 : 0.35
  }

  // Bonus euskera del País Vasco: +10 puntos, tope 70 %.
  if (euskera && cfg.euskeraBonus) {
    bajo = Math.min(0.7, bajo + 0.1)
    alto = Math.min(0.7, alto + 0.1)
  }
  return { bajo, alto, cumpleRequisito }
}

/** Base de deducción (docs §3): elegible + extras (copias/P&P, máx. 40 %), tope 80 % opcional, minorada por subvenciones. */
export function calcularBase({ coste, costeElegible, extras = 0, subvenciones = [], aplicarTope80 = false }) {
  const elegible = costeElegible ?? coste
  const extrasCap = Math.min(Math.max(0, extras), 0.4 * coste)
  let baseBruta = elegible + extrasCap
  if (aplicarTope80) baseBruta = Math.min(baseBruta, TOPE_BASE_PCT * coste)
  const sumSubvenciones = subvenciones.reduce((a, s) => a + (s.importe || 0), 0)
  const base = Math.max(0, baseBruta - sumSubvenciones)
  return { baseBruta, base, sumSubvenciones, minorada: sumSubvenciones > 0 }
}

/** Deducción del territorio sobre la base (doble tramo + límite del territorio). */
export function deduccionTerritorio(cfg, base, opts = {}) {
  const { bajo, alto, cumpleRequisito } = tiposTerritorio(cfg, opts)
  const deduccionBruta = tramos(base, bajo, alto)
  const deduccion = Math.min(deduccionBruta, cfg.limite)
  return { tipoBajo: bajo, tipoAlto: alto, cumpleRequisito, deduccionBruta, deduccion, topaLimite: deduccionBruta > cfg.limite }
}

/**
 * Tope de intensidad de ayuda (docs §5). La suma de deducción + subvenciones no
 * puede superar el % del coste; si lo supera, se recorta la deducción.
 */
export function aplicarIntensidad({ deduccion, subvenciones = [], coste, coproduccionUE = false, obraDificil = false }) {
  const sumSubvenciones = subvenciones.reduce((a, s) => a + (s.importe || 0), 0)
  const capPct = coproduccionUE ? INTENSIDAD.coproduccionUE : INTENSIDAD.general
  const capIntensidad = capPct * coste
  const ayudaTotalBruta = deduccion + sumSubvenciones
  if (obraDificil || ayudaTotalBruta <= capIntensidad) {
    return { capPct, capIntensidad, sumSubvenciones, ayudaTotalBruta, topaIntensidad: false, deduccionNeta: deduccion, ayudaTotalNeta: ayudaTotalBruta }
  }
  const deduccionNeta = Math.max(0, capIntensidad - sumSubvenciones)
  return { capPct, capIntensidad, sumSubvenciones, ayudaTotalBruta, topaIntensidad: true, deduccionNeta, ayudaTotalNeta: deduccionNeta + sumSubvenciones }
}

/** Evalúa un territorio completo (base → deducción → tope de intensidad) para unos inputs. */
export function evaluarTerritorio(id, inputs = {}) {
  const cfg = cfgDe(id)
  const {
    coste = 0, euskera = false, pctGasto = 1, tipologia, novel = false,
    coproduccionUE = false, subvenciones = [], obraDificil = false,
    costeElegible, extras = 0, aplicarTope80 = false,
  } = inputs

  const { base, baseBruta, sumSubvenciones, minorada } = calcularBase({ coste, costeElegible, extras, subvenciones, aplicarTope80 })
  const ded = deduccionTerritorio(cfg, base, { euskera, pctGasto, tipologia, novel })
  const intens = aplicarIntensidad({ deduccion: ded.deduccion, subvenciones, coste, coproduccionUE, obraDificil })

  const topes = []
  if (ded.topaLimite) topes.push(`Límite de ${eur0(cfg.limite)}`)
  if (intens.topaIntensidad) topes.push(`Intensidad ${tipoTxt(intens.capPct)}`)

  return {
    id: cfg.id,
    territorio: cfg.territorio,
    tipoBajo: ded.tipoBajo,
    tipoAlto: ded.tipoAlto,
    pctLabel: ded.tipoBajo === ded.tipoAlto ? tipoTxt(ded.tipoBajo) : `${tipoTxt(ded.tipoBajo)} / ${tipoTxt(ded.tipoAlto)}`,
    base,
    baseBruta,
    sumSubvenciones,
    minorada,
    deduccionBruta: ded.deduccion,
    deduccionNeta: intens.deduccionNeta,
    deduccionEstimada: intens.deduccionNeta, // alias para la tabla del UI
    factible: ded.cumpleRequisito,
    cumpleRequisito: ded.cumpleRequisito,
    requisitoLabel: cfg.requisitoLabel,
    topaIntensidad: intens.topaIntensidad,
    topaLimite: ded.topaLimite,
    capPct: intens.capPct,
    capIntensidad: intens.capIntensidad,
    topes,
    efectivo: coste ? intens.deduccionNeta / coste : 0,
    nota: cfg.nota,
  }
}

/** Normaliza un objeto de formulario (o un número de coste) a los inputs del motor. */
export function inputsDesdeFormulario(form) {
  if (typeof form === 'number') return { coste: form }
  const UE = new Set(['Francia', 'Italia', 'Portugal', 'Alemania', 'Bélgica'])
  const coproduccionUE = !!form.coproduccion && (!(form.paises?.length) || form.paises.some((p) => UE.has(p)))
  return {
    coste: form.presupuesto ?? 0,
    tipologia: form.tipologia,
    euskera: form.idioma === 'Euskera',
    novel: !!form.novel,
    coproduccionUE,
    territorios: form.territorios ?? [],
    pctGasto: (form.pctGasto ?? 60) / 100,
    subvenciones: form.subvenciones ?? [],
    obraDificil: !!form.obraDificil,
    aplicarTope80: !!form.aplicarTope80,
  }
}

/** Tabla por territorio (docs §10): evalúa TODOS los territorios con los inputs. */
export function tablaTerritorios(arg) {
  const inputs = inputsDesdeFormulario(arg)
  return TERRITORIOS.map((cfg) => evaluarTerritorio(cfg.id, inputs))
}

const ICAA_GENERAL_SUGERIDA = 600_000

function ayudaGeneralEstimable(coste) {
  return Math.min(ICAA_GENERAL_SUGERIDA, Math.round(coste * 0.5))
}

function tarjeta(ev, { etiqueta, recomendado = false, coste, ayudaHasta = 0, inputs }) {
  let bandaLo
  let bandaHi
  let nota
  if (ayudaHasta > 0) {
    const combinacion = combinar({
      ...inputs,
      coste,
      territorio: ev.id,
      subvenciones: [...(inputs?.subvenciones || []), { nombre: 'ICAA Generales', importe: ayudaHasta }],
    })
    bandaLo = combinacion.retornoNeto * 0.95
    bandaHi = combinacion.retornoNeto
    nota = combinacion.retornoNeto < combinacion.deduccionSola
      ? `ICAA Generales orientativa: la minoración y el tope reducen el neto en ${eur0(combinacion.deduccionSola - combinacion.retornoNeto)}.`
      : combinacion.topado
        ? `ICAA Generales orientativa: ${eur0(ayudaHasta)}; recorte por intensidad de ${eur0(combinacion.recorte)}.`
        : `ICAA Generales orientativa: ${eur0(ayudaHasta)}; base minorada a ${eur0(combinacion.baseMinorada)}.`
  } else {
    bandaLo = ev.deduccionNeta * 0.92
    bandaHi = ev.deduccionNeta
    if (!ev.factible && ev.requisitoLabel) nota = `No cumple el requisito (${ev.requisitoLabel}); se aplican los tipos reducidos.`
    else if (ev.topaIntensidad) nota = `Tope de intensidad del ${tipoTxt(ev.capPct)} activo: la deducción se recorta a ${eur0(ev.deduccionNeta)}.`
    else if (ev.topaLimite) nota = `Deducción topada por el límite del territorio (${eur0(ev.capIntensidad)} de intensidad disponible).`
    else nota = ev.nota
  }

  return {
    id: ev.id,
    territorioId: ev.id,
    etiqueta,
    territorio: ev.territorio,
    deduccion: ev.deduccionNeta,
    efectivo: ev.efectivo,
    bandaLo,
    bandaHi,
    ayudaHasta,
    ayudas: AYUDAS_POR_TERRITORIO[ev.id] || AYUDAS_POR_TERRITORIO.comun,
    nota,
    recomendado,
    topaIntensidad: ev.topaIntensidad,
    factible: ev.factible,
    pctLabel: ev.pctLabel,
  }
}

/**
 * Tres escenarios CALCULADOS desde los territorios candidatos y las reglas (docs §6).
 * Acepta el formulario completo (o un número de coste para compatibilidad).
 */
export function escenarios(arg) {
  const inputs = inputsDesdeFormulario(arg)
  const coste = inputs.coste

  const candidatosIds = inputs.territorios?.length ? inputs.territorios : TERRITORIOS.map((t) => t.id)
  const idsUnicos = [...new Set(candidatosIds.map(normalizarId))]
  const evals = idsUnicos.map((id) => evaluarTerritorio(id, inputs))

  const porDeduccion = (a, b) => b.deduccionNeta - a.deduccionNeta

  // Máximo retorno: mayor deducción neta (aunque tope o requisito).
  const max = [...evals].sort(porDeduccion)[0] || evaluarTerritorio('comun', inputs)

  // Equilibrado: mejor deducción FACTIBLE; si coincide con el máximo, el siguiente factible.
  const factibles = evals.filter((e) => e.factible).sort(porDeduccion)
  let eq = factibles[0] || max
  if (eq.id === max.id && factibles.length > 1) eq = factibles[1]

  // Ayuda abierta en el corte de la demo; el importe es orientativo, no un baremo oficial.
  const comun = evaluarTerritorio('comun', inputs)
  const ayudaHasta = inputs.subvenciones?.some((s) => s.nombre === 'ICAA Generales') ? 0 : ayudaGeneralEstimable(coste)

  const cards = [
    tarjeta(max, { etiqueta: 'Máximo retorno', coste }),
    tarjeta(eq, { etiqueta: 'Equilibrado', recomendado: true, coste }),
    tarjeta(comun, { etiqueta: 'Combinación orientativa', coste, ayudaHasta, inputs }),
  ]
  // IDs estables y únicos para React aunque se repita territorio.
  return cards.map((c, i) => ({ ...c, id: ['max', 'eq', 'prob'][i] }))
}

/**
 * Combinación deducción + ayudas (docs §7).
 * Las subvenciones minoran la base y la suma subvenciones + deducción queda
 * sometida al tope de intensidad del 50 % / 60 %.
 */
export function combinar({
  coste = 0,
  territorio = 'comun',
  euskera = false,
  coproduccionUE = false,
  subvenciones = [],
  pctGasto = 1,
  tipologia,
  novel = false,
  obraDificil = false,
  costeElegible,
  extras = 0,
  aplicarTope80 = false,
} = {}) {
  const cfg = cfgDe(territorio)
  const ayudas = Array.isArray(subvenciones) ? subvenciones : []
  const subvencionTotal = ayudas.reduce((a, s) => a + (Number(s.importe) || 0), 0)

  const sinAyudasBase = calcularBase({ coste, costeElegible, extras, subvenciones: [], aplicarTope80 })
  const base = sinAyudasBase.base
  const baseMinorada = Math.max(0, base - subvencionTotal)

  const dedSolaTerritorio = deduccionTerritorio(cfg, base, { euskera, pctGasto, tipologia, novel })
  const dedTerritorio = deduccionTerritorio(cfg, baseMinorada, { euskera, pctGasto, tipologia, novel })

  const solaIntensidad = aplicarIntensidad({
    deduccion: dedSolaTerritorio.deduccion,
    subvenciones: [],
    coste,
    coproduccionUE,
    obraDificil,
  })

  const capPct = coproduccionUE ? INTENSIDAD.coproduccionUE : INTENSIDAD.general
  const cap = capPct * coste
  const deduccion = dedTerritorio.deduccion
  const ayudaTotal = deduccion + subvencionTotal
  const topado = !obraDificil && ayudaTotal > cap
  const deduccionAjustada = topado ? Math.max(0, cap - subvencionTotal) : deduccion
  const recorte = topado ? Math.max(0, deduccion - deduccionAjustada) : 0
  const retornoNeto = deduccionAjustada + subvencionTotal
  const deduccionSola = solaIntensidad.deduccionNeta

  return {
    territorioId: cfg.id,
    territorio: cfg.territorio,
    coste,
    base,
    baseMinorada,
    subvencionTotal,
    subvenciones: subvencionTotal,
    deduccion,
    deduccionAjustada,
    deduccionSola,
    deduccionSinAyudas: deduccionSola,
    deduccionConAyudas: deduccionAjustada,
    ayudaTotal,
    cap,
    capPct,
    capIntensidad: cap,
    topado,
    topaIntensidad: topado,
    recorte,
    retornoNeto,
    efectoMinoracion: deduccion - dedSolaTerritorio.deduccion,
    topaLimite: dedTerritorio.topaLimite,
    cumpleRequisito: dedTerritorio.cumpleRequisito,
  }
}
