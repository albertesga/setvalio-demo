// ─────────────────────────────────────────────────────────────────────────
// Proyecto — entidad central del core data layer (en memoria, sin backend).
//
// La tipología RAMIFICA el comportamiento del producto:
//  - aplicaV2()  → qué proyectos acceden al tax credit (todos salvo programa_tv).
//  - capaD3()    → qué intensidad de control de gestión necesita el proyecto.
// ─────────────────────────────────────────────────────────────────────────

// Catálogos (value + label legible es-ES) — sirven para selects y para etiquetas.
export const TIPOLOGIAS = [
  { value: 'largometraje_ficcion', label: 'Largometraje de ficción' },
  { value: 'serie_ficcion', label: 'Serie de ficción' },
  { value: 'documental', label: 'Documental' },
  { value: 'serie_documental', label: 'Serie documental' },
  { value: 'animacion', label: 'Animación' },
  { value: 'programa_tv', label: 'Programa de televisión' },
]

export const CANALES = [
  { value: 'cine', label: 'Cine' },
  { value: 'tv_lineal', label: 'TV lineal' },
  { value: 'plataforma', label: 'Plataforma' },
]

export const ESTADOS = [
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'preproduccion', label: 'Preproducción' },
  { value: 'rodaje', label: 'En rodaje' },
  { value: 'postproduccion', label: 'Postproducción' },
  { value: 'cerrado', label: 'Cerrado' },
]

export const IDIOMAS = [
  { value: 'castellano', label: 'Castellano' },
  { value: 'catalan', label: 'Catalán' },
  { value: 'euskera', label: 'Euskera' },
  { value: 'gallego', label: 'Gallego' },
]

// Territorios (ids alineados con el motor de incentivos y el formulario del optimizador).
export const TERRITORIOS_PY = [
  { id: 'comun', label: 'Territorio común' },
  { id: 'canarias', label: 'Canarias' },
  { id: 'bizkaia', label: 'Bizkaia' },
  { id: 'gipuzkoa', label: 'Gipuzkoa' },
  { id: 'alava', label: 'Álava' },
  { id: 'navarra', label: 'Navarra' },
]

export const UMBRAL_PRESUPUESTO_ALTO = 6_000_000
const SERIES = ['serie_ficcion', 'serie_documental']

export const PRESUPUESTO_CAPITULOS_ICAA = [
  { id: '01', nombre: 'Guion y música', importe: 120_000 },
  { id: '02', nombre: 'Personal artístico', importe: 480_000 },
  { id: '03', nombre: 'Equipo técnico', importe: 540_000 },
  { id: '04', nombre: 'Escenografía', importe: 210_000 },
  { id: '05', nombre: 'Estudios de rodaje y varios de producción', importe: 150_000 },
  { id: '06', nombre: 'Maquinaria de rodaje y transportes', importe: 180_000 },
  { id: '07', nombre: 'Viajes, hoteles y comidas', importe: 150_000 },
  { id: '08', nombre: 'Soportes y material sensible', importe: 30_000 },
  { id: '09', nombre: 'Laboratorio y postproducción', importe: 120_000 },
  { id: '10', nombre: 'Seguros', importe: 60_000 },
  { id: '11', nombre: 'Gastos generales', importe: 240_000 },
  { id: '12', nombre: 'Gastos de explotación, comercial y financieros', importe: 120_000 },
]

export function totalPresupuestoCapitulos(capitulos = []) {
  return capitulos.reduce((acc, c) => acc + (Number(c.importe) || 0), 0)
}

function normalizarImporte(n) {
  return Math.max(0, Math.round(Number(n) || 0))
}

function escalarCapitulos(capitulos, totalObjetivo) {
  const total = totalPresupuestoCapitulos(capitulos)
  const objetivo = normalizarImporte(totalObjetivo)
  if (!objetivo || !total) return capitulos.map((c) => ({ ...c, importe: 0 }))

  const escalados = capitulos.map((c) => ({ ...c, importe: Math.round((c.importe / total) * objetivo) }))
  const diff = objetivo - totalPresupuestoCapitulos(escalados)
  if (diff && escalados.length) escalados[escalados.length - 1] = { ...escalados[escalados.length - 1], importe: escalados[escalados.length - 1].importe + diff }
  return escalados
}

function capitulosNormalizados(capitulos, totalFallback) {
  const porId = new Map((capitulos || []).map((c) => [c.id, c]))
  const tieneCapitulos = PRESUPUESTO_CAPITULOS_ICAA.every((c) => porId.has(c.id))
  if (!tieneCapitulos) return escalarCapitulos(PRESUPUESTO_CAPITULOS_ICAA, totalFallback || totalPresupuestoCapitulos(PRESUPUESTO_CAPITULOS_ICAA))
  return PRESUPUESTO_CAPITULOS_ICAA.map((base) => {
    const actual = porId.get(base.id)
    return { id: base.id, nombre: actual?.nombre || base.nombre, importe: normalizarImporte(actual?.importe) }
  })
}

