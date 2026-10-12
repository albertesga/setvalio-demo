// Historias de la demo: una sola fuente para la lista de historias, el recorrido
// guiado, las sugerencias y lo que cuenta como visto. La demo cuenta una idea,
// «los agentes preparan, tú decides», en cinco historias cortas, en orden de autonomía
// (la de las facturas enseña dos: lo que hacen solos y lo que te proponen). Lo que no
// está aquí sigue respondiendo por texto (dossier, incentivo, caja, desviación…), pero
// no se ofrece en el camino principal. Ninguna se abre sola: todo empieza porque lo pides.
//
// Que cada entrada y cada pregunta resuelvan a su intención lo comprueba
// scripts/check-agentes.mjs.

import { AUTONOMIA } from './agentes.js'
import { PREGUNTA } from './rodaje.js'

// Etiqueta única de lo que aún no es producto. No «En estudio»: en cine, un estudio es un plató.
// Contrato: ETIQUETA_CAPACIDAD[capacidad] → etiqueta visible; 'decidida' no lleva etiqueta.
export const ETIQUETA_CAPACIDAD = { exploratoria: 'En exploración' }
export const LEYENDA_CAPACIDAD = 'En exploración: ideas que aún no están en Filmpilot. Te las enseñamos con datos de ejemplo para saber si te servirían.'

// Contrato: nivel de una historia → etiqueta. 'lee' es solo del parte; los otros tres
// salen de AUTONOMIA (agentes.js), que lleva también su descripción.
export const ETIQUETA_NIVEL = { lee: 'Solo leen', ...Object.fromEntries(Object.values(AUTONOMIA).map((a) => [a.id, a.etiqueta])) }


const texto = (tx) => ({ tipo: 'texto', texto: tx })
const evento = (eventoId) => ({ tipo: 'evento', eventoId })

/**
 * Contrato HISTORIAS: cinco, en el orden del arco.
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
    arco: 'Lo hace solo o te lo propone',
    titulo: 'Las facturas de esta mañana',
    unaLinea: 'Entran tres por correo, formulario web y WhatsApp. Conciliación contabiliza sola las dos que cuadran con su pedido; el ticket que no está claro, Facturas te lo propone.',
    nivel: 'ejecuta',
    capacidad: 'decidida',
    autonomia: 'Lo rutinario lo hacen solos; lo dudoso te lo proponen.',
    agentes: ['facturas', 'conciliacion', 'cumplimiento', 'excepciones'],
    prompt: '¿Han llegado facturas nuevas?',
    entrada: evento('EV-01'),
    nota: 'Entran tres facturas por tres canales. Las dos que cuadran con su pedido se contabilizan solas y se pueden deshacer; el ticket dudoso te lo proponen y eliges tú.',
    intenciones: ['factura_nueva'],
  },
  {
    id: 'aprueba',
    arco: 'Pide tu aprobación',
    titulo: 'Una compra que ningún agente aprueba',
    unaLinea: 'Llega una compra de hotel que dejaría Viajes por encima de su límite y bajaría la caja. Ningún agente puede aprobarla: te la traen con su impacto.',
    nivel: 'aprueba',
    capacidad: 'decidida',
    autonomia: 'Pide tu aprobación: hay dinero en juego.',
    agentes: ['costes', 'prevision', 'excepciones'],
    prompt: 'Revisa la orden de compra OC-104',
    entrada: evento('EV-02'),
    espera: { tipo: 'orden', id: 'OC-104' },
    decisionDePrueba: 'rechazar',
    nota: 'Llega una compra de hotel que dejaría Viajes por encima de su límite. Ningún agente puede aprobarla: te la traen con su impacto en el coste y la caja. Decide para seguir; después puedes deshacerlo.',
    intenciones: ['aprobar_oc'],
  },
  {
    id: 'adelanta',
    arco: 'Se adelantan',
    titulo: 'La lluvia de mañana',
    unaLinea: 'Riesgos ve lluvia probable en el exterior de mañana. Propone cambiar el orden de jornadas, sin coste, o apartar dinero, y deja el aviso al equipo en borrador.',
    // La tarjeta es de aprobación (line producer y producción ejecutiva), como en «Por revisar».
    nivel: 'aprueba',
    capacidad: 'exploratoria',
    autonomia: 'Se adelanta y propone una respuesta; decidirla pide tu aprobación.',
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
    unaLinea: 'Pides una cosa y siete agentes se reparten el trabajo, cada uno su parte. El borrador sale solo; compartirlo fuera de la productora necesita tu aprobación.',
    nivel: 'aprueba',
    capacidad: 'decidida',
    autonomia: 'Lo preparan solos; compartirlo pide tu aprobación.',
    agentes: ['orquestador', 'facturas', 'conciliacion', 'costes', 'prevision', 'excepciones', 'cumplimiento', 'informes'],
    prompt: 'Prepárame el informe semanal de coste',
    entrada: texto('Prepárame el informe semanal de coste'),
    nota: 'Siete agentes se reparten el trabajo y preparan el borrador. Compartirlo fuera de la productora necesita tu aprobación.',
    intenciones: ['informe_semanal'],
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

// Contrato RECORRIDO: un paso por historia y en su orden; nunca el epílogo.
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


// ── Conversaciones ───────────────────────────────────────────────────────────

/**
 * Contrato CONVERSACIONES: las conversaciones de la demo, en el orden en que se escriben
 * (de la más antigua a la más reciente: así el informe sale al día y el parte lo cuenta todo).
 * { id, titulo (corto, para la lista), etiqueta (clasificación o agente principal), agente
 *   (avatar), apertura (lo que el agente ya ha escrito: una entrada del orquestador), hora,
 *   capacidad?, deshacible? (lo que hizo el agente solo se puede deshacer) }
 * La pantalla las ordena por la actividad más reciente, como un chat.
 */
