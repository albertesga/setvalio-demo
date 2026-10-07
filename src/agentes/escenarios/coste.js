// Guiones de coste: informe semanal, desviaciones, previsión y resumen.

import { reducirVarias } from '../acciones.js'
import { confianzaBaja } from '../politicas.js'
import { eurSigned } from '../../lib/format.js'
import { decisionesAbiertas } from '../pendientes.js'
import { riesgosAltos } from '../rodaje.js'
import { cuenta } from '../texto.js'
import { t, v, c, POLITICAS, paso, sug, texto, aviso, lista, kpisProyecto, bloqueDesviaciones, tablaCapitulos, tablaPartidas, bloqueCaja, aprobacionOrden } from './comun.js'

const enBandeja = (m) => Object.values(m.documentos).filter((d) => d.estado === 'en_bandeja')

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
        salida: t('Casan con su pedido y quedan contabilizadas: {ok}. Sin pedido, a Excepciones: {sin}', { ok: v(casables.length, 'num'), sin: v(sinPedido, 'num') }),
      }),
      paso('costes', t('Compara presupuesto, gastado, comprometido y previsión por capítulo'), {
        salida: (_, d) => {
          const fuera = c.capitulos(d).filter((x) => x.fueraRango)
          return fuera.length
            ? t('{n} fuera del umbral del {u}: {cap}', { n: cuenta(fuera.length, 'capítulo', 'capítulos'), u: v(POLITICAS.umbralDesviacion, 'pct0'), cap: v(fuera.map((x) => `${x.id} ${x.nombre}`).join(', ')) })
            : t('Ningún capítulo supera el umbral del {u}', { u: v(POLITICAS.umbralDesviacion, 'pct0') })
        },
      }),
      paso('prevision', t('Revisa la previsión de cierre'), {
        paralelo: true,
        salida: (_, d) => {
          const inc = c.incoherenciasPrevision(d)
          return inc.length
            ? t('Coste estimado final {cef}; {p} tiene más comprometido que previsto', { cef: v(c.totales(d).cef, 'eur'), p: v(inc[0].codigo, 'id') })
            : t('Coste estimado final {cef}', { cef: v(c.totales(d).cef, 'eur') })
        },
      }),
      paso('excepciones', t('Ordena lo que necesita una decisión'), {
        tipo: 'revision',
        autonomia: 'aprueba',
        salida: (_, d) => {
          const ex = c.excepciones(d)
          return t('{n}: {a} con aprobación y {p} propuestas', { n: cuenta(ex.length, 'decisión de coste', 'decisiones de coste'), a: v(ex.filter((e) => e.nivel === 'aprueba').length, 'num'), p: v(ex.filter((e) => e.nivel === 'propone').length, 'num') })
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
    const tot = c.totales(despues)
    const des = c.desviaciones(despues)
    const mayor = des.items[0]
    const infAntes = antes.informes[despues.periodo.id]
    const infDespues = despues.informes[despues.periodo.id]
    const contabilizadas = Object.values(despues.documentos).filter((d) => d.estado === 'contabilizada' && antes.documentos[d.id].estado !== 'contabilizada')
    const bloques = [
      texto(
        t('Borrador del informe de {periodo} ({fechas}) listo. El coste estimado final es {cef}, {desv} ({pct}) sobre presupuesto. La mayor presión está en {cap}: {capDesv}.', {
          periodo: v(despues.periodo.etiqueta),
          fechas: v(despues.periodo.fechas),
          cef: v(tot.cef, 'eur'),
          desv: v(tot.desviacion, 'eurSigned'),
          pct: v(tot.desviacionPct, 'pctSigned'),
          cap: v(`${mayor.id} ${mayor.nombre}`),
          capDesv: v(mayor.desviacion, 'eurSigned'),
        }),
      ),
      kpisProyecto(despues),
    ]
    if (infAntes && infAntes === infDespues) {
      bloques.splice(1, 0, aviso('info', 'Sigue al día', t('Las cifras no han cambiado desde la edición {n}, así que no la rehago{aprob}.', { n: v(infDespues.edicion, 'num'), aprob: v(infDespues.estado === 'aprobado' ? ' y su aprobación sigue valiendo' : '') })))
    } else if (infDespues?.sustituyeAprobada) {
      bloques.splice(1, 0, aviso('aviso', 'Nueva edición', t('Las cifras cambiaron: esta edición sustituye a la que estaba aprobada y hay que volver a aprobarla.')))
    }
    if (contabilizadas.length) {
      bloques.push(
        texto(
          t('Contabilizado al casar con su pedido: {ids}. No cambia la previsión, porque ese gasto ya estaba comprometido.', {
            ids: v(contabilizadas.map((d) => `${d.id} (${d.proveedor})`).join(', ')),
          }),
        ),
      )
    }
    // Lo que se decide va justo después del informe; el detalle por capítulo, plegado al final.
    // La lista de decisiones no se repite aquí: está en «Por revisar» y en el propio informe.
    bloques.push({ tipo: 'informe', id: despues.periodo.id })
    bloques.push({
      tipo: 'aprobacion',
      id: `ap-informe-${despues.periodo.id}`,
      ref: { tipo: 'informe', id: despues.periodo.id },
      agente: 'informes',
      nivel: 'aprueba',
      rol: 'Producción ejecutiva',
      titulo: t('Compartir el informe de {periodo}', { periodo: v(despues.periodo.etiqueta) }),
      resumen: det?.entidades?.quiereEnviar
        ? t('Me pides enviarlo. En la demo no se envía ni se descarga nada: aquí solo queda registrada la aprobación.')
        : t('Antes de compartirlo fuera de la productora, alguien de producción ejecutiva tiene que revisarlo.'),
      acciones: [
        { id: 'aprobar', etiqueta: 'Aprobar para compartir', variante: 'primary', accion: { tipo: 'informe/aprobar', informeId: despues.periodo.id }, rol: 'Producción ejecutiva' },
      ],
    })
    bloques.push({ ...bloqueDesviaciones(despues, { conCausas: 'fuera' }), plegado: true })
    const sugerencias = [sug('¿Por qué se desvía Escenografía?'), sug('¿Cómo cerraremos el proyecto y llegamos con la caja?')]
    if (c.excepciones(despues).some((e) => e.tipo === 'confianza')) sugerencias.push(sug('¿Qué gastos tengo que revisar?'))
    if (c.ordenesPendientes(despues).length) sugerencias.push(sug('¿Qué órdenes de compra tengo pendientes?'))
    return {
      bloques,
      sugerencias,
      fuentes: ['Presupuesto ICAA por partidas', 'Bandeja de documentos', 'Órdenes de compra', 'Previsión de tesorería', 'Dossier fiscal'],
      reglas: [
        t('Una factura se contabiliza sola si casa con un pedido aprobado (tolerancia {tol})', { tol: v(POLITICAS.toleranciaConciliacion, 'pct0') }),
        t('Capítulo fuera de umbral si se desvía más del {u}', { u: v(POLITICAS.umbralDesviacion, 'pct0') }),
        t('Confianza mínima para clasificar solo: {u}', { u: v(POLITICAS.umbralConfianza, 'pct0') }),
      ],
      noHecho: [t('No ha enviado el informe a nadie.'), t('No ha aprobado ninguna compra ni contabilizado lo dudoso.'), t('No ha modificado el presupuesto.')],
    }
  },
}

// ── Explicar desviación ──────────────────────────────────────────────────────

export const explicarDesviacion = {
  id: 'explicar_desviacion',
  titulo: 'Explicar una desviación',
  ejemplos: ['¿Por qué se desvía Escenografía?', 'explica la desviación del capítulo 07', '¿qué capítulos están fuera de rango?', '¿Qué capítulos están fuera de umbral?', 'por qué estamos por encima del presupuesto', 'desviación de la partida 04.01'],

  planificar(m, det) {
    const cap = det.entidades.capitulo
    return [
      paso('costes', cap ? t('Desglosa el capítulo {cap} por partidas', { cap: v(`${cap} ${c.nombreCapitulo(m, cap)}`) }) : t('Ordena los capítulos por desviación'), {
        salida: () => {
          if (!cap) return t('{n} con sobrecoste y {a} con ahorro', { n: cuenta(c.desviaciones(m).items.filter((x) => x.desviacion > 0).length, 'capítulo', 'capítulos'), a: v(c.desviaciones(m).items.filter((x) => x.desviacion < 0).length, 'num') })
          const x = c.capitulo(m, cap)
          return t('{desv} ({pct}) sobre presupuesto', { desv: v(x.desviacion, 'eurSigned'), pct: v(x.desviacionPct, 'pctSigned') })
        },
      }),
      paso('prevision', t('Separa lo consolidado de lo previsto'), {
        salida: () => {
          const causas = c.desviaciones(m).items.filter((x) => !cap || x.id === cap).flatMap((x) => x.causas).filter((p) => p.desviacion > 0)
          const cons = causas.filter((p) => p.consolidada)
          return t('Consolidadas: {c} de {n} con sobrecoste', { c: v(cons.length, 'num'), n: cuenta(causas.length, 'partida', 'partidas') })
        },
      }),
      paso('costes', t('Busca margen para compensar'), {
        autonomia: 'propone',
        salida: () => {
          const fuera = cap ? c.capitulo(m, cap).fueraRango : c.capitulos(m).some((x) => x.fueraRango)
          return fuera ? t('Propuestas preparadas; no cambia nada sin tu visto bueno') : t('Sin propuestas: está dentro del umbral')
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
            ? t('Sobrecostes por {sobre}, ahorros por {ahorro} y reservas de riesgos por {res}: neto {neto}. {n} fuera del umbral del {u}.', {
                sobre: v(d.resumen.sobrecostes, 'eurSigned'),
                ahorro: v(d.resumen.ahorros, 'eurSigned'),
                res: v(d.resumen.reservas, 'eurSigned'),
                neto: v(d.resumen.neto, 'eurSigned'),
                n: cuenta(fuera.length, 'capítulo', 'capítulos'),
                u: v(POLITICAS.umbralDesviacion, 'pct0'),
              })
            : t('Sobrecostes por {sobre} y ahorros por {ahorro}: neto {neto}. {n} fuera del umbral del {u}.', {
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
        bloques.push(aviso('aviso', 'Cerca del umbral', t('{cap} está a {margen} del umbral. Aún quedan {pend} previstos en sus partidas; cuando se agoten, cualquier gasto de más de {margen} lo pasará.', { cap: v(`${cerca[0].id} ${cerca[0].nombre}`), margen: v(cerca[0].margenUmbral, 'eur'), pend: v(Math.max(0, cerca[0].disponible), 'eur') })))
      }
      for (const x of fuera.slice(0, 2)) sugerencias.push(sug(`¿Por qué se desvía ${x.nombre}?`))
      if (cerca[0]) sugerencias.push(sug(`Explica la desviación del capítulo ${cerca[0].id}`))
      return { bloques, sugerencias, fuentes: ['Presupuesto ICAA por partidas'], reglas: [t('Fuera de umbral: desviación mayor del {u}', { u: v(POLITICAS.umbralDesviacion, 'pct0') })], noHecho: [t('No ha cambiado ninguna previsión.')] }
    }

    const x = c.capitulo(m, cap)
    const d = c.desviaciones(m).items.find((i) => i.id === cap)
    const causas = d ? d.causas.filter((p) => p.desviacion > 0) : []
    const consolidada = causas.length > 0 && causas.every((p) => p.consolidada)
    const bloques = []
    if (!d || x.desviacion <= 0) {
      bloques.push(texto(t('{cap} no tiene sobrecoste: {desv} ({pct}) sobre presupuesto.', { cap: v(`${x.id} ${x.nombre}`), desv: v(x.desviacion, 'eurSigned'), pct: v(x.desviacionPct, 'pctSigned') })))
      bloques.push(tablaPartidas(m, cap))
      sugerencias.push(sug('¿Qué capítulos están fuera de umbral?'))
      return { bloques, sugerencias, fuentes: ['Presupuesto ICAA por partidas'], reglas: [], noHecho: [t('No ha cambiado ninguna previsión.')] }
    }

    bloques.push(
      texto(
        t('{cap} cerrará en {cef}, {desv} ({pct}) sobre presupuesto. {estado}', {
          cap: v(`${x.id} ${x.nombre}`),
          cef: v(x.cef, 'eur'),
          desv: v(x.desviacion, 'eurSigned'),
          pct: v(x.desviacionPct, 'pctSigned'),
          estado: v(
            consolidada
              ? 'La desviación ya está consolidada: lo gastado y comprometido igualan la previsión, así que no es una estimación.'
              : 'Parte es previsión: todavía queda pendiente por gastar en las partidas que se desvían.',
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
      const props = [t('Pedir tu visto bueno antes de comprometer cualquier compra nueva en el capítulo {cap}.', { cap: v(cap, 'id') })]
      if (ahorros.length) props.push(t('Compensar con los capítulos que van por debajo: {lista}.', { lista: v(ahorros.map((a) => `${a.id} ${a.nombre} (${eurSigned(a.desviacion)})`).join(', ')) }))
      bloques.push(lista('Qué puedes hacer', props.map((tx) => ({ texto: tx })), 'propone'))
    } else if (x.margenUmbral > 0) {
      const oc = Object.values(m.ordenes).find((o) => o.capitulo === cap && (o.estado === 'Pendiente' || o.estado === 'Por llegar'))
      bloques.push(aviso('aviso', 'Cerca del umbral', t('Quedan {margen} hasta el umbral del {u}.', { margen: v(x.margenUmbral, 'eur'), u: v(POLITICAS.umbralDesviacion, 'pct0') })))
      if (oc) {
        const imp = c.impactoOrden(m, oc.id)
        bloques.push(texto(t('La orden {oc} ({prov}, {imp}) lo dejaría en {pct}.', { oc: v(oc.id, 'id'), prov: v(oc.proveedor), imp: v(oc.importe, 'eur'), pct: v(imp.capitulo.despues.desviacionPct, 'pctSigned') })))
        if (oc.estado === 'Pendiente') sugerencias.push(sug(`Revisa la orden de compra ${oc.id}`))
      }
    }
    if (cap !== '04') sugerencias.push(sug('¿Por qué se desvía Escenografía?'))
    if (cap !== '07') sugerencias.push(sug('¿Y el 07?'))
    sugerencias.push(sug('¿Cómo cerraremos el proyecto y llegamos con la caja?'))
    return {
      bloques,
      sugerencias,
      fuentes: ['Presupuesto ICAA por partidas', 'Facturas contabilizadas', 'Órdenes de compra'],
      reglas: [t('Desviación consolidada: gastado + comprometido igualan el coste estimado final')],
      noHecho: [t('No ha bloqueado compras ni movido presupuesto entre capítulos: solo lo propone.')],
    }
  },
}

// ── Previsión de cierre y caja ───────────────────────────────────────────────

export const prevision = {
  id: 'prevision',
  titulo: 'Previsión de cierre y caja',
  ejemplos: ['¿Cómo cerraremos el proyecto?', 'previsión de coste final', '¿hay semanas con la caja en negativo?', 'actualiza el forecast', 'tesorería'],

  planificar(m) {
    const inc = c.incoherenciasPrevision(m)
    return [
      paso('prevision', t('Recalcula el coste estimado final partida a partida'), {
        salida: inc.length ? t('{n} con más comprometido que previsto', { n: cuenta(inc.length, 'partida', 'partidas') }) : t('Previsión coherente con lo comprometido'),
      }),
      paso('prevision', t('Proyecta la caja semana a semana'), {
        salida: () => {
          const tes = c.tesoreria(m)
          return t('{n} en negativo; mínimo {min} en {sem}', { n: cuenta(tes.negativas.length, 'semana', 'semanas'), min: v(tes.minimo.saldo, 'eur'), sem: v(tes.minimo.semana) })
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
    const bloques = [
      texto(
        t('El coste estimado final es {cef} ({pct} sobre presupuesto). Ya está consolidado el {cons}; quedan {pend} por gastar según la previsión.', {
          cef: v(tot.cef, 'eur'),
          pct: v(tot.desviacionPct, 'pctSigned'),
          cons: v(tot.consolidadoPct, 'pct'),
          pend: v(tot.disponible, 'eur'),
        }),
      ),
      kpisProyecto(m, null, { claves: ['cef', 'consolidado', 'disponible', 'desviacion'] }),
    ]
    if (tot.reservas > 0) bloques.push(texto(t('El coste estimado final incluye {res} de reservas de riesgos de rodaje (agente exploratorio), aparte de los capítulos.', { res: v(tot.reservas, 'eur') })))
    if (pend.length) {
      bloques.push(texto(t('Si se aprueban las órdenes pendientes ({ids}), el coste estimado final sube {extra}.', { ids: v(pend.map((o) => o.id).join(', ')), extra: v(extra, 'eur') })))
    }
    for (const i of inc) {
      bloques.push({
        tipo: 'aprobacion',
        id: `ap-cef-${i.codigo}`,
        ref: { tipo: 'cef', id: i.codigo },
        agente: 'prevision',
        nivel: 'propone',
        rol: 'Line producer',
        titulo: t('Ajustar la previsión de {p} {nombre}', { p: v(i.codigo, 'id'), nombre: v(i.nombre) }),
        resumen: t('Lo gastado y comprometido ({cons}) ya supera la previsión ({cef}). Propongo subirla a {nuevo}: el pendiente de esa partida deja de ser negativo.', { cons: v(i.consolidado, 'eur'), cef: v(i.cef, 'eur'), nuevo: v(i.cefPropuesto, 'eur') }),
        impacto: [
          { etiqueta: `Partida ${i.codigo} · coste estimado final`, antes: i.cef, despues: i.cefPropuesto, formato: 'eur' },
          { etiqueta: 'Proyecto · desviación', antes: tot.desviacion, despues: c.r2(tot.desviacion + i.exceso), formato: 'eurSigned' },
        ],
        acciones: [
          { id: 'aprobar', etiqueta: 'Ajustar previsión', variante: 'primary', accion: { tipo: 'partida/ajustarCef', codigo: i.codigo, cef: i.cefPropuesto }, rol: 'Line producer' },
        ],
      })
    }
    bloques.push(
      texto(
        tes.negativas.length
          ? t('La caja pasa a negativo en {n}. La peor es {sem} ({fechas}): {saldo}.', { n: cuenta(tes.negativas.length, 'semana', 'semanas'), sem: v(tes.minimo.semana), fechas: v(tes.minimo.fechas), saldo: v(tes.minimo.saldo, 'eur') })
          : t('La caja no pasa a negativo en las próximas semanas.'),
      ),
    )
    bloques.push(bloqueCaja(m))
    if (tes.negativas.length) {
      const cobro = tes.semanas.find((s) => s.cobros > 0)
      const ops = []
      if (cobro) ops.push(t('Pedir que se adelante el cobro de {sem}: {imp} ({concepto}).', { sem: v(cobro.semana), imp: v(cobro.cobros, 'eur'), concepto: v(cobro.concepto) }))
      ops.push(t('Disponer de la póliza de crédito durante las semanas en negativo.'))
      ops.push(t('Acordar con proveedores aplazar pagos no críticos de esas semanas.'))
      bloques.push(lista('Opciones para cubrir la caja', ops.map((tx) => ({ texto: tx })), 'propone'))
      bloques.push(aviso('info', 'Previsión no mueve dinero', t('Calcula y propone. Las gestiones con bancos, clientes y proveedores las decides y haces tú.')))
    }
    const sinMargen = c.partidasSinMargen(m)
    if (sinMargen.length) {
      bloques.push(
        aviso(
          'aviso',
          'Partidas sin margen',
          t('Vamos por el día {dia} de {total} de rodaje y {n} ya no tienen pendiente: {lista}. Cualquier gasto nuevo en ellas sube el coste estimado final.', {
            dia: v(m.proyecto.diaActual, 'num'),
            total: v(m.proyecto.diasRodaje, 'num'),
            n: cuenta(sinMargen.length, 'partida', 'partidas'),
            lista: v(sinMargen.slice(0, 4).map((p) => p.codigo).join(', ') + (sinMargen.length > 4 ? '…' : '')),
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
      reglas: [t('Un coste nuevo consume primero el pendiente de su partida; el exceso sube el coste estimado final'), t('Solo el exceso de una compra se añade a los pagos de su semana: el pendiente ya estaba en la previsión de caja')],
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
          t('{dia} de {total} jornadas rodadas. Coste estimado final {cef} ({pct} sobre presupuesto) y {n} por revisar.', {
            dia: v(m.proyecto.diaActual, 'num'),
            total: v(m.proyecto.diasRodaje, 'num'),
            cef: v(tot.cef, 'eur'),
            pct: v(tot.desviacionPct, 'pctSigned'),
            n: v(ex.length, 'num'),
          }),
        ),
        kpisProyecto(m),
        ...(altos.length ? [texto(t('Riesgos de rodaje (agente exploratorio, datos de ejemplo): {n}. El primero: {r}.', { n: cuenta(altos.length, 'alto', 'altos'), r: altos[0].titulo }))] : []),
        { tipo: 'decisiones' },
      ],
      sugerencias: [sug('Prepárame el informe semanal de coste'), sug('¿Qué riesgos hay para las próximas jornadas?'), sug('¿Qué capítulos están fuera de umbral?')],
      fuentes: ['Presupuesto ICAA por partidas', 'Cola de excepciones'],
      reglas: [],
      noHecho: [t('Solo ha leído datos.')],
    }
  },
}

export { reducirVarias, tablaCapitulos, aprobacionOrden }
