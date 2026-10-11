// Guiones de coste: informe semanal, desviaciones, previsión y resumen.

import { reducirVarias } from '../acciones.js'
import { confianzaBaja, ROLES } from '../politicas.js'
import { eurSigned } from '../../lib/format.js'
import { CAPITULOS } from '../../lib/data.js'
import { decisionesAbiertas } from '../pendientes.js'
import { riesgosAltos } from '../rodaje.js'
import { cuenta } from '../texto.js'
import { t, v, c, POLITICAS, paso, sug, texto, aviso, lista, kpisProyecto, bloqueDesviaciones, tablaCapitulos, tablaPartidas, bloqueCaja, aprobacionOrden, nombrePartida, nombreCorto, semanaDel, minuscula } from './comun.js'

const enBandeja = (m) => Object.values(m.documentos).filter((d) => d.estado === 'en_bandeja')

const CAJA = '¿Cuánto nos costará al final y llegamos de caja?'

/** «Rodaje 1» → «la semana 1 de rodaje». */
function periodoEnProsa(etiqueta) {
  const n = /^Rodaje (\d+)$/.exec(etiqueta ?? '')
  return n ? t('la semana {n} de rodaje', { n: v(Number(n[1]), 'num') }) : t('{p}', { p: v(etiqueta) })
}

// ── Informe semanal ──────────────────────────────────────────────────────────

