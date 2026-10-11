// Historias de la demo: una sola fuente para la lista de historias, el recorrido
// guiado, las sugerencias y lo que cuenta como visto. La demo cuenta una idea,
// «los agentes preparan, tú decides», en seis historias cortas; cada una enseña un
// solo nivel de autonomía. Lo que no está aquí sigue respondiendo por texto (dossier,
// incentivo, caja, desviación…), pero no se ofrece en el camino principal.
//
// Que cada entrada y cada pregunta resuelvan a su intención lo comprueba
// scripts/check-agentes.mjs.

import { crearMundo } from './mundo.js'
import { AUTONOMIA } from './agentes.js'
import { PREGUNTA } from './rodaje.js'
import { formatear } from './texto.js'

// Etiqueta única de lo que aún no es producto. No «En estudio»: en cine, un estudio es un plató.
// Contrato: ETIQUETA_CAPACIDAD[capacidad] → etiqueta visible; 'decidida' no lleva etiqueta.
export const ETIQUETA_CAPACIDAD = { exploratoria: 'En exploración' }
export const LEYENDA_CAPACIDAD = 'En exploración: ideas que aún no están en Filmpilot. Te las enseñamos con datos de ejemplo para saber si te servirían.'

// Contrato: nivel de una historia → etiqueta. 'lee' es solo del parte; los otros tres
// salen de AUTONOMIA (agentes.js), que lleva también su descripción.
export const ETIQUETA_NIVEL = { lee: 'Solo leen', ...Object.fromEntries(Object.values(AUTONOMIA).map((a) => [a.id, a.etiqueta])) }

// Cifras de las notas: salen del mundo, no se escriben a mano.
const MUNDO = crearMundo()
const CONFIANZA_TICKET = formatear(Math.min(...Object.values(MUNDO.documentos['G-004'].confianza)), 'pct0')

const texto = (tx) => ({ tipo: 'texto', texto: tx })
const evento = (eventoId) => ({ tipo: 'evento', eventoId })

/**
 * Contrato HISTORIAS: seis, en el orden del arco.
 * { id, arco, titulo, unaLinea, nivel ('lee'|'ejecuta'|'propone'|'aprueba'),
 *   capacidad ('decidida'|'exploratoria'), autonomia (frase de cómo actúan),
 *   agentes, prompt (la pregunta visible), entrada (texto o evento; la pantalla la
 *   resuelve con entradaDeHistoria), entradaRecorrido? (si el recorrido usa otra;
 *   null = el paso no envía nada), espera? (decisión que bloquea el recorrido),
 *   decisionDePrueba? (id de la acción de la tarjeta que usan las pruebas),
 *   nota (la de la barra del recorrido), intenciones (las que cuentan como vista) }
 */
