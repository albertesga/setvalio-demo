// Guiones de documentos: factura entrante, gasto dudoso y petición de documentación.

import { reducir, LLEGAN_CON_EV01 } from '../acciones.js'
import { PERSONAS } from '../mundo.js'
import { confianzaBaja, ROLES } from '../politicas.js'
import { cuenta, fecha, unir } from '../texto.js'
import { t, v, c, POLITICAS, paso, sug, texto, aviso, kpisPartida, bloqueDocumento, nombrePartida, minuscula, articulo } from './comun.js'

const enBandeja = (m) => Object.values(m.documentos).filter((d) => d.estado === 'en_bandeja')
const casable = (m, d) => !d.revisionManual && !confianzaBaja(d) && d.impuesto?.tipo !== 'IGIC' && c.conciliar(m, d.id).resultado === 'ok'

/** ['a', 'b', 'c'] → 'a, b y c'. */
const enLista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0] ?? '')

function confianzaMinima(d) {
  return d.confianza ? Math.min(...Object.values(d.confianza)) : null
}

// ── Lo que ha llegado esta mañana (EV-01) ────────────────────────────────────

/** Las que han entrado hoy con EV-01, en el orden en que llegaron. */
const llegadasDeHoy = (m) => LLEGAN_CON_EV01.map((id) => m.documentos[id]).filter((d) => d && d.estado !== 'por_llegar')

/** Elige el documento del que habla la petición. */
export function documentoObjetivo(m, det) {
  const id = det.entidades?.documento
  return id && m.documentos[id] ? id : null
}

/** ¿Trae esta petición lo de esta mañana? La novedad, o preguntar por una de las tres antes de que entre. */
function traeLaLlegada(m, det) {
  if (!m.entrantes.includes('EV-01')) return false
  if (det.eventoId === 'EV-01') return true
  const id = documentoObjetivo(m, det)
  return !!id && LLEGAN_CON_EV01.includes(id)
}

/** Pasos de la llegada: recoger los tres canales, leer, cuadrar lo que cuadra y proponer lo dudoso. */
function planLlegada(m) {
  const recibir = { tipo: 'evento/recibir', eventoId: 'EV-01' }
  const m1 = reducir(m, recibir)
  const docs = llegadasDeHoy(m1)
  const solas = docs.filter((d) => casable(m1, d))
  const dudosos = docs.filter((d) => confianzaBaja(d))
  const pasos = [
    paso('facturas', t('Recoge lo que ha entrado por correo, formulario web y WhatsApp'), { tipo: 'lectura', acciones: [recibir], salida: t('{n}', { n: cuenta(docs.length, 'documento', 'documentos') }) }),
    paso('facturas', t('Lee cada documento con OCR'), {
      tipo: 'ocr',
      salida: dudosos.length ? t('{ok} claros; {dud} con confianza baja', { ok: v(docs.length - dudosos.length, 'num'), dud: v(dudosos.length, 'num') }) : t('Todos claros'),
    }),
  ]
  for (const d of solas) {
    const conc = c.conciliar(m1, d.id)
    pasos.push(
      paso('conciliacion', t('Cuadra {id} con el pedido {oc}', { id: v(d.id, 'id'), oc: v(conc.oc, 'id') }), {
        tipo: 'conciliacion',
        acciones: [{ tipo: 'documento/contabilizar', docId: d.id, por: 'Conciliación' }],
        salida: t('Cuadra con su pedido: contabilizada'),
      }),
    )
  }
  for (const d of dudosos) {
    pasos.push(
      paso('facturas', t('Compara dónde puede ir el gasto de {prov}', { prov: v(d.proveedor) }), {
        autonomia: 'propone',
        salida: t('{a} o {b}', { a: v(nombrePartida(m1, d.partida)), b: v(nombrePartida(m1, d.alternativa)) }),
      }),
    )
  }
  // Comprobar es rutinario: lo hace solo, no propone nada.
  pasos.push(paso('cumplimiento', t('Comprueba si los gastos son elegibles'), { tipo: 'revision', autonomia: 'ejecuta', paralelo: true, salida: t('Revisado') }))
  if (dudosos.length) pasos.push(paso('excepciones', t('Te trae lo dudoso para decidir'), { tipo: 'revision', autonomia: 'propone', salida: t('No se contabiliza sin tu confirmación') }))
  return pasos
}

const REGLAS_FACTURAS = () => [
  t('Se contabiliza sola si la confianza de cada campo es de al menos {u} y cuadra con un pedido aprobado', { u: v(POLITICAS.umbralConfianza, 'pct0') }),
  t('Tolerancia de conciliación: {tol}', { tol: v(POLITICAS.toleranciaConciliacion, 'pct0') }),
]