export const CONVERSACIONES = [
  { id: 'itsasoa', titulo: 'Presupuesto de Itsasoa', etiqueta: 'Presupuesto', agente: 'presupuesto', apertura: texto('Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa'), hora: 'Ayer', capacidad: 'exploratoria' },
  { id: 'lluvia', titulo: 'Lluvia de mañana', etiqueta: 'Riesgos', agente: 'riesgos', apertura: texto(PREGUNTA['RG-1']), hora: '07:40', capacidad: 'exploratoria' },
  { id: 'horas', titulo: 'Horas extra de noche', etiqueta: 'Riesgos', agente: 'riesgos', apertura: texto(PREGUNTA['RG-5']), hora: '07:45', capacidad: 'exploratoria' },
  { id: 'grua', titulo: 'Grúa de la jornada 17', etiqueta: 'Riesgos', agente: 'riesgos', apertura: texto(PREGUNTA['RG-7']), hora: '07:50', capacidad: 'exploratoria' },
  { id: 'hotel', titulo: 'Pedido del Hotel NH', etiqueta: 'Compras', agente: 'excepciones', apertura: evento('EV-02'), hora: '09:20' },
  { id: 'facturas', titulo: 'Facturas de esta mañana', etiqueta: 'Facturas', agente: 'facturas', apertura: evento('EV-01'), hora: '09:41', deshacible: true },
  { id: 'informe', titulo: 'Informe semanal', etiqueta: 'Informes', agente: 'informes', apertura: texto('Prepárame el informe semanal de coste'), hora: '10:05' },
  { id: 'dossier', titulo: 'Dossier fiscal al día', etiqueta: 'Fiscal', agente: 'cumplimiento', apertura: texto('¿Cómo va la adecuación fiscal?'), hora: '10:10' },
  { id: 'parte', titulo: 'Parte de hoy', etiqueta: 'Equipo', agente: 'orquestador', apertura: { tipo: 'saludo' }, hora: '10:30' },
]

export const CONVERSACIONES_POR_ID = Object.fromEntries(CONVERSACIONES.map((c) => [c.id, c]))
