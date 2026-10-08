// Parte de la mañana: el saludo con el que empiezan los agentes.
//
// Cada agente aporta lo suyo (rodaje, coste, bandeja, caja, riesgos, dossier y
// decisiones) y el Orquestador lo ordena por urgencia: primero lo que afecta a
// mañana, después lo que vence esta semana. Solo lee: no decide ni envía nada.
// Las tarjetas «Para hoy» y «Esta semana» leen el mundo actual, así que se van
// tachando a medida que decides.

import { cuenta, esPlantilla, unir } from '../texto.js'
import { confianzaBaja } from '../politicas.js'
import { decisionesAbiertas } from '../pendientes.js'
import { evaluarRiesgos, jornada, jornadaOriginal, PREGUNTA, UMBRALES } from '../rodaje.js'
import { borradorRiesgo } from './riesgos.js'
import { t, v, c, POLITICAS, paso, sug, texto } from './comun.js'

export const PREGUNTAS_PARTE = {
  compras: '¿Qué órdenes de compra tengo pendientes?',
  dossier: '¿Qué bloquea el dossier fiscal?',
  informe: 'Prepárame el informe semanal de coste',
  caja: '¿Cómo cerraremos el proyecto y llegamos con la caja?',
  riesgos: '¿Qué riesgos hay para las próximas jornadas?',
}

/** «Azotea, sin cobertura» → «azotea, sin cobertura»; también dentro de una plantilla. */
function minuscula(x) {
  if (esPlantilla(x)) return { ...x, plantilla: x.plantilla.charAt(0).toLowerCase() + x.plantilla.slice(1) }
  const s = String(x ?? '')
  return s.charAt(0).toLowerCase() + s.slice(1)
}

// «Madrid centro · interiores» → «Madrid centro»: en una frase basta el sitio.
const sitio = (loc) => loc.split(' · ')[0]
const tipoJornada = (j) => t('{tipo} de {franja}', { tipo: v(j.tipo === 'EXT' ? 'exterior' : 'interior'), franja: v(j.franja.toLowerCase()) })
const cuando = (r) => (r.dias <= 1 ? v('mañana') : v(r.fecha, 'dia'))