/** Respuesta a la llegada: cómo han entrado, el detalle de cada una y la tarjeta de lo dudoso. */
function componerLlegada(antes, despues) {
  const docs = llegadasDeHoy(despues)
  const solas = docs.filter((d) => d.estado === 'contabilizada' && d.contabilizadaPor === 'Conciliación')
  const dudoso = docs.find((d) => d.estado === 'en_bandeja' && confianzaBaja(d))
  const mismoCoste = Math.abs(c.totales(antes).cef - c.totales(despues).cef) < 0.005
  const lead = [
    t('Esta mañana han entrado {n}, cada uno por un canal.', { n: cuenta(docs.length, 'documento', 'documentos') }),
    solas.length && t('Conciliación ha contabilizado sola {k} que cuadran con su pedido{coste}', { k: cuenta(solas.length, 'factura', 'facturas'), coste: v(mismoCoste ? `: el coste final no cambia, ${solas.length === 1 ? 'ese gasto ya estaba previsto' : 'esos gastos ya estaban previstos'}.` : '.') }),
    dudoso && t('El ticket de {prov} no está claro: Facturas te propone dónde va.', { prov: v(dudoso.proveedor) }),
  ]
  const bloques = [texto(unir(lead)), { tipo: 'llegadas', docIds: docs.map((d) => d.id) }, ...solas.map((d) => bloqueDocumento(despues, d.id))]
  if (dudoso) {
    const p = propuestaPartida(despues, dudoso)
    bloques.push(texto(p.explicacion), ...p.bloques)
  }
  return {
    bloques,
    // Una línea por si se pliega, y la cita de deshacer.
    resumen: solas.length ? t('Conciliación contabilizó sola {ids} · {cuadra} con su pedido', { ids: v(enLista(solas.map((d) => d.id))), cuadra: v(solas.length === 1 ? 'cuadra' : 'cuadran') }) : null,
    sugerencias: [sug('Prepárame el informe semanal de coste'), sug('¿Qué bloquea el dossier fiscal?')],
    fuentes: ['Correo de facturas', 'Formulario web de proveedores', 'WhatsApp de producción', 'Órdenes de compra', 'Presupuesto por partidas'],
    reglas: [...REGLAS_FACTURAS(), t('Por debajo del {u} de confianza, Facturas propone y una persona confirma', { u: v(POLITICAS.umbralConfianza, 'pct0') })],
    noHecho: [dudoso ? t('No ha contabilizado el ticket: espera tu decisión.') : null, t('No ha pagado ninguna factura.')].filter(Boolean),
  }
}

/** «¿Han llegado facturas nuevas?» sin documento concreto: antes de la llegada, nada; después, cómo están las de hoy. */
function componerBandeja(m) {
  const sugerencias = [sug('¿Qué gastos tengo que revisar?'), sug('Prepárame el informe semanal de coste')]
  if (m.entrantes.includes('EV-01')) {
    return {
      bloques: [
        texto(t('Todavía no ha entrado nada hoy. Las facturas llegan por correo, por el formulario web o por WhatsApp; las que cuadran con su pedido, Conciliación las contabiliza sola.')),
        { tipo: 'acciones', texto: t('En la demo puedes hacer que lleguen las de esta mañana.'), acciones: [{ id: 'ver', etiqueta: 'Ver cómo llegan', variante: 'primary', entrada: { tipo: 'evento', eventoId: 'EV-01' } }] },
      ],
      sugerencias,
      fuentes: ['Bandeja de documentos'],
      reglas: [],
      noHecho: [t('No ha contabilizado nada.')],
    }
  }
  const hoy = llegadasDeHoy(m)
  const hechas = hoy.filter((d) => d.estado === 'contabilizada').length
  const pendientes = hoy.filter((d) => d.estado === 'en_bandeja')
  const estado = [hechas && cuenta(hechas, 'contabilizado', 'contabilizados'), pendientes.length && cuenta(pendientes.length, 'por revisar', 'por revisar')].filter(Boolean)
  const bloques = [
    texto(estado.length > 1 ? t('Esta mañana han entrado {n}: {a} y {b}.', { n: cuenta(hoy.length, 'documento', 'documentos'), a: estado[0], b: estado[1] }) : t('Esta mañana han entrado {n}: {a}.', { n: cuenta(hoy.length, 'documento', 'documentos'), a: estado[0] })),
    { tipo: 'llegadas', docIds: hoy.map((d) => d.id) },
  ]
  if (pendientes.length) {
    bloques.push({
      tipo: 'acciones',
      texto: pendientes.length === 1 ? t('Uno espera tu decisión.') : t('{n} esperan tu decisión.', { n: v(pendientes.length, 'num') }),
      acciones: pendientes.map((d) => ({ id: d.id, etiqueta: `Revisar ${d.id}`, variante: 'secondary', entrada: { tipo: 'texto', texto: confianzaBaja(d) ? '¿Qué gastos tengo que revisar?' : `Procesa la factura ${d.id}` } })),
    })
  }
  return { bloques, sugerencias, fuentes: ['Correo de facturas', 'Formulario web de proveedores', 'WhatsApp de producción'], reglas: [], noHecho: [t('No ha cambiado nada.')] }
}

