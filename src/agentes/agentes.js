// Catálogo de agentes y niveles de autonomía del prototipo conversacional.
//
// Contrato AGENTES[id].etiqueta: la etiqueta corta de una conversación con ese agente.
// Contrato AGENTES[id].preguntas: dos preguntas que se le pueden hacer a cada agente
// (la hoja del agente las ofrece). Todas resuelven a un guion; las de Presupuesto y
// Proveedores llevan al epílogo, Itsasoa.

import { PREGUNTA } from './rodaje.js'
import { POLITICAS } from './politicas.js'
import { formatear } from './texto.js'

const LIMITE = formatear(POLITICAS.umbralDesviacion, 'pct0')

export const AGENTES = {
  orquestador: {
    id: 'orquestador',
    familia: null,
    nombre: 'Orquestador',
    etiqueta: 'Equipo',
    codigo: 'OR',
    rol: 'Entiende la petición, reparte el trabajo y reúne la respuesta.',
    hace: 'Decide qué agentes intervienen y en qué orden. No toca cifras ni aprueba nada.',
    niveles: ['ejecuta'],
    preguntas: ['Ponme al día', '¿Qué puedes hacer?'],
  },
  facturas: {
    id: 'facturas',
    familia: 'documentacion',
    nombre: 'Facturas',
    etiqueta: 'Facturas',
    codigo: 'FA',
    rol: 'Lee facturas y tickets, extrae los campos y propone la partida.',
    hace: 'Clasifica sola la factura electrónica y lo que lee con confianza suficiente. Lo dudoso lo propone.',
    niveles: ['ejecuta', 'propone'],
    preguntas: ['¿Han llegado facturas nuevas?', '¿Qué gastos tengo que revisar?'],
  },
  conciliacion: {
    id: 'conciliacion',
    familia: 'financiacion',
    nombre: 'Conciliación',
    etiqueta: 'Facturas',
    codigo: 'CN',
    rol: 'Cuadra cada factura con su orden de compra y su partida.',
    hace: 'Contabiliza sola la factura que cuadra con un pedido aprobado. Lo que no cuadra pasa a Excepciones.',
    niveles: ['ejecuta'],
    preguntas: ['¿Cómo contabilizó Conciliación la F-2026-078?', 'Procesa la factura F-2026-069'],
  },
  excepciones: {
    id: 'excepciones',
    familia: 'financiacion',
    nombre: 'Excepciones',
    etiqueta: 'Revisión',
    codigo: 'EX',
    rol: 'Separa lo que no cuadra y lo lleva a quien decide.',
    hace: 'Ordena las decisiones pendientes y asigna responsable. Nunca aprueba en nombre de nadie.',
    niveles: ['propone', 'aprueba'],
    preguntas: ['¿Qué tengo que revisar?', 'Revisa la orden de compra OC-104'],
  },
  prevision: {
    id: 'prevision',
    familia: 'financiacion',
    nombre: 'Previsión',
    etiqueta: 'Caja',
    codigo: 'PR',
    rol: 'Recalcula el coste estimado final y la caja.',
    hace: 'Actualiza la previsión con cada movimiento y propone ajustes. No mueve dinero.',
    niveles: ['ejecuta', 'propone'],
    preguntas: ['¿Cuánto nos costará al final y llegamos de caja?', '¿Cuánto dinero tenemos?'],
  },
  costes: {
    id: 'costes',
    familia: 'presupuesto',
    nombre: 'Control de costes',
    etiqueta: 'Costes',
    codigo: 'CC',
    rol: 'Compara presupuesto, gastado, comprometido y previsión por capítulo.',
    hace: `Calcula desviaciones y el impacto de cada compra. Pide aprobación si un capítulo se pasa del límite: un ${LIMITE} por encima de su presupuesto.`,
    niveles: ['ejecuta', 'aprueba'],
    preguntas: ['¿Por qué se desvía Escenografía?', '¿Qué capítulos se pasan del límite?'],
  },
  informes: {
    id: 'informes',
    familia: 'documentacion',
    nombre: 'Informes',
    etiqueta: 'Informes',
    codigo: 'IN',
    rol: 'Redacta el informe semanal para producción.',
    hace: 'Prepara el borrador con cifras y causas. Compartirlo fuera requiere aprobación.',
    niveles: ['ejecuta', 'aprueba'],
    preguntas: ['Prepárame el informe semanal de coste', '¿Cómo vamos?'],
  },
  cumplimiento: {
    id: 'cumplimiento',
    familia: 'documentacion',
    nombre: 'Cumplimiento',
    etiqueta: 'Fiscal',
    codigo: 'CU',
    rol: 'Revisa elegibilidad fiscal, impuestos y el dossier.',
    hace: 'Prepara la documentación y avisa de lo que bloquea. El fiscalista revisa y firma.',
    niveles: ['ejecuta', 'propone', 'aprueba'],
    preguntas: ['¿Qué bloquea el dossier fiscal?', '¿Cuánto supondría llegar al 50 % de gasto en Canarias?'],
  },
  presupuesto: {
    id: 'presupuesto',
    familia: 'presupuesto',
    nombre: 'Presupuesto',
    etiqueta: 'Presupuesto',
    codigo: 'PS',
    rol: 'Monta la propuesta de presupuesto por capítulos ICAA.',
    hace: 'Coloca en su partida los costes que aportas y monta la propuesta por capítulos. No cierra el presupuesto: lo propone.',
    niveles: ['ejecuta', 'propone'],
    preguntas: ['Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa', 'Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €'],
  },
  proveedores: {
    id: 'proveedores',
    familia: 'presupuesto',
    nombre: 'Proveedores',
    etiqueta: 'Proveedores',
    codigo: 'PV',
    rol: 'Busca proveedores más baratos y confirma precios por teléfono.',
    hace: 'Compara el directorio con tus requisitos y, con tu permiso, llama para confirmar el precio final. No reserva ni negocia: eliges tú.',
    niveles: ['ejecuta', 'propone', 'aprueba'],
    preguntas: ['Optimiza los proveedores de la propuesta', '¿Tengo que dar permiso para llamar?'],
  },
  riesgos: {
    id: 'riesgos',
    familia: 'presupuesto',
    nombre: 'Riesgos de producción',
    etiqueta: 'Riesgos',
    codigo: 'RG',
    rol: 'Vigila el plan de rodaje y avisa de lo que puede alterarlo.',
    hace: 'Cruza el plan con el tiempo, convocatorias, permisos y órdenes del día; avisa con antelación, propone una respuesta y calcula el impacto. Cambiar el plan lo decide el line producer; apartar dinero o asumir el riesgo, producción ejecutiva.',
    niveles: ['ejecuta', 'propone', 'aprueba'],
    preguntas: [PREGUNTA['RG-1'], '¿Qué riesgos hay para las próximas jornadas?'],
    exploratorio: true,
  },
}

