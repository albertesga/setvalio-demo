// Todas las decisiones abiertas: excepciones del coste, propuesta de presupuesto
// y riesgos de rodaje. El panel, el contador y «¿Cómo vamos?» leen esta lista.

import { excepciones } from './calculos.js'
import { decisionesPropuesta } from './propuesta.js'
import { decisionesRiesgos } from './rodaje.js'

export function decisionesAbiertas(mundo) {
  return [...excepciones(mundo), ...decisionesPropuesta(mundo), ...decisionesRiesgos(mundo)]
}
