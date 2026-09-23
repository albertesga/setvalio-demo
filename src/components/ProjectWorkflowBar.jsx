import { Chip } from './ui.jsx'
import { IconChevronRight } from './icons.jsx'
import { eur, pct } from '../lib/format.js'
import { etiquetaEstado, toneEstado } from '../lib/proyectos.js'
import { PROYECTO_DEMO_ID, TOTALES } from '../lib/data.js'

const NEXT_STEPS = {
  presupuesto: { route: 'incentivos', label: 'Optimizar retorno' },
  incentivos: { route: 'ayudas', label: 'Combinar ayudas' },
  escenarios: { route: 'ayudas', label: 'Comparar ayudas' },
  ayudas: { route: 'tesoreria', label: 'Revisar caja' },
  tesoreria: { route: 'compras', label: 'Revisar compras' },
  compras: { route: 'coste', label: 'Ver impacto en costes' },
  coste: { route: 'facturas', label: 'Clasificar gastos' },
  proveedores: { route: 'compras', label: 'Revisar órdenes' },
  facturas: { route: 'elegibilidad', label: 'Validar fiscalidad' },
  elegibilidad: { route: 'documental', label: 'Resolver dossier' },
  documental: { route: 'informes', label: 'Preparar informes' },
  informes: { route: 'despacho', label: 'Abrir despacho' },
}

function StatusMetric({ label, value, tone = 'text-ink' }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 border-l border-line pl-3 text-xs">
      <span className="text-muted">{label}</span>
      <strong className={`tnum font-semibold ${tone}`}>{value}</strong>
    </span>
  )
}

export default function ProjectWorkflowBar({ proyecto, route, onNavigate }) {
  if (!proyecto || ['proyectos', 'despacho', 'design-system'].includes(route)) return null

  const demo = proyecto.id === PROYECTO_DEMO_ID
  const gastoPct = demo && proyecto.presupuesto ? TOTALES.gastado / proyecto.presupuesto : null
  const rodaje = proyecto.diaActual != null && proyecto.diasRodaje != null
  const next = route === 'panel'
    ? demo && TOTALES.cef > proyecto.presupuesto
      ? { route: 'coste', label: 'Revisar desviación' }
      : { route: 'presupuesto', label: 'Revisar presupuesto' }
    : NEXT_STEPS[route]

  return (
    <section aria-label="Estado del proyecto" className="fp-shell-surface z-20 mx-3 rounded-xl border border-line bg-canvas px-3 py-2 lg:sticky lg:top-[92px] lg:mx-0 lg:px-4">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
        <div className="fp-status-scroll flex min-w-0 items-center gap-3 overflow-x-auto whitespace-nowrap py-1">
          <Chip tone={toneEstado(proyecto.estado)} dot>{etiquetaEstado(proyecto.estado)}</Chip>
          <StatusMetric label="Presupuesto" value={eur(proyecto.presupuesto)} />
          {gastoPct != null && <StatusMetric label="Gastado" value={pct(gastoPct)} tone={gastoPct > 0.5 ? 'text-warning' : 'text-ink'} />}
          {rodaje && <StatusMetric label="Rodaje" value={`${proyecto.diaActual}/${proyecto.diasRodaje}`} />}
          {demo && <Chip tone="negative" dot>3 bloqueantes</Chip>}
        </div>
        {next && (
          <button
            type="button"
            onClick={() => onNavigate?.(next.route)}
            className="inline-flex min-h-11 shrink-0 items-center justify-between gap-2 rounded-md px-2 text-left text-xs font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <span><span className="text-muted">Siguiente: </span>{next.label}</span>
            <IconChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}