/**
 * Lo que toca hoy, en orden: la decisión de un riesgo alto, los avisos al equipo,
 * las compras pendientes y el plazo del dossier que vence antes. Devuelve también
 * cuántas decisiones quedan fuera (siguen en «Por revisar»).
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
      const valores = { loc: v(sitio(j.localizacion)), nota: v(minuscula(j.nota)), p: v(r.probabilidad, 'pct0'), i: v(ji.n, 'num'), iloc: v(sitio(ji.localizacion)), inota: v(minuscula(ji.nota)), res: v(r.reserva, 'eur') }
      detalle = r.dias <= 1
        ? t('Mañana toca exterior en {loc} ({nota}) con un {p} de lluvia. Riesgos de producción propone cambiarla por la jornada {i}, un interior en {iloc} ({inota}), sin coste; si no, reservar {res} en la previsión.', valores)
        : t('El {f} toca exterior en {loc} ({nota}) con un {p} de lluvia. Riesgos de producción propone cambiarla por la jornada {i}, un interior en {iloc} ({inota}), sin coste; si no, reservar {res} en la previsión.', { ...valores, f: v(r.fecha, 'dia') })
      resumen = t('decidir qué hacer con la jornada {n} de {cuando}, un exterior con un {p} de lluvia{cita}', { n, cuando: cuando(r), p: v(r.probabilidad, 'pct0'), cita: cita ? t(' y la orden del día sin publicar') : v('') })
    } else {
      detalle = t('{porque} {respuesta}', { porque: r.porQue, respuesta: r.respuesta })
      resumen = t('decidir qué hacer con {titulo}', { titulo: minuscula(r.titulo) })
    }
    items.push({
      id: `riesgo-${r.id}`,
      titulo: r.id === 'RG-1' ? t('Decide qué hacer con la jornada {n}', { n }) : r.titulo,
      detalle,
      cuando: cita ? t('Hoy, antes de publicar su orden del día') : r.dias <= 1 ? t('Hoy') : t('Antes del {f}', { f: v(r.fecha, 'dia') }),
      decide: d?.rol ?? 'Line producer y producción ejecutiva',
      capacidad: 'exploratoria',
      acciones: [{ etiqueta: 'Ver la propuesta', entrada: PREGUNTA[r.id] }],
      ref: { tipo: 'riesgo', id: r.id },
      resumen,
      cierre: r.id === 'RG-1' ? t('la jornada {n}', { n }) : minuscula(r.titulo),
      entrada: PREGUNTA[r.id],
    })
  }

  // 2. Avisos al equipo que conviene mandar esta semana (los redacta Riesgos; los mandas tú).
  const avisos = riesgos.filter((r) => r.aviso && r.estado === 'abierto' && r.dias >= 0 && r.dias <= UMBRALES.diasAlta).sort((a, b) => a.dias - b.dias)
  if (avisos.length) {
    items.push({
      id: 'avisos',
      titulo: avisos.length === 1 ? t('Prepara un aviso para el equipo') : t('Prepara {n} para el equipo', { n: cuenta(avisos.length, 'aviso', 'avisos') }),
      detalle: t('Son mensajes cortos: los redacta Riesgos de producción y los revisas y mandas tú. El primero es para {cuando}.', { cuando: cuando(avisos[0]) }),
      cuando: avisos[0].dias <= 1 ? t('Hoy') : t('Antes del {f}', { f: v(avisos[0].fecha, 'dia') }),
      decide: 'Line producer',
      rolEtiqueta: 'Los manda',
      capacidad: 'exploratoria',
      subitems: avisos.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        detalle: t('Para {para} · {cuando}', { para: v(borradorRiesgo(m, r.id)?.para?.split(' · ')[0] ?? 'el equipo'), cuando: cuando(r) }),
        etiqueta: 'Preparar el aviso',
        entrada: PREGUNTA[r.id],
        ref: { tipo: 'aviso', id: r.id },
      })),
      ref: { tipo: 'grupo', refs: avisos.map((r) => ({ tipo: 'aviso', id: r.id })) },
      resumen: t('preparar {n} para el equipo', { n: cuenta(avisos.length, 'aviso', 'avisos') }),
      cierre: t('los avisos'),
      entrada: PREGUNTA[avisos[0].id],
    })
  }

  // 3. Compras que esperan aprobación.
  const ordenes = c.ordenesPendientes(m)
  if (ordenes.length) {
    const imps = ordenes.map((o) => ({ o, imp: c.impactoOrden(m, o.id) }))
    for (const { o } of imps) {
      const d = dec.find((x) => x.ref?.tipo === 'orden' && x.ref.id === o.id)
      if (d) cubiertas.add(d.id)
    }
    const total = imps.reduce((s, x) => s + x.o.importe, 0)
    const exceso = imps.reduce((s, x) => s + x.imp.exceso, 0)
    const semana = m.tesoreria.semanas.find((s) => s.semana === ordenes[0].semanaPago)
    const ejecutiva = imps.some((x) => x.imp.rol === 'Producción ejecutiva')
    items.push({
      id: 'compras',
      titulo: ordenes.length === 1 ? t('Decide la compra {oc}', { oc: v(ordenes[0].id, 'id') }) : t('Decide {n}', { n: cuenta(ordenes.length, 'compra pendiente', 'compras pendientes') }),
      detalle:
        exceso > 0
          ? t('Suman {total}; {exc} no estaba en la previsión y subiría el coste estimado final.', { total: v(total, 'eur'), exc: v(exceso, 'eur') })
          : t('Suman {total} y caben en lo que la previsión ya tenía para sus partidas: no mueven el coste estimado final.', { total: v(total, 'eur') }),
      cuando: semana?.enCurso ? t('Se pagan esta semana') : semana ? t('Se pagan la semana del {f}', { f: v(semana.fechas) }) : t('Sin semana de pago'),
      decide: ejecutiva ? 'Producción ejecutiva' : 'Line producer',
      subitems: imps.map(({ o, imp }) => ({
        id: o.id,
        titulo: t('{oc} · {prov}', { oc: v(o.id, 'id'), prov: v(o.proveedor) }),
        detalle: t('{concepto} · {imp} · {nota}', {
          concepto: v(o.concepto),
          imp: v(o.importe, 'eur'),
          nota: imp.nivel === 'aprueba' ? (imp.motivos.includes('importe') ? t('pide aprobación: pasa de {u}', { u: v(POLITICAS.umbralImporteOc, 'eur') }) : t('pide aprobación: deja el capítulo por encima del umbral')) : t('propuesta: la decide el line producer'),
        }),
        etiqueta: 'Revisar',
        entrada: `Revisa la orden de compra ${o.id}`,
        ref: { tipo: 'orden', id: o.id },
      })),
      ref: { tipo: 'grupo', refs: ordenes.map((o) => ({ tipo: 'orden', id: o.id })) },
      resumen: t('decidir {n}', { n: cuenta(ordenes.length, 'compra pendiente', 'compras pendientes') }),
      cierre: t('las compras'),
      entrada: PREGUNTAS_PARTE.compras,
    })
  }

  // 4. El plazo del dossier que vence antes (si es esta semana o la que viene).
  const prox = c
    .dossier(m)
    .filter((d) => d.dias >= 0 && d.dias <= UMBRALES.diasAlta)
    .sort((a, b) => a.dias - b.dias)[0]
  if (prox) {
    const deduccion = m.financiacion.find((f) => f.tipo === 'Deducción')
    items.push({
      id: `dossier-${prox.id}`,
      titulo: t('{doc}: vence el {f}', { doc: v(prox.documento), f: v(prox.deadline, 'dia') }),
      detalle: deduccion
        ? t('{razon} Es bloqueante del dossier fiscal, y la deducción prevista son {imp} del plan de financiación.', { razon: v(prox.razon), imp: v(deduccion.importe, 'eur') })
        : t('{razon} Es bloqueante del dossier fiscal.', { razon: v(prox.razon) }),
      cuando: t('Vence en {d}', { d: v(prox.dias, 'dias') }),
      decide: prox.responsable,
      rolEtiqueta: 'Responsable',
      acciones: [{ etiqueta: 'Ver el dossier', entrada: PREGUNTAS_PARTE.dossier }],
      ref: null,
      resumen: t('el {doc}, que vence el {f}', { doc: v(minuscula(prox.documento)), f: v(prox.deadline, 'dia') }),
      cierre: t('el dossier'),
      entrada: PREGUNTAS_PARTE.dossier,
    })
  }

  const resto = dec.filter((d) => !cubiertas.has(d.id))
  return { items, resto: resto.length, restoAprobacion: resto.filter((d) => d.nivel === 'aprueba').length }
}

/** Cuatro frases: dónde se rueda hoy, cómo va el coste, la caja y lo primero que toca. */
function entradilla(m, agenda) {
  const dia = m.proyecto.diaActual
  const hoy = jornada(m, dia)
  const fin = m.rodaje.jornadas[m.rodaje.jornadas.length - 1]
  const tot = c.totales(m)
  const fuera = c.capitulos(m).filter((x) => x.fueraRango)
  const tes = c.tesoreria(m)
  const coste = { cef: v(tot.cef, 'eur'), pct: v(tot.desviacionPct, 'pctSigned') }
  const frases = [
    hoy
      ? t('Hoy se rueda la jornada {n} en {loc}, {tipo}: van {hechas} de {total} y el rodaje cierra el {fin}.', { n: v(dia, 'num'), loc: v(sitio(hoy.localizacion)), tipo: tipoJornada(hoy), hechas: v(dia - 1, 'num'), total: v(m.proyecto.diasRodaje, 'num'), fin: v(fin.fecha, 'dia') })
      : t('Día {n} de {total} de rodaje.', { n: v(dia, 'num'), total: v(m.proyecto.diasRodaje, 'num') }),
    fuera.length === 1
      ? t('El coste estimado final va en {cef}, {pct} sobre presupuesto, y {cap} es el único capítulo por encima del umbral.', { ...coste, cap: v(fuera[0].nombre) })
      : fuera.length
        ? t('El coste estimado final va en {cef}, {pct} sobre presupuesto, con {n} por encima del umbral.', { ...coste, n: cuenta(fuera.length, 'capítulo', 'capítulos') })
        : t('El coste estimado final va en {cef}, {pct} sobre presupuesto, sin capítulos por encima del umbral.', coste),
    tes.negativas.length
      ? t('La caja aguanta esta semana, pero la del {f} baja a {s}.', { f: v(tes.negativas[0].fechas), s: v(tes.negativas[0].saldo, 'eur') })
      : t('La caja no pasa a negativo en las próximas semanas.'),
    agenda.items.length ? t('Lo primero hoy: {x}.', { x: agenda.items[0].resumen }) : t('Hoy no hay nada urgente por decidir.'),
  ]
  return { tipo: 'texto', destacado: true, texto: unir(frases) }
}

