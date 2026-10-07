// Plan de rodaje y riesgos de producción de «La última función» (EXPLORATORIO).
//
// Datos de ejemplo: plan de jornadas, previsión del tiempo, convocatorias,
// permisos y avisos. No se consulta ningún servicio externo.
//
// Calendario del mundo de los agentes: el rodaje empezó el lunes 11/05/2026 y
// rueda cinco días por semana, así que hoy (lunes 01/06) es la jornada 16 y
// «día 15 de 30» son las jornadas hechas. Coincide con PERIODO (Rodaje 3 =
// 25–31 may) y con CASHFLOW (Rodaje 4–6). No coinciden fechaInicioRodaje
// '04/05/2026' de proyectos.js ni las facturas «semana 3»: aquí no se usan.
//
// Este módulo no importa calculos.js: calculos.js lo importa a él.

import { CASHFLOW } from '../lib/data.js'
import { t, v, diasEntre, fecha as fechaLarga, formatear } from './texto.js'

// Nombres de LOCALIZACIONES de src/screens/Coste.jsx (copiados: es JSX y Node no lo importa).
export const LOCALIZACIONES = ['Madrid centro · interiores', 'Teatro Apolo · decorado', 'Exteriores Madrid', 'Canarias · scouting y bloque 2', 'Postproducción inicial']
const [MADRID, APOLO, EXTERIORES, CANARIAS] = LOCALIZACIONES

const J = (n, fecha, semana, localizacion, tipo, franja, extra = {}) => ({ n, fecha, semana, localizacion, tipo, franja, roles: ['Protagonistas', 'Equipo técnico'], nota: '', ...extra })

export const JORNADAS = [
  J(16, '2026-06-01', 'Rodaje 4', MADRID, 'INT', 'Día', { nota: 'Jornada ampliada (refuerzo de catering, OC-109)' }),
  J(17, '2026-06-02', 'Rodaje 4', MADRID, 'INT', 'Día'),
  J(18, '2026-06-03', 'Rodaje 4', EXTERIORES, 'EXT', 'Día', { nota: 'Azotea, sin cobertura' }),
  J(19, '2026-06-04', 'Rodaje 4', APOLO, 'INT', 'Día', { nota: 'Decorado montado' }),
  J(20, '2026-06-05', 'Rodaje 4', MADRID, 'INT', 'Día', { nota: 'Cambiada desde Exteriores Madrid', anterior: EXTERIORES }),
  J(21, '2026-06-08', 'Rodaje 5', CANARIAS, 'EXT', 'Día', { roles: ['Protagonistas', 'Actriz secundaria', 'Equipo técnico'] }),
  J(22, '2026-06-09', 'Rodaje 5', CANARIAS, 'EXT', 'Día', { roles: ['Protagonistas', 'Actriz secundaria', 'Equipo técnico'] }),
  J(23, '2026-06-10', 'Rodaje 5', CANARIAS, 'EXT', 'Día', { nota: 'Vía pública' }),
  J(24, '2026-06-11', 'Rodaje 5', CANARIAS, 'EXT', 'Noche'),
  J(25, '2026-06-12', 'Rodaje 5', CANARIAS, 'EXT', 'Noche'),
  J(26, '2026-06-15', 'Rodaje 6', APOLO, 'INT', 'Día'),
  J(27, '2026-06-16', 'Rodaje 6', APOLO, 'INT', 'Día'),
  J(28, '2026-06-17', 'Rodaje 6', MADRID, 'INT', 'Día'),
  J(29, '2026-06-18', 'Rodaje 6', EXTERIORES, 'EXT', 'Día'),
  J(30, '2026-06-19', 'Rodaje 6', APOLO, 'INT', 'Día', { nota: 'Cierre de rodaje' }),
]

// Previsión del tiempo de ejemplo: probabilidad de lluvia por fecha.
export const METEO = {
  '2026-06-03': 0.8,
  '2026-06-04': 0.1,
  '2026-06-18': 0.2,
}

export const SENALES = {
  // El exterior de esta semana y el interior con el que se puede intercambiar.
  lluvia: { jornada: 18, intercambio: 19, actualizacion: 0.9 },
  citacion: { jornada: 17, publicada: false, alerta: false },
  billete: { jornadas: [21, 22], rol: 'Actriz secundaria', contratoFirmado: true, emitido: false },
  permiso: { jornada: 23, solicitado: '2026-05-20', resuelto: false, organismo: 'Ayuntamiento de Las Palmas de Gran Canaria' },
  cambio: { jornada: 20, de: EXTERIORES, a: MADRID, avisados: ['Dirección', 'Arte'], sinAvisar: 'Transportes Madrid Film S.L.' },
  // OC-106 (28/05) paga las horas extra de las noches de las jornadas 12 a 14.
  noches: { jornadas: [24, 25], anteriores: [12, 13, 14], oc: 'OC-106', partida: '03.03' },
}

