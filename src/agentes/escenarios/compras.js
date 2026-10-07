// Guion de órdenes de compra: impacto y aprobación.

import { reducir } from '../acciones.js'
import { normalizar } from '../intenciones.js'
import { cuenta } from '../texto.js'
import { t, v, c, POLITICAS, paso, sug, texto, aprobacionOrden } from './comun.js'

function objetivo(m, det) {
  if (det.eventoId === 'EV-02') return 'OC-104'
  return det.entidades?.oc ?? null
}

export const aprobarOc = {
  id: 'aprobar_oc',
  titulo: 'Aprobar una compra',
  ejemplos: ['¿Qué órdenes de compra tengo pendientes?', 'Aprueba la OC-104', '¿qué impacto tiene la orden de compra del Hotel NH?', 'autoriza la oc 105', 'Revisa la orden de compra OC-106'],

  planificar(m, det) {
    const id = objetivo(m, det)
    if (id && !m.ordenes[id]) return [paso('costes', t('Busca la orden {id}', { id: v(id, 'id') }), { salida: t('No existe en esta producción') })]

    if (id) {
      const o0 = m.ordenes[id]
      const pasos = []
      let m1 = m
      if (o0.estado === 'Por llegar') {
        if (det.eventoId !== 'EV-02') return [paso('excepciones', t('Busca la solicitud {id}', { id: v(id, 'id') }), { salida: t('Todavía no ha llegado') })]
        const recibir = { tipo: 'evento/recibir', eventoId: 'EV-02' }
        m1 = reducir(m, recibir)
        pasos.push(paso('excepciones', t('Recibe la solicitud {id} de {sol}', { id: v(id, 'id'), sol: v(o0.solicitante) }), { tipo: 'lectura', acciones: [recibir], salida: t('{prov} · {imp}', { prov: v(o0.proveedor), imp: v(o0.importe, 'eur') }) }))
      } else if (o0.estado !== 'Pendiente') {
        return [paso('costes', t('Busca la orden {id}', { id: v(id, 'id') }), { salida: t('Estado: {e}', { e: v(o0.estado.toLowerCase()) }) })]
      }
      const imp = c.impactoOrden(m1, id)
      pasos.push(
        paso('costes', t('Calcula el impacto en el capítulo {cap}', { cap: v(imp.capitulo.despues.id, 'id') }), {
          salida: t('Desviación del capítulo: de {a} a {b}', { a: v(imp.capitulo.antes.desviacionPct, 'pctSigned'), b: v(imp.capitulo.despues.desviacionPct, 'pctSigned') }),
        }),
      )
      pasos.push(
        paso('prevision', t('Recalcula cierre y caja si se aprueba'), {
          paralelo: true,
          salida: imp.exceso > 0 ? t('Coste estimado final {d}', { d: v(imp.exceso, 'eurSigned') }) : t('No cambia el coste estimado final'),
        }),
      )
      pasos.push(
        paso('excepciones', t('Decide quién tiene que aprobarla'), {
          tipo: 'revision',
          autonomia: imp.nivel,
          salida: t('Aprueba: {rol}', { rol: v(imp.rol) }),
        }),
      )
      return pasos
    }

    const pend = c.ordenesPendientes(m)
    return [
      paso('costes', t('Calcula el impacto de cada orden pendiente'), { salida: t('{n} pendientes', { n: cuenta(pend.length, 'orden', 'órdenes') }) }),
      paso('prevision', t('Recalcula cierre y caja para cada una'), { paralelo: true, salida: t('Impacto en caja calculado') }),
      paso('excepciones', t('Asigna quién aprueba cada una'), { tipo: 'revision', autonomia: 'aprueba', salida: t('Ordenadas por impacto') }),
    ]
  },

  componer({ antes, despues: m, det }) {
    const id = objetivo(antes, det)
    const pideAprobar = det.texto && /\b(aprueba|apruebala|aprobar|autoriza|autorizala|rechaza|rechazala)\b/.test(normalizar(det.texto))

    if (id && !m.ordenes[id]) {
      return { bloques: [texto(t('No encuentro la orden {id} en esta producción.', { id: v(id, 'id') }))], sugerencias: [sug('¿Qué órdenes de compra tengo pendientes?')], fuentes: ['Órdenes de compra'], reglas: [], noHecho: [] }
    }

    if (id) {
      const o = m.ordenes[id]
      if (o.estado === 'Por llegar') {
        return {
          bloques: [
            texto(t('La solicitud {id} todavía no ha llegado.', { id: v(id, 'id') })),
            { tipo: 'acciones', texto: t('En la demo puedes simular que producción la envía ahora.'), acciones: [{ id: 'simular', etiqueta: 'Simular la solicitud', entrada: { tipo: 'evento', eventoId: 'EV-02' } }] },
          ],
          sugerencias: [sug('¿Qué órdenes de compra tengo pendientes?')],
          fuentes: ['Órdenes de compra'],
          reglas: [],
          noHecho: [],
        }
      }
      if (o.estado !== 'Pendiente') {
        const ed = c.estadoDecision(m, { tipo: 'orden', id })
        return {
          bloques: [
            texto(
              o.importeAprobado !== undefined && o.importeAprobado < o.importe - 0.004
                ? t('{id} ({prov}) está aprobada por {aprob} de {imp}{por}. El resto no se ha comprometido.', { id: v(id, 'id'), prov: v(o.proveedor), aprob: v(o.importeAprobado, 'eur'), imp: v(o.importe, 'eur'), por: v(ed.por ? `, por decisión de ${ed.por}` : '') })
                : t('{id} ({prov}, {imp}) ya está {estado}{por}.', { id: v(id, 'id'), prov: v(o.proveedor), imp: v(o.importe, 'eur'), estado: v(o.estado.toLowerCase()), por: v(ed.por ? ` por ${ed.por}` : '') }),
            ),
          ],
          sugerencias: [sug('¿Qué órdenes de compra tengo pendientes?'), sug('¿Cómo cerraremos el proyecto y llegamos con la caja?')],
          fuentes: ['Órdenes de compra'],
          reglas: [],
          noHecho: [],
        }
      }
      const imp = c.impactoOrden(m, id)
      const bloques = []
      if (det.eventoId === 'EV-02') {
        bloques.push(texto(t('Ha llegado una solicitud de compra de {sol}: {concepto} con {prov} por {imp}.', { sol: v(o.solicitante), concepto: v(o.concepto.toLowerCase()), prov: v(o.proveedor), imp: v(o.importe, 'eur') })))
      }
      bloques.push(
        texto(
          imp.superaUmbral
            ? t('Aprobarla deja {cap} en {pct}, por encima del umbral del {u}. Por eso no la aprueba ningún agente: la decide {rol}.', { cap: v(`${imp.capitulo.despues.id} ${imp.capitulo.despues.nombre}`), pct: v(imp.capitulo.despues.desviacionPct, 'pctSigned'), u: v(POLITICAS.umbralDesviacion, 'pct0'), rol: v(imp.rol) })
            : imp.nivel === 'aprueba'
              ? t('No saca el capítulo del umbral, pero supera {lim}: la aprueba {rol}.', { lim: v(POLITICAS.umbralImporteOc, 'eur'), rol: v(imp.rol) })
              : t('Cabe en la previsión y no supera ningún umbral. Te propongo aprobarla.'),
        ),
      )
      if (pideAprobar) bloques.push(texto(t('Para aprobar o rechazar usa los botones de la tarjeta: así queda registrado quién decide.')))
      bloques.push(aprobacionOrden(m, id))
      return {
        bloques,
        sugerencias: [sug(`Explica la desviación del capítulo ${o.capitulo}`), sug('¿Cómo cerraremos el proyecto y llegamos con la caja?'), sug('¿Qué órdenes de compra tengo pendientes?')],
        fuentes: ['Órdenes de compra', 'Presupuesto por partidas', 'Previsión de tesorería'],
        reglas: [
          t('Orden de más de {lim}: la aprueba line producer', { lim: v(POLITICAS.umbralImporteOc, 'eur') }),
          t('Orden que deja su capítulo por encima del {u}: la aprueba producción ejecutiva', { u: v(POLITICAS.umbralDesviacion, 'pct0') }),
          t('Una compra consume primero lo previsto para su partida; el exceso sube el coste estimado final'),
        ],
        noHecho: [t('No ha aprobado ni rechazado la orden.'), t('No ha avisado al proveedor.')],
      }
    }

    const pend = c.ordenesPendientes(m)
    if (!pend.length) {
      return { bloques: [texto(t('No hay órdenes de compra pendientes.'))], sugerencias: [sug('¿Cómo cerraremos el proyecto y llegamos con la caja?')], fuentes: ['Órdenes de compra'], reglas: [], noHecho: [] }
    }
    const filas = pend.map((o) => {
      const imp = c.impactoOrden(m, o.id)
      return { id: o.id, orden: `${o.id} · ${o.proveedor}`, importe: o.importe, exceso: imp.exceso, desviacion: imp.capitulo.despues.desviacionPct, decide: imp.nivel === 'propone' ? 'Recomiendo aprobar' : imp.rol, alerta: imp.superaUmbral }
    })
    const totalExceso = c.r2(filas.reduce((a, f) => a + f.exceso, 0))
    return {
      bloques: [
        texto(t('Tienes {n}. Juntas sumarían {exc} al coste estimado final.', { n: cuenta(pend.length, 'orden pendiente', 'órdenes pendientes'), exc: v(totalExceso, 'eur') })),
        {
          tipo: 'tabla',
          titulo: 'Órdenes de compra pendientes',
          columnas: [
            { id: 'orden', etiqueta: 'Orden' },
            { id: 'importe', etiqueta: 'Importe', formato: 'eur', alinear: 'right' },
            { id: 'exceso', etiqueta: 'Sube el CEF', formato: 'eur', alinear: 'right' },
            { id: 'desviacion', etiqueta: 'Capítulo queda', formato: 'pctSigned', alinear: 'right', tono: true },
            { id: 'decide', etiqueta: 'Decide' },
          ],
          filas,
        },
        ...pend.slice(0, 3).map((o) => aprobacionOrden(m, o.id)),
      ],
      sugerencias: [sug('¿Cómo cerraremos el proyecto y llegamos con la caja?'), sug('¿Qué capítulos están fuera de rango?')],
      fuentes: ['Órdenes de compra', 'Presupuesto por partidas', 'Previsión de tesorería'],
      reglas: [t('Orden de más de {lim} o que deja su capítulo por encima del {u}: requiere aprobación', { lim: v(POLITICAS.umbralImporteOc, 'eur'), u: v(POLITICAS.umbralDesviacion, 'pct0') })],
      noHecho: [t('No ha aprobado ni rechazado ninguna orden.')],
    }
  },
}
