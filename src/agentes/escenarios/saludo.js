// Parte de la mañana: el saludo con el que empiezan los agentes.
//
// Cada agente aporta lo suyo (rodaje, coste, bandeja, caja, riesgos, dossier y
// decisiones) y el Orquestador lo ordena por urgencia: primero lo que afecta a
// mañana, después lo que vence esta semana. Solo lee: no decide ni envía nada.
// Cabe en una pantalla: qué es Filmpilot (solo al abrir), tres frases, lo que ya
// han hecho solos, «Para hoy» con tres puntos como mucho, las cifras y la tira.
// «Para hoy» y la tira leen el mundo actual: lo que decides se tacha.

import { cuenta, esPlantilla, unir } from '../texto.js'
import { decisionesAbiertas } from '../pendientes.js'
import { evaluarRiesgos, jornada, jornadaOriginal, PREGUNTA, UMBRALES } from '../rodaje.js'
import { borradorRiesgo } from './riesgos.js'
import { t, v, c, POLITICAS, paso, texto, semanaDel } from './comun.js'

// Las preguntas que mandan los botones de «Para hoy».
export const PREGUNTAS_PARTE = {
  compras: '¿Qué órdenes de compra tengo pendientes?',
  dossier: '¿Qué bloquea el dossier fiscal?',
}

/** «Azotea, sin cobertura» → «azotea, sin cobertura»; también dentro de una plantilla. */
function minuscula(x) {
  if (esPlantilla(x)) return { ...x, plantilla: x.plantilla.charAt(0).toLowerCase() + x.plantilla.slice(1) }
  const s = String(x ?? '')
  return s.charAt(0).toLowerCase() + s.slice(1)
}

// «Madrid centro · interiores» → «Madrid centro»: en una frase basta el sitio.
const sitio = (loc) => loc.split(' · ')[0]
const cuando = (r) => (r.dias <= 1 ? v('mañana') : v(r.fecha, 'dia'))

/**
 * Lo que toca hoy, tres puntos como mucho y en orden de urgencia: la decisión de un
 * riesgo alto, las compras pendientes y el plazo del dossier que vence antes. Los
 * avisos al equipo no son un punto: van aparte, plegados (`avisos`). Devuelve también
 * cuántas decisiones quedan fuera (`resto`; siguen en «Por revisar»).
 */
