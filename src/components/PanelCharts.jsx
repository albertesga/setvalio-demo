import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, ReferenceLine, Tooltip } from 'recharts'
import { eur, eurSigned } from '../lib/format.js'

const VERDE = '#236847'
const ROJO = '#A8383D'

/** Los importes operativos se muestran completos desde el primer fotograma. */
export function Contador({ value, format = (v) => Math.round(v), className }) {
  return <span className={className}>{format(value)}</span>
}

/** Barra-termómetro: gastado · comprometido · estimación restante, con marca de presupuesto. */
export function TermometroCoste({ gastado, comprometido, cef, presupuesto }) {
  const pGast = (gastado / cef) * 100
  const pComp = (comprometido / cef) * 100
  const marca = (presupuesto / cef) * 100
  return (
    <div className="relative pt-5">
      {/* marca de presupuesto */}
      <div className="absolute top-0 bottom-1.5 z-10" style={{ left: `${marca}%` }}>
        <span className="absolute -left-px top-0 h-full w-px bg-ink/30" style={{ borderLeft: '1px dashed rgba(24,37,31,0.45)' }} />
        <span className="absolute -top-0 right-2 whitespace-nowrap text-[10px] font-semibold text-muted">Presupuesto</span>
      </div>
      <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="absolute inset-y-0 left-0"
          style={{ backgroundColor: VERDE, width: `${pGast}%` }}
        />
        <div
          className="absolute inset-y-0 bg-[var(--accent-soft)]"
          style={{ left: `${pGast}%`, width: `${pComp}%` }}
        />
      </div>
    </div>
  )
}

/** Mayores desviaciones por capítulo, barras divergentes legibles de inmediato. */
export function DesviacionesMovers({ movers, maxMover, onSelect }) {
  return (
    <div className="space-y-1">
      {movers.map((c) => {
        const over = c.desviacion > 0
        const w = (Math.abs(c.desviacion) / maxMover) * 50
        return (
          <button
            key={c.id}
            onClick={() => onSelect?.(c)}
            className="group flex w-full items-center gap-2 rounded-2xl px-2 py-2 text-left transition hover:bg-surface sm:gap-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] bg-surface text-[10px] font-extrabold text-faint group-hover:bg-canvas">
              {c.id}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink sm:w-36 sm:flex-none">{c.nombre}</span>
            <span className="relative hidden h-2.5 flex-1 items-center sm:flex">
              <span className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-x-1/2 -translate-y-1/2 bg-line" />
              <span
                className="absolute top-1/2 h-2.5 -translate-y-1/2"
                style={{
                  backgroundColor: over ? ROJO : VERDE,
                  [over ? 'left' : 'right']: '50%',
                  borderRadius: over ? '0 9999px 9999px 0' : '9999px 0 0 9999px',
                  width: `${w}%`,
                }}
              />
            </span>
            <span
              className={`tnum w-[88px] shrink-0 rounded-full px-2 py-0.5 text-right text-2xs font-bold ${
                over ? 'bg-negative-soft text-negative' : 'bg-positive-soft text-positive'
              }`}
            >
              {eurSigned(c.desviacion)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TooltipTesoreria({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-2xl border border-line bg-canvas px-3 py-2 shadow-modal">
      <div className="text-2xs font-extrabold text-ink">{p.full}</div>
      <div className="text-[10px] font-semibold text-faint">{p.fechas}</div>
      <div className={`tnum mt-0.5 text-sm font-extrabold ${p.saldo < 0 ? 'text-negative' : 'text-ink'}`}>{eurSigned(p.saldo)}</div>
    </div>
  )
}

/** Resumen textual del gráfico para lectores de pantalla. */
function resumenTesoreria(data) {
  if (!data?.length) return 'Previsión de caja semanal.'
  const inicio = data[0]
  const fin = data[data.length - 1]
  const negativos = data.filter((d) => d.saldo < 0)
  let s = `Gráfico de previsión de caja semanal. Saldo inicial ${eur(inicio.saldo)} (${inicio.full || inicio.name}); saldo final ${eur(fin.saldo)} (${fin.full || fin.name}).`
  if (negativos.length) {
    s += ` Entra en negativo en ${negativos.map((d) => `${d.full || d.name}, ${eurSigned(d.saldo)}`).join('; ')}.`
  } else {
    s += ' El saldo se mantiene positivo todas las semanas.'
  }
  return s
}

/** Gráfico de barras de tesorería (recharts): saldo semanal, positivo/negativo. */
export function GraficoTesoreria({ data }) {
  return (
    <div role="img" aria-label={resumenTesoreria(data)}>
    <ResponsiveContainer width="100%" height={184}>
      <BarChart data={data} margin={{ top: 16, right: 6, left: 6, bottom: 0 }} barCategoryGap="26%">
        <ReferenceLine y={0} stroke="#DED2D8" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 10, fill: '#6B5965', fontWeight: 600 }}
          height={18}
        />
        <Tooltip cursor={{ fill: 'rgba(49,27,46,0.06)' }} content={<TooltipTesoreria />} />
        <Bar dataKey="saldo" radius={[9, 9, 9, 9]} maxBarSize={34} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.saldo >= 0 ? VERDE : ROJO} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