export const informeSemanal = {
  id: 'informe_semanal',
  titulo: 'Informe semanal de coste',
  ejemplos: ['Prepárame el informe semanal de coste', 'hazme el cost report de esta semana', 'INFORME SEMANAL', '¿Tienes el informe de la semana para producción?', 'cierre semanal de costes'],

  planificar(m) {
    const bandeja = enBandeja(m)
    const casables = bandeja.filter((d) => !confianzaBaja(d) && c.conciliar(m, d.id).resultado === 'ok')
    const xml = bandeja.filter((d) => d.origen === 'Factura-e XML').length
    const dudosos = bandeja.filter((d) => confianzaBaja(d)).length
    const sinPedido = bandeja.filter((d) => !d.oc && !confianzaBaja(d)).length
    const acciones = casables.map((d) => ({ tipo: 'documento/contabilizar', docId: d.id, por: 'Conciliación' }))
    return [
      paso('facturas', t('Lee los {n} documentos de la bandeja', { n: v(bandeja.length, 'num') }), {
        tipo: 'lectura',
        salida: t('{xml}, {otros}; {dudosos} con confianza baja', { xml: cuenta(xml, 'factura electrónica', 'facturas electrónicas'), otros: cuenta(bandeja.length - xml, 'escaneado', 'escaneados'), dudosos: v(dudosos, 'num') }),
      }),
      paso('conciliacion', t('Cuadra cada factura con su pedido'), {
        tipo: 'conciliacion',
        acciones,
        salida: t(`{ok} ${casables.length === 1 ? 'cuadra con su pedido y queda contabilizada' : 'cuadran con su pedido y quedan contabilizadas'}; {sin} sin pedido ${sinPedido === 1 ? 'pasa' : 'pasan'} a revisión`, { ok: v(casables.length, 'num'), sin: v(sinPedido, 'num') }),
      }),
      paso('costes', t('Compara presupuesto, gastado, comprometido y previsión por capítulo'), {
        salida: (_, d) => {
          const fuera = c.capitulos(d).filter((x) => x.fueraRango)
          return fuera.length
            ? t('Por encima del límite del {u}: {cap}', { u: v(POLITICAS.umbralDesviacion, 'pct0'), cap: v(fuera.map((x) => nombreCorto(x.nombre)).join(', ')) })
            : t('Ningún capítulo pasa del límite del {u}', { u: v(POLITICAS.umbralDesviacion, 'pct0') })
        },
      }),
      paso('prevision', t('Revisa la previsión de cierre'), {
        paralelo: true,
        salida: (_, d) => {
          const inc = c.incoherenciasPrevision(d)
          return inc.length
            ? t('Coste estimado final {cef}; {p} tiene más comprometido que previsto', { cef: v(c.totales(d).cef, 'eur'), p: v(inc[0].nombre) })
            : t('Coste estimado final {cef}', { cef: v(c.totales(d).cef, 'eur') })
        },
      }),
      paso('excepciones', t('Ordena lo que necesita una decisión'), {
        tipo: 'revision',
        autonomia: 'aprueba',
        salida: (_, d) => {
          const ex = c.excepciones(d)
          const a = ex.filter((e) => e.nivel === 'aprueba').length
          const p = ex.filter((e) => e.nivel === 'propone').length
          return t(`{n}: {a} ${a === 1 ? 'necesita' : 'necesitan'} aprobación y {p} ${p === 1 ? 'es propuesta' : 'son propuestas'}`, { n: cuenta(ex.length, 'decisión de coste', 'decisiones de coste'), a: v(a, 'num'), p: v(p, 'num') })
        },
      }),
      paso('cumplimiento', t('Revisa elegibilidad y dossier fiscal'), {
        tipo: 'revision',
        autonomia: 'propone',
        paralelo: true,
        salida: (_, d) => {
          const dos = c.dossier(d)
          const prox = dos.reduce((a, x) => (x.dias < a.dias ? x : a), dos[0])
          return t('{n}; el primero vence en {dias}', { n: cuenta(dos.length, 'bloqueante', 'bloqueantes'), dias: v(prox.dias, 'dias') })
        },
      }),
      paso('informes', t('Redacta el borrador para producción'), {
        tipo: 'redaccion',
        acciones: [{ tipo: 'informe/generar', periodoId: m.periodo.id, por: 'Informes' }],
        salida: (antes, d) => {
          const previo = antes.informes[m.periodo.id]
          const nuevo = d.informes[m.periodo.id]
          if (previo && previo === nuevo) return t('El informe sigue al día: no hay que rehacerlo')
          if (previo) return t('Edición {n}: las cifras habían cambiado', { n: v(nuevo.edicion, 'num') })
          return t('Borrador listo para tu revisión')
        },
      }),
    ]
  },

  componer({ antes, despues, det }) {
    const des = c.desviaciones(despues)
    const mayor = des.items[0]
    const infAntes = antes.informes[despues.periodo.id]
    const infDespues = despues.informes[despues.periodo.id]
    const contabilizadas = Object.values(despues.documentos).filter((d) => d.estado === 'contabilizada' && antes.documentos[d.id].estado !== 'contabilizada')
    const periodo = periodoEnProsa(despues.periodo.etiqueta)
    // Las cifras del proyecto las lleva la hoja del informe: la frase de entrada no las repite.
    const bloques = [
      texto(
        t('Borrador del informe de {periodo} listo. La mayor presión, en {cap}: {capDesv}.', {
          periodo,
          cap: v(nombreCorto(mayor.nombre)),
          capDesv: v(mayor.desviacion, 'eurSigned'),
        }),
      ),
    ]
    if (infAntes && infAntes === infDespues) {
      bloques.push(aviso('info', 'Sigue al día', t('Las cifras no han cambiado desde la edición {n}, así que no la rehacemos{aprob}.', { n: v(infDespues.edicion, 'num'), aprob: v(infDespues.estado === 'aprobado' ? ' y su aprobación sigue valiendo' : '') })))
    } else if (infDespues?.sustituyeAprobada) {
      bloques.push(aviso('aviso', 'Nueva edición', t('Las cifras cambiaron: esta edición sustituye a la que estaba aprobada y hay que volver a aprobarla.')))
    }
    if (contabilizadas.length) {
      bloques.push(
        texto(
          t(contabilizadas.length === 1 ? 'Conciliación contabilizó sola {ids}: cuadra con su pedido y el coste final no cambia.' : 'Conciliación contabilizó solas {ids}: cuadran con su pedido y el coste final no cambia.', {
            ids: v(contabilizadas.map((d) => `${d.id} (${d.proveedor})`).join(', ')),
          }),
        ),
      )
    }
    // Lo que se decide va justo después del informe; el detalle por capítulo, plegado al final.
    // La lista de decisiones no se repite aquí: está en «Por revisar» y en el propio informe.
    const pe = ROLES.produccionEjecutiva
    bloques.push({ tipo: 'informe', id: despues.periodo.id })
    bloques.push({
      tipo: 'aprobacion',
      id: `ap-informe-${despues.periodo.id}`,
      ref: { tipo: 'informe', id: despues.periodo.id },
      agente: 'informes',
      nivel: 'aprueba',
      rol: pe,
      titulo: t('Compartir el informe de {periodo}', { periodo }),
      resumen: det?.entidades?.quiereEnviar
        ? t('En la demo no se envía nada: aquí solo queda registrada la aprobación. Antes de que salga de la productora, lo tiene que aprobar {rol}.', { rol: v(minuscula(pe)) })
        : t('Antes de que salga de la productora, lo tiene que aprobar {rol}.', { rol: v(minuscula(pe)) }),
      acciones: [
        { id: 'aprobar', etiqueta: 'Aprobar para compartir', burbuja: 'Apruebo compartir el informe', variante: 'primary', accion: { tipo: 'informe/aprobar', informeId: despues.periodo.id }, rol: pe },
        // «Todavía no» no decide ni lanza un turno: la tarjeta sigue abierta en «Por revisar».
        { id: 'posponer', etiqueta: 'Todavía no', burbuja: 'Todavía no lo comparto', variante: 'secondary', posponer: true, rol: pe },
      ],
    })
    bloques.push({ ...bloqueDesviaciones(despues, { conCausas: 'fuera' }), plegado: true })
    const sugerencias = [sug(`¿Por qué se desvía ${nombreCorto(mayor.nombre)}?`), sug('¿Qué bloquea el dossier fiscal?'), sug(CAJA)]
    return {
      bloques,
      sugerencias,
      fuentes: ['Presupuesto ICAA por partidas', 'Bandeja de documentos', 'Órdenes de compra', 'Previsión de tesorería', 'Dossier fiscal'],
      reglas: [
        t('Una factura se contabiliza sola si cuadra con un pedido aprobado (tolerancia {tol})', { tol: v(POLITICAS.toleranciaConciliacion, 'pct0') }),
        t('Un capítulo se pasa del límite si se desvía más del {u}', { u: v(POLITICAS.umbralDesviacion, 'pct0') }),
        t('Confianza mínima para clasificar solo: {u}', { u: v(POLITICAS.umbralConfianza, 'pct0') }),
      ],
      noHecho: [t('No ha enviado el informe a nadie.'), t('No ha aprobado ninguna compra ni contabilizado lo dudoso.'), t('No ha modificado el presupuesto.')],
    }
  },
}

