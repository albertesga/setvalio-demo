// Guiones de documentos: factura entrante, gasto dudoso y petición de documentación.

import { reducir } from '../acciones.js'
import { PERSONAS } from '../mundo.js'
import { confianzaBaja, ROLES } from '../politicas.js'
import { cuenta, fecha } from '../texto.js'
import { t, v, c, POLITICAS, paso, sug, texto, aviso, kpisPartida, bloqueDocumento } from './comun.js'

const enBandeja = (m) => Object.values(m.documentos).filter((d) => d.estado === 'en_bandeja')
const casable = (m, d) => !confianzaBaja(d) && d.impuesto?.tipo !== 'IGIC' && c.conciliar(m, d.id).resultado === 'ok'

function confianzaMinima(d) {
  return d.confianza ? Math.min(...Object.values(d.confianza)) : null
}

/** Elige el documento del que habla la petición. */
export function documentoObjetivo(m, det) {
  if (det.eventoId === 'EV-01') return 'F-2026-078'
  const id = det.entidades?.documento
  if (id && m.documentos[id]) return id
  const candidato = enBandeja(m).find((d) => casable(m, d))
  if (candidato) return candidato.id
  if (m.documentos['F-2026-078'].estado === 'por_llegar') return 'F-2026-078'
  return null
}

// ── Factura entrante ─────────────────────────────────────────────────────────