export const HISTORIAS = [
  {
    id: 'parte',
    arco: 'Cada mañana',
    titulo: 'Lo que encuentras cada mañana',
    unaLinea: 'Sin que pidas nada, los agentes han leído rodaje, coste, facturas, caja y dossier: te cuentan lo que ya han hecho y lo que te toca decidir hoy.',
    nivel: 'lee',
    capacidad: 'decidida',
    autonomia: 'Solo leen: no cambian nada.',
    agentes: ['orquestador', 'riesgos', 'costes', 'conciliacion', 'facturas', 'prevision', 'cumplimiento', 'excepciones', 'informes'],
    prompt: 'Ponme al día',
    entrada: texto('Ponme al día'),
    // El parte ya está en pantalla al empezar: el primer paso no envía nada.
    entradaRecorrido: null,
    nota: 'Antes de que llegues, ocho agentes han cruzado rodaje, coste, facturas y caja. Arriba, lo que ya han hecho solos; debajo, lo que te toca decidir hoy.',
    intenciones: ['saludo'],
  },
  {
    id: 'solo',
    arco: 'Lo hace solo',
    titulo: 'Una factura que cuadra',
    unaLinea: 'Entra una factura que cuadra con su pedido. Conciliación la contabiliza sin preguntar, porque es rutinario y reversible, y queda registrada.',
    nivel: 'ejecuta',
    capacidad: 'decidida',
    autonomia: 'Lo hace solo: es rutinario y reversible.',
    agentes: ['facturas', 'conciliacion', 'cumplimiento'],
    prompt: '¿Han llegado facturas nuevas?',
    entrada: evento('EV-01'),
    nota: 'Entra una factura que cuadra con su pedido: Conciliación la contabiliza sola. Queda registrada y se puede deshacer.',
    intenciones: ['factura_nueva'],
  },
  {
    id: 'propone',
    arco: 'Te lo propone',
    titulo: 'Un ticket que no sabe dónde va',
    unaLinea: 'Con un ticket dudoso, Facturas no decide: te propone dos partidas, con lo que cada una hace al coste, y espera tu sí.',
    nivel: 'propone',
    capacidad: 'decidida',
    autonomia: 'Te lo propone: lo deja preparado y espera tu sí.',
    agentes: ['facturas', 'excepciones', 'cumplimiento'],
    prompt: '¿Qué gastos tengo que revisar?',
    entrada: texto('¿Qué gastos tengo que revisar?'),
    nota: `Con un ${CONFIANZA_TICKET} de confianza, Facturas no decide: te propone dos partidas y eliges tú.`,
    intenciones: ['revisar_gasto', 'pedir_documentacion'],
  },
  {
    id: 'aprueba',
    arco: 'Te pide aprobación',
    titulo: 'Una compra que ningún agente aprueba',
    unaLinea: 'Llega una compra de hotel que deja Viajes por encima de su límite y baja la caja. Ningún agente puede aprobarla: te la traen con su impacto.',
    nivel: 'aprueba',
    capacidad: 'decidida',
    autonomia: 'Pide tu aprobación: hay dinero en juego.',
    agentes: ['costes', 'prevision', 'excepciones'],
    prompt: 'Revisa la orden de compra OC-104',
    entrada: evento('EV-02'),
    espera: { tipo: 'orden', id: 'OC-104' },
    decisionDePrueba: 'rechazar',
    nota: 'Llega una compra de hotel que pasaría Viajes de su límite. Ningún agente puede aprobarla: te la traen con su impacto en el coste y la caja. Decide para seguir; después puedes deshacerlo.',
    intenciones: ['aprobar_oc', 'prevision'],
  },
  {
    id: 'adelanta',
    arco: 'Se adelantan',
    titulo: 'La lluvia de mañana',
    unaLinea: 'Riesgos ve lluvia probable en el exterior de mañana. Propone cambiar el orden de jornadas, sin coste, o apartar dinero, y deja el aviso al equipo en borrador.',
    nivel: 'propone',
    capacidad: 'exploratoria',
    autonomia: 'Te lo propone; apartar dinero pide tu aprobación.',
    agentes: ['riesgos', 'prevision', 'excepciones'],
    prompt: PREGUNTA['RG-1'],
    entrada: texto(PREGUNTA['RG-1']),
    espera: { tipo: 'riesgo', id: 'RG-1' },
    decisionDePrueba: 'aprobar',
    nota: 'Lluvia mañana en un exterior: Riesgos propone cambiar el orden de jornadas, sin coste, o apartar dinero. Es una idea en exploración.',
    intenciones: ['riesgos'],
  },
  {
    id: 'equipo',
    arco: 'Todo el equipo',
    titulo: 'El informe del viernes',
    unaLinea: 'Pides una cosa y siete agentes trabajan a la vez. El borrador sale solo; compartirlo fuera de la productora necesita tu aprobación.',
    nivel: 'aprueba',
    capacidad: 'decidida',
    autonomia: 'Lo preparan solos; compartirlo pide tu aprobación.',
    agentes: ['orquestador', 'facturas', 'conciliacion', 'costes', 'prevision', 'excepciones', 'cumplimiento', 'informes'],
    prompt: 'Prepárame el informe semanal de coste',
    entrada: texto('Prepárame el informe semanal de coste'),
    nota: 'Todo el equipo a la vez: siete agentes preparan el borrador. Compartirlo fuera de la productora necesita tu aprobación.',
    intenciones: ['informe_semanal', 'explicar_desviacion', 'cumplimiento', 'incentivo'],
  },
]

// Contrato EPILOGO: otro proyecto, antes del rodaje. Fuera del recorrido y de las
// sugerencias de «La última función»; se ofrece bajo las historias y al final del recorrido.
export const EPILOGO = {
  id: 'itsasoa',
  arco: 'Para después',
  titulo: 'Antes del rodaje · Itsasoa',
  unaLinea: 'Otro proyecto, en desarrollo: la primera propuesta de presupuesto y las llamadas a proveedores.',
  capacidad: 'exploratoria',
  agentes: ['presupuesto', 'proveedores', 'prevision', 'costes', 'excepciones'],
  prompt: 'Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa',
  entrada: texto('Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa'),
  intenciones: ['presupuesto_nuevo', 'anadir_coste', 'optimizar_proveedores'],
}

export const HISTORIAS_POR_ID = Object.fromEntries([...HISTORIAS, EPILOGO].map((h) => [h.id, h]))

// Contrato CASO_DE_INTENCION: intención → id de la historia (o 'itsasoa') que cuenta
// como vista. Lo que no está (resumen, ayuda, fuera_alcance…) no cuenta.
export const CASO_DE_INTENCION = Object.fromEntries([...HISTORIAS, EPILOGO].flatMap((h) => h.intenciones.map((i) => [i, h.id])))

// Contrato RECORRIDO: seis pasos, uno por historia y en su orden; nunca el epílogo.
// { id, historia, arco, titulo, nota, entrada (null = no envía nada), espera?, decisionDePrueba? }
export const RECORRIDO = HISTORIAS.map((h) => ({
  id: h.id,
  historia: h.id,
  arco: h.arco,
  titulo: h.titulo,
  nota: h.nota,
  entrada: h.entradaRecorrido !== undefined ? h.entradaRecorrido : h.entrada,
  ...(h.espera ? { espera: h.espera } : {}),
  ...(h.decisionDePrueba ? { decisionDePrueba: h.decisionDePrueba } : {}),
}))

/**
 * Contrato: la entrada que manda pulsar una historia. Si es una novedad que ya llegó
 * (no está en mundo.entrantes), se pregunta con su texto. Vale también para el epílogo.
 */
export function entradaDeHistoria(h, mundo) {
  const e = h.entrada
  if (!e) return texto(h.prompt)
  if (e.tipo === 'evento' && !mundo?.entrantes?.includes(e.eventoId)) return texto(h.prompt)
  return e
}

