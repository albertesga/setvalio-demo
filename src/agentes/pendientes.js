// Todas las decisiones abiertas: excepciones del coste, informes por aprobar, propuesta
// de presupuesto y riesgos de rodaje. El panel, el contador y «¿Cómo vamos?» leen esta lista.

import { excepciones } from './calculos.js'
import { decisionesPropuesta } from './propuesta.js'
import { decisionesRiesgos } from './rodaje.js'
import { ROLES } from './politicas.js'

/** El informe redactado espera tu aprobación para compartirlo: su tarjeta dice «Por revisar». */
function informesPorAprobar(mundo) {
  return Object.values(mundo.informes ?? {})
    .filter((i) => i.estado !== 'aprobado')
    .map((i) => ({ id: `ex-informe-${i.id}`, tipo: 'informe', ref: { tipo: 'informe', id: i.id }, nivel: 'aprueba', rol: ROLES.produccionEjecutiva, importe: 0, titulo: 'Compartir el informe semanal', entrada: 'Prepárame el informe semanal de coste' }))
}

export function decisionesAbiertas(mundo) {
  return [...excepciones(mundo), ...informesPorAprobar(mundo), ...decisionesPropuesta(mundo), ...decisionesRiesgos(mundo)]
}
