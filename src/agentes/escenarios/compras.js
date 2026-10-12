// Guion de órdenes de compra: impacto y aprobación.

import { reducir } from '../acciones.js'
import { normalizar } from '../intenciones.js'
import { crearMundo } from '../mundo.js'
import { cuenta } from '../texto.js'
import { ROLES } from '../politicas.js'
import { t, v, c, POLITICAS, paso, sug, texto, aprobacionOrden, nombreCorto, minuscula, quien, articulo } from './comun.js'

function objetivo(m, det) {
  if (det.eventoId === 'EV-02') return 'OC-104'
  return det.entidades?.oc ?? null
}

// El título solo recibe la petición: el proveedor sale de los pedidos de la semilla, que no cambian.
let PEDIDOS = null
function proveedorDe(id) {
  PEDIDOS ??= crearMundo().ordenes
  return PEDIDOS[id]?.proveedor ?? null
}

const CAJA = '¿Cuánto nos costará al final y llegamos de caja?'

// En la prosa se habla de «la compra» (aprobarla, aprobada); el documento es «el pedido».

/** «del line producer» / «de producción ejecutiva»: la preposición va en la plantilla y el rol, resaltado. */
const de = (rol) => (articulo(rol) ? 'del' : 'de')
const lo = (rol) => (articulo(rol) ? 'el ' : '')

const REGLAS = [
  t(`Pedido de más de {lim}: lo aprueba ${lo(ROLES.lineProducer)}{rol}`, { lim: v(POLITICAS.umbralImporteOc, 'eur'), rol: v(minuscula(ROLES.lineProducer)) }),
  t(`Pedido que deja su capítulo por encima del límite del {u}: lo aprueba ${lo(ROLES.produccionEjecutiva)}{rol}`, { u: v(POLITICAS.umbralDesviacion, 'pct0'), rol: v(minuscula(ROLES.produccionEjecutiva)) }),
  t('Una compra gasta primero lo previsto para su partida; lo que pasa de ahí sube el coste estimado final'),
]

