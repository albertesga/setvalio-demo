// Guiones del agente de riesgos de producción (EXPLORATORIO): parte de riesgos,
// detalle de un riesgo y avisos que llegan solos (orden del día, lluvia).

import { cuenta, fecha as fechaLarga, formatear } from '../texto.js'
import { evaluarRiesgos, riesgo as riesgoDe, jornada, jornadaOriginal, riesgoDeJornada, UMBRALES, TIPOS, PREGUNTA, HECHAS } from '../rodaje.js'
import { PERSONAS } from '../mundo.js'
import { t, v, c, paso, sug, texto, aviso, lista } from './comun.js'

export const AVISO_EXPLORATORIO = aviso(
  'exploratorio',
  'Exploratorio',
  t('El agente de riesgos es una idea en estudio: aún no está en el producto. Plan de rodaje, previsión del tiempo, convocatorias y permisos son datos de ejemplo: no consulta ningún servicio externo.'),
)

const NO_HECHO = [t('No ha enviado ningún aviso: los mensajes al equipo quedan como borradores.'), t('No ha cambiado el plan de rodaje ni la previsión sin tu decisión.')]

const REGLAS = [
  t('Riesgo alto: probabilidad de al menos {p} en los próximos {d}, o un aviso urgente', { p: v(UMBRALES.probabilidad, 'pct0'), d: v(UMBRALES.diasAlta, 'dias') }),
  t('Riesgo medio: exposición de {e} o más, o una jornada en los próximos {d}', { e: v(UMBRALES.exposicion, 'eur'), d: v(UMBRALES.diasUrgente, 'dias') }),
  t('Coste de una jornada: pagos previstos de su semana entre cinco jornadas'),
]

const FIRMA = () => `${PERSONAS.alvaro.nombre} · ${PERSONAS.alvaro.rol} · La última función`

/** Borrador del aviso de cada riesgo de comunicación. */
export function borradorRiesgo(m, id) {
  const r = riesgoDe(m, id)
  const s = m.rodaje.senales
  const base = { id: `BOR-${id}`, ref: id, firma: FIRMA() }
  if (id === 'RG-2') {
    return {
      ...base,
      canal: 'mensaje interno',
      para: 'Coordinación de producción · viajes',
      asunto: t('Billete de la actriz secundaria · jornadas {a} y {b}', { a: v(s.billete.jornadas[0], 'num'), b: v(s.billete.jornadas[1], 'num') }),
      cuerpo: [
        t('Hola:'),
        t('La actriz secundaria está convocada en Canarias las jornadas {a} y {b} ({f}) y su billete sigue sin emitir.', { a: v(s.billete.jornadas[0], 'num'), b: v(s.billete.jornadas[1], 'num'), f: v(fechaLarga(r.fecha)) }),
        t('¿Puedes emitirlo hoy y confirmarme el vuelo? Si hay algún problema de fechas, avísame cuanto antes.'),
      ],
    }
  }
  if (id === 'RG-3') {
    return {
      ...base,
      canal: 'email',
      para: `${s.permiso.organismo} · oficina de rodajes`,
      asunto: t('Permiso de rodaje en vía pública · {f}', { f: v(fechaLarga(r.fecha)) }),
      cuerpo: [
        t('Buenos días:'),
        t('El {s} solicitamos permiso para rodar en vía pública el {f} para el largometraje «La última función» (Candilejas Films).', { s: v(fechaLarga(s.permiso.solicitado)), f: v(fechaLarga(r.fecha)) }),
        t('¿Nos pueden indicar en qué estado está la solicitud y si falta algún documento?'),
        t('Gracias.'),
      ],
    }
  }
  if (id === 'RG-4') {
    return {
      ...base,
      canal: 'mensaje interno',
      para: 'Ayudantía de dirección',
      asunto: t('Orden del día de la jornada {n}', { n: v(s.citacion.jornada, 'num') }),
      cuerpo: [t('Hola:'), t('La orden del día de mañana (jornada {n}) aún no está publicada y el equipo no sabe su citación.', { n: v(s.citacion.jornada, 'num') }), t('¿Puedes publicarla o decirme a qué hora sale?')],
    }
  }
  if (id === 'RG-6') {
    return {
      ...base,
      canal: 'email',
      para: `${s.cambio.sinAvisar} · coordinación`,
      asunto: t('Cambio de localización · jornada {n} ({f})', { n: v(s.cambio.jornada, 'num'), f: v(fechaLarga(r.fecha)) }),
      cuerpo: [
        t('Hola:'),
        t('La jornada del {f} se rueda en {a} y no en {de}.', { f: v(fechaLarga(r.fecha)), a: v(s.cambio.a), de: v(s.cambio.de) }),
        t('Por favor, actualizad la hoja de ruta de los camiones y confirmadnos la hora de llegada.'),
      ],
    }
  }
  return null
}