// ── Factura entrante ─────────────────────────────────────────────────────────

const tituloDocumento = (id) => `${/^G-/.test(id) ? 'Ticket' : 'Factura'} ${id}`

export const facturaNueva = {
  id: 'factura_nueva',
  titulo: (det) => (det.eventoId === 'EV-01' ? 'Facturas de esta mañana' : det.entidades?.documento ? tituloDocumento(det.entidades.documento) : 'Bandeja de facturas'),
  ejemplos: ['¿Han llegado facturas nuevas?', 'Ha llegado una factura de Grúas y Cámaras del Sur', 'procesa la F-2026-078', 'nueva factura en el buzón', 'Procesa la factura F-2026-069'],

  planificar(m, det) {
    if (traeLaLlegada(m, det)) return planLlegada(m)
    const id = documentoObjetivo(m, det)
    if (!id) {
      return [paso('facturas', t('Revisa la bandeja de entrada'), { tipo: 'lectura', salida: m.entrantes.includes('EV-01') ? t('Nada nuevo desde esta mañana') : t('{n} hoy', { n: cuenta(llegadasDeHoy(m).length, 'documento', 'documentos') }) })]
    }
    const d0 = m.documentos[id]
    if (d0.estado === 'por_llegar') return [paso('facturas', t('Revisa la bandeja de entrada'), { tipo: 'lectura', salida: t('Nada nuevo desde esta mañana') })]
    if (d0.estado === 'contabilizada') return [paso('facturas', t('Busca {id}', { id: v(id, 'id') }), { tipo: 'lectura', salida: t('Ya está contabilizada') })]

    const pasos = [
      paso('facturas', d0.origen === 'Factura-e XML' ? t('Lee la factura electrónica {id}', { id: v(id, 'id') }) : t('Lee {id} con OCR', { id: v(id, 'id') }), {
        tipo: d0.origen === 'Factura-e XML' ? 'lectura' : 'ocr',
        salida: t('{prov} · {total} · partida {p}', { prov: v(d0.proveedor), total: v(d0.total, 'eurCents'), p: v(d0.partida, 'id') }),
      }),
    ]
    const conc = c.conciliar(m, id)
    if (conc.resultado === 'ok' && d0.revisionManual) {
      // Deshiciste lo que hizo sola: ahora no la contabiliza sin ti.
      pasos.push(paso('conciliacion', t('Cuadra {id} con el pedido {oc}', { id: v(id, 'id'), oc: v(conc.oc, 'id') }), { tipo: 'conciliacion', salida: t('Cuadra con su pedido') }))
      pasos.push(paso('excepciones', t('Te la trae para que la revises'), { tipo: 'revision', autonomia: 'propone', salida: t('No la contabiliza sin ti') }))
    } else if (conc.resultado === 'ok') {
      pasos.push(
        paso('conciliacion', t('Cuadra {id} con el pedido {oc}', { id: v(id, 'id'), oc: v(conc.oc, 'id') }), {
          tipo: 'conciliacion',
          acciones: [{ tipo: 'documento/contabilizar', docId: id, por: 'Conciliación' }],
          salida: t('Cuadra con su pedido: contabilizada'),
        }),
      )
      pasos.push(paso('cumplimiento', t('Comprueba si el gasto es elegible'), { tipo: 'revision', autonomia: 'ejecuta', paralelo: true, salida: (_, d) => (c.elegibilidad(d, id).estado === 'elegible' ? t('Elegible') : t('Elegible cuando se pague: falta el justificante de pago')) }))
    } else {
      pasos.push(paso('conciliacion', t('Busca el pedido de {id}', { id: v(id, 'id') }), { tipo: 'conciliacion', salida: d0.contrato ? t('Sin pedido; el proveedor tiene contrato marco') : t('Sin pedido ni contrato') }))
      pasos.push(paso('excepciones', t('Lo lleva a quien puede contabilizarla'), { tipo: 'revision', autonomia: 'aprueba', salida: t('Decide: {rol}', { rol: v(minuscula(ROLES.lineProducer)) }) }))
    }
    return pasos
  },

  componer({ antes, despues, det }) {
    if (traeLaLlegada(antes, det)) return componerLlegada(antes, despues)
    const id = documentoObjetivo(antes, det)
    if (!id || antes.documentos[id].estado === 'por_llegar') return componerBandeja(despues)
    const reglas = REGLAS_FACTURAS()
    const d = despues.documentos[id]

    if (antes.documentos[id].estado === 'contabilizada') {
      // La que Conciliación contabilizó sola se cuenta así, no como «ya estaba contabilizada».
      const sola = d.contabilizadaPor === 'Conciliación' && d.oc
      return {
        bloques: [
          texto(
            sola
              ? d.recibida === despues.corte.fecha
                ? t('{id} de {prov} entró hoy y Conciliación la contabilizó sola: cuadra con {oc}.', { id: v(d.id, 'id'), prov: v(d.proveedor), oc: v(d.oc, 'id') })
                : t('{id} de {prov} ya está contabilizada: Conciliación la contabilizó sola porque cuadra con {oc}.', { id: v(d.id, 'id'), prov: v(d.proveedor), oc: v(d.oc, 'id') })
              : t('{id} de {prov} ya está contabilizada en {p}.', { id: v(id, 'id'), prov: v(d.proveedor), p: v(nombrePartida(despues, d.partida)) }),
          ),
          bloqueDocumento(despues, id, { elegibilidad: true }),
        ],
        sugerencias: [sug('¿Han llegado facturas nuevas?'), sug('¿Qué gastos tengo que revisar?')],
        fuentes: ['Bandeja de documentos'],
        reglas: sola ? reglas : [],
        noHecho: [t('No ha cambiado nada.')],
      }
    }

    if (d.estado === 'contabilizada') {
      const pa = antes.partidas[d.partida]
      const pd = despues.partidas[d.partida]
      const cambiaCef = Math.abs(pa.cef - pd.cef) > 0.004
      const partida = nombrePartida(despues, d.partida)
      return {
        bloques: [
          texto(
            cambiaCef
              ? t('Cuadra con su pedido ({oc}) y queda contabilizada en {p}. Parte del importe no estaba previsto: el coste estimado final sube {dif}.', { p: v(partida), oc: v(d.oc, 'id'), dif: v(pd.cef - pa.cef, 'eurSigned') })
              : t('Cuadra con su pedido ({oc}) y queda contabilizada en {p}. El coste final no cambia: ese gasto ya estaba previsto.', { p: v(partida), oc: v(d.oc, 'id') }),
          ),
          bloqueDocumento(despues, id, { elegibilidad: true }),
          kpisPartida(antes, despues, d.partida),
        ],
        // Base sin IVA, como el parte y la partida.
        resumen: t('Conciliación contabilizó sola {id} · {total} · cuadra con {oc}', { id: v(id, 'id'), total: v(d.base, 'eur'), oc: v(d.oc, 'id') }),
        sugerencias: [sug('¿Qué gastos tengo que revisar?'), sug('¿Qué bloquea el dossier fiscal?'), sug('Prepárame el informe semanal de coste')],
        fuentes: ['Bandeja de documentos', 'Órdenes de compra', 'Presupuesto por partidas'],
        reglas,
        noHecho: [t('No ha pagado la factura.'), t('No ha cambiado el pedido ni el presupuesto.')],
      }
    }

    // La que deshiciste: cuadra, pero ahora la contabilizas tú.
    if (d.revisionManual) {
      const imp = c.impactoNuevoCoste(despues, d.partida, d.base, 'gastado')
      const partida = nombrePartida(despues, d.partida)
      return {
        bloques: [
          texto(t('{id} de {prov} cuadra con su pedido ({oc}). Deshiciste lo que hizo Conciliación, así que ahora no la contabiliza sin ti.', { id: v(id, 'id'), prov: v(d.proveedor), oc: v(d.oc, 'id') })),
          bloqueDocumento(despues, id, { elegibilidad: true }),
          {
            tipo: 'aprobacion',
            id: `ap-${id}-manual`,
            ref: { tipo: 'documento', id },
            agente: 'conciliacion',
            nivel: 'propone',
            rol: ROLES.revisionHumana,
            titulo: t('Contabilizar {id} en {p}', { id: v(id, 'id'), p: v(partida) }),
            resumen: imp.exceso > 0 ? t('Sube el coste estimado final de {p} en {exc}.', { p: v(partida), exc: v(imp.exceso, 'eur') }) : t('Cabe en lo previsto: el coste estimado final no cambia.'),
            acciones: [
              { id: 'aprobar', etiqueta: 'Contabilizar', burbuja: `Contabilizo ${id}`, variante: 'primary', accion: { tipo: 'documento/contabilizar', docId: id }, rol: ROLES.revisionHumana },
              { id: 'aplazar', etiqueta: 'Dejar en revisión', burbuja: `Dejo ${id} en revisión`, variante: 'secondary', accion: { tipo: 'documento/aplazar', docId: id }, rol: ROLES.revisionHumana },
            ].filter((a) => a.id !== 'aplazar' || !d.aplazado),
          },
        ],
        sugerencias: [sug('¿Qué gastos tengo que revisar?'), sug('Prepárame el informe semanal de coste')],
        fuentes: ['Bandeja de documentos', 'Órdenes de compra'],
        reglas,
        noHecho: [t('No ha contabilizado la factura: espera tu decisión.')],
      }
    }

    // Sin pedido: decisión del line producer.
    const imp = c.impactoNuevoCoste(despues, d.partida, d.base, 'gastado')
    return {
      bloques: [
        texto(
          t(`{id} de {prov} ({base} sin IVA) no tiene pedido. {contrato} Contabilizarla sin pedido lo decide ${articulo(ROLES.lineProducer) ? 'el ' : ''}{rol}.`, {
            id: v(id, 'id'),
            prov: v(d.proveedor),
            base: v(d.base, 'eurCents'),
            contrato: v(d.contrato ? 'El proveedor tiene contrato marco, así que el gasto está respaldado.' : 'Tampoco hay contrato con el proveedor.'),
            rol: v(minuscula(ROLES.lineProducer)),
          }),
        ),
        bloqueDocumento(despues, id, { elegibilidad: true }),
        {
          tipo: 'aprobacion',
          id: `ap-${id}`,
          ref: { tipo: 'documento', id },
          agente: 'excepciones',
          nivel: 'aprueba',
          rol: ROLES.lineProducer,
          titulo: t('Contabilizar {id} sin pedido', { id: v(id, 'id') }),
          resumen:
            imp.exceso > 0
              ? t('Sube el coste estimado final de {p} en {exc}.', { p: v(nombrePartida(despues, d.partida)), exc: v(imp.exceso, 'eur') })
              : t('Cabe en lo previsto para {p}: el coste estimado final no cambia.', { p: v(nombrePartida(despues, d.partida)) }),
          impacto: [{ etiqueta: `${nombrePartida(despues, d.partida)} · gastado`, antes: imp.partida.antes.gastado, despues: imp.partida.despues.gastado, formato: 'eur' }],
          acciones: [
            { id: 'aprobar', etiqueta: 'Contabilizar', burbuja: `Contabilizo ${id} sin pedido`, variante: 'primary', accion: { tipo: 'documento/contabilizar', docId: id }, rol: ROLES.lineProducer },
            { id: 'aplazar', etiqueta: 'Dejar en la bandeja', burbuja: `Dejo ${id} en la bandeja`, variante: 'secondary', accion: { tipo: 'documento/aplazar', docId: id }, rol: ROLES.lineProducer },
          ].filter((x) => x.id !== 'aplazar' || !d.aplazado),
        },
      ],
      sugerencias: [sug(`Pide a ${d.proveedor} la documentación que falta`), sug('¿Qué gastos tengo que revisar?')],
      fuentes: ['Bandeja de documentos', 'Órdenes de compra', 'Contratos de proveedores'],
      reglas: [t('Una factura sin pedido no se contabiliza sola')],
      noHecho: [t('No ha contabilizado la factura: espera la decisión.')],
    }
  },
}