export function agendaDelDia(m) {
  const riesgos = evaluarRiesgos(m)
  const dec = decisionesAbiertas(m)
  const cubiertas = new Set()
  const items = []

  // 1. Riesgo alto con dinero en juego: decidir antes que nada.
  for (const r of riesgos.filter((x) => x.severidad === 'alta' && x.decision)) {
    const d = dec.find((x) => x.ref?.tipo === 'riesgo' && x.ref.id === r.id)
    if (d) cubiertas.add(d.id)
    // La orden del día de esa misma jornada espera a la decisión.
    const cita = riesgos.find((x) => x.id === 'RG-4' && x.estado === 'abierto' && x.jornadas.includes(r.jornadas[0]))
    const n = v(r.jornadas[0], 'num')
    let detalle
    let resumen
    if (r.id === 'RG-1') {
      const j = jornadaOriginal(r.jornadas[0])
      const ji = jornadaOriginal(r.intercambio)
      const valores = { nota: v(j.nota), p: v(r.probabilidad, 'pct0'), i: v(ji.n, 'num'), res: v(r.reserva, 'eur') }
      detalle = t('{nota}, con un {p} de lluvia. Riesgos propone cambiarla por la {i}, sin coste, o apartar {res}.', valores)
      resumen = t('decidir qué hacer con la jornada {n} de {cuando}, un exterior con un {p} de lluvia', { n, cuando: cuando(r), p: v(r.probabilidad, 'pct0') })
    } else {
      detalle = t('{porque} {respuesta}', { porque: r.porQue, respuesta: r.respuesta })
      resumen = t('decidir qué hacer con {titulo}', { titulo: minuscula(r.titulo) })
    }
    items.push({
      id: `riesgo-${r.id}`,
      titulo: r.id === 'RG-1' ? t('Decide qué hacer con la jornada {n}', { n }) : r.titulo,
      detalle,
      cuando: cita ? t('Hoy, antes de publicar la orden del día de mañana') : r.dias <= 1 ? t('Hoy') : t('Antes del {f}', { f: v(r.fecha, 'dia') }),
      decide: d?.rol ?? 'Line producer y producción ejecutiva',
      capacidad: 'exploratoria',
      acciones: [{ etiqueta: 'Ver la propuesta', entrada: PREGUNTA[r.id] }],
      ref: { tipo: 'riesgo', id: r.id },
      resumen,
      entrada: PREGUNTA[r.id],
    })
  }

  // 2. Compras que esperan aprobación.
  const ordenes = c.ordenesPendientes(m)
  if (ordenes.length) {
    const imps = ordenes.map((o) => ({ o, imp: c.impactoOrden(m, o.id) }))
    for (const { o } of imps) {
      const d = dec.find((x) => x.ref?.tipo === 'orden' && x.ref.id === o.id)
      if (d) cubiertas.add(d.id)
    }
    const total = imps.reduce((s, x) => s + x.o.importe, 0)
    const exceso = imps.reduce((s, x) => s + x.imp.exceso, 0)
    // La semana de pago del grupo: si alguna se paga ya, lo dice; si no, la más temprana.
    const semanas = m.tesoreria.semanas
    const idxs = ordenes.map((o) => semanas.findIndex((s) => s.semana === o.semanaPago)).filter((i) => i >= 0)
    const enCurso = idxs.filter((i) => semanas[i].enCurso).length
    const semana = idxs.length ? semanas[Math.min(...idxs)] : null
    const ejecutiva = imps.some((x) => x.imp.rol === 'Producción ejecutiva')
    items.push({
      id: 'compras',
      titulo: ordenes.length === 1 ? t('Decide la compra {oc}', { oc: v(ordenes[0].id, 'id') }) : t('Decide {n}', { n: cuenta(ordenes.length, 'compra pendiente', 'compras pendientes') }),
      detalle:
        exceso > 0
          ? t('Suman {total}. Si las apruebas, el coste estimado final sube {exc}: no estaba previsto.', { total: v(total, 'eur'), exc: v(exceso, 'eur') })
          : t('Suman {total} y caben en lo previsto para sus partidas: no mueven el coste estimado final.', { total: v(total, 'eur') }),
      cuando:
        enCurso && enCurso === idxs.length
          ? t(ordenes.length === 1 ? 'Se paga esta semana' : 'Se pagan esta semana')
          : enCurso
            ? t('{n} esta semana', { n: v(enCurso === 1 ? 'Una se paga' : `${enCurso} se pagan`) })
            : semana
              ? t(ordenes.length === 1 ? 'Se paga la semana del {f}' : 'Se pagan desde la semana del {f}', { f: v(semanaDel(semana.fechas)) })
              : t('Sin semana de pago'),
      decide: ejecutiva ? 'Producción ejecutiva' : 'Line producer',
      // Plegadas tras «Ver las compras ›»: el punto ya dice cuántas son y cuánto suman.
      plegado: ordenes.length === 1 ? t('Ver la compra') : t('Ver las compras'),
      subitems: imps.map(({ o, imp }) => ({
        id: o.id,
        titulo: t('{concepto} · {prov}', { concepto: v(o.concepto), prov: v(o.proveedor) }),
        // Por qué pide aprobación y qué hace al coste: el punto suma el exceso de todas.
        detalle: t('{oc} · {imp} · {nota}', {
          oc: v(o.id, 'id'),
          imp: v(o.importe, 'eur'),
          nota: unir(
            [
              imp.nivel === 'aprueba' &&
                (imp.motivos.includes('importe')
                  ? t('necesita aprobación: supera {u}', { u: v(POLITICAS.umbralImporteOc, 'eur') })
                  : t('necesita aprobación: deja el capítulo por encima del límite')),
              imp.exceso > 0 ? t('sube el coste estimado final {exc}', { exc: v(imp.exceso, 'eur') }) : t('cabe en lo previsto'),
            ].filter(Boolean),
            ' · ',
          ),
        }),
        etiqueta: 'Revisar',
        entrada: `Revisa la orden de compra ${o.id}`,
        ref: { tipo: 'orden', id: o.id },
      })),
      ref: { tipo: 'grupo', refs: ordenes.map((o) => ({ tipo: 'orden', id: o.id })) },
      resumen: t('decidir {n}', { n: cuenta(ordenes.length, 'compra pendiente', 'compras pendientes') }),
      entrada: PREGUNTAS_PARTE.compras,
    })
  }

  // 3. El plazo del dossier que vence antes (si es esta semana o la que viene).
  const prox = c
    .dossier(m)
    .filter((d) => d.dias >= 0 && d.dias <= UMBRALES.diasAlta)
    .sort((a, b) => a.dias - b.dias)[0]
  if (prox) {
    const deduccion = m.financiacion.find((f) => f.tipo === 'Deducción')
    items.push({
      id: `dossier-${prox.id}`,
      titulo: t('{doc}', { doc: v(prox.documento) }),
      detalle: deduccion
        ? t('Sin él se pierde la deducción fiscal: {imp} del plan de financiación.', { imp: v(deduccion.importe, 'eur') })
        : t('Sin él no se cierra el dossier fiscal.'),
      cuando: t('Vence el {f}', { f: v(prox.deadline, 'dia') }),
      decide: prox.responsable,
      rolEtiqueta: 'Responsable',
      acciones: [{ etiqueta: 'Ver el dossier', entrada: PREGUNTAS_PARTE.dossier }],
      ref: null,
      resumen: t('tener listo el {doc}, que vence el {f}', { doc: v(minuscula(prox.documento)), f: v(prox.deadline, 'dia') }),
      entrada: PREGUNTAS_PARTE.dossier,
    })
  }

  const resto = dec.filter((d) => !cubiertas.has(d.id))
  return { items, avisos: avisosDelDia(m, riesgos), resto: resto.length, restoAprobacion: resto.filter((d) => d.nivel === 'aprueba').length }
}

