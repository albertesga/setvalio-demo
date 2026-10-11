// Guiones de conversación: ayuda, cierre del recorrido, fuera de alcance,
// desambiguar y no entendido.

import { AGENTES, ORDEN_AGENTES, ORDEN_FAMILIAS, AUTONOMIA } from '../agentes.js'
import { ROLES } from '../politicas.js'
import { t, v, c, POLITICAS, paso, sug, texto, aviso, lista } from './comun.js'
import { EPILOGO } from '../casos.js'

// La regla común de lo que nunca hacen los agentes. Se repite igual en todas partes.
export const REGLA_COMUN = 'No paga, no firma y no se comunica con nadie sin tu permiso'

const EJEMPLO = {
  informe_semanal: 'Prepárame el informe semanal de coste',
  factura_nueva: '¿Han llegado facturas nuevas?',
  revisar_gasto: '¿Qué gastos tengo que revisar?',
  explicar_desviacion: '¿Por qué se desvía Escenografía?',
  aprobar_oc: '¿Qué órdenes de compra tengo pendientes?',
  prevision: '¿Cuánto nos costará al final y llegamos de caja?',
  cumplimiento: '¿Qué bloquea el dossier fiscal?',
  pedir_documentacion: 'Pide a Ferretería El Tornillo la factura completa',
  incentivo: '¿Cuánto supondría llegar al 50 % de gasto en Canarias?',
  ayuda: '¿Qué puedes hacer?',
  resumen: '¿Cómo vamos?',
  riesgos: '¿Qué riesgos hay para las próximas jornadas?',
  presupuesto_nuevo: 'Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa',
  optimizar_proveedores: 'Optimiza los proveedores de la propuesta',
  saludo: 'Ponme al día',
}

/** Reglas de autonomía: van en «Cómo lo han hecho» de la ayuda, no en el cuerpo. */
function reglasAutonomia() {
  return [
    t('Clasifica solo si la confianza es de al menos {u}; por debajo, propone.', { u: v(POLITICAS.umbralConfianza, 'pct0') }),
    t('Contabiliza solo la factura que cuadra con un pedido aprobado.'),
    t('Una compra de más de {imp} la aprueba el line producer.', { imp: v(POLITICAS.umbralImporteOc, 'eur') }),
    t('Si deja su capítulo más de un {u} por encima de su presupuesto, la aprueba producción ejecutiva.', { u: v(POLITICAS.umbralDesviacion, 'pct0') }),
    t('Lo fiscal lo valida el fiscalista.'),
    t('Riesgos de producción avisa sin que se lo pidas. Cambiar el plan lo decide el line producer; apartar dinero o asumir el riesgo, producción ejecutiva.'),
    t('{regla}.', { regla: v(REGLA_COMUN) }),
  ]
}

// «¿Qué puedes hacer?»: una frase de marca, las historias que se pueden ver y el
// equipo plegado. Contrato del bloque: { tipo: 'tabla', plegado: true, resumen } se
// pinta cerrado con `resumen` como enlace.
export const ayuda = {
  id: 'ayuda',
  titulo: 'Qué hacen los agentes',
  ejemplos: ['¿Qué puedes hacer?', '¿qué agentes hay?', '¿cómo decides qué tengo que aprobar yo?', 'ayuda'],
  planificar() {
    return [paso('orquestador', t('Reúne lo que sabe hacer cada agente'), { tipo: 'lectura', salida: t('Agentes y reglas de autonomía') })]
  },
  componer({ antes }) {
    return {
      bloques: [
        texto(t('Un equipo de agentes lleva el control de coste de «{p}». Los agentes preparan, tú decides: hacen solos lo rutinario, te proponen lo dudoso y te piden aprobación cuando hay dinero o riesgo.', { p: v(antes.proyecto.titulo) })),
        // Contrato: { tipo: 'historias', epilogo? } pinta las historias (sin el parte) con su marca de vista.
        { tipo: 'historias' },
        {
          tipo: 'tabla',
          titulo: 'El equipo',
          plegado: true,
          // Informativo: el título ya dice qué es.
          resumen: `El Orquestador y ${ORDEN_AGENTES.length - 1} agentes en ${ORDEN_FAMILIAS.length} familias`,
          columnas: [
            { id: 'agente', etiqueta: 'Agente' },
            { id: 'hace', etiqueta: 'Qué hace' },
            { id: 'niveles', etiqueta: 'Cómo actúa' },
          ],
          filas: ORDEN_AGENTES.map((id) => ({ id, agente: AGENTES[id].nombre, agenteId: id, hace: AGENTES[id].hace, niveles: AGENTES[id].niveles.map((n) => AUTONOMIA[n].etiqueta).join(' · ') })),
        },
      ],
      sugerencias: [sug('¿Qué tengo que revisar?')],
      fuentes: ['Configuración de agentes'],
      reglas: reglasAutonomia(),
      noHecho: [],
    }
  },
}