export function normalizarProyecto(p = {}) {
  p = p || {}
  const presupuestoBase = normalizarImporte(p.presupuesto) || totalPresupuestoCapitulos(PRESUPUESTO_CAPITULOS_ICAA)
  const presupuestoCapitulos = capitulosNormalizados(p.presupuestoCapitulos, presupuestoBase)
  return {
    ...p,
    presupuestoCapitulos,
    presupuesto: totalPresupuestoCapitulos(presupuestoCapitulos),
    escenariosGuardados: Array.isArray(p.escenariosGuardados) ? p.escenariosGuardados : [],
  }
}

export function actualizarPresupuestoTotal(p, total) {
  const base = normalizarProyecto(p)
  return normalizarProyecto({
    ...base,
    presupuestoCapitulos: escalarCapitulos(base.presupuestoCapitulos, total),
  })
}

export function actualizarPresupuestoCapitulo(p, id, importe) {
  const base = normalizarProyecto(p)
  return normalizarProyecto({
    ...base,
    presupuestoCapitulos: base.presupuestoCapitulos.map((c) => (c.id === id ? { ...c, importe: normalizarImporte(importe) } : c)),
  })
}

// ── Helpers derivados (funciones puras) ─────────────────────────────────────
const etiquetaDe = (catalogo, key, prop = 'value') => catalogo.find((x) => x[prop] === key)?.label ?? key

export const etiquetaTipologia = (t) => etiquetaDe(TIPOLOGIAS, t)
export const etiquetaCanal = (c) => etiquetaDe(CANALES, c)
export const etiquetaEstado = (e) => etiquetaDe(ESTADOS, e)
export const etiquetaIdioma = (i) => etiquetaDe(IDIOMAS, i)

export function esSerie(p) {
  return SERIES.includes(p?.tipologia)
}

export function esEuskera(p) {
  return p?.idioma === 'euskera'
}

/** ¿Accede al tax credit cultural (art. 36 LIS)? Todos salvo los programas de TV. */
export function aplicaV2(p) {
  return p?.tipologia !== 'programa_tv'
}

/** Intensidad de control de gestión que necesita el proyecto. */
export function capaD3(p) {
  if (!p) return 'ligera'
  const presupuesto = normalizarProyecto(p).presupuesto
  if (p.tipologia === 'programa_tv') return 'recurrente'
  const serie = esSerie(p)
  if ((serie && (p.bloques ?? 0) >= 2) || presupuesto > UMBRAL_PRESUPUESTO_ALTO) return 'pesada'
  if (presupuesto >= 3_000_000 || serie) return 'media'
  return 'ligera'
}

export function etiquetaCapa(capa) {
  return { ligera: 'Control: ligero', media: 'Control: medio', pesada: 'Control: pesado', recurrente: 'Control: recurrente' }[capa] || 'Control'
}

/** Tono de chip por fase del estado. */
export function toneEstado(estado) {
  return {
    desarrollo: 'neutral',
    preproduccion: 'primary',
    rodaje: 'warning',
    postproduccion: 'primary',
    cerrado: 'positive',
  }[estado] || 'neutral'
}

/** Proyecto en blanco con defaults sensatos para el alta. */
export function proyectoVacio() {
  return normalizarProyecto({
    id: null,
    titulo: '',
    productora: '',
    tipologia: 'largometraje_ficcion',
    canal: 'cine',
    estado: 'desarrollo',
    episodios: null,
    bloques: null,
    presupuesto: 1_000_000,
    moneda: 'EUR',
    coproduccionUE: false,
    paises: [],
    pctGastoTerritorio: { comun: 100, canarias: 0, bizkaia: 0, alava: 0, gipuzkoa: 0, navarra: 0 },
    territoriosCandidatos: ['comun'],
    idioma: 'castellano',
    direccionNovel: false,
    obraDificil: false,
    diasRodaje: null,
    semanasRodaje: null,
    fechaInicioRodaje: '',
    fechaEntrega: '',
    productorEjecutivo: '',
    lineProducer: '',
    escenariosGuardados: [],
  })
}