function cifras(m) {
  const tot = c.totales(m)
  const tes = c.tesoreria(m)
  const dec = decisionesAbiertas(m)
  const piden = dec.filter((d) => d.nivel === 'aprueba').length
  return {
    tipo: 'kpis',
    titulo: 'Así va la producción',
    items: [
      { id: 'cef', etiqueta: 'Coste estimado final', formato: 'eur', valor: tot.cef, sub: t('{d} ({p}) sobre presupuesto', { d: v(tot.desviacion, 'eurSigned'), p: v(tot.desviacionPct, 'pctSigned') }) },
      { id: 'gastado', etiqueta: 'Gastado', formato: 'eur', valor: tot.gastado, sub: t('{p} del presupuesto', { p: v(tot.ejecucionPct, 'pct') }) },
      {
        id: 'caja',
        etiqueta: 'Caja hoy',
        formato: 'eur',
        valor: tes.saldoHoy,
        sub: tes.negativas.length ? t('La más justa, {f}: {s}', { f: v(tes.minimo.fechas), s: v(tes.minimo.saldo, 'eur') }) : t('Sin semanas en negativo'),
      },
      { id: 'revisar', etiqueta: 'Por revisar', formato: 'num', valor: dec.length, sub: t('{n} con aprobación', { n: v(piden, 'num') }) },
    ],
  }
}