/** Lo que se ha visto de cada nivel, con el estado real del mundo. */
function lineasCierre(m) {
  const factura = m.documentos['F-2026-078']
  const ticket = m.documentos['G-004']
  const orden = m.ordenes['OC-104']
  const confianza = Math.min(...Object.values(ticket.confianza ?? { x: 0 }))
  const lineas = []
  lineas.push(
    factura?.estado === 'contabilizada'
      ? t('Lo hace solo: Conciliación contabilizó {doc} porque cuadra con su pedido, {oc}.', { doc: v(factura.id, 'id'), oc: v(factura.oc, 'id') })
      : t('Lo hace solo: Conciliación contabiliza sola la factura que cuadra con su pedido.'),
  )
  const decTicket = c.estadoDecision(m, { tipo: 'documento', id: ticket.id })
  const datosTicket = { p: v(confianza, 'pct0'), prov: v(ticket.proveedor) }
  lineas.push(
    decTicket.estado !== 'aprobada'
      ? t('Te lo propone: con un {p} de confianza, Facturas no decide la partida del ticket de {prov}. Te propone dos y espera tu sí.', datosTicket)
      : decTicket.por
        ? t('Te lo propone: con un {p} de confianza, Facturas no decidió la partida del ticket de {prov}. Propuso dos y {por} eligió.', { ...datosTicket, por: v(decTicket.por) })
        : t('Te lo propone: con un {p} de confianza, Facturas no decidió la partida del ticket de {prov}. Propuso dos y ya está elegida.', datosTicket),
  )
  const dec = c.estadoDecision(m, { tipo: 'orden', id: orden.id })
  if (dec.estado === 'aprobada' || dec.estado === 'rechazada') {
    lineas.push(
      dec.por
        ? t('Pide tu aprobación: ningún agente podía aprobar {oc}. Esperó a {rol} y {por} la {que}.', { oc: v(orden.id, 'id'), rol: v(ROLES.produccionEjecutiva.toLowerCase()), por: v(dec.por), que: v(dec.estado === 'aprobada' ? 'aprobó' : 'rechazó') })
        : t('Pide tu aprobación: ningún agente podía aprobar {oc}. Esperó a {rol}.', { oc: v(orden.id, 'id'), rol: v(ROLES.produccionEjecutiva.toLowerCase()) }),
    )
  } else {
    const rol = c.impactoOrden(m, orden.id)?.rol ?? ROLES.produccionEjecutiva
    lineas.push(t('Pide tu aprobación: ningún agente puede aprobar {oc}. Espera a {rol}.', { oc: v(orden.id, 'id'), rol: v(rol.toLowerCase()) }))
  }
  return lineas
}

// Cierre del recorrido guiado (entrada { tipo: 'cierreRecorrido' }, sesion.js).
export const cierreRecorrido = {
  id: 'cierre_recorrido',
  titulo: 'Lo que acabas de ver',
  ejemplos: [],
  planificar() {
    return [paso('orquestador', t('Resume lo que has visto en el recorrido'), { tipo: 'lectura', salida: t('Lo hace solo, te lo propone y pide tu aprobación') })]
  },
  componer({ antes }) {
    return {
      bloques: [
        texto(t('Así trabaja Filmpilot: los agentes preparan, tú decides. Lo has visto en sus tres formas de actuar.')),
        lista('Tres formas de actuar', lineasCierre(antes).map((x) => ({ texto: x }))),
        // Las seis historias ya están en el carril con su marca: aquí solo lo que queda por ver.
        { tipo: 'acciones', texto: t('Para después: otro proyecto, antes del rodaje. Está en exploración.'), acciones: [{ id: 'itsasoa', etiqueta: EPILOGO.titulo, variante: 'secondary', entrada: EPILOGO.entrada ?? { tipo: 'texto', texto: EPILOGO.prompt } }] },
      ],
      sugerencias: ['¿Por qué se desvía Escenografía?', '¿Qué bloquea el dossier fiscal?', '¿Cuánto nos costará al final y llegamos de caja?'].map(sug),
      fuentes: [],
      reglas: [t('{regla}.', { regla: v(REGLA_COMUN) })],
      noHecho: [],
    }
  },
}

