// Guiones del agente de riesgos de producción (EXPLORATORIO): parte de riesgos,
// detalle de un riesgo y avisos que llegan solos (orden del día, lluvia).

import { cuenta, fecha as fechaLarga, formatear } from '../texto.js'
import { evaluarRiesgos, riesgo as riesgoDe, jornada, UMBRALES, TIPOS } from '../rodaje.js'
import { PERSONAS } from '../mundo.js'
import { t, v, c, paso, sug, texto, aviso, lista } from './comun.js'

export const AVISO_EXPLORATORIO = aviso(
  'exploratorio',
  'Exploratorio',
  t('El agente de riesgos se exploró como idea; no forma parte del alcance decidido. Plan de rodaje, previsión del tiempo, convocatorias y permisos son datos de ejemplo: no consulta ningún servicio externo.'),
)

const NO_HECHO = [t('No ha enviado ningún aviso: los mensajes al equipo quedan como borradores.'), t('No ha cambiado el plan de rodaje ni la previsión sin tu decisión.')]

const REGLAS = [
  t('Riesgo alto: probabilidad de al menos {p} en los próximos {d}, o un aviso urgente', { p: v(UMBRALES.probabilidad, 'pct0'), d: v(7, 'dias') }),
  t('Riesgo medio: exposición de {e} o más, o una jornada en los próximos {d}', { e: v(UMBRALES.exposicion, 'eur'), d: v(UMBRALES.diasUrgente, 'dias') }),
  t('Coste de una jornada: pagos previstos de su semana entre cinco jornadas'),
]

// Jornada → riesgo («¿y la jornada 23?»).
const RIESGO_DE_JORNADA = { 17: 'RG-4', 18: 'RG-1', 20: 'RG-6', 21: 'RG-2', 22: 'RG-2', 23: 'RG-3', 24: 'RG-5', 25: 'RG-5' }

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

/** Tarjeta de decisión de un riesgo con impacto económico (RG-1 lluvia, RG-5 horas extra). */
export function tarjetaRiesgo(m, id) {
  const r = riesgoDe(m, id)
  const cef = c.totales(m).cef
  const lluvia = id === 'RG-1'
  const j = jornada(m, r.jornadas[0])
  const acciones = [
    lluvia
      ? { id: 'aprobar', etiqueta: 'Cambiar el orden con la jornada 19', variante: 'primary', accion: { tipo: 'riesgo/mitigar', riesgoId: id, opcion: 'permutar' }, rol: 'Line producer' }
      : { id: 'aprobar', etiqueta: 'Replanificar las noches', variante: 'primary', accion: { tipo: 'riesgo/mitigar', riesgoId: id, opcion: 'replanificar' }, rol: 'Line producer' },
  ]
  if (r.reserva) acciones.push({ id: 'reservar', etiqueta: 'Reservar en la previsión', variante: 'secondary', accion: { tipo: 'riesgo/reservar', riesgoId: id, importe: r.reserva }, rol: 'Producción ejecutiva' })
  acciones.push({ id: 'rechazar', etiqueta: 'Asumir el riesgo', variante: 'secondary', accion: { tipo: 'riesgo/aceptar', riesgoId: id }, rol: 'Producción ejecutiva' })
  return {
    tipo: 'aprobacion',
    id: `ap-${id}-${r.reserva ?? 0}`,
    ref: { tipo: 'riesgo', id, reserva: r.reserva ?? undefined },
    agente: 'riesgos',
    nivel: 'aprueba',
    rol: 'Line producer; la reserva, producción ejecutiva',
    titulo: r.titulo,
    resumen: lluvia
      ? t('Previsión de ejemplo: {p} de lluvia el {f}, y la jornada {n} es un exterior de día sin cobertura. Perder la jornada costaría unos {exp}. La jornada {otra} es interior, con el decorado montado: se pueden cambiar de orden sin coste.', {
          p: v(r.probabilidad, 'pct0'),
          f: v(fechaLarga(r.fecha)),
          n: v(j.n, 'num'),
          exp: v(r.exposicion, 'eur'),
          otra: v(19, 'num'),
        })
      : t('Las noches anteriores generaron horas extra y quedan dos más. Si se repite, la partida {p} ya no tiene margen y el coste estimado final subiría {exp}. Una citación más tardía reduce las horas extra.', { p: v(m.rodaje.senales.noches.partida, 'id'), exp: v(r.exposicion, 'eur') }),
    impactoTitulo: 'Opción',
    impactoColumnas: ['Coste final ahora', 'Después'],
    impacto: [
      { etiqueta: lluvia ? 'Cambiar el orden de jornadas' : 'Replanificar las noches', antes: cef, despues: cef, formato: 'eur' },
      ...(r.reserva ? [{ etiqueta: lluvia ? `Reservar el impacto esperado (${formatear(r.probabilidad, 'pct0')} de ${formatear(r.exposicion, 'eur')})` : 'Reservar el coste si se repite', antes: cef, despues: cef + r.reserva, formato: 'eur' }] : []),
      { etiqueta: 'Asumir el riesgo sin reservar', antes: cef, despues: cef, formato: 'eur' },
    ],
    recomendacion: lluvia ? t('Recomiendo cambiar el orden: elimina el riesgo sin coste.') : t('Recomiendo replanificar: reduce las horas extra sin tocar la previsión.'),
    acciones,
  }
}