/**
 * Avisos al equipo que conviene mandar esta semana. Ya están escritos (los redacta
 * Riesgos); los revisas y los mandas tú. No son decisiones: van plegados bajo
 * «Para hoy», tras «Verlos ›». null si no hay ninguno.
 */
function avisosDelDia(m, riesgos) {
  const avisos = riesgos.filter((r) => r.aviso && r.estado === 'abierto' && r.dias >= 0 && r.dias <= UMBRALES.diasAlta).sort((a, b) => a.dias - b.dias)
  if (!avisos.length) return null
  return {
    titulo: avisos.length === 1 ? t('Revisa y manda un aviso al equipo') : t('Revisa y manda {n} al equipo', { n: cuenta(avisos.length, 'aviso', 'avisos') }),
    detalle: avisos.length === 1 ? t('Lo ha escrito Riesgos: no sale sin ti.') : t('Los ha escrito Riesgos: no sale ninguno sin ti.'),
    // Corto: va en la misma línea que el título, también en móvil.
    plegado: avisos.length === 1 ? t('Verlo') : t('Verlos'),
    subitems: avisos.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      detalle: t('Para {para} · {cuando}', { para: v(borradorRiesgo(m, r.id)?.para?.split(' · ')[0] ?? 'el equipo'), cuando: cuando(r) }),
      etiqueta: 'Ver el aviso',
      entrada: PREGUNTA[r.id],
      ref: { tipo: 'aviso', id: r.id },
    })),
    ref: { tipo: 'grupo', refs: avisos.map((r) => ({ tipo: 'aviso', id: r.id })) },
  }
}

/** Tres frases como mucho: dónde se rueda hoy, cómo va el coste y lo primero que toca. */
function entradilla(m, agenda) {
  const dia = m.proyecto.diaActual
  const hoy = jornada(m, dia)
  const fin = m.rodaje.jornadas[m.rodaje.jornadas.length - 1]
  const tot = c.totales(m)
  const fuera = c.capitulos(m).filter((x) => x.fueraRango)
  const coste = { cef: v(tot.cef, 'eur'), pct: v(tot.desviacionPct, 'pctSigned') }
  const frases = [
    hoy
      ? t('Hoy se rueda en {loc} y el rodaje cierra el {fin}.', { loc: v(sitio(hoy.localizacion)), fin: v(fin.fecha, 'dia') })
      : t('Día {n} de {total} de rodaje.', { n: v(dia, 'num'), total: v(m.proyecto.diasRodaje, 'num') }),
    fuera.length === 1
      ? t('El coste estimado final va en {cef} ({pct}) y solo {cap} se pasa del límite.', { ...coste, cap: v(fuera[0].nombre) })
      : fuera.length
        ? t('El coste estimado final va en {cef} ({pct}) y {n} se pasan del límite.', { ...coste, n: cuenta(fuera.length, 'capítulo', 'capítulos') })
        : t('El coste estimado final va en {cef} ({pct}) y ningún capítulo se pasa del límite.', coste),
    agenda.items.length
      ? t('Lo primero hoy: {x}.', { x: agenda.items[0].resumen })
      : agenda.avisos
        ? t('Lo primero hoy: {x}.', { x: minuscula(agenda.avisos.titulo) })
        : t('Hoy no hay nada urgente por decidir.'),
  ]
  return { tipo: 'texto', destacado: true, texto: unir(frases) }
}