// Umbrales de severidad (se citan en las reglas de cada respuesta).
export const UMBRALES = { probabilidad: 0.7, diasAlta: 7, exposicion: 20_000, diasUrgente: 5 }

export const TIPOS = {
  'RG-1': { tipo: 'Clima', agente: 'riesgos' },
  'RG-2': { tipo: 'Ausencia', agente: 'riesgos' },
  'RG-3': { tipo: 'Permiso', agente: 'riesgos' },
  'RG-4': { tipo: 'Orden del día', agente: 'riesgos' },
  'RG-5': { tipo: 'Horas extra', agente: 'riesgos' },
  'RG-6': { tipo: 'Coordinación', agente: 'riesgos' },
}

export function crearRodaje() {
  return {
    jornadas: JORNADAS.map((j) => ({ ...j, roles: [...j.roles] })),
    meteo: { ...METEO },
    senales: JSON.parse(JSON.stringify(SENALES)),
  }
}

const r2 = (n) => Math.round(n * 100) / 100
const pendiente = (p) => r2(p.cef - p.gastado - p.comprometido)

/** Coste de una jornada de rodaje: pagos de su semana en la previsión de caja, entre cinco jornadas. */
export function costeJornada(semana) {
  const s = CASHFLOW.find((x) => x.semana === semana)
  return s ? r2(s.pagos / 5) : 0
}

export const jornada = (m, n) => m.rodaje.jornadas.find((j) => j.n === n)
export const jornadaOriginal = (n) => JORNADAS.find((j) => j.n === n)

/** Horas extra de las noches que quedan: lo pagado por noche (OC-106) por las noches que faltan, menos el margen de su partida. */
function horasExtra(m) {
  const { oc, partida, anteriores, jornadas } = m.rodaje.senales.noches
  const o = m.ordenes[oc]
  const p = m.partidas[partida]
  if (!o || !p) return { repetir: 0, margen: 0, exceso: 0 }
  const repetir = r2((o.importe / anteriores.length) * jornadas.length)
  const yaConsumido = o.estado === 'Pendiente' || o.estado === 'Por llegar' ? o.importe : 0
  const margen = r2(Math.max(0, pendiente(p) - yaConsumido))
  return { repetir, margen, exceso: Math.round(repetir - Math.min(repetir, margen)) }
}

function severidad({ alerta, probabilidad, dias, exposicion }) {
  if (alerta) return 'alta'
  if (probabilidad != null && probabilidad >= UMBRALES.probabilidad && dias <= UMBRALES.diasAlta) return 'alta'
  if ((exposicion ?? 0) >= UMBRALES.exposicion || dias <= UMBRALES.diasUrgente) return 'media'
  return 'baja'
}

const PESO = { alta: 0, media: 1, baja: 2, controlado: 3 }
const etiquetaJ = (ns) => (ns.length > 1 ? `jornadas ${ns.join(' y ')}` : `jornada ${ns[0]}`)

