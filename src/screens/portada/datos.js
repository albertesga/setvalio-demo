// Datos de la portada. Sin JSX: scripts/check-agentes.mjs los importa en Node y
// comprueba que RODAJE y PLAN_RIESGO cuadran con el mundo de los agentes.
//
// Ojo: RIESGO, el texto del caso de lluvia y su pregunta viven en Landing.jsx
// (check:agentes los busca allí) y llegan a la sección del flujo como props.

import { TOTALES } from '../../lib/data.js'
import { eur, pctSigned } from '../../lib/format.js'

export const NAV = [
  { label: 'Agentes', href: '#agentes' },
  { label: 'Cómo funciona', href: '#flujo' },
  { label: 'Fiscalidad', href: '#documental' },
  { label: 'Preguntas', href: '#faq' },
]

// Secciones de la página, en orden (pista de montaje de la cabecera).
export const SECCIONES = ['inicio', 'agentes', 'foto', 'flujo', 'documental', 'faq', 'cierre']

// El día de rodaje del mundo de los agentes (check:agentes lo compara con crearMundo()).
export const RODAJE = { titulo: 'La última función', dia: 7, jornadas: 20 }

// Vista estática del informe semanal (no importa el motor para no cargarlo en la portada).
// trabaja y acaba: cuándo empieza y termina cada agente en la toma, en ms.
export const AGENTS_PREVIEW = [
  { familia: 'documentacion', nombre: 'Facturas', tarea: 'Lee los cuatro documentos de la bandeja', estado: 'done', trabaja: 300, acaba: 1000 },
  { familia: 'financiacion', nombre: 'Conciliación', tarea: 'Cuadra cada factura con su pedido', estado: 'done', trabaja: 1000, acaba: 1700 },
  { familia: 'presupuesto', nombre: 'Control de costes', tarea: 'Escenografía supera el umbral del 8 %', estado: 'done', trabaja: 1700, acaba: 2500 },
  { familia: 'financiacion', nombre: 'Excepciones', tarea: 'Una compra de más de 10.000 € espera tu aprobación', estado: 'review', trabaja: 1700, acaba: 2900 },
]

export const CEF = { cifra: eur(TOTALES.cef), desviacion: pctSigned(TOTALES.desviacionPct) }

// Cada etapa abre los agentes con una pregunta. Las cifras son las que responden ellos
// (mismos datos de ejemplo de «La última función»). El icono lo pone la sección.
export const FLOW = [
  { number: '01', name: 'Presupuesto', detail: 'Una base por capítulos ICAA para todo el proyecto.', value: eur(TOTALES.presupuesto), nota: 'presupuesto total', pregunta: '¿Cómo vamos?' },
  { number: '02', name: 'Incentivos', detail: 'Deducción por territorio y ayudas en una misma cuenta.', value: '650.000 €', nota: 'deducción estimada', pregunta: '¿Cuánto supondría llegar al 50 % de gasto en Canarias?' },
  { number: '03', name: 'Financiación', detail: 'Cobros, pagos y caja semana a semana.', value: '−54.000 €', nota: 'saldo mínimo previsto', pregunta: '¿Cómo cerraremos el proyecto y llegamos con la caja?' },
  { number: '04', name: 'Rodaje', detail: 'Compras, gasto real y coste estimado final antes del cierre.', value: pctSigned(TOTALES.desviacionPct), nota: 'sobre presupuesto', pregunta: '¿Por qué se desvía Escenografía?' },
  { number: '05', name: 'Justificación', detail: 'Cada gasto y documento conectado a la deducción.', value: '3 bloqueantes', nota: 'en el dossier fiscal', pregunta: '¿Qué bloquea el dossier fiscal?' },
]

// Las jornadas 7 a 9 del plan, tal como las tiene rodaje.js (check:agentes lo compara):
// la 8 es el exterior con lluvia y la 9 el interior por el que se propone cambiarla.
export const PLAN_RIESGO = {
  jornadas: [
    { n: 7, tipo: 'INT', localizacion: 'Madrid centro · interiores', nota: '' },
    { n: 8, tipo: 'EXT', localizacion: 'Exteriores Madrid', nota: 'Azotea, sin cobertura' },
    { n: 9, tipo: 'INT', localizacion: 'Teatro Apolo · decorado', nota: 'Decorado montado' },
  ],
  lluvia: 8,
  intercambio: 9,
}

// Los mismos bloqueantes que enseña el agente de Cumplimiento.
export const DOSSIER = [
  ['Certificado cultural ICAA', 'Productora · vence 05/06/2026'],
  ['Justificantes de pago vinculados a facturas', 'Line producer · vence 14/06/2026 · faltan 6'],
  ['Coste reconocido por capítulos ICAA', 'Fiscalista · vence 20/06/2026'],
]

export const FAQ = [
  ['¿Qué puedo probar aquí?', 'Los agentes trabajando sobre «La última función», un largometraje en su día 7 de rodaje, de 20. Te reciben con el parte de la mañana: lo que pasa hoy, lo que vence esta semana y lo que espera tu decisión. Después pides un informe, una explicación o el parte de riesgos y ves cómo trabaja cada agente y qué te deja decidir.'],
  ['¿Los agentes deciden por mí?', 'No. Hacen solos lo rutinario y reversible, como contabilizar una factura que casa con su pedido. Lo dudoso lo proponen y lo que compromete dinero o tiene riesgo fiscal espera la aprobación de la persona responsable.'],
  ['¿Sustituye a mi fiscalista?', 'No. Tu fiscalista revisa, valida y firma. Filmpilot prepara cálculos, evidencias y trazabilidad para que esa revisión sea más clara.'],
  ['¿Puedo trabajar con cine, series y documental?', 'Filmpilot contempla distintas tipologías, territorios, presupuestos por capítulos ICAA y requisitos de coproducción.'],
  ['¿Cómo se procesan las facturas?', 'La factura electrónica se lee como dato estructurado. Los PDF y tickets se procesan con OCR y los casos de baja confianza quedan señalados para revisión.'],
]