// ── Gasto dudoso ─────────────────────────────────────────────────────────────

export const revisarGasto = {
  id: 'revisar_gasto',
  titulo: 'Gastos por revisar',
  ejemplos: ['¿Qué gastos tengo que revisar?', 'revisa el ticket de la ferretería', 'gastos con baja confianza', 'bandeja de gastos'],

  planificar(m) {
    const dudosos = enBandeja(m).filter((d) => confianzaBaja(d))
    if (!dudosos.length) return [paso('facturas', t('Revisa la bandeja de gastos'), { tipo: 'lectura', salida: t('Nada con confianza baja') })]
    const d = dudosos[0]
    return [
      paso('facturas', t('Relee {prov} con OCR', { prov: v(d.proveedor) }), {
        tipo: 'ocr',
        salida: t('Confianza {c}: por debajo del {u}', { c: v(confianzaMinima(d), 'pct0'), u: v(POLITICAS.umbralConfianza, 'pct0') }),
      }),
      paso('facturas', t('Compara las partidas posibles'), {
        autonomia: 'propone',
        salida: t('{a} o {b}', { a: v(nombrePartida(m, d.partida)), b: v(nombrePartida(m, d.alternativa)) }),
      }),
      paso('excepciones', t('Te lo trae para decidir'), { tipo: 'revision', autonomia: 'propone', salida: t('No se contabiliza sin tu confirmación') }),
    ]
  },

  componer({ despues: m }) {
    const dudosos = enBandeja(m).filter((d) => confianzaBaja(d))
    if (!dudosos.length) {
      return {
        bloques: [texto(t('No tienes gastos por revisar. Estas son las decisiones que siguen abiertas:')), { tipo: 'decisiones' }],
        sugerencias: [sug('¿Han llegado facturas nuevas?'), sug('Prepárame el informe semanal de coste')],
        fuentes: ['Bandeja de documentos'],
        reglas: [],
        noHecho: [t('No ha contabilizado nada.')],
      }
    }
    const d = dudosos[0]
    const p = propuestaPartida(m, d)
    const cuantos = dudosos.length === 1 ? t('Solo tienes un gasto por revisar.') : t('Tienes {n} por revisar; empiezo por el de {prov}.', { n: cuenta(dudosos.length, 'gasto', 'gastos'), prov: v(d.proveedor) })
    return {
      bloques: [texto(unir([cuantos, p.explicacion])), ...p.bloques],
      sugerencias: [sug('¿Han llegado facturas nuevas?'), sug('¿Qué bloquea el dossier fiscal?')],
      fuentes: ['Bandeja de documentos', 'Presupuesto por partidas'],
      reglas: [t('Por debajo del {u} de confianza, Facturas propone y una persona confirma', { u: v(POLITICAS.umbralConfianza, 'pct0') })],
      noHecho: [t('No ha contabilizado el gasto.'), t('No ha pedido nada al proveedor.')],
    }
  },
}