export const aprobarOc = {
  id: 'aprobar_oc',
  titulo: (det) => {
    const id = det.eventoId === 'EV-02' ? 'OC-104' : det.entidades?.oc
    const prov = id && proveedorDe(id)
    return prov ? `Pedido de ${prov}` : 'Compras pendientes'
  },
  ejemplos: ['¿Qué órdenes de compra tengo pendientes?', 'Aprueba la OC-104', '¿qué impacto tiene la orden de compra del Hotel NH?', 'autoriza la oc 105', 'Revisa la orden de compra OC-106'],

  planificar(m, det) {
    const id = objetivo(m, det)
    if (id && !m.ordenes[id]) return [paso('costes', t('Busca el pedido {id}', { id: v(id, 'id') }), { salida: t('No existe en esta producción') })]

    if (id) {
      const o0 = m.ordenes[id]
      const pasos = []
      let m1 = m
      if (o0.estado === 'Por llegar') {
        if (det.eventoId !== 'EV-02') return [paso('excepciones', t('Busca el pedido {id}', { id: v(id, 'id') }), { salida: t('Todavía no ha llegado') })]
        const recibir = { tipo: 'evento/recibir', eventoId: 'EV-02' }
        m1 = reducir(m, recibir)
        pasos.push(paso('excepciones', t(`Recibe el pedido {id} ${de(o0.solicitante)} {sol}`, { id: v(id, 'id'), sol: v(minuscula(o0.solicitante)) }), { tipo: 'lectura', acciones: [recibir], salida: t('{prov} · {imp}', { prov: v(o0.proveedor), imp: v(o0.importe, 'eur') }) }))
      } else if (o0.estado !== 'Pendiente') {
        return [paso('costes', t('Busca el pedido {id}', { id: v(id, 'id') }), { salida: t('Estado: {e}', { e: v(o0.estado.toLowerCase()) }) })]
      }
      const imp = c.impactoOrden(m1, id)
      pasos.push(
        paso('costes', t('Calcula el impacto en {cap}', { cap: v(nombreCorto(imp.capitulo.despues.nombre)) }), {
          // Si al redondear no cambia, se dice así y no «de +1,1 % a +1,1 %».
          salida:
            Math.abs(imp.capitulo.antes.desviacionPct - imp.capitulo.despues.desviacionPct) < 0.0005
              ? t('La desviación del capítulo no cambia: {b}', { b: v(imp.capitulo.despues.desviacionPct, 'pctSigned') })
              : t('Desviación del capítulo: de {a} a {b}', { a: v(imp.capitulo.antes.desviacionPct, 'pctSigned'), b: v(imp.capitulo.despues.desviacionPct, 'pctSigned') }),
        }),
      )
      pasos.push(
        paso('prevision', t('Recalcula el coste final y la caja si se aprueba'), {
          paralelo: true,
          salida: imp.exceso > 0 ? t('Coste estimado final {d}', { d: v(imp.exceso, 'eurSigned') }) : t('No cambia el coste estimado final'),
        }),
      )
      pasos.push(
        paso('excepciones', t('Mira quién tiene que aprobarlo'), {
          tipo: 'revision',
          autonomia: imp.nivel,
          salida: imp.nivel === 'propone' ? t('Basta tu sí: no pasa ningún límite') : t('Decide: {rol}', { rol: v(minuscula(imp.rol)) }),
        }),
      )
      return pasos
    }

    const pend = c.ordenesPendientes(m)
    return [
      paso('costes', t('Calcula el impacto de cada pedido pendiente'), { salida: t('{n} pendientes', { n: cuenta(pend.length, 'pedido', 'pedidos') }) }),
      paso('prevision', t('Recalcula el coste final y la caja para cada uno'), { paralelo: true, salida: t('Impacto en caja calculado') }),
      paso('excepciones', t('Asigna quién aprueba cada uno'), { tipo: 'revision', autonomia: 'aprueba', salida: t('Ordenados por impacto') }),
    ]
  },

  componer({ antes, despues: m, det }) {
    const id = objetivo(antes, det)
    const pideAprobar = det.texto && /\b(aprueba|apruebala|aprobar|autoriza|autorizala|rechaza|rechazala)\b/.test(normalizar(det.texto))

    if (id && !m.ordenes[id]) {
      return { bloques: [texto(t('No encontramos el pedido {id} en esta producción.', { id: v(id, 'id') }))], sugerencias: [sug('¿Qué órdenes de compra tengo pendientes?')], fuentes: ['Órdenes de compra'], reglas: [], noHecho: [] }
    }

    if (id) {
      const o = m.ordenes[id]
      if (o.estado === 'Por llegar') {
        return {
          bloques: [
            texto(t('El pedido {id} todavía no ha llegado.', { id: v(id, 'id') })),
            { tipo: 'acciones', texto: t('En la demo puedes hacer que llegue ahora.'), acciones: [{ id: 'ver', etiqueta: 'Ver cómo llega', variante: 'primary', entrada: { tipo: 'evento', eventoId: 'EV-02' } }] },
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
                ? t('La compra {id} ({prov}) está aprobada por {aprob} de {imp}{por}. El resto no se ha comprometido.', { id: v(id, 'id'), prov: v(o.proveedor), aprob: v(o.importeAprobado, 'eur'), imp: v(o.importe, 'eur'), por: v(ed.por ? `, por decisión de ${ed.por}` : '') })
                : t('La compra {id} ({prov}, {imp}) ya está {estado}{por}.', { id: v(id, 'id'), prov: v(o.proveedor), imp: v(o.importe, 'eur'), estado: v(o.estado.toLowerCase()), por: v(ed.por ? ` por ${ed.por}` : '') }),
            ),
          ],
          sugerencias: [sug('¿Qué órdenes de compra tengo pendientes?'), sug(CAJA)],
          fuentes: ['Órdenes de compra'],
          reglas: [],
          noHecho: [],
        }
      }
      const imp = c.impactoOrden(m, id)
      const cap = nombreCorto(imp.capitulo.despues.nombre)
      const bloques = []
      if (det.eventoId === 'EV-02') {
        bloques.push(texto(t('{sol} pide una compra: {concepto} en {prov} por {imp}.', { sol: v(quien(o.solicitante).replace(/^./, (l) => l.toUpperCase())), concepto: v(minuscula(o.concepto)), prov: v(o.proveedor), imp: v(o.importe, 'eur') })))
      }
      // La prosa nombra la regla; quién decide lo dice la tarjeta («Decide: …» o «Decides tú»).
      bloques.push(
        texto(
          imp.superaUmbral
            ? t(`Aprobarla deja {cap} en {pct}, por encima del límite del {u}. Ningún agente puede aprobarla: necesita el visto bueno ${de(imp.rol)} {rol}.`, { cap: v(cap), pct: v(imp.capitulo.despues.desviacionPct, 'pctSigned'), u: v(POLITICAS.umbralDesviacion, 'pct0'), rol: v(minuscula(imp.rol)) })
            : imp.nivel === 'aprueba'
              ? t(`No deja {cap} por encima del límite, pero pasa de {lim}: necesita el visto bueno ${de(imp.rol)} {rol}.`, { cap: v(cap), lim: v(POLITICAS.umbralImporteOc, 'eur'), rol: v(minuscula(imp.rol)) })
              : t('No pasa ningún límite: basta tu sí.'),
        ),
      )
      if (pideAprobar) bloques.push(texto(t('Para aprobar o rechazar usa los botones de la tarjeta: así queda registrado quién decide.')))
      bloques.push(aprobacionOrden(m, id, { conMotivos: false }))
      return {
        bloques,
        // «¿Por qué se desvía…?» solo si el capítulo ya va por encima de su presupuesto.
        sugerencias: [sug(CAJA), ...(imp.capitulo.antes.desviacionPct > 0 ? [sug(`¿Por qué se desvía ${cap}?`)] : []), sug('¿Qué órdenes de compra tengo pendientes?')],
        fuentes: ['Órdenes de compra', 'Presupuesto por partidas', 'Previsión de tesorería'],
        reglas: REGLAS,
        noHecho: [t('No ha aprobado ni rechazado el pedido.'), t('No ha avisado al proveedor.')],
      }
    }

    const pend = c.ordenesPendientes(m)
    if (!pend.length) {
      return { bloques: [texto(t('No hay pedidos pendientes de aprobar.'))], sugerencias: [sug(CAJA)], fuentes: ['Órdenes de compra'], reglas: [], noHecho: [] }
    }
    const totalExceso = c.r2(pend.reduce((a, o) => a + c.impactoOrden(m, o.id).exceso, 0))
    const bloques = [
      texto(
        totalExceso > 0
          ? t('Tienes {n}. Juntos sumarían {exc} al coste estimado final.', { n: cuenta(pend.length, 'pedido pendiente', 'pedidos pendientes'), exc: v(totalExceso, 'eur') })
          : t('Tienes {n}. Ninguno cambia el coste estimado final.', { n: cuenta(pend.length, 'pedido pendiente', 'pedidos pendientes') }),
      ),
    ]
    // Con tres pedidos o menos bastan las tarjetas: la tabla repetiría sus cifras.
    if (pend.length > 3) {
      bloques.push({
        tipo: 'tabla',
        titulo: 'Pedidos pendientes',
        columnas: [
          { id: 'orden', etiqueta: 'Pedido' },
          { id: 'importe', etiqueta: 'Importe', formato: 'eur', alinear: 'right' },
          { id: 'exceso', etiqueta: 'Suma al coste estimado final', formato: 'eur', alinear: 'right' },
          { id: 'desviacion', etiqueta: 'El capítulo queda en', formato: 'pctSigned', alinear: 'right', tono: true },
          { id: 'decide', etiqueta: 'Decide' },
        ],
        filas: pend.map((o) => {
          const imp = c.impactoOrden(m, o.id)
          return { id: o.id, orden: `${o.concepto} · ${o.proveedor}`, importe: o.importe, exceso: imp.exceso, desviacion: imp.capitulo.despues.desviacionPct, decide: imp.nivel === 'propone' ? 'Basta tu sí' : minuscula(imp.rol), alerta: imp.superaUmbral }
        }),
      })
    }
    bloques.push(...pend.slice(0, 3).map((o) => aprobacionOrden(m, o.id)))
    return {
      bloques,
      sugerencias: [sug(CAJA), sug('¿Qué capítulos se pasan del límite?')],
      fuentes: ['Órdenes de compra', 'Presupuesto por partidas', 'Previsión de tesorería'],
      reglas: REGLAS,
      noHecho: [t('No ha aprobado ni rechazado ningún pedido.')],
    }
  },
}
