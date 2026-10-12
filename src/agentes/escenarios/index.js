// Registro de guiones.

import { informeSemanal, explicarDesviacion, prevision, resumen } from './coste.js'
import { facturaNueva, revisarGasto, pedirDocumentacion } from './documentos.js'
import { aprobarOc } from './compras.js'
import { cumplimiento, incentivo } from './fiscal.js'
import { ayuda, fueraAlcance, desambiguar, noEntendido } from './conversacion.js'
import { accion } from './decisiones.js'
import { presupuestoNuevo, anadirCoste, optimizarProveedores } from './presupuesto.js'
import { riesgos } from './riesgos.js'
import { saludo } from './saludo.js'

export const ESCENARIOS = Object.fromEntries(
  [informeSemanal, explicarDesviacion, prevision, resumen, facturaNueva, revisarGasto, pedirDocumentacion, aprobarOc, cumplimiento, incentivo, ayuda, fueraAlcance, desambiguar, noEntendido, accion, presupuestoNuevo, anadirCoste, optimizarProveedores, riesgos, saludo].map((e) => [e.id, e]),
)