/**
 * Lo dudoso (confianza baja): Facturas no decide la partida y te propone dos, con lo que
 * cada una hace al coste. La usan «Gastos por revisar» y la llegada de esta mañana.
 * Devuelve la frase que lo explica y los bloques: el documento y la tarjeta.
 */
function propuestaPartida(m, d) {
  const a = c.impactoNuevoCoste(m, d.partida, d.base, 'gastado')
  const b = c.impactoNuevoCoste(m, d.alternativa, d.base, 'gastado')
  const pa = nombrePartida(m, d.partida)
  const pb = nombrePartida(m, d.alternativa)
  const acciones = [
    { id: 'confirmar', etiqueta: `Imputar a ${pa}`, burbuja: `Lo imputo a ${pa}`, variante: 'primary', accion: { tipo: 'documento/contabilizar', docId: d.id, partida: d.partida }, rol: ROLES.revisionHumana },
    { id: 'alternativa', etiqueta: `Imputar a ${pb}`, burbuja: `Lo imputo a ${pb}`, variante: 'secondary', accion: { tipo: 'documento/contabilizar', docId: d.id, partida: d.alternativa }, rol: ROLES.revisionHumana },
    { id: 'aplazar', etiqueta: 'Dejar en revisión', burbuja: 'Lo dejo en revisión', variante: 'secondary', accion: { tipo: 'documento/aplazar', docId: d.id }, rol: ROLES.revisionHumana },
  ].filter((x) => x.id !== 'aplazar' || !d.aplazado)
  // Sin factura completa no vale para el dossier: se pide desde la misma tarjeta (guion pedir_documentacion).
  // Esta acción no decide nada: lleva `entrada` en lugar de `accion`.
  if (faltaDocumentacion(d)) {
    acciones.push({ id: 'pedir', etiqueta: d.tipo === 'ticket' ? 'Pedir la factura completa' : 'Pedir la documentación', variante: 'secondary', entrada: { tipo: 'texto', texto: d.tipo === 'ticket' ? `Pide a ${d.proveedor} la factura completa` : `Pide a ${d.proveedor} la documentación que falta` }, rol: ROLES.revisionHumana })
  }
  return {
    explicacion: t('Sus líneas dicen {lineas}: encaja en {pa}, pero también podría ir a {pb}.', { lineas: v(enLista(d.lineas.map((l) => `«${l}»`))), pa: v(pa), pb: v(pb) }),
    bloques: [
      bloqueDocumento(m, d.id, { conciliacion: false }),
      {
        tipo: 'aprobacion',
        id: `ap-${d.id}`,
        ref: { tipo: 'documento', id: d.id },
        agente: 'facturas',
        nivel: 'propone',
        rol: ROLES.revisionHumana,
        titulo: t('¿En qué partida va el gasto de {prov}?', { prov: v(d.proveedor) }),
        resumen:
          a.exceso > 0 && b.exceso === 0
            ? t('{pa} ya no tiene nada por gastar: ahí el coste estimado final sube {exc}. En {pb} cabe en lo previsto.', { pa: v(pa), exc: v(a.exceso, 'eurCents'), pb: v(pb) })
            : t('Elige la partida; el coste se recalcula al confirmar.'),
        // Filas cortas: en móvil la etiqueta comparte ancho con dos cifras.
        impactoTitulo: 'Coste estimado final si va a…',
        impacto: [
          { etiqueta: pa, antes: a.partida.antes.cef, despues: a.partida.despues.cef, formato: 'eurCents' },
          { etiqueta: pb, antes: b.partida.antes.cef, despues: b.partida.despues.cef, formato: 'eurCents' },
        ],
        acciones,
        nota: d.tipo === 'ticket' ? 'Es un ticket simplificado: para el dossier fiscal hace falta una factura a nombre de la productora.' : undefined,
      },
    ],
  }
}