// ── Explicar desviación ──────────────────────────────────────────────────────

export const explicarDesviacion = {
  id: 'explicar_desviacion',
  // Título dinámico: el nombre del capítulo sale de la semilla (no cambia con las decisiones).
  titulo: (det) => {
    const cap = CAPITULOS.find((x) => x.id === det.entidades?.capitulo)
    return cap ? `Por qué se desvía ${nombreCorto(cap.nombre)}` : 'Desviaciones por capítulo'
  },
  ejemplos: ['¿Por qué se desvía Escenografía?', '¿Y Viajes?', 'explica la desviación del capítulo 07', '¿qué capítulos están fuera de rango?', '¿Qué capítulos se pasan del límite?', 'por qué estamos por encima del presupuesto', 'desviación de la partida 04.01'],

  planificar(m, det) {
    const cap = det.entidades.capitulo
    return [
      paso('costes', cap ? t('Desglosa {cap} por partidas', { cap: v(nombreCorto(c.nombreCapitulo(m, cap))) }) : t('Ordena los capítulos por desviación'), {
        salida: () => {
          if (!cap) return t('{n} con sobrecoste y {a} con ahorro', { n: cuenta(c.desviaciones(m).items.filter((x) => x.desviacion > 0).length, 'capítulo', 'capítulos'), a: v(c.desviaciones(m).items.filter((x) => x.desviacion < 0).length, 'num') })
          const x = c.capitulo(m, cap)
          return t('{desv} ({pct}) sobre presupuesto', { desv: v(x.desviacion, 'eurSigned'), pct: v(x.desviacionPct, 'pctSigned') })
        },
      }),
      paso('prevision', t('Separa lo ya firme de lo que aún puede cambiar'), {
        salida: () => {
          const causas = c.desviaciones(m).items.filter((x) => !cap || x.id === cap).flatMap((x) => x.causas).filter((p) => p.desviacion > 0)
          const firmes = causas.filter((p) => p.consolidada)
          return t('Ya firmes: {c} de {n} con sobrecoste', { c: v(firmes.length, 'num'), n: cuenta(causas.length, 'partida', 'partidas') })
        },
      }),
      paso('costes', t('Busca margen para compensar'), {
        autonomia: 'propone',
        salida: () => {
          const fuera = cap ? c.capitulo(m, cap).fueraRango : c.capitulos(m).some((x) => x.fueraRango)
          return fuera ? t('Propuestas preparadas; no cambia nada sin tu visto bueno') : t('Sin propuestas: está dentro del límite')
        },
      }),
    ]
  },

  componer({ despues: m, det }) {
    const cap = det.entidades.capitulo
    const sugerencias = []
    if (!cap) {
      const d = c.desviaciones(m)
      const fuera = d.items.filter((x) => x.fueraRango)
      const cerca = d.items.filter((x) => !x.fueraRango && x.desviacion > 0 && x.margenUmbral < 0.01 * x.presupuesto)
      const bloques = [
        texto(
          d.resumen.reservas > 0
            ? t('Sobrecostes por {sobre}, ahorros por {ahorro} y reservas de riesgos por {res}: neto {neto}. {n} por encima del límite del {u}.', {
                sobre: v(d.resumen.sobrecostes, 'eurSigned'),
                ahorro: v(d.resumen.ahorros, 'eurSigned'),
                res: v(d.resumen.reservas, 'eurSigned'),
                neto: v(d.resumen.neto, 'eurSigned'),
                n: cuenta(fuera.length, 'capítulo', 'capítulos'),
                u: v(POLITICAS.umbralDesviacion, 'pct0'),
              })
            : t('Sobrecostes por {sobre} y ahorros por {ahorro}: neto {neto}. {n} por encima del límite del {u}.', {
                sobre: v(d.resumen.sobrecostes, 'eurSigned'),
                ahorro: v(d.resumen.ahorros, 'eurSigned'),
                neto: v(d.resumen.neto, 'eurSigned'),
                n: cuenta(fuera.length, 'capítulo', 'capítulos'),
                u: v(POLITICAS.umbralDesviacion, 'pct0'),
              }),
        ),
        bloqueDesviaciones(m, { conCausas: false }),
      ]
      if (cerca.length) {
        bloques.push(aviso('aviso', 'Cerca del límite', t('{cap} está a {margen} del límite. Aún quedan {pend} por gastar en sus partidas; cuando se agoten, cualquier gasto de más de {margen} lo pasará.', { cap: v(nombreCorto(cerca[0].nombre)), margen: v(cerca[0].margenUmbral, 'eur'), pend: v(Math.max(0, cerca[0].disponible), 'eur') })))
      }
      for (const x of fuera.slice(0, 2)) sugerencias.push(sug(`¿Por qué se desvía ${nombreCorto(x.nombre)}?`))
      if (cerca[0]) sugerencias.push(sug(`¿Por qué se desvía ${nombreCorto(cerca[0].nombre)}?`))
      return { bloques, sugerencias, fuentes: ['Presupuesto ICAA por partidas'], reglas: [t('Un capítulo se pasa del límite si se desvía más del {u}', { u: v(POLITICAS.umbralDesviacion, 'pct0') })], noHecho: [t('No ha cambiado ninguna previsión.')] }
    }

    const x = c.capitulo(m, cap)
    const d = c.desviaciones(m).items.find((i) => i.id === cap)
    const causas = d ? d.causas.filter((p) => p.desviacion > 0) : []
    const consolidada = causas.length > 0 && causas.every((p) => p.consolidada)
    const bloques = []
    if (!d || x.desviacion <= 0) {
      bloques.push(texto(t('{cap} no tiene sobrecoste: {desv} ({pct}) sobre presupuesto.', { cap: v(x.nombre), desv: v(x.desviacion, 'eurSigned'), pct: v(x.desviacionPct, 'pctSigned') })))
      bloques.push(tablaPartidas(m, cap))
      sugerencias.push(sug('¿Qué capítulos se pasan del límite?'))
      return { bloques, sugerencias, fuentes: ['Presupuesto ICAA por partidas'], reglas: [], noHecho: [t('No ha cambiado ninguna previsión.')] }
    }

    bloques.push(
      texto(
        t('{cap} cerrará en {cef}, {desv} ({pct}) sobre presupuesto. {estado}', {
          cap: v(x.nombre),
          cef: v(x.cef, 'eur'),
          desv: v(x.desviacion, 'eurSigned'),
          pct: v(x.desviacionPct, 'pctSigned'),
          estado: v(
            consolidada
              ? 'Este sobrecoste ya es firme: está gastado o comprometido, no es una estimación.'
              : 'Parte es previsión: aún queda por gastar en las partidas que se desvían.',
          ),
        }),
      ),
    )
    bloques.push(bloqueDesviaciones(m, { capitulos: [cap] }))

    // Evidencias: documentos y órdenes del capítulo.
    const evid = [
      ...Object.values(m.documentos).filter((doc) => doc.capitulo === cap && doc.estado !== 'por_llegar').map((doc) => t('{id} · {prov}: {concepto} ({imp})', { id: v(doc.id, 'id'), prov: v(doc.proveedor), concepto: v(doc.concepto), imp: v(doc.base, 'eur') })),
      ...Object.values(m.ordenes).filter((o) => o.capitulo === cap && !o.aliasLegacy).map((o) =>
        o.importeAprobado !== undefined && o.importeAprobado < o.importe - 0.004
          ? t('{id} · {prov}: {concepto} (aprobada por {aprob} de {imp})', { id: v(o.id, 'id'), prov: v(o.proveedor), concepto: v(o.concepto), aprob: v(o.importeAprobado, 'eur'), imp: v(o.importe, 'eur') })
          : t('{id} · {prov}: {concepto} ({imp}, {estado})', { id: v(o.id, 'id'), prov: v(o.proveedor), concepto: v(o.concepto), imp: v(o.importe, 'eur'), estado: v(o.estado.toLowerCase()) }),
      ),
    ]
    if (evid.length) bloques.push(lista('Documentos y pedidos del capítulo', evid.map((tx) => ({ texto: tx }))))

    if (x.fueraRango) {
      const ahorros = c.desviaciones(m).items.filter((i) => i.desviacion < 0)
      const props = [t('Pedir tu visto bueno antes de comprometer cualquier compra nueva en {cap}.', { cap: v(nombreCorto(x.nombre)) })]
      if (ahorros.length) props.push(t('Compensar con los capítulos que van por debajo: {lista}.', { lista: v(ahorros.map((a) => `${nombreCorto(a.nombre)} (${eurSigned(a.desviacion)})`).join(', ')) }))
      bloques.push(lista('Qué puedes hacer', props.map((tx) => ({ texto: tx })), 'propone'))
    } else if (x.margenUmbral > 0) {
      const oc = Object.values(m.ordenes).find((o) => o.capitulo === cap && (o.estado === 'Pendiente' || o.estado === 'Por llegar'))
      bloques.push(aviso('aviso', 'Cerca del límite', t('Quedan {margen} hasta el límite del {u}.', { margen: v(x.margenUmbral, 'eur'), u: v(POLITICAS.umbralDesviacion, 'pct0') })))
      if (oc) {
        const imp = c.impactoOrden(m, oc.id)
        bloques.push(texto(t('El pedido {oc} de {prov} ({imp}) lo dejaría en {pct}.', { oc: v(oc.id, 'id'), prov: v(oc.proveedor), imp: v(oc.importe, 'eur'), pct: v(imp.capitulo.despues.desviacionPct, 'pctSigned') })))
        if (oc.estado === 'Pendiente') sugerencias.push(sug(`Revisa la orden de compra ${oc.id}`))
      }
    }
    if (cap !== '04') sugerencias.push(sug('¿Por qué se desvía Escenografía?'))
    if (cap !== '07') sugerencias.push(sug('¿Y Viajes?'))
    sugerencias.push(sug(CAJA))
    return {
      bloques,
      sugerencias,
      fuentes: ['Presupuesto ICAA por partidas', 'Facturas contabilizadas', 'Órdenes de compra'],
      reglas: [t('Un sobrecoste es firme cuando lo gastado y lo comprometido igualan el coste estimado final')],
      noHecho: [t('No ha bloqueado compras ni movido presupuesto entre capítulos: solo lo propone.')],
    }
  },
}