/** Lo que ha hecho o vigila cada agente, en una línea. */
function equipo(m) {
  const docs = Object.values(m.documentos)
  const contabilizadas = docs.filter((d) => d.estado === 'contabilizada').sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  const bandeja = docs.filter((d) => d.estado === 'en_bandeja')
  const grupos = [
    [bandeja.filter((d) => !confianzaBaja(d) && d.impuesto?.tipo !== 'IGIC' && d.oc && c.conciliar(m, d.id).resultado === 'ok').length, 'listo para contabilizar', 'listos para contabilizar'],
    [bandeja.filter((d) => !confianzaBaja(d) && d.impuesto?.tipo !== 'IGIC' && !d.oc).length, 'sin pedido', 'sin pedido'],
    [bandeja.filter((d) => !confianzaBaja(d) && d.impuesto?.tipo === 'IGIC').length, 'con IGIC para el fiscalista', 'con IGIC para el fiscalista'],
    [bandeja.filter((d) => confianzaBaja(d)).length, 'dudoso (confianza baja)', 'dudosos (confianza baja)'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`)
  const listaGrupos = grupos.length > 1 ? `${grupos.slice(0, -1).join(', ')} y ${grupos[grupos.length - 1]}` : grupos.join('')
  const fuera = c.capitulos(m).filter((x) => x.fueraRango)
  const sinMargen = c.partidasSinMargen(m)
  const tes = c.tesoreria(m)
  const actual = tes.semanas.find((s) => s.enCurso) ?? tes.semanas[0]
  const cobro = tes.semanas.find((s) => s.cobros > 0)
  const riesgos = evaluarRiesgos(m)
  const dossier = c.dossier(m).sort((a, b) => a.dias - b.dias)
  const dec = decisionesAbiertas(m)
  const inf = m.informes[m.periodo.id]
  const items = [
    {
      agente: 'conciliacion',
      texto: contabilizadas.length
        ? t('Ha contabilizado sola {n} que casaban con su pedido, por {imp}; la última, de {prov}, el {f}.', { n: cuenta(contabilizadas.length, 'factura', 'facturas'), imp: v(contabilizadas.reduce((s, d) => s + d.base, 0), 'eur'), prov: v(contabilizadas[0].proveedor), f: v(contabilizadas[0].fecha, 'dia') })
        : t('Todavía no ha contabilizado ninguna factura.'),
    },
    {
      agente: 'facturas',
      texto: bandeja.length ? t('Tiene {n} en la bandeja: {detalle}.', { n: cuenta(bandeja.length, 'documento', 'documentos'), detalle: v(listaGrupos) }) : t('La bandeja está vacía.'),
    },
    {
      agente: 'costes',
      texto: fuera.length
        ? t('{cap} está por encima del umbral del {u}: {d} ({p}). {n} ya no tienen margen.', { cap: v(fuera.map((x) => x.nombre).join(' y ')), u: v(POLITICAS.umbralDesviacion, 'pct0'), d: v(fuera[0].desviacion, 'eurSigned'), p: v(fuera[0].desviacionPct, 'pctSigned'), n: cuenta(sinMargen.length, 'partida', 'partidas') })
        : t('Ningún capítulo pasa del umbral del {u}.', { u: v(POLITICAS.umbralDesviacion, 'pct0') }),
    },
    {
      agente: 'prevision',
      texto: tes.negativas.length
        ? t('Esta semana la caja cierra en {s}. La del {f} baja a {min}; el siguiente cobro, {concepto} por {imp}, llega la del {fc}.', {
            s: v(actual.saldo, 'eur'),
            f: v(tes.negativas[0].fechas),
            min: v(tes.negativas[0].saldo, 'eur'),
            concepto: v(cobro ? cobro.concepto.split(' · ')[0] : ''),
            imp: v(cobro?.cobros ?? 0, 'eur'),
            fc: v(cobro?.fechas ?? ''),
          })
        : t('La caja no pasa a negativo: esta semana cierra en {s}.', { s: v(actual.saldo, 'eur') }),
    },
    {
      agente: 'riesgos',
      exploratorio: true,
      texto: t('Vigila de la jornada {a} a la {b}: {n}, {altos} y {medios}.', {
        a: v(m.proyecto.diaActual, 'num'),
        b: v(m.proyecto.diasRodaje, 'num'),
        n: cuenta(riesgos.length, 'riesgo', 'riesgos'),
        altos: cuenta(riesgos.filter((r) => r.severidad === 'alta').length, 'alto', 'altos'),
        medios: cuenta(riesgos.filter((r) => r.severidad === 'media').length, 'medio', 'medios'),
      }),
    },
    {
      agente: 'cumplimiento',
      texto: dossier.length ? t('El dossier fiscal tiene {n}. El primero vence el {f}.', { n: cuenta(dossier.length, 'bloqueante', 'bloqueantes'), f: v(dossier[0].deadline, 'dia') }) : t('El dossier fiscal no tiene bloqueantes.'),
    },
    {
      agente: 'excepciones',
      texto: dec.length
        ? t('Ha ordenado las {n} por revisar: {a} piden aprobación y {p} son propuestas.', { n: cuenta(dec.length, 'decisión', 'decisiones'), a: v(dec.filter((e) => e.nivel === 'aprueba').length, 'num'), p: v(dec.filter((e) => e.nivel !== 'aprueba').length, 'num') })
        : t('No hay nada por revisar.'),
    },
    {
      agente: 'informes',
      texto: inf
        ? t('El informe semanal de {sem} está {estado}.', { sem: v(m.periodo.etiqueta), estado: v(inf.estado === 'aprobado' ? 'aprobado' : 'redactado y por aprobar') })
        : t('El informe semanal de {sem} ({f}), la primera semana de rodaje, está por preparar.', { sem: v(m.periodo.etiqueta), f: v(m.periodo.fechas) }),
    },
  ]
  return { tipo: 'equipo', titulo: 'Lo que ha hecho cada agente', items }
}

export const saludo = {
  id: 'saludo',
  titulo: 'Parte de la mañana',
  ejemplos: ['Buenos días', 'Ponme al día', '¿Qué está pasando hoy?'],

  planificar(m) {
    const riesgos = evaluarRiesgos(m)
    const tot = c.totales(m)
    const tes = c.tesoreria(m)
    const contab = Object.values(m.documentos).filter((d) => d.estado === 'contabilizada').length
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
        salida: tes.negativas.length ? t('La semana del {f} baja a {s}', { f: v(tes.minimo.fechas), s: v(tes.minimo.saldo, 'eur') }) : t('Sin semanas en negativo'),
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
    // Pedido con palabras («ponme al día»): sin la cabecera del saludo, una línea de entrada.
    const pedido = det?.entidades?.dia == null
    const primero = agenda.items[0]
    const semana = jornada(m, m.proyecto.diaActual)?.semana ?? m.rodaje.jornadas[0]?.semana
    const informePendiente = !m.informes[m.periodo.id]
    const cierre = primero
      ? informePendiente
        ? t('¿Empezamos por {x}? También puedo prepararte el informe semanal de coste de {sem}.', { x: primero.cierre, sem: v(m.periodo.etiqueta) })
        : t('¿Empezamos por {x}?', { x: primero.cierre })
      : t('¿Qué quieres revisar?')
    return {
      bloques: [
        ...(pedido ? [texto(t('El parte del día {n} de rodaje, al momento: con lo que ya has decidido hoy.', { n: v(m.proyecto.diaActual, 'num') }))] : []),
        entradilla(m, agenda),
        { tipo: 'tira' },
        cifras(m),
        { tipo: 'agenda', titulo: 'Para hoy', items: agenda.items, resto: agenda.resto, restoAprobacion: agenda.restoAprobacion },
        { tipo: 'semana', semana },
        equipo(m),
        texto(cierre),
      ],
      sugerencias: [...(primero ? [sug(primero.entrada)] : []), ...(informePendiente ? [sug(PREGUNTAS_PARTE.informe)] : []), sug(PREGUNTAS_PARTE.caja)].slice(0, 3),
      fuentes: ['Plan de rodaje (ejemplo)', 'Presupuesto ICAA por partidas', 'Bandeja de facturas y órdenes de compra', 'Previsión de tesorería semanal', 'Dossier fiscal', 'Cola de excepciones'],
      reglas: [
        t('Primero lo que afecta a mañana; después, lo que vence o se paga esta semana'),
        t('Un riesgo alto con dinero en juego y una compra que pide aprobación siempre entran en «Para hoy»'),
        t('Los plazos del dossier entran si vencen en los próximos {d}', { d: v(UMBRALES.diasAlta, 'dias') }),
      ],
      noHecho: [t('Solo ha leído: no ha contabilizado, aprobado ni cambiado nada.'), t('No ha enviado avisos ni ha contactado con nadie.')],
    }
  },
}
