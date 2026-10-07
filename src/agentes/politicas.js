// Reglas de autonomía. Son las que ya usa la demo clásica:
// - desviación de capítulo por encima del 8 % (src/lib/coste.js, Compras)
// - orden de compra de más de 10.000 € (Compras)
// - gasto no electrónico con confianza por debajo del 80 % (Facturas)

export const POLITICAS = {
  umbralDesviacion: 0.08,
  umbralImporteOc: 10_000,
  umbralConfianza: 0.8,
  toleranciaConciliacion: 0.01,
}

export const ROLES = {
  produccionEjecutiva: 'Producción ejecutiva',
  lineProducer: 'Line producer',
  fiscalista: 'Fiscalista',
  revisionHumana: 'Line producer o producción ejecutiva',
}

// Qué decisiones puede tomar cada persona de la demo.
const PUEDE = {
  'Producción ejecutiva': new Set([ROLES.produccionEjecutiva, ROLES.lineProducer, ROLES.revisionHumana]),
  'Line producer': new Set([ROLES.lineProducer, ROLES.revisionHumana]),
}

export function puedeDecidir(rolPersona, rolDecision) {
  return PUEDE[rolPersona]?.has(rolDecision) ?? false
}

/** Nivel de autonomía y responsable de una orden de compra según su impacto. */
export function nivelOrden({ importe, desviacionPctDespues }) {
  const motivos = []
  if (importe > POLITICAS.umbralImporteOc) motivos.push('importe')
  if (desviacionPctDespues > POLITICAS.umbralDesviacion) motivos.push('umbral')
  const rol = motivos.includes('umbral') ? ROLES.produccionEjecutiva : ROLES.lineProducer
  return { nivel: motivos.length ? 'aprueba' : 'propone', motivos, rol }
}

export function confianzaBaja(doc) {
  if (!doc.confianza) return false
  const valores = Object.values(doc.confianza)
  return valores.some((c) => c < POLITICAS.umbralConfianza)
}