// ── Previsión de cierre y caja ───────────────────────────────────────────────

export const prevision = {
  id: 'prevision',
  titulo: 'Coste final y caja',
  ejemplos: ['¿Cuánto nos costará al final y llegamos de caja?', '¿Cómo cerraremos el proyecto?', 'previsión de coste final', '¿hay semanas con la caja en negativo?', 'actualiza el forecast', 'tesorería'],

  planificar(m) {
    const inc = c.incoherenciasPrevision(m)
    return [
      paso('prevision', t('Recalcula el coste estimado final partida a partida'), {
        salida: inc.length ? t('{n} con más comprometido que previsto', { n: cuenta(inc.length, 'partida', 'partidas') }) : t('La previsión cuadra con lo comprometido'),
      }),
      paso('prevision', t('Proyecta la caja semana a semana'), {
        salida: () => {
          const tes = c.tesoreria(m)
          if (!tes.negativas.length) return t('Ninguna semana en negativo')
          return t('{n} en negativo; la peor, la del {sem}: {min}', { n: cuenta(tes.negativas.length, 'semana', 'semanas'), min: v(tes.minimo.saldo, 'eurSigned'), sem: v(semanaDel(tes.minimo.fechas)) })
        },
      }),
      paso('costes', t('Calcula qué pasa si se aprueban las compras pendientes'), {
        autonomia: 'propone',
        salida: () => {
          const extra = c.ordenesPendientes(m).reduce((a, o) => a + c.impactoOrden(m, o.id).exceso, 0)
          return t('Sumarían {extra} al coste estimado final', { extra: v(extra, 'eur') })
        },
      }),
    ]
  },

  componer({ despues: m }) {
    const tot = c.totales(m)
    const tes = c.tesoreria(m)
    const inc = c.incoherenciasPrevision(m)
    const pend = c.ordenesPendientes(m)
    const extra = c.r2(pend.reduce((a, o) => a + c.impactoOrden(m, o.id).exceso, 0))
    // La frase responde a las dos preguntas; las cifras las llevan los KPI, no se repiten aquí.
    const coste = tot.desviacion > 0.004 ? 'Cerraremos por encima del presupuesto' : 'Cerraremos dentro del presupuesto'
    const bloques = [
      texto(
        tes.negativas.length
          ? t(`${coste} y faltará caja en {n}.`, { n: cuenta(tes.negativas.length, 'semana', 'semanas') })
          : t(`${coste} y la caja no pasa a negativo en las próximas semanas.`),
      ),
      kpisProyecto(m, null, { claves: ['cef', 'consolidado', 'disponible', 'desviacion'] }),
    ]
    if (tot.reservas > 0) bloques.push(texto(t('El coste estimado final incluye {res} apartados por riesgos de rodaje, fuera de los capítulos.', { res: v(tot.reservas, 'eur') })))
    if (pend.length) {
      const ids = pend.map((o) => o.id)
      const lista = ids.length > 1 ? `${ids.slice(0, -1).join(', ')} y ${ids.at(-1)}` : ids[0]
      bloques.push(
        texto(
          extra > 0
            ? t('Si se aprueban los pedidos pendientes ({ids}), el coste estimado final sube {extra}.', { ids: v(lista), extra: v(extra, 'eur') })
            : t('Los pedidos pendientes ({ids}) no cambian el coste estimado final.', { ids: v(lista) }),
        ),
      )
    }
    for (const i of inc) {
      bloques.push({
        tipo: 'aprobacion',
        id: `ap-cef-${i.codigo}`,
        ref: { tipo: 'cef', id: i.codigo },
        agente: 'prevision',
        nivel: 'propone',
        rol: ROLES.lineProducer,
        titulo: t('Ajustar la previsión de {nombre}', { nombre: v(i.nombre) }),
        resumen: t('Ya hay {cons} gastados o comprometidos y solo había {cef} previstos. Proponemos subir lo previsto a {nuevo} para que cuadre.', { cons: v(i.consolidado, 'eur'), cef: v(i.cef, 'eur'), nuevo: v(i.cefPropuesto, 'eur') }),
        impacto: [
          { etiqueta: `${i.nombre} · coste estimado final`, antes: i.cef, despues: i.cefPropuesto, formato: 'eur' },
          { etiqueta: 'Película · desviación', antes: tot.desviacion, despues: c.r2(tot.desviacion + i.exceso), formato: 'eurSigned' },
        ],
        acciones: [
          { id: 'aprobar', etiqueta: 'Ajustar previsión', burbuja: `Ajusto la previsión de ${i.nombre}`, variante: 'primary', accion: { tipo: 'partida/ajustarCef', codigo: i.codigo, cef: i.cefPropuesto }, rol: ROLES.lineProducer },
        ],
      })
    }
    if (tes.negativas.length) bloques.push(texto(t('La peor semana de caja es la del {fechas}: {saldo}.', { fechas: v(semanaDel(tes.minimo.fechas)), saldo: v(tes.minimo.saldo, 'eurSigned') })))
    bloques.push(bloqueCaja(m))
    if (tes.negativas.length) {
      const cobro = tes.semanas.find((s) => s.cobros > 0)
      const ops = []
      if (cobro) ops.push(t('Pedir que se adelante el cobro de la semana del {fechas}: {imp}, {concepto}.', { fechas: v(semanaDel(cobro.fechas)), imp: v(cobro.cobros, 'eur'), concepto: v(cobro.concepto.split(' · ')[0]) }))
      ops.push(t('Disponer de la póliza de crédito durante las semanas en negativo.'))
      ops.push(t('Acordar con proveedores aplazar pagos no críticos de esas semanas.'))
      // Que no movemos dinero ya lo dice «Lo que no ha hecho»: aquí no se repite.
      bloques.push(lista('Opciones para cubrir la caja', ops.map((tx) => ({ texto: tx })), 'propone'))
    }
    const sinMargen = c.partidasSinMargen(m)
    if (sinMargen.length) {
      bloques.push(
        aviso(
          'aviso',
          'Partidas sin margen',
          t('Vamos por el día {dia} de {total} y {n} ya no tienen margen: {lista}. Cualquier gasto nuevo en ellas sube el coste estimado final.', {
            dia: v(m.proyecto.diaActual, 'num'),
            total: v(m.proyecto.diasRodaje, 'num'),
            n: cuenta(sinMargen.length, 'partida', 'partidas'),
            lista: v(sinMargen.slice(0, 4).map((p) => p.nombre).join(', ') + (sinMargen.length > 4 ? '…' : '')),
          }),
        ),
      )
    }
    const sugerencias = [sug('¿Qué órdenes de compra tengo pendientes?'), sug('¿Qué bloquea el dossier fiscal?')]
    if (!m.informes[m.periodo.id]) sugerencias.unshift(sug('Prepárame el informe semanal de coste'))
    return {
      bloques,
      sugerencias,
      fuentes: ['Presupuesto ICAA por partidas', 'Previsión de tesorería semanal', 'Órdenes de compra'],
      reglas: [t('Un coste nuevo gasta primero lo que queda por gastar en su partida; lo que pasa de ahí sube el coste estimado final'), t('Solo ese exceso se suma a los pagos de su semana: lo previsto ya estaba en la caja')],
      noHecho: [t('No ha cambiado ninguna previsión sin tu confirmación.'), t('No ha movido dinero ni contactado con nadie.')],
    }
  },
}

