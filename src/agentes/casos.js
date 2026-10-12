// Conversaciones de la demo: una por agente y tema, como en un chat. Cuentan una idea,
// «los agentes preparan, tú decides»: lo que hacen solos (facturas), lo que te proponen
// (el ticket, los riesgos) y lo que te piden aprobar (la compra del hotel, el informe).
// Lo que no está aquí sigue respondiendo por texto, en la conversación abierta o en una
// nueva. Nada llega solo: lo que ya han escrito estaba al abrir la demo.
//
// Que cada entrada y cada pregunta resuelvan a su intención lo comprueba
// scripts/check-agentes.mjs.

import { PREGUNTA } from './rodaje.js'

// Etiqueta única de lo que aún no es producto. No «En estudio»: en cine, un estudio es un plató.
// Contrato: ETIQUETA_CAPACIDAD[capacidad] → etiqueta visible; 'decidida' no lleva etiqueta.
export const ETIQUETA_CAPACIDAD = { exploratoria: 'En exploración' }
export const LEYENDA_CAPACIDAD = 'Ideas que aún no están en Filmpilot. Te las enseñamos con datos de ejemplo para saber si te servirían.'

const texto = (tx) => ({ tipo: 'texto', texto: tx })
const evento = (eventoId) => ({ tipo: 'evento', eventoId })

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
  // `contexto`: de qué se habla cuando la apertura es una novedad («apruébala» es la OC-104).
  { id: 'hotel', titulo: 'Pedido del Hotel NH', etiqueta: 'Compras', agente: 'excepciones', apertura: evento('EV-02'), hora: '09:20', contexto: { ultimaIntencion: 'aprobar_oc', ultimasEntidades: { oc: 'OC-104' } } },
  { id: 'facturas', titulo: 'Facturas de esta mañana', etiqueta: 'Facturas', agente: 'facturas', apertura: evento('EV-01'), hora: '09:41', deshacible: true, contexto: { ultimaIntencion: 'revisar_gasto', ultimasEntidades: { documento: 'G-004' } } },
  { id: 'informe', titulo: 'Informe semanal', etiqueta: 'Informes', agente: 'informes', apertura: texto('Prepárame el informe semanal de coste'), hora: '10:05' },
  { id: 'dossier', titulo: 'Dossier fiscal al día', etiqueta: 'Fiscal', agente: 'cumplimiento', apertura: texto('¿Cómo va la adecuación fiscal?'), hora: '10:10' },
  { id: 'parte', titulo: 'Parte de hoy', etiqueta: 'Equipo', agente: 'orquestador', apertura: { tipo: 'saludo' }, hora: '10:30' },
]

export const CONVERSACIONES_POR_ID = Object.fromEntries(CONVERSACIONES.map((c) => [c.id, c]))