/** Tarjeta de decisión de un riesgo con impacto económico (RG-1 lluvia, RG-5 horas extra).
 *  Las acciones dependen del estado: tras asumirlo solo queda cambiar el plan; con una
 *  reserva aprobada se puede ajustar, cambiar el plan o asumirlo (y liberarla). */
export function tarjetaRiesgo(m, id) {
  const r = riesgoDe(m, id)
  const d = m.decisionesRiesgo[id]
  const lluvia = id === 'RG-1'
  const cef = c.totales(m).cef
  const reservada = m.reservas[id]?.importe ?? 0
  const base = cef - reservada
  const soloCambiarPlan = d?.estado === 'aceptado'
  const ji = lluvia ? jornadaOriginal(r.intercambio) : null
  const etiquetaPlan = lluvia ? `Cambiar el orden con la jornada ${r.intercambio}` : 'Replanificar las noches'
  const acciones = [{ id: 'aprobar', etiqueta: etiquetaPlan, variante: 'primary', accion: { tipo: 'riesgo/mitigar', riesgoId: id, opcion: lluvia ? 'permutar' : 'replanificar' }, rol: 'Line producer' }]
  if (!soloCambiarPlan && r.reserva && (!d || r.reservaCorta)) acciones.push({ id: 'reservar', etiqueta: reservada ? 'Ajustar la reserva' : 'Reservar en la previsión', variante: 'secondary', accion: { tipo: 'riesgo/reservar', riesgoId: id, importe: r.reserva }, rol: 'Producción ejecutiva' })
  if (!soloCambiarPlan) acciones.push({ id: 'rechazar', etiqueta: reservada ? 'Asumirlo y liberar la reserva' : 'Asumir el riesgo', variante: 'secondary', accion: { tipo: 'riesgo/aceptar', riesgoId: id }, rol: 'Producción ejecutiva' })
  const impacto = [{ etiqueta: lluvia ? 'Cambiar el orden de jornadas' : 'Replanificar las noches', antes: cef, despues: lluvia ? base : cef, formato: 'eur' }]
  if (acciones.some((a) => a.id === 'reservar')) {
    impacto.push({ etiqueta: lluvia ? `Reservar el impacto esperado (${formatear(r.probabilidad, 'pct0')} de ${formatear(r.exposicion, 'eur')})` : 'Reservar el coste si se repiten', antes: cef, despues: base + r.reserva, formato: 'eur' })
  }
  // Asumir parece gratis en la tabla: la etiqueta dice lo que se arriesga.
  const siOcurre = lluvia ? `si llueve, hasta ${formatear(r.exposicion, 'eur')} más` : `si se repiten, unos ${formatear(r.exposicion, 'eur')} más`
  if (!soloCambiarPlan) impacto.push({ etiqueta: `${reservada ? 'Asumir el riesgo y liberar la reserva' : 'Asumir el riesgo sin reservar'} (${siOcurre})`, antes: cef, despues: base, formato: 'eur' })
  return {
    tipo: 'aprobacion',
    id: `ap-${id}-${d?.estado ?? 'abierto'}-${r.reserva ?? 0}`,
    ref: soloCambiarPlan ? { tipo: 'riesgo', id, soloCambiarPlan: true } : { tipo: 'riesgo', id, reserva: r.reserva ?? undefined },
    agente: 'riesgos',
    nivel: 'aprueba',
    rol: 'Line producer',
    nota: soloCambiarPlan ? 'Se decidió asumir el riesgo; cambiar el plan sigue siendo posible.' : 'Cambiar el plan lo decide line producer; reservar o asumir el riesgo, producción ejecutiva.',
    entradaActual: PREGUNTA[id],
    titulo: r.titulo,
    resumen: lluvia
      ? t('Previsión de ejemplo: {p} de lluvia el {f}, y la jornada {n} es un exterior de día sin cobertura. Perder la jornada costaría unos {exp}. La jornada {otra} es un interior con el decorado montado: cambiarlas de orden no cuesta nada en la previsión, pero confirma con dirección, reparto y transporte.', {
          p: v(r.probabilidad, 'pct0'),
          f: v(fechaLarga(r.fecha)),
          n: v(r.jornadas[0], 'num'),
          exp: v(r.exposicion, 'eur'),
          otra: v(ji.n, 'num'),
        })
      : t('Las noches anteriores generaron horas extra y quedan dos más. Si se repiten, el coste estimado final subiría unos {exp}. Una citación más tardía reduce las horas extra, aunque no las elimina.', { exp: v(r.exposicion, 'eur') }),
    impactoTitulo: 'Opción',
    impactoColumnas: ['Coste estimado final ahora', 'Con esta opción'],
    impacto,
    recomendacion: soloCambiarPlan ? null : lluvia ? t('Recomiendo cambiar el orden: elimina el riesgo sin coste en la previsión.') : t('Recomiendo replanificar: reduce las horas extra sin tocar la previsión.'),
    acciones,
  }
}