// ── Resumen ──────────────────────────────────────────────────────────────────

export const resumen = {
  id: 'resumen',
  titulo: 'Resumen',
  ejemplos: ['¿Cómo vamos?', 'resumen del proyecto', 'estado del proyecto'],
  planificar() {
    return [
      paso('costes', t('Calcula el estado del coste'), { salida: t('Totales al día') }),
      paso('excepciones', t('Reúne las decisiones pendientes'), { paralelo: true, salida: t('Cola ordenada por importancia') }),
    ]
  },
  componer({ despues: m }) {
    const tot = c.totales(m)
    const ex = decisionesAbiertas(m)
    const altos = riesgosAltos(m)
    return {
      bloques: [
        texto(
          t('Día {dia} de {total} de rodaje: {hechas} rodadas. Coste estimado final {cef} ({pct} sobre presupuesto) y {n} por revisar.', {
            dia: v(m.proyecto.diaActual, 'num'),
            hechas: cuenta(m.proyecto.diaActual - 1, 'jornada', 'jornadas'),
            total: v(m.proyecto.diasRodaje, 'num'),
            cef: v(tot.cef, 'eur'),
            pct: v(tot.desviacionPct, 'pctSigned'),
            n: v(ex.length, 'num'),
          }),
        ),
        kpisProyecto(m),
        ...(altos.length
          ? [
              texto(
                altos.length === 1
                  ? t('Hay un riesgo alto de rodaje: {r}.', { r: minuscula(altos[0].titulo) })
                  : t('Hay {n} de rodaje; el primero, {r}.', { n: cuenta(altos.length, 'riesgo alto', 'riesgos altos'), r: minuscula(altos[0].titulo) }),
              ),
            ]
          : []),
        { tipo: 'decisiones' },
      ],
      sugerencias: [sug('Prepárame el informe semanal de coste'), sug('¿Qué riesgos hay para las próximas jornadas?'), sug('¿Qué capítulos se pasan del límite?')],
      fuentes: ['Presupuesto ICAA por partidas', 'Cola de excepciones'],
      reglas: [],
      noHecho: [t('Solo ha leído datos.')],
    }
  },
}

export { reducirVarias, tablaCapitulos, aprobacionOrden }