export const facturaNueva = {
  id: 'factura_nueva',
  titulo: 'Factura entrante',
  ejemplos: ['¿Han llegado facturas nuevas?', 'Ha llegado una factura de Grúas y Cámaras del Sur', 'procesa la F-2026-078', 'nueva factura en el buzón', 'Procesa la factura F-2026-069'],

  planificar(m, det) {
    const id = documentoObjetivo(m, det)
    if (!id) return [paso('facturas', t('Revisa la bandeja de entrada'), { tipo: 'lectura', salida: t('No hay documentos nuevos') })]
    const d0 = m.documentos[id]

    if (d0.estado === 'por_llegar' && det.eventoId !== 'EV-01') {
      return [paso('facturas', t('Revisa la bandeja de entrada'), { tipo: 'lectura', salida: t('Nada nuevo desde el último corte') })]
    }
    if (d0.estado === 'contabilizada') {
      return [paso('facturas', t('Busca {id}', { id: v(id, 'id') }), { tipo: 'lectura', salida: t('Ya estaba contabilizada') })]
    }

    const pasos = []
    let m1 = m
    if (d0.estado === 'por_llegar') {
      const recibir = { tipo: 'evento/recibir', eventoId: 'EV-01' }
      m1 = reducir(m, recibir)
      pasos.push(
        paso('facturas', t('Recibe {id} de {prov} y la lee con OCR', { id: v(id, 'id'), prov: v(d0.proveedor) }), {
          tipo: 'ocr',
          acciones: [recibir],
          salida: t('Proveedor {a}, importe {b}, partida {c}', { a: v(d0.confianza.proveedor, 'pct0'), b: v(d0.confianza.importe, 'pct0'), c: v(d0.confianza.partida, 'pct0') }),
        }),
      )
    } else {
      pasos.push(
        paso('facturas', d0.origen === 'Factura-e XML' ? t('Lee la factura electrónica {id}', { id: v(id, 'id') }) : t('Lee {id} con OCR', { id: v(id, 'id') }), {
          tipo: d0.origen === 'Factura-e XML' ? 'lectura' : 'ocr',
          salida: t('{prov} · {total} · partida {p}', { prov: v(d0.proveedor), total: v(d0.total, 'eurCents'), p: v(d0.partida, 'id') }),
        }),
      )
    }

    const conc = c.conciliar(m1, id)
    if (conc.resultado === 'ok') {
      pasos.push(
        paso('conciliacion', t('Cuadra {id} con el pedido {oc}', { id: v(id, 'id'), oc: v(conc.oc, 'id') }), {
          tipo: 'conciliacion',
          acciones: [{ tipo: 'documento/contabilizar', docId: id, por: 'Conciliación' }],
          salida: t('Importe igual al pedido: contabilizada'),
        }),
      )
      pasos.push(
        paso('cumplimiento', t('Comprueba si el gasto es elegible'), {
          tipo: 'revision',
          autonomia: 'propone',
          paralelo: true,
          salida: (_, d) => {
            const el = c.elegibilidad(d, id)
            return el.estado === 'elegible' ? t('Elegible') : t('Elegible cuando se pague: falta el justificante de pago')
          },
        }),
      )
    } else {
      pasos.push(
        paso('conciliacion', t('Busca el pedido de {id}', { id: v(id, 'id') }), {
          tipo: 'conciliacion',
          salida: d0.contrato ? t('Sin pedido; el proveedor tiene contrato marco') : t('Sin pedido ni contrato'),
        }),
      )
      pasos.push(paso('excepciones', t('Lo lleva a quien puede contabilizarla'), { tipo: 'revision', autonomia: 'aprueba', salida: t('Decide: {rol}', { rol: v(ROLES.lineProducer) }) }))
    }
    return pasos
  },

  componer({ antes, despues, det }) {
    const id = documentoObjetivo(antes, det)
    if (!id || (antes.documentos[id].estado === 'por_llegar' && det.eventoId !== 'EV-01')) {
      const pend = enBandeja(despues)
      const bloques = [texto(t('No ha llegado ninguna factura nueva desde el último corte. En la bandeja quedan {n} que necesitan una decisión.', { n: cuenta(pend.length, 'documento', 'documentos') })), { tipo: 'decisiones' }]
      if (despues.entrantes.includes('EV-01')) {
        bloques.push({ tipo: 'acciones', texto: t('En la demo puedes simular que entra una factura ahora.'), acciones: [{ id: 'simular', etiqueta: 'Simular llegada de una factura', entrada: { tipo: 'evento', eventoId: 'EV-01' } }] })
      }
      return { bloques, sugerencias: [sug('¿Qué gastos tengo que revisar?'), sug('Prepárame el informe semanal de coste')], fuentes: ['Bandeja de documentos'], reglas: [], noHecho: [t('No ha contabilizado nada.')] }
    }

    const d = despues.documentos[id]
    if (antes.documentos[id].estado === 'contabilizada') {
      return {
        bloques: [texto(t('{id} de {prov} ya estaba contabilizada en {p}.', { id: v(id, 'id'), prov: v(d.proveedor), p: v(d.partida, 'id') })), bloqueDocumento(despues, id, { elegibilidad: true })],
        sugerencias: [sug('¿Han llegado facturas nuevas?'), sug('¿Qué gastos tengo que revisar?')],
        fuentes: ['Bandeja de documentos'],
        reglas: [],
        noHecho: [t('No ha cambiado nada.')],
      }
    }

    if (d.estado === 'contabilizada') {
      const pa = antes.partidas[d.partida]
      const pd = despues.partidas[d.partida]
      const cambiaCef = Math.abs(pa.cef - pd.cef) > 0.004
      return {
        bloques: [
          texto(
            cambiaCef
              ? t('Contabilizada en {p} y casada con {oc}. Parte del importe no estaba previsto y sube el coste estimado final {dif}.', { p: v(d.partida, 'id'), oc: v(d.oc, 'id'), dif: v(pd.cef - pa.cef, 'eurSigned') })
              : t('Contabilizada en {p} y casada con {oc}. No cambia la previsión: ese gasto ya estaba comprometido.', { p: v(d.partida, 'id'), oc: v(d.oc, 'id') }),
          ),
          bloqueDocumento(despues, id, { elegibilidad: true }),
          kpisPartida(antes, despues, d.partida),
        ],
        sugerencias: [sug('¿Qué gastos tengo que revisar?'), sug('¿Qué bloquea el dossier fiscal?'), sug('Prepárame el informe semanal de coste')],
        fuentes: ['Bandeja de documentos', 'Órdenes de compra', 'Presupuesto por partidas'],
        reglas: [
          t('Se contabiliza sola si la confianza de cada campo es de al menos {u} y casa con un pedido aprobado', { u: v(POLITICAS.umbralConfianza, 'pct0') }),
          t('Tolerancia de conciliación: {tol}', { tol: v(POLITICAS.toleranciaConciliacion, 'pct0') }),
        ],
        noHecho: [t('No ha pagado la factura.'), t('No ha cambiado el pedido ni el presupuesto.')],
      }
    }

    // Sin pedido: decisión del line producer.
    const imp = c.impactoNuevoCoste(despues, d.partida, d.base, 'gastado')
    return {
      bloques: [
        texto(
          t('{id} de {prov} ({base} sin IVA) no tiene pedido. {contrato} Contabilizarla sin pedido lo decide {rol}.', {
            id: v(id, 'id'),
            prov: v(d.proveedor),
            base: v(d.base, 'eurCents'),
            contrato: v(d.contrato ? 'El proveedor tiene contrato marco, así que el gasto está respaldado.' : 'Tampoco hay contrato con el proveedor.'),
            rol: v(ROLES.lineProducer),
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
              ? t('Sube el coste estimado final de {p} en {exc}.', { p: v(d.partida, 'id'), exc: v(imp.exceso, 'eur') })
              : t('Cabe en lo previsto para {p}: el coste estimado final no cambia.', { p: v(d.partida, 'id') }),
          impacto: [{ etiqueta: `Partida ${d.partida} · gastado`, antes: imp.partida.antes.gastado, despues: imp.partida.despues.gastado, formato: 'eur' }],
          acciones: [
            { id: 'aprobar', etiqueta: 'Contabilizar', variante: 'primary', accion: { tipo: 'documento/contabilizar', docId: id }, rol: ROLES.lineProducer },
            { id: 'aplazar', etiqueta: 'Dejar en la bandeja', variante: 'secondary', accion: { tipo: 'documento/aplazar', docId: id }, rol: ROLES.lineProducer },
          ],
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
  titulo: 'Gasto dudoso',
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
        salida: t('{a} o {b}', { a: v(c.etiquetaPartida(m, d.partida)), b: v(c.etiquetaPartida(m, d.alternativa)) }),
      }),
      paso('excepciones', t('Te lo trae para decidir'), { tipo: 'revision', autonomia: 'aprueba', salida: t('No se contabiliza sin tu confirmación') }),
    ]
  },

  componer({ despues: m }) {
    const dudosos = enBandeja(m).filter((d) => confianzaBaja(d))
    if (!dudosos.length) {
      return {
        bloques: [texto(t('No queda ningún gasto con confianza baja. Estas son las decisiones abiertas:')), { tipo: 'decisiones' }],
        sugerencias: [sug('¿Han llegado facturas nuevas?'), sug('Prepárame el informe semanal de coste')],
        fuentes: ['Bandeja de documentos'],
        reglas: [],
        noHecho: [t('No ha contabilizado nada.')],
      }
    }
    const d = dudosos[0]
    const a = c.impactoNuevoCoste(m, d.partida, d.base, 'gastado')
    const b = c.impactoNuevoCoste(m, d.alternativa, d.base, 'gastado')
    const bloques = [
      texto(
        t('No estoy seguro de la partida ({conf}). Las líneas hablan de «{lineas}»: encaja en {pa}, pero también podría ir a {pb}.', {
          conf: v(confianzaMinima(d), 'pct0'),
          lineas: v(d.lineas.join('», «')),
          pa: v(c.etiquetaPartida(m, d.partida)),
          pb: v(c.etiquetaPartida(m, d.alternativa)),
        }),
      ),
      bloqueDocumento(m, d.id, { conciliacion: false }),
      {
        tipo: 'aprobacion',
        id: `ap-${d.id}`,
        ref: { tipo: 'documento', id: d.id },
        agente: 'excepciones',
        nivel: 'aprueba',
        rol: ROLES.revisionHumana,
        titulo: t('¿En qué partida va el gasto de {prov}?', { prov: v(d.proveedor) }),
        resumen:
          a.exceso > 0 && b.exceso === 0
            ? t('{pa} ya no tiene pendiente: ahí sube el coste estimado final {exc}. En {pb} cabe en lo previsto.', { pa: v(d.partida, 'id'), exc: v(a.exceso, 'eurCents'), pb: v(d.alternativa, 'id') })
            : t('Elige la partida; el coste se recalcula al confirmar.'),
        impactoTitulo: 'Según la partida',
        impacto: [
          { etiqueta: `Si va a ${d.partida} · coste estimado final`, antes: a.partida.antes.cef, despues: a.partida.despues.cef, formato: 'eurCents' },
          { etiqueta: `Si va a ${d.alternativa} · coste estimado final`, antes: b.partida.antes.cef, despues: b.partida.despues.cef, formato: 'eurCents' },
        ],
        acciones: [
          { id: 'confirmar', etiqueta: `Confirmar ${d.partida}`, variante: 'primary', accion: { tipo: 'documento/contabilizar', docId: d.id, partida: d.partida }, rol: ROLES.revisionHumana },
          { id: 'alternativa', etiqueta: `Usar ${d.alternativa}`, variante: 'secondary', accion: { tipo: 'documento/contabilizar', docId: d.id, partida: d.alternativa }, rol: ROLES.revisionHumana },
          { id: 'aplazar', etiqueta: 'Dejar en revisión', variante: 'secondary', accion: { tipo: 'documento/aplazar', docId: d.id }, rol: ROLES.revisionHumana },
        ],
      },
    ]
    if (d.tipo === 'ticket') bloques.push(aviso('info', 'Falta la factura completa', t('Es un ticket simplificado: para el dossier fiscal hace falta una factura a nombre de la productora.')))
    return {
      bloques,
      sugerencias: [sug(`Pide a ${d.proveedor} la factura completa`), sug('¿Han llegado facturas nuevas?'), sug('¿Qué bloquea el dossier fiscal?')],
      fuentes: ['Bandeja de documentos', 'Presupuesto por partidas'],
      reglas: [t('Por debajo del {u} de confianza, el agente propone y una persona confirma', { u: v(POLITICAS.umbralConfianza, 'pct0') })],
      noHecho: [t('No ha contabilizado el gasto.'), t('No ha pedido nada al proveedor.')],
    }
  },
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

function documentoParaPedir(m, det) {
  const id = det.entidades?.documento
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
      const candidatos = enBandeja(m).filter((d) => d.tipo === 'ticket' || !d.oc || d.impuesto?.tipo === 'IGIC')
      return {
        bloques: [texto(t('¿A qué proveedor escribo? Estos tienen documentación pendiente:'))],
        sugerencias: candidatos.slice(0, 3).map((d) => sug(`Pide a ${d.proveedor} la documentación que falta`)),
        fuentes: ['Bandeja de documentos'],
        reglas: [],
        noHecho: [t('No ha redactado nada todavía.')],
      }
    }
    const d = m.documentos[id]
    const bloques = []
    if (det.entidades?.quiereEnviar) bloques.push(texto(t('No envío correos: te dejo el borrador para que lo revises y lo envíes tú desde tu correo.')))
    else bloques.push(texto(t('Borrador para {prov}. Revísalo antes de enviarlo: los campos entre corchetes los tienes que completar.', { prov: v(d.proveedor) })))
    bloques.push({ tipo: 'borrador', id: `BOR-${id}` })
    return {
      bloques,
      sugerencias: [sug('¿Qué bloquea el dossier fiscal?'), sug('¿Qué gastos tengo que revisar?')],
      fuentes: ['Bandeja de documentos', 'Criterios de elegibilidad'],
      reglas: [t('Las comunicaciones externas siempre las confirma una persona')],
      noHecho: [t('No ha enviado ningún correo.'), t('No ha usado direcciones de correo: el destinatario va por su rol.')],
    }
  },
}