const ALCANCE = {
  fase_posterior: {
    titulo: 'Aún no está en Filmpilot',
    texto: t('Production Rescue —planes de recuperación para producciones en apuros— aún no está en Filmpilot ni en esta demo. Hoy puedo ayudarte a ver dónde está la presión.'),
    sugerencias: ['¿Qué capítulos se pasan del límite?', '¿Cuánto nos costará al final y llegamos de caja?'],
  },
  pagos: {
    titulo: 'Sin pagos',
    texto: t('No hago pagos ni transferencias: salen de tu banca, con tus firmas. Sí puedo decirte qué vence y cómo queda la caja.'),
    sugerencias: ['¿Cuánto nos costará al final y llegamos de caja?', '¿Qué bloquea el dossier fiscal?'],
  },
}

export const fueraAlcance = {
  id: 'fuera_alcance',
  titulo: 'Esto aún no lo hace Filmpilot',
  ejemplos: ['Activa el Production Rescue', 'rescata la producción', 'paga la factura de Grúas', 'haz la transferencia al hotel'],
  planificar(m, det) {
    return [paso('orquestador', t('Comprueba si la petición está en el alcance'), { tipo: 'plan', salida: det.motivo === 'pagos' ? t('Pagos: Filmpilot no los hace') : t('Aún no está en Filmpilot') })]
  },
  componer({ det }) {
    const a = ALCANCE[det.motivo] ?? ALCANCE.fase_posterior
    return {
      bloques: [aviso(det.motivo === 'pagos' ? 'info' : 'fase', a.titulo, a.texto), { tipo: 'lista', titulo: 'Puedes pedir', items: a.sugerencias.map((x) => ({ texto: t('{x}', { x: v(x) }), entrada: x })) }],
      sugerencias: a.sugerencias.map(sug),
      fuentes: [],
      reglas: [t('{regla}.', { regla: v(REGLA_COMUN) })],
      noHecho: [t('No ha hecho nada fuera de su alcance.')],
    }
  },
}

const NOMBRE_INTENCION = {
  informe_semanal: 'el informe semanal',
  factura_nueva: 'una factura entrante',
  revisar_gasto: 'los gastos por revisar',
  explicar_desviacion: 'una desviación',
  aprobar_oc: 'las órdenes de compra',
  prevision: 'la previsión y la caja',
  cumplimiento: 'el dossier fiscal',
  pedir_documentacion: 'pedir documentación',
  incentivo: 'el incentivo fiscal',
  ayuda: 'lo que hacen los agentes',
  resumen: 'un resumen',
  riesgos: 'los riesgos de rodaje',
  presupuesto_nuevo: 'la propuesta de presupuesto',
  optimizar_proveedores: 'optimizar proveedores',
  anadir_coste: 'añadir un coste',
  saludo: 'el parte de la mañana',
}

export const desambiguar = {
  id: 'desambiguar',
  titulo: '¿Qué querías decir?',
  ejemplos: [],
  planificar() {
    return [paso('orquestador', t('Interpreta la petición'), { tipo: 'plan', salida: t('Dos lecturas posibles') })]
  },
  componer({ det }) {
    const [a, b] = det.opciones
    return {
      bloques: [
        texto(t('¿Te refieres a {a} o a {b}?', { a: v(NOMBRE_INTENCION[a] ?? a), b: v(NOMBRE_INTENCION[b] ?? b) })),
        { tipo: 'lista', titulo: 'Elige una', items: [a, b].filter((x) => EJEMPLO[x]).map((x) => ({ texto: t('{x}', { x: v(EJEMPLO[x]) }), entrada: EJEMPLO[x] })) },
      ],
      sugerencias: [a, b].filter((x) => EJEMPLO[x]).map((x) => sug(EJEMPLO[x])),
      fuentes: [],
      reglas: [],
      noHecho: [t('Prefiere preguntar antes que adivinar.')],
    }
  },
}

export const noEntendido = {
  id: 'no_entendido',
  titulo: 'Esto no lo tengo preparado',
  ejemplos: [],
  planificar() {
    return [paso('orquestador', t('Interpreta la petición'), { tipo: 'plan', salida: t('No encaja con nada preparado en esta demo') })]
  },
  componer({ det }) {
    const alt = (det.alternativas || []).filter((x) => EJEMPLO[x])
    const base = ['informe_semanal', 'explicar_desviacion', 'aprobar_oc']
    const lista = [...new Set([...alt, ...base])].slice(0, 3)
    return {
      bloques: [
        texto(t('No tengo preparada esa petición: en esta demo los agentes siguen guiones y no inventan respuestas.')),
        { tipo: 'lista', titulo: 'Esto sí puedo resolverlo', items: lista.map((x) => ({ texto: t('{x}', { x: v(EJEMPLO[x]) }), entrada: EJEMPLO[x] })) },
      ],
      sugerencias: lista.map((x) => sug(EJEMPLO[x])),
      fuentes: [],
      reglas: [],
      noHecho: [t('No ha inventado ninguna respuesta.')],
    }
  },
}

export { EJEMPLO }