// ── Semilla ──────────────────────────────────────────────────────────────────
const PROYECTOS_SEMILLA = [
  {
    id: 'p-ultima-funcion',
    titulo: 'La última función',
    productora: 'Candilejas Films',
    tipologia: 'largometraje_ficcion',
    canal: 'cine',
    estado: 'rodaje',
    episodios: null,
    bloques: null,
    presupuesto: 2_400_000,
    moneda: 'EUR',
    coproduccionUE: false,
    paises: [],
    pctGastoTerritorio: { comun: 65, canarias: 35, bizkaia: 0, alava: 0, gipuzkoa: 0, navarra: 0 },
    territoriosCandidatos: ['comun', 'canarias'],
    idioma: 'castellano',
    direccionNovel: false,
    obraDificil: false,
    diasRodaje: 20,
    semanasRodaje: 4,
    fechaInicioRodaje: '25/05/2026',
    fechaEntrega: '30/10/2026',
    productorEjecutivo: 'Marta Cobo',
    lineProducer: 'Álvaro Ferrer',
    // Campos de display usados por Panel/Topbar (compatibilidad).
    tipo: 'Largometraje de ficción',
    ubicacion: 'Madrid · con rodaje parcial en Canarias',
    // Jornada que se rueda hoy (martes 02/06/2026): van seis hechas.
    diaActual: 7,
    fechaInforme: '02/06/2026',
  },
  {
    id: 'p-marea-negra',
    titulo: 'Marea negra',
    productora: 'Atlántica Series',
    tipologia: 'serie_ficcion',
    canal: 'plataforma',
    estado: 'preproduccion',
    episodios: 8,
    bloques: 2,
    presupuesto: 9_600_000,
    moneda: 'EUR',
    coproduccionUE: true,
    paises: ['Francia', 'Portugal'],
    pctGastoTerritorio: { comun: 70, canarias: 0, bizkaia: 0, alava: 0, gipuzkoa: 0, navarra: 30 },
    territoriosCandidatos: ['comun', 'navarra'],
    idioma: 'castellano',
    direccionNovel: false,
    obraDificil: false,
    diasRodaje: 95,
    semanasRodaje: 19,
    fechaInicioRodaje: '12/01/2027',
    fechaEntrega: '30/06/2027',
    productorEjecutivo: 'Nuria Sanz',
    lineProducer: 'Diego Roldán',
    tipo: 'Serie de ficción',
    ubicacion: 'Galicia · Madrid',
    diaActual: null,
    fechaInforme: '01/06/2026',
  },
  {
    id: 'p-tierra-lenta',
    titulo: 'Tierra lenta',
    productora: 'Raíz Documental',
    tipologia: 'documental',
    canal: 'tv_lineal',
    estado: 'desarrollo',
    episodios: null,
    bloques: null,
    presupuesto: 480_000,
    moneda: 'EUR',
    coproduccionUE: false,
    paises: [],
    pctGastoTerritorio: { comun: 100, canarias: 0, bizkaia: 0, alava: 0, gipuzkoa: 0, navarra: 0 },
    territoriosCandidatos: ['comun'],
    idioma: 'castellano',
    direccionNovel: true,
    obraDificil: true,
    diasRodaje: 24,
    semanasRodaje: 8,
    fechaInicioRodaje: '15/03/2026',
    fechaEntrega: '01/12/2026',
    productorEjecutivo: 'Lucía Vega',
    lineProducer: '',
    tipo: 'Documental',
    ubicacion: 'Extremadura',
    diaActual: null,
    fechaInforme: '01/06/2026',
  },
  {
    id: 'p-claqueta-late',
    titulo: 'Claqueta Late Show',
    productora: 'Prime Time TV',
    tipologia: 'programa_tv',
    canal: 'tv_lineal',
    estado: 'rodaje',
    episodios: null,
    bloques: null,
    presupuesto: 3_600_000,
    moneda: 'EUR',
    coproduccionUE: false,
    paises: [],
    pctGastoTerritorio: { comun: 100, canarias: 0, bizkaia: 0, alava: 0, gipuzkoa: 0, navarra: 0 },
    territoriosCandidatos: ['comun'],
    idioma: 'castellano',
    direccionNovel: false,
    obraDificil: false,
    diasRodaje: 200,
    semanasRodaje: 40,
    fechaInicioRodaje: '08/09/2025',
    fechaEntrega: '30/06/2026',
    productorEjecutivo: 'Hugo Marín',
    lineProducer: 'Sara Gil',
    tipo: 'Programa de televisión',
    ubicacion: 'Plató Madrid',
    diaActual: null,
    fechaInforme: '01/06/2026',
  },
  {
    id: 'p-itsasoa',
    titulo: 'Itsasoa',
    productora: 'Gau Films',
    tipologia: 'largometraje_ficcion',
    canal: 'cine',
    estado: 'desarrollo',
    episodios: null,
    bloques: null,
    presupuesto: 1_200_000,
    moneda: 'EUR',
    coproduccionUE: false,
    paises: [],
    pctGastoTerritorio: { comun: 20, canarias: 0, bizkaia: 60, alava: 0, gipuzkoa: 20, navarra: 0 },
    territoriosCandidatos: ['comun', 'bizkaia', 'gipuzkoa'],
    idioma: 'euskera',
    direccionNovel: true,
    obraDificil: false,
    diasRodaje: 28,
    semanasRodaje: 6,
    fechaInicioRodaje: '02/02/2027',
    fechaEntrega: '15/10/2027',
    productorEjecutivo: 'Eneko Larrañaga',
    lineProducer: 'Maite Aguirre',
    tipo: 'Largometraje de ficción',
    ubicacion: 'Bizkaia · Gipuzkoa',
    diaActual: null,
    fechaInforme: '01/06/2026',
  },
]

export const PROYECTOS = PROYECTOS_SEMILLA.map(normalizarProyecto)

// Compatibilidad: el primer proyecto sigue siendo el «por defecto».
export const PROYECTO = PROYECTOS[0]