// ── Pedir documentación ──────────────────────────────────────────────────────

function borradorPara(m, d) {
  const firma = `${PERSONAS.alvaro.nombre} · ${PERSONAS.alvaro.rol} · ${m.proyecto.titulo}`
  const base = { id: `BOR-${d.id}`, canal: 'email', ref: d.id, para: `${d.proveedor} · administración`, firma }
  if (d.tipo === 'ticket') {
    return {
      ...base,
      motivo: t('Ticket simplificado sin los datos fiscales de la productora'),
      asunto: t('Factura completa del ticket del {f} ({total})', { f: v(fecha(d.fecha)), total: v(d.total, 'eurCents') }),
      cuerpo: [
        t('Hola:'),
        t('El {f} compramos material en vuestra tienda por {total} y nos disteis un ticket simplificado.', { f: v(fecha(d.fecha)), total: v(d.total, 'eurCents') }),
        t('Para nuestra contabilidad necesitamos una factura completa a nombre de {prod}, con NIF [NIF de la productora] y dirección fiscal.', { prod: v(m.proyecto.productora) }),
        t('¿Podéis enviárnosla respondiendo a este correo? Gracias.'),
      ],
    }
  }
  if (d.impuesto?.tipo === 'IGIC') {
    return {
      ...base,
      motivo: t('Gasto en Canarias pendiente de validación territorial'),
      asunto: t('Factura {id}: detalle de las estancias', { id: v(d.id, 'id') }),
      cuerpo: [
        t('Hola:'),
        t('Sobre la factura {id} ({concepto}, {total}):', { id: v(d.id, 'id'), concepto: v(d.concepto), total: v(d.total, 'eurCents') }),
        t('para justificar el gasto en Canarias necesitamos el detalle de las estancias: fechas de entrada y salida y nombre de los huéspedes de cada habitación.'),
        t('¿Nos lo podéis enviar? Gracias.'),
      ],
    }
  }
  return {
    ...base,
    motivo: t('Factura sin pedido asociado'),
    asunto: t('Factura {id}: referencia del encargo', { id: v(d.id, 'id') }),
    cuerpo: [
      t('Hola:'),
      t('Hemos recibido la factura {id} ({concepto}, {base} sin IVA).', { id: v(d.id, 'id'), concepto: v(d.concepto), base: v(d.base, 'eurCents') }),
      t('Para imputarla necesitamos la referencia del contrato o del encargo al que corresponde.'),
      t('¿Nos la indicáis? Gracias.'),
    ],
  }
}