/**
 * Dos cifras: cómo cierra el coste y cómo va la caja. Lo que hay por revisar ya lo
 * cuenta la cabecera, y lo gastado, el informe.
 */
function cifras(m) {
  const tot = c.totales(m)
  const tes = c.tesoreria(m)
  return {
    tipo: 'kpis',
    titulo: 'Así va la producción',
    items: [
      { id: 'cef', etiqueta: 'Coste estimado final', formato: 'eur', valor: tot.cef, sub: t('{d} ({p}) sobre presupuesto', { d: v(tot.desviacion, 'eurSigned'), p: v(tot.desviacionPct, 'pctSigned') }) },
      {
        id: 'caja',
        etiqueta: 'Caja hoy',
        formato: 'eur',
        valor: tes.saldoHoy,
        sub: tes.negativas.length ? t('En negativo la semana del {f}: {s}', { f: v(semanaDel(tes.minimo.fechas)), s: v(tes.minimo.saldo, 'eurSigned') }) : t('Sin semanas en negativo'),
      },
    ],
  }
}

/**
 * «Ya hecho, sin pedírtelo»: tres líneas como mucho con lo que han hecho solos antes
 * de que llegues. El detalle de cada agente queda en «Cómo lo han hecho».
 */
// Lo que contabilizó Conciliación sola, con su pedido; lo que decidió la persona no cuenta.
const deConciliacion = (d) => d.estado === 'contabilizada' && d.oc && (d.contabilizadaPor == null || d.contabilizadaPor === 'Conciliación')

function hecho(m) {
  const contabilizadas = Object.values(m.documentos).filter(deConciliacion)
  const riesgos = evaluarRiesgos(m)
  const altos = riesgos.filter((r) => r.severidad === 'alta').length
  const items = [
    contabilizadas.length && {
      agente: 'conciliacion',
      texto: t('contabilizó {n} que cuadran con su pedido · {imp}', { n: cuenta(contabilizadas.length, 'factura', 'facturas'), imp: v(contabilizadas.reduce((s, d) => s + d.base, 0), 'eur') }),
    },
    { agente: 'prevision', texto: t('recalculó la caja hasta el cierre') },
    {
      agente: 'riesgos',
      texto: altos
        ? t('revisó las jornadas {a} a {b}: {n}', { a: v(m.proyecto.diaActual, 'num'), b: v(m.proyecto.diasRodaje, 'num'), n: cuenta(altos, 'riesgo alto', 'riesgos altos') })
        : t('revisó las jornadas {a} a {b}', { a: v(m.proyecto.diaActual, 'num'), b: v(m.proyecto.diasRodaje, 'num') }),
    },
  ].filter(Boolean)
  return { tipo: 'hecho', titulo: 'Ya hecho, sin pedírtelo', nivel: 'ejecuta', items: items.slice(0, 3) }
}

