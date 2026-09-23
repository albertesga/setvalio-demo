import { CAPITULOS_TOTAL } from './data.js'

// Los importes reales son datos de demo; el presupuesto siempre viene del proyecto activo.
export function costeProyectoDemo(proyecto) {
  const presupuestoPorId = new Map((proyecto?.presupuestoCapitulos || []).map((c) => [c.id, c]))
  const capitulos = CAPITULOS_TOTAL.map((real) => {
    const plan = presupuestoPorId.get(real.id)
    const presupuesto = plan?.importe ?? real.presupuesto
    const proyeccion = real.cef
    const desviacion = proyeccion - presupuesto
    const desviacionPct = presupuesto ? desviacion / presupuesto : 0

    return {
      id: real.id,
      nombre: plan?.nombre || real.nombre,
      presupuesto,
      comprometido: real.comprometido,
      gastado: real.gastado,
      proyeccion,
      cef: proyeccion,
      desviacion,
      desviacionPct,
      fueraRango: desviacionPct > 0.08,
    }
  })

  const totales = capitulos.reduce(
    (acc, c) => ({
      presupuesto: acc.presupuesto + c.presupuesto,
      comprometido: acc.comprometido + c.comprometido,
      gastado: acc.gastado + c.gastado,
      proyeccion: acc.proyeccion + c.proyeccion,
    }),
    { presupuesto: 0, comprometido: 0, gastado: 0, proyeccion: 0 },
  )

  totales.cef = totales.proyeccion
  totales.desviacion = totales.cef - totales.presupuesto
  totales.desviacionPct = totales.presupuesto ? totales.desviacion / totales.presupuesto : 0
  totales.ejecucionPresupuestoPct = totales.presupuesto ? totales.gastado / totales.presupuesto : 0
  totales.disponible = totales.cef - totales.gastado - totales.comprometido

  return { capitulos, totales }
}