// Familias de la marca Filmpilot: cada una tiene su glifo (src/brand/glifos.js).
// El Orquestador no pertenece a ninguna: lleva el símbolo de Filmpilot.
export const FAMILIAS = {
  presupuesto: { id: 'presupuesto', nombre: 'Presupuesto', descriptor: 'Prepara la propuesta, busca proveedores y vigila coste y rodaje.' },
  financiacion: { id: 'financiacion', nombre: 'Financiación', descriptor: 'Cuadra cada pago con su pedido y anticipa la caja.' },
  documentacion: { id: 'documentacion', nombre: 'Documentación', descriptor: 'Lee facturas, redacta informes y prepara el dossier fiscal.' },
}

export const ORDEN_FAMILIAS = ['presupuesto', 'financiacion', 'documentacion']

export const ORDEN_AGENTES = ['orquestador', 'presupuesto', 'proveedores', 'facturas', 'conciliacion', 'excepciones', 'prevision', 'costes', 'informes', 'cumplimiento', 'riesgos']

/** Agentes de una familia, en el orden de ORDEN_AGENTES. */
export function agentesDeFamilia(familia) {
  return ORDEN_AGENTES.filter((id) => AGENTES[id].familia === familia)
}

// Contrato AUTONOMIA: cómo actúa un agente, con nombres para personas.
// { id, etiqueta, corta (insignia compacta), nivel (1-3), descripcion }
export const AUTONOMIA = {
  ejecuta: {
    id: 'ejecuta',
    etiqueta: 'Lo hace solo',
    corta: 'Lo hace solo',
    nivel: 1,
    descripcion: 'Es rutinario y reversible: lo hace y queda registrado.',
  },
  propone: {
    id: 'propone',
    etiqueta: 'Te lo propone',
    corta: 'Te lo propone',
    nivel: 2,
    descripcion: 'Lo deja preparado y espera tu sí.',
  },
  aprueba: {
    id: 'aprueba',
    etiqueta: 'Pide tu aprobación',
    corta: 'Tu aprobación',
    nivel: 3,
    descripcion: 'Hay dinero o riesgo: no sigue sin la persona responsable.',
  },
}

// Duraciones de cada tipo de paso a ritmo normal (ms). Solo afectan a la animación.
export const DURACIONES = {
  plan: 650,
  lectura: 900,
  ocr: 1300,
  conciliacion: 1000,
  calculo: 850,
  revision: 900,
  redaccion: 1200,
  llamada: 2400,
  bloque: 140,
}