export const saludo = {
  id: 'saludo',
  titulo: 'Parte de la mañana',
  ejemplos: ['Buenos días', 'Ponme al día', '¿Qué está pasando hoy?'],

  planificar(m) {
    const riesgos = evaluarRiesgos(m)
    const tot = c.totales(m)
    const tes = c.tesoreria(m)
    const contab = Object.values(m.documentos).filter(deConciliacion).length
    const bandeja = Object.values(m.documentos).filter((d) => d.estado === 'en_bandeja').length
    const dossier = c.dossier(m).sort((a, b) => a.dias - b.dias)
    const dec = decisionesAbiertas(m)
    // El parte ya cuenta los riesgos: el parte de riesgos no vuelve a llegar solo.
    const recibirParte = m.entrantes.includes('EV-RIESGOS') ? [{ tipo: 'evento/recibir', eventoId: 'EV-RIESGOS' }] : []
    return [
      paso('riesgos', t('Lee el plan de rodaje: hoy y las próximas jornadas'), {
        tipo: 'lectura',
        acciones: recibirParte,
        salida: t('Jornadas {a} a {b}: {n}, {altos}', { a: v(m.proyecto.diaActual, 'num'), b: v(m.proyecto.diasRodaje, 'num'), n: cuenta(riesgos.length, 'riesgo', 'riesgos'), altos: cuenta(riesgos.filter((r) => r.severidad === 'alta').length, 'alto', 'altos') }),
      }),
      paso('costes', t('Cierra el coste con lo contabilizado hasta ayer'), { paralelo: true, salida: t('Coste estimado final {cef} ({pct})', { cef: v(tot.cef, 'eur'), pct: v(tot.desviacionPct, 'pctSigned') }) }),
      paso('conciliacion', t('Repasa lo que ha contabilizado sola'), { tipo: 'lectura', paralelo: true, salida: t('{n} casadas con su pedido', { n: cuenta(contab, 'factura', 'facturas') }) }),
      paso('facturas', t('Mira la bandeja de entrada'), { tipo: 'lectura', paralelo: true, salida: t('{n} esperando', { n: cuenta(bandeja, 'documento', 'documentos') }) }),
      paso('prevision', t('Recalcula la caja de las próximas semanas'), {
        salida: tes.negativas.length ? t('La semana del {f} baja a {s}', { f: v(semanaDel(tes.minimo.fechas)), s: v(tes.minimo.saldo, 'eurSigned') }) : t('Sin semanas en negativo'),
      }),
      paso('cumplimiento', t('Repasa los plazos del dossier fiscal'), {
        tipo: 'revision',
        paralelo: true,
        salida: dossier.length ? t('{doc} vence en {d}', { doc: v(dossier[0].documento), d: v(dossier[0].dias, 'dias') }) : t('Sin plazos abiertos'),
      }),
      paso('excepciones', t('Ordena lo que espera una decisión'), { tipo: 'revision', salida: t('{n} por revisar', { n: v(dec.length, 'num') }) }),
      paso('informes', t('Redacta el parte de la mañana'), { tipo: 'redaccion', salida: t('Listo') }),
    ]
  },

  componer({ despues: m, det }) {
    const agenda = agendaDelDia(m)
    // Pedido con palabras («ponme al día»): una línea de entrada que dice que está rehecho.
    const pedido = det?.entidades?.dia == null
    return {
      bloques: [
        ...(pedido ? [texto(t('El parte del día {n} de rodaje, rehecho con lo que ya has decidido hoy.', { n: v(m.proyecto.diaActual, 'num') }))] : []),
        entradilla(m, agenda),
        hecho(m),
        { tipo: 'agenda', titulo: 'Para hoy', items: agenda.items, avisos: agenda.avisos, resto: agenda.resto, restoAprobacion: agenda.restoAprobacion },
        cifras(m),
        { tipo: 'tira' },
      ],
      // Las sugerencias las pone la pantalla (la siguiente historia): «Para hoy» ya lleva sus botones.
      sugerencias: [],
      fuentes: ['Plan de rodaje (ejemplo)', 'Presupuesto ICAA por partidas', 'Bandeja de facturas y órdenes de compra', 'Previsión de tesorería semanal', 'Dossier fiscal', 'Cola de excepciones'],
      reglas: [
        t('Primero lo que afecta a mañana; después, lo que vence o se paga esta semana'),
        t('Un riesgo alto con dinero en juego y una compra que pide aprobación siempre entran en «Para hoy»'),
        t('Como mucho tres puntos; los avisos al equipo van aparte, porque no son decisiones'),
        t('Los plazos del dossier entran si vencen en los próximos {d}', { d: v(UMBRALES.diasAlta, 'dias') }),
      ],
      // Lo de «Ya hecho» se hizo antes: para preparar el parte solo se lee.
      // Lo han preparado varios agentes: plural.
      noHecho: [t('Para preparar el parte solo han leído: no han aprobado, contabilizado ni cambiado nada.'), t('No han enviado avisos ni han contactado con nadie.')],
    }
  },
}