/** Le falta documentación: ticket simplificado, IGIC por validar o factura sin pedido ni contrato. */
export function faltaDocumentacion(d) {
  return d.estado !== 'por_llegar' && (d.tipo === 'ticket' || d.impuesto?.tipo === 'IGIC' || (!d.oc && !d.contrato) || (!d.oc && d.estado === 'en_bandeja'))
}

function documentoParaPedir(m, det) {
  let id = det.entidades?.documento
  // Un proveedor con varios documentos: el que tiene algo pendiente.
  if (!id && det.entidades?.proveedor) id = Object.values(m.documentos).find((d) => d.proveedor === det.entidades.proveedor && faltaDocumentacion(d))?.id
  if (id && m.documentos[id] && m.documentos[id].estado !== 'por_llegar') return id
  return null
}

export const pedirDocumentacion = {
  id: 'pedir_documentacion',
  titulo: 'Pedir documentación',
  ejemplos: ['Pide a Ferretería El Tornillo la factura completa', 'Pide a Hotel Cristina la documentación que falta', 'redacta un correo a Gestoría Pérez', 'escribe al proveedor de la factura F-2026-072', 'envía el correo al hotel Cristina'],

  planificar(m, det) {
    const id = documentoParaPedir(m, det)
    if (!id) return [paso('cumplimiento', t('Busca qué documentación falta'), { tipo: 'revision', salida: t('Varios proveedores con algo pendiente') })]
    const d = m.documentos[id]
    if (!faltaDocumentacion(d)) return [paso('cumplimiento', t('Revisa la documentación de {id}', { id: v(id, 'id') }), { tipo: 'revision', salida: t('No le falta nada') })]
    const borrador = borradorPara(m, d)
    return [
      paso('cumplimiento', t('Identifica qué falta en {id}', { id: v(id, 'id') }), { tipo: 'revision', salida: borrador.motivo }),
      paso('orquestador', t('Redacta el borrador para {prov}', { prov: v(d.proveedor) }), {
        tipo: 'redaccion',
        autonomia: 'propone',
        acciones: [{ tipo: 'borrador/crear', borrador }],
        salida: t('Borrador listo; no se envía'),
      }),
    ]
  },

  componer({ despues: m, det }) {
    const id = documentoParaPedir(m, det)
    if (!id) {
      const candidatos = Object.values(m.documentos).filter(faltaDocumentacion)
      return {
        bloques: [
          texto(t('¿A qué proveedor escribimos? Estos tienen documentación pendiente.')),
          { tipo: 'lista', titulo: 'Proveedores con documentación pendiente', items: candidatos.slice(0, 4).map((d) => ({ texto: t('{prov} · {id}', { prov: v(d.proveedor), id: v(d.id, 'id') }), entrada: `Pide a ${d.proveedor} la documentación que falta` })) },
        ],
        sugerencias: candidatos.slice(0, 3).map((d) => sug(`Pide a ${d.proveedor} la documentación que falta`)),
        fuentes: ['Bandeja de documentos'],
        reglas: [],
        noHecho: [t('No ha redactado nada todavía.')],
      }
    }
    const d = m.documentos[id]
    if (!faltaDocumentacion(d)) {
      return {
        bloques: [texto(d.oc ? t('A {id} de {prov} no le falta documentación: cuadra con el pedido {oc}. No preparamos ningún correo.', { id: v(id, 'id'), prov: v(d.proveedor), oc: v(d.oc, 'id') }) : t('A {id} de {prov} no le falta documentación: el proveedor tiene contrato marco. No preparamos ningún correo.', { id: v(id, 'id'), prov: v(d.proveedor) }))],
        sugerencias: [sug('¿Qué bloquea el dossier fiscal?')],
        fuentes: ['Bandeja de documentos', 'Órdenes de compra'],
        reglas: [],
        noHecho: [t('No ha redactado ningún correo.')],
      }
    }
    const bloques = [aviso('exploratorio', 'En exploración', t('En exploración: pedir documentación a proveedores aún no está en Filmpilot. Redactamos el correo; lo envías tú.'))]
    if (det.entidades?.quiereEnviar) bloques.push(texto(t('No enviamos correos: te dejamos el borrador para que lo revises, lo copies y lo envíes tú desde tu correo.')))
    else bloques.push(texto(t('Borrador para {prov}. Revísalo antes de enviarlo: los campos entre corchetes los tienes que completar.', { prov: v(d.proveedor) })))
    bloques.push({ tipo: 'borrador', id: `BOR-${id}` })
    return {
      bloques,
      sugerencias: [sug('¿Qué bloquea el dossier fiscal?'), sug('¿Qué gastos tengo que revisar?')],
      fuentes: ['Bandeja de documentos', 'Criterios de elegibilidad'],
      reglas: [t('Las comunicaciones externas siempre las confirma una persona')],
      noHecho: [t('No ha enviado ningún correo.')],
    }
  },
}