/** Evalúa los seis riesgos con el estado actual del mundo. */
export function evaluarRiesgos(m) {
  const { meteo, senales } = m.rodaje
  const hoy = m.corte.fecha
  const dec = m.decisionesRiesgo ?? {}
  const out = []

  // RG-1 · lluvia en el exterior de esta semana. Se identifica por la jornada original.
  const ll = senales.lluvia
  const j1 = jornadaOriginal(ll.jornada)
  const ji = jornadaOriginal(ll.intercambio)
  const exterior = m.rodaje.jornadas.find((j) => j.localizacion === j1.localizacion && j.tipo === 'EXT' && j.semana === j1.semana) ?? jornada(m, j1.n)
  const p1 = meteo[exterior.fecha] ?? 0
  const pOriginal = meteo[j1.fecha] ?? 0
  const exp1 = costeJornada(j1.semana)
  const mitigado1 = dec['RG-1']?.estado === 'mitigado'
  out.push({
    id: 'RG-1',
    jornadas: [j1.n],
    fecha: j1.fecha,
    probabilidad: mitigado1 ? p1 : pOriginal,
    exposicion: exp1,
    reserva: Math.round(pOriginal * exp1),
    intercambio: ji.n,
    titulo: t('Lluvia en el exterior de la jornada {n}', { n: v(j1.n, 'num') }),
    senales: [
      t('Previsión de ejemplo para el {f}: {p} de lluvia', { f: v(fechaLarga(j1.fecha)), p: v(pOriginal, 'pct0') }),
      t('Jornada {n}: exterior de {franja} en {loc} ({nota})', { n: v(j1.n, 'num'), franja: v(j1.franja.toLowerCase()), loc: v(j1.localizacion), nota: v(j1.nota) }),
      t('Una jornada de esa semana cuesta unos {c}: pagos previstos de la semana entre cinco jornadas', { c: v(exp1, 'eur') }),
    ],
    porQue: t('Si llueve, se pierde la jornada o se rueda con riesgo para el equipo y el material.'),
    respuesta: mitigado1
      ? t('Orden cambiado: el exterior pasa a la jornada {n}, con un {p} de lluvia.', { n: v(exterior.n, 'num'), p: v(p1, 'pct0') })
      : t('Cambiar el orden con la jornada {n} ({loc}, interior con el decorado montado), sin coste en la previsión.', { n: v(ji.n, 'num'), loc: v(ji.localizacion) }),
    decision: true,
  })

  // RG-2 · ausencia de la actriz secundaria en Canarias.
  const b = senales.billete
  const exp2 = r2(b.jornadas.length * costeJornada(jornada(m, b.jornadas[0]).semana))
  out.push({
    id: 'RG-2',
    jornadas: [...b.jornadas],
    fecha: jornada(m, b.jornadas[0]).fecha,
    probabilidad: null,
    exposicion: exp2,
    reserva: null,
    titulo: t('Actriz secundaria sin billete a Canarias'),
    senales: [
      t('Convocada en las {j} del bloque de Canarias', { j: v(etiquetaJ(b.jornadas)) }),
      t('Contrato firmado; billete todavía sin emitir'),
      t('Exposición máxima si no llega: el coste de esas jornadas, unos {c}', { c: v(exp2, 'eur') }),
    ],
    porQue: t('Sin ella no se pueden rodar sus secuencias en Canarias y habría que reprogramarlas.'),
    respuesta: t('Pedir hoy a coordinación de producción que emita el billete.'),
    aviso: 'BOR-RG-2',
  })

  // RG-3 · permiso de vía pública sin resolver.
  const pm = senales.permiso
  out.push({
    id: 'RG-3',
    jornadas: [pm.jornada],
    fecha: jornada(m, pm.jornada).fecha,
    probabilidad: null,
    exposicion: null,
    reserva: null,
    titulo: t('Permiso de vía pública pendiente'),
    senales: [
      t('Solicitado el {f} al {org}', { f: v(fechaLarga(pm.solicitado)), org: v(pm.organismo) }),
      t('Sin resolución, y la jornada {n} es en vía pública', { n: v(pm.jornada, 'num') }),
      t('Impacto por estimar: depende del plan B de localización'),
    ],
    porQue: t('Sin permiso no se puede rodar en la calle: habría que cambiar de localización con poco margen.'),
    respuesta: t('Preguntar por el estado del permiso y tener lista una localización privada de reserva.'),
    aviso: 'BOR-RG-3',
  })

  // RG-4 · orden del día de mañana sin publicar.
  const ci = senales.citacion
  out.push({
    id: 'RG-4',
    jornadas: [ci.jornada],
    fecha: jornada(m, ci.jornada).fecha,
    probabilidad: null,
    exposicion: null,
    reserva: null,
    alerta: ci.alerta && !ci.publicada,
    titulo: t('Orden del día de mañana sin publicar'),
    senales: [
      t('La orden del día de la jornada {n} todavía no está publicada', { n: v(ci.jornada, 'num') }),
      ci.alerta ? t('Ayudantía de dirección no ha confirmado a qué hora sale y el equipo no sabe su citación') : t('Suele publicarse la tarde anterior'),
    ],
    porQue: t('Sin la orden del día el equipo llega tarde o a otro sitio: se acumulan esperas y horas extra.'),
    respuesta: t('Recordárselo a ayudantía de dirección.'),
    aviso: 'BOR-RG-4',
  })

  // RG-5 · horas extra en las noches de Canarias.
  const no = senales.noches
  const he = horasExtra(m)
  const o = m.ordenes[no.oc]
  out.push({
    id: 'RG-5',
    jornadas: [...no.jornadas],
    fecha: jornada(m, no.jornadas[0]).fecha,
    probabilidad: null,
    exposicion: he.exceso,
    reserva: he.exceso > 0 ? he.exceso : null,
    titulo: t('Horas extra en las noches de Canarias'),
    senales: [
      t('Las noches de las {j} generaron horas extra: {oc} de {prov}, {imp}', { j: v(etiquetaJ([no.anteriores[0], no.anteriores[no.anteriores.length - 1]]).replace(' y ', ' a ')), oc: v(no.oc, 'id'), prov: v(o?.proveedor ?? ''), imp: v(o?.importe ?? 0, 'eur') }),
      t('Quedan las noches de las {j}: al mismo ritmo, unos {rep}', { j: v(etiquetaJ(no.jornadas)), rep: v(he.repetir, 'eur') }),
      he.exceso > 0
        ? t('A la partida {p} le quedan {mar} previstos: el coste estimado final subiría {exc}', { p: v(no.partida, 'id'), mar: v(he.margen, 'eur'), exc: v(he.exceso, 'eur') })
        : t('Cabría en lo que queda previsto en la partida {p}', { p: v(no.partida, 'id') }),
      t('Conviene revisar los descansos del equipo con el convenio'),
    ],
    porQue: t('Las noches seguidas alargan las jornadas: más horas extra y equipo cansado.'),
    respuesta:
      dec['RG-5']?.estado === 'mitigado'
        ? t('Noches replanificadas con una citación más tardía: reduce las horas extra, no las elimina.')
        : t('Replanificar las noches con una citación más tardía, o reservar el coste en la previsión.'),
    decision: true,
  })

  // RG-6 · cambio de localización que no ha llegado a transportes.
  const cb = senales.cambio
  out.push({
    id: 'RG-6',
    jornadas: [cb.jornada],
    fecha: jornada(m, cb.jornada).fecha,
    probabilidad: null,
    exposicion: null,
    reserva: null,
    titulo: t('Cambio de localización sin avisar a transportes'),
    senales: [
      t('La jornada {n} pasa de {de} a {a}', { n: v(cb.jornada, 'num'), de: v(cb.de), a: v(cb.a) }),
      t('Lo saben {quien}; la hoja de ruta de {prov} sigue con la dirección anterior', { quien: v(cb.avisados.join(' y ')), prov: v(cb.sinAvisar) }),
    ],
    porQue: t('Los camiones irían a la localización anterior: retraso en el montaje y horas de espera.'),
    respuesta: t('Avisar a transportes del cambio.'),
    aviso: 'BOR-RG-6',
  })

  return out
    .map((r) => {
      const d = dec[r.id]
      const dias = diasEntre(hoy, r.fecha)
      const borrador = r.aviso ? m.borradores?.[r.aviso] : null
      const estado = d?.estado ?? (borrador && borrador.estado !== 'descartado' ? 'aviso' : 'abierto')
      const base = severidad({ ...r, dias })
      // Cambiar el orden elimina la lluvia; replanificar las noches solo la reduce; asumir no cambia la severidad.
      const sev = estado === 'mitigado' ? (r.id === 'RG-1' ? 'controlado' : 'baja') : base
      const reservaCorta = d?.estado === 'reservado' && r.reserva != null && Math.abs(d.importe - r.reserva) > 0.5
      return {
        ...r,
        ...TIPOS[r.id],
        dias,
        severidad: sev,
        estado,
        decision: !!r.decision && (!d || reservaCorta),
        reservaAprobada: m.reservas?.[r.id]?.importe ?? null,
        reservaCorta,
      }
    })
    .sort((a, b) => (PESO[a.severidad] ?? 3) - (PESO[b.severidad] ?? 3) || a.dias - b.dias)
}