function etiquetaJornadas(r) {
  return r.jornadas.length > 1 ? v(`jornadas ${r.jornadas.join(' y ')}`) : v(`jornada ${r.jornadas[0]}`)
}

function riesgoPedido(m, det) {
  if (det.entidades?.riesgo) return det.entidades.riesgo
  if (det.entidades?.jornada) return RIESGO_DE_JORNADA[det.entidades.jornada] ?? null
  return null
}

export const riesgos = {
  id: 'riesgos',
  titulo: (det) => (det.eventoId === 'EV-CITACION' ? 'Aviso urgente · orden del día' : det.eventoId === 'EV-LLUVIA' ? 'Aviso · previsión de lluvia' : det.entidades?.riesgo || det.entidades?.jornada ? 'Riesgo de rodaje' : 'Parte de riesgos de rodaje'),
  ejemplos: ['¿Qué riesgos hay para las próximas jornadas?', '¿Va a llover en la jornada 18?', '¿Qué riesgo hay con las horas extra de noche?', '¿Está publicada la orden de rodaje de mañana?'],

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
        paso('riesgos', t('Recibe la previsión actualizada'), { tipo: 'lectura', acciones: [{ tipo: 'evento/recibir', eventoId: 'EV-LLUVIA' }], salida: (_, d) => t('Lluvia el {f}: {p}', { f: v(fechaLarga('2026-06-03')), p: v(d.rodaje.meteo['2026-06-03'], 'pct0') }) }),
        paso('prevision', t('Recalcula el impacto esperado'), { salida: (_, d) => (d.decisionesRiesgo['RG-1']?.estado === 'mitigado' ? t('Sin impacto: la jornada ya es interior') : t('Impacto esperado {i}', { i: v(riesgoDe(d, 'RG-1').reserva, 'eur') })) }),
      ]
    }

    const id = riesgoPedido(m, det)
    const recibirParte = m.entrantes.includes('EV-RIESGOS') ? [{ tipo: 'evento/recibir', eventoId: 'EV-RIESGOS' }] : []
    if (id) {
      const r = riesgoDe(m, id)
      const pasos = [
        paso('riesgos', t('Revisa las señales: {tipo}, {j}', { tipo: v(r.tipo.toLowerCase()), j: etiquetaJornadas(r) }), { tipo: 'lectura', acciones: recibirParte, salida: t('{n} revisadas', { n: cuenta(r.senales.length, 'señal', 'señales') }) }),
      ]
      if (r.exposicion) pasos.push(paso('prevision', t('Calcula el impacto económico posible'), { salida: t('Exposición {e}', { e: v(r.exposicion, 'eur') }) }))
      if (r.aviso && !m.borradores[r.aviso]) {
        pasos.push(paso('riesgos', t('Redacta el aviso para quien puede resolverlo'), { tipo: 'redaccion', autonomia: 'propone', acciones: [{ tipo: 'borrador/crear', borrador: borradorRiesgo(m, id) }], salida: t('Borrador listo; no se envía') }))
      } else if (r.decision) {
        pasos.push(paso('excepciones', t('Te trae las opciones para decidir'), { tipo: 'revision', autonomia: 'aprueba', salida: t('Cambio de plan, reserva o asumirlo') }))
      }
      return pasos
    }

    const evaluados = evaluarRiesgos(m)
    return [
      paso('riesgos', t('Lee el plan de las próximas jornadas'), { tipo: 'lectura', acciones: recibirParte, salida: t('De la jornada {a} a la {b}', { a: v(16, 'num'), b: v(m.proyecto.diasRodaje, 'num') }) }),
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
        bloques: [AVISO_EXPLORATORIO, aviso('aviso', 'Urgente', t('Es por la tarde y la orden del día de mañana sigue sin publicar. Te dejo un recordatorio para ayudantía de dirección.')), { tipo: 'borrador', id: 'BOR-RG-4' }],
        sugerencias: [sug('¿Qué riesgos hay para las próximas jornadas?')],
        fuentes,
        reglas: REGLAS,
        noHecho: NO_HECHO,
      }
    }

    if (det.eventoId === 'EV-LLUVIA') {
      const r = riesgoDe(m, 'RG-1')
      const d = m.decisionesRiesgo['RG-1']
      const bloques = [AVISO_EXPLORATORIO]
      if (d?.estado === 'mitigado') {
        bloques.push(texto(t('La previsión de ejemplo para el {f} sube al {p} de lluvia, pero la jornada {n} ya es interior: no afecta al rodaje.', { f: v(fechaLarga('2026-06-03')), p: v(m.rodaje.meteo['2026-06-03'], 'pct0'), n: v(18, 'num') })))
      } else if (d?.estado === 'reservado') {
        bloques.push(texto(t('La previsión de ejemplo sube al {p}. La reserva aprobada ({res}) se queda corta: el impacto esperado es ahora {nuevo}.', { p: v(m.rodaje.meteo['2026-06-03'], 'pct0'), res: v(d.importe, 'eur'), nuevo: v(r.reserva, 'eur') })))
        bloques.push(tarjetaRiesgo(m, 'RG-1'))
      } else if (d?.estado === 'aceptado') {
        bloques.push(texto(t('La previsión de ejemplo sube al {p}. Decidiste asumir el riesgo; si quieres, todavía se puede cambiar el orden de jornadas.', { p: v(m.rodaje.meteo['2026-06-03'], 'pct0') })))
      } else {
        bloques.push(texto(t('La previsión de ejemplo para el {f} sube al {p} de lluvia. El impacto esperado pasa a {nuevo}.', { f: v(fechaLarga('2026-06-03')), p: v(m.rodaje.meteo['2026-06-03'], 'pct0'), nuevo: v(r.reserva, 'eur') })))
        bloques.push(tarjetaRiesgo(m, 'RG-1'))
      }
      return { bloques, sugerencias: [sug('¿Qué riesgos hay para las próximas jornadas?')], fuentes, reglas: REGLAS, noHecho: NO_HECHO }
    }

    const id = riesgoPedido(antes, det)
    if (id) {
      const r = riesgoDe(m, id)
      const bloques = [AVISO_EXPLORATORIO]
      if (det.entidades?.quiereEnviar) bloques.push(texto(t('No envío avisos: te dejo el borrador para que lo revises y lo mandes tú.')))
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
      if (r.estado === 'mitigado' || r.estado === 'aceptado' || r.estado === 'reservado') {
        bloques.push(texto(r.estado === 'mitigado' ? t('Ya está resuelto con un cambio de plan.') : r.estado === 'reservado' ? t('Hay una reserva aprobada de {r} en la previsión.', { r: v(r.reservaAprobada, 'eur') }) : t('Se decidió asumirlo.')))
      } else if (r.decision) {
        bloques.push(tarjetaRiesgo(m, id))
      } else if (r.aviso) {
        bloques.push(lista('Respuesta propuesta', [{ texto: r.respuesta }], 'propone'))
        if (id === 'RG-3') bloques.push(lista('Plan B', [{ texto: t('Tener localizada una calle privada o un patio con permiso del propietario (partida {p}).', { p: v('05.01', 'id') }) }], 'propone'))
        bloques.push({ tipo: 'borrador', id: r.aviso })
      }
      return {
        bloques,
        sugerencias: [sug('¿Qué riesgos hay para las próximas jornadas?'), sug(r.id === 'RG-1' ? '¿Qué riesgo hay con las horas extra de noche?' : '¿Va a llover en la jornada 18?')],
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
          a: v(16, 'num'),
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
    for (const r of evaluados.filter((x) => x.decision)) bloques.push(tarjetaRiesgo(m, r.id))
    return {
      bloques,
      sugerencias: [sug('¿Está publicada la orden de rodaje de mañana?'), sug('¿Tiene billete la actriz de la jornada 21?'), sug('Prepara el aviso a transportes por el cambio de localización de la jornada 20')],
      fuentes,
      reglas: REGLAS,
      noHecho: NO_HECHO,
    }
  },
}

export { TIPOS }