function etiquetaJornadas(r) {
  return r.jornadas.length > 1 ? v(`jornadas ${r.jornadas.join(' y ')}`) : v(`jornada ${r.jornadas[0]}`)
}

/** Qué pregunta la persona: un riesgo, una jornada sin riesgo o el parte entero. */
function riesgoPedido(m, det) {
  const n = det.entidades?.jornada
  const id = det.entidades?.riesgo
  if (n != null) {
    const r = id ? riesgoDe(m, id) : riesgoDeJornada(m, n)
    if (r && r.jornadas.includes(n)) return { id: r.id }
    return { jornada: n }
  }
  if (id) return { id }
  return null
}

export const riesgos = {
  id: 'riesgos',
  titulo: (det) =>
    det.eventoId === 'EV-CITACION' ? 'Aviso urgente · orden del día' : det.eventoId === 'EV-LLUVIA' ? 'Aviso · previsión de lluvia' : det.entidades?.jornada != null && !det.entidades?.riesgo ? 'Jornada de rodaje' : det.entidades?.riesgo ? 'Riesgo de rodaje' : 'Parte de riesgos de rodaje',
  ejemplos: ['¿Qué riesgos hay para las próximas jornadas?', PREGUNTA['RG-1'], PREGUNTA['RG-5'], PREGUNTA['RG-4']],

  planificar(m, det) {
    // Alertas que llegan solas.
    if (det.eventoId === 'EV-CITACION') {
      return [
        paso('riesgos', t('Comprueba la orden del día de mañana'), { tipo: 'lectura', acciones: [{ tipo: 'evento/recibir', eventoId: 'EV-CITACION' }], salida: t('Sigue sin publicar') }),
        paso('riesgos', t('Prepara un recordatorio para ayudantía de dirección'), { tipo: 'redaccion', autonomia: 'propone', acciones: [{ tipo: 'borrador/crear', borrador: borradorRiesgo(m, 'RG-4') }], salida: t('Borrador listo; no se envía') }),
      ]
    }
    if (det.eventoId === 'EV-LLUVIA') {
      return [
        paso('riesgos', t('Recibe la previsión actualizada'), { tipo: 'lectura', acciones: [{ tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' }], salida: (_, d) => { const f = jornadaOriginal(d.rodaje.senales.lluvia.jornada).fecha; return t('Lluvia el {f}: {p}', { f: v(fechaLarga(f)), p: v(d.rodaje.meteo[f], 'pct0') }) } }),
        paso('prevision', t('Recalcula el impacto esperado'), { salida: (_, d) => (d.decisionesRiesgo['RG-1']?.estado === 'mitigado' ? t('Sin impacto: la jornada ya es interior') : t('Impacto esperado {i}', { i: v(riesgoDe(d, 'RG-1').reserva, 'eur') })) }),
      ]
    }

    const pedido = riesgoPedido(m, det)
    const recibirParte = m.entrantes.includes('EV-RIESGOS') ? [{ tipo: 'evento/recibir', eventoId: 'EV-RIESGOS' }] : []
    if (pedido?.jornada != null) {
      return [paso('riesgos', t('Revisa la jornada {n} en el plan', { n: v(pedido.jornada, 'num') }), { tipo: 'lectura', acciones: recibirParte, salida: jornada(m, pedido.jornada) ? t('Sin riesgos abiertos en esa jornada') : HECHAS.some((h) => h.n === pedido.jornada) ? t('Ya rodada') : t('Fuera del plan que vigila') })]
    }
    const id = pedido?.id
    if (id) {
      const r = riesgoDe(m, id)
      const pasos = [
        paso('riesgos', t('Revisa las señales: {tipo}, {j}', { tipo: v(r.tipo.toLowerCase()), j: etiquetaJornadas(r) }), { tipo: 'lectura', acciones: recibirParte, salida: t('{n} revisadas', { n: cuenta(r.senales.length, 'señal', 'señales') }) }),
      ]
      if (r.exposicion) pasos.push(paso('prevision', t('Calcula el impacto económico posible'), { salida: t('Exposición {e}', { e: v(r.exposicion, 'eur') }) }))
      if (r.aviso && (!m.borradores[r.aviso] || m.borradores[r.aviso].estado === 'descartado')) {
        pasos.push(paso('riesgos', t('Redacta el aviso para quien puede resolverlo'), { tipo: 'redaccion', autonomia: 'propone', acciones: [{ tipo: 'borrador/crear', borrador: borradorRiesgo(m, id) }], salida: t('Borrador listo; no se envía') }))
      } else if (r.decision || m.decisionesRiesgo[id]?.estado === 'aceptado' || m.decisionesRiesgo[id]?.estado === 'reservado') {
        pasos.push(paso('excepciones', t('Te trae las opciones para decidir'), { tipo: 'revision', autonomia: 'aprueba', salida: t('Cambio de plan, reserva o asumirlo') }))
      }
      return pasos
    }

    const evaluados = evaluarRiesgos(m)
    return [
      paso('riesgos', t('Lee el plan de las próximas jornadas'), { tipo: 'lectura', acciones: recibirParte, salida: t('De la jornada {a} a la {b}', { a: v(m.proyecto.diaActual, 'num'), b: v(m.proyecto.diasRodaje, 'num') }) }),
      paso('riesgos', t('Mira la previsión del tiempo para los exteriores'), {
        paralelo: true,
        salida: () => {
          const n = m.rodaje.jornadas.filter((j) => j.tipo === 'EXT' && (m.rodaje.meteo[j.fecha] ?? 0) >= 0.5).length
          return n ? t('{n} con lluvia probable', { n: cuenta(n, 'exterior', 'exteriores') }) : t('Ningún exterior con lluvia probable')
        },
      }),
      paso('riesgos', t('Revisa órdenes del día, convocatorias, permisos y avisos'), { tipo: 'revision', salida: t('{n} detectados', { n: cuenta(evaluados.length, 'riesgo', 'riesgos') }) }),
      paso('prevision', t('Calcula el impacto económico posible'), { salida: t('El riesgo con más exposición: {e}', { e: v(Math.max(...evaluados.map((r) => r.exposicion ?? 0)), 'eur') }) }),
      paso('excepciones', t('Asigna quién decide cada uno'), { tipo: 'revision', autonomia: 'aprueba', salida: t('Cambios de plan: line producer. Reservas: producción ejecutiva') }),
    ]
  },

  componer({ antes, despues: m, det }) {
    const fuentes = ['Plan de rodaje (ejemplo)', 'Previsión del tiempo (ejemplo)', 'Convocatorias, permisos y órdenes del día (ejemplo)', 'Previsión de caja y presupuesto']

    if (det.eventoId === 'EV-CITACION') {
      return {
        bloques: [AVISO_EXPLORATORIO, aviso('aviso', 'Urgente', t('La orden del día de mañana sigue sin publicar y ayudantía de dirección no ha confirmado a qué hora sale. Te dejo un recordatorio.')), { tipo: 'borrador', id: 'BOR-RG-4' }],
        sugerencias: [sug('¿Qué riesgos hay para las próximas jornadas?')],
        fuentes,
        reglas: REGLAS,
        noHecho: NO_HECHO,
      }
    }

    if (det.eventoId === 'EV-LLUVIA') {
      const r = riesgoDe(m, 'RG-1')
      const d = m.decisionesRiesgo['RG-1']
      const j0 = jornadaOriginal(m.rodaje.senales.lluvia.jornada)
      const p = v(m.rodaje.meteo[j0.fecha], 'pct0')
      const bloques = [AVISO_EXPLORATORIO]
      if (d?.estado === 'mitigado') {
        bloques.push(texto(t('La previsión de ejemplo para el {f} sube al {p} de lluvia, pero la jornada {n} ya es interior: no afecta al rodaje.', { f: v(fechaLarga(j0.fecha)), p, n: v(j0.n, 'num') })))
      } else if (d?.estado === 'reservado') {
        bloques.push(texto(t('La previsión de ejemplo sube al {p}. La reserva aprobada ({res}) se queda corta: el impacto esperado es ahora {nuevo}.', { p, res: v(d.importe, 'eur'), nuevo: v(r.reserva, 'eur') })))
        bloques.push(tarjetaRiesgo(m, 'RG-1'))
      } else if (d?.estado === 'aceptado') {
        bloques.push(texto(t('La previsión de ejemplo sube al {p}. Se decidió asumir el riesgo; todavía se puede cambiar el orden de jornadas.', { p })))
        bloques.push(tarjetaRiesgo(m, 'RG-1'))
      } else {
        bloques.push(texto(t('La previsión de ejemplo para el {f} sube al {p} de lluvia. El impacto esperado pasa a {nuevo}.', { f: v(fechaLarga(j0.fecha)), p, nuevo: v(r.reserva, 'eur') })))
        bloques.push(tarjetaRiesgo(m, 'RG-1'))
      }
      return { bloques, sugerencias: [sug('¿Qué riesgos hay para las próximas jornadas?')], fuentes, reglas: REGLAS, noHecho: NO_HECHO }
    }

    const pedido = riesgoPedido(antes, det)
    if (pedido?.jornada != null) {
      const j = jornada(m, pedido.jornada)
      const hecha = HECHAS.find((h) => h.n === pedido.jornada)
      const rango = { a: v(m.proyecto.diaActual, 'num'), b: v(m.proyecto.diasRodaje, 'num') }
      return {
        bloques: [
          AVISO_EXPLORATORIO,
          texto(
            j
              ? t('Jornada {n} ({f}): {loc}, {tipo} de {franja}. No veo riesgos abiertos en esa jornada.', { n: v(j.n, 'num'), f: v(fechaLarga(j.fecha)), loc: v(j.localizacion), tipo: v(j.tipo === 'EXT' ? 'exterior' : 'interior'), franja: v(j.franja.toLowerCase()) })
              : hecha
                ? t('La jornada {n} ya se rodó ({f}: {loc}, {tipo} de {franja}). Vigilo las que quedan, de la {a} a la {b}.', { n: v(hecha.n, 'num'), f: v(fechaLarga(hecha.fecha)), loc: v(hecha.localizacion), tipo: v(hecha.tipo === 'EXT' ? 'exterior' : 'interior'), franja: v(hecha.franja.toLowerCase()), ...rango })
                : t('La jornada {n} está fuera del plan que vigilo: de la {a} a la {b}.', { n: v(pedido.jornada, 'num'), ...rango }),
          ),
        ],
        sugerencias: [sug('¿Qué riesgos hay para las próximas jornadas?')],
        fuentes,
        reglas: REGLAS,
        noHecho: NO_HECHO,
      }
    }
    const id = pedido?.id
    if (id) {
      const r = riesgoDe(m, id)
      const bloques = [AVISO_EXPLORATORIO]
      if (det.entidades?.quiereEnviar) bloques.push(texto(r.aviso ? t('No envío avisos: te dejo el borrador para que lo revises y lo mandes tú.') : t('No envío nada: este riesgo no tiene un aviso para el equipo, sino una decisión.')))
      bloques.push(
        texto(
          t('{titulo} ({j}, {f}, dentro de {d}). {porque}', {
            titulo: r.titulo,
            j: etiquetaJornadas(r),
            f: v(fechaLarga(r.fecha)),
            d: v(r.dias, 'dias'),
            porque: r.porQue,
          }),
        ),
      )
      bloques.push(lista('Qué ha mirado el agente', r.senales.map((s) => ({ texto: s }))))
      if (r.estado === 'mitigado') {
        bloques.push(texto(r.respuesta))
      } else if (r.decision || r.estado === 'aceptado' || r.estado === 'reservado') {
        if (r.estado === 'reservado') bloques.push(texto(r.reservaCorta ? t('La reserva aprobada ({res}) se queda corta: el impacto esperado es {nuevo}.', { res: v(r.reservaAprobada, 'eur'), nuevo: v(r.reserva, 'eur') }) : t('Hay una reserva aprobada de {res} en la previsión.', { res: v(r.reservaAprobada, 'eur') })))
        bloques.push(tarjetaRiesgo(m, id))
      } else if (r.aviso) {
        bloques.push(lista('Respuesta propuesta', [{ texto: r.respuesta }], 'propone'))
        if (id === 'RG-3') bloques.push(lista('Plan B', [{ texto: t('Tener localizada una calle privada o un patio con permiso del propietario (partida {p}).', { p: v('05.01', 'id') }) }], 'propone'))
        bloques.push({ tipo: 'borrador', id: r.aviso })
      }
      return {
        bloques,
        sugerencias: [sug('¿Qué riesgos hay para las próximas jornadas?'), sug(r.id === 'RG-1' ? PREGUNTA['RG-5'] : PREGUNTA['RG-1'])],
        fuentes,
        reglas: REGLAS,
        noHecho: NO_HECHO,
      }
    }

    // Parte de riesgos.
    const evaluados = evaluarRiesgos(m)
    const altos = evaluados.filter((r) => r.severidad === 'alta')
    const medios = evaluados.filter((r) => r.severidad === 'media')
    const bloques = [
      AVISO_EXPLORATORIO,
      texto(
        t('He revisado las jornadas {a} a {b}: {n}. {altos} y {medios}. El más urgente: {top}.', {
          a: v(m.proyecto.diaActual, 'num'),
          b: v(m.proyecto.diasRodaje, 'num'),
          n: cuenta(evaluados.length, 'riesgo', 'riesgos'),
          altos: cuenta(altos.length, 'alto', 'altos'),
          medios: cuenta(medios.length, 'medio', 'medios'),
          top: evaluados[0].titulo,
        }),
      ),
      { tipo: 'riesgos' },
      { tipo: 'plan' },
    ]
    for (const r of evaluados.filter((x) => x.decision || x.estado === 'aceptado')) bloques.push(tarjetaRiesgo(m, r.id))
    return {
      bloques,
      sugerencias: [sug(PREGUNTA['RG-4']), sug(PREGUNTA['RG-2']), sug(PREGUNTA['RG-6'])],
      fuentes,
      reglas: REGLAS,
      noHecho: NO_HECHO,
    }
  },
}

export { TIPOS }