export function riesgo(m, id) {
  return evaluarRiesgos(m).find((r) => r.id === id)
}

/** Decisiones abiertas con dinero en juego: van al panel de decisiones. */
export function decisionesRiesgos(m) {
  return evaluarRiesgos(m)
    .filter((r) => r.decision && r.reserva)
    .map((r) => ({
      id: `ex-${r.id}`,
      tipo: 'riesgo',
      ref: { tipo: 'riesgo', id: r.id },
      nivel: 'aprueba',
      rol: 'Producción ejecutiva',
      importe: r.reserva,
      titulo: `Riesgo · ${TIPOS[r.id].tipo.toLowerCase()}, ${etiquetaJ(r.jornadas)}${r.reservaCorta ? ' (reserva corta)' : ''}`,
      entrada: PREGUNTA[r.id],
    }))
}

/** Riesgos altos que no se han resuelto con un cambio de plan (los asumidos siguen contando). */
export function riesgosAltos(m) {
  return evaluarRiesgos(m).filter((r) => r.severidad === 'alta')
}

// Pregunta que abre cada riesgo en la conversación.
export const PREGUNTA = {
  'RG-1': '¿Va a llover en la jornada 18?',
  'RG-2': '¿Tiene billete la actriz de la jornada 21?',
  'RG-3': '¿Cómo va el permiso de vía pública de Canarias?',
  'RG-4': '¿Está publicada la orden de rodaje de mañana?',
  'RG-5': '¿Qué riesgo hay con las horas extra de noche?',
  'RG-6': 'Prepara el aviso a transportes por el cambio de localización de la jornada 20',
}

// Jornada → riesgo («¿y la jornada 23?»).
export function riesgoDeJornada(m, n) {
  return evaluarRiesgos(m).find((r) => r.jornadas.includes(n)) ?? null
}

export { formatear }
