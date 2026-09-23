import { useEffect, useMemo, useState } from 'react'
import { eur, eurSigned, pctSigned } from '../lib/format.js'
import { Card, KPI, Chip, PageHeader, Th, Td, Button, EmptyState } from '../components/ui.jsx'
import { IconAlert, IconChevronRight, IconDownload, IconClock, IconLocation, IconCoste } from '../components/icons.jsx'
import { capaD3 } from '../lib/proyectos.js'
import { PROYECTO_DEMO_ID } from '../lib/data.js'
import { costeProyectoDemo } from '../lib/coste.js'

// El día de rodaje del demo (15/30) vive en el proyecto; aquí se replica como
// referencia interna del burn chart. Si cambia proyecto.diaActual, actualízalo.
const RODAJE = {
  diaActual: 15,
  diasRodaje: 30,
}

const TABS = [
  { id: 'capitulo', label: 'Por capítulo' },
  { id: 'dia', label: 'Por día' },
  { id: 'localizacion', label: 'Por localización' },
]

function costePorDia(totales) {
  return Array.from({ length: 15 }, (_, idx) => {
    const dia = idx + 1
    const previsto = Math.round((totales.presupuesto / RODAJE.diasRodaje) * dia)
    const factor = dia < 10 ? 0.98 + dia * 0.002 : 1.005 + (dia - 10) * 0.006
    const real = dia === RODAJE.diaActual ? totales.gastado : Math.round(previsto * factor)
    return { dia, previsto, real, delta: real - previsto }
  })
}

const LOCALIZACIONES = [
  { nombre: 'Madrid centro · interiores', presupuestoBase: 690_000, gastado: 345_000, estado: 'En rango' },
  { nombre: 'Teatro Apolo · decorado', presupuestoBase: 520_000, gastado: 296_000, estado: 'Vigilar' },
  { nombre: 'Exteriores Madrid', presupuestoBase: 430_000, gastado: 228_000, estado: 'En rango' },
  { nombre: 'Canarias · scouting y bloque 2', presupuestoBase: 510_000, gastado: 245_000, estado: 'Desviado' },
  { nombre: 'Postproducción inicial', presupuestoBase: 250_000, gastado: 62_000, estado: 'En rango' },
]

function pctCoste(n) {
  return `${(n * 100).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

function puntosPath(datos, key, max, width, height, pad, diasRodaje = RODAJE.diasRodaje) {
  return datos
    .map((d) => {
      const x = pad + ((d.dia - 1) / (diasRodaje - 1)) * (width - pad * 2)
      const y = height - pad - (d[key] / max) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function estadoLocalizacionTone(estado) {
  if (estado === 'Desviado') return 'negative'
  if (estado === 'Vigilar') return 'warning'
  return 'neutral'
}

export default function Coste({ proyecto, pushToast, onNavigate, contexto }) {
  const [tab, setTab] = useState('capitulo')
  const { capitulos, totales } = useMemo(() => costeProyectoDemo(proyecto), [proyecto])
  const costeDia = useMemo(() => costePorDia(totales), [totales])
  const capituloActivoId = contexto?.capituloId
  const capituloActivo = capitulos.find((c) => c.id === capituloActivoId)

  const desviacionTotal = totales.proyeccion - totales.presupuesto
  const desviacionTotalPct = totales.presupuesto ? desviacionTotal / totales.presupuesto : 0
  const recurrente = capaD3(proyecto) === 'recurrente'
  const sinDatos = proyecto && proyecto.id !== PROYECTO_DEMO_ID

  useEffect(() => {
    if (capituloActivoId) setTab('capitulo')
  }, [capituloActivoId])

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Control de costes"
        subtitle="Corte de la demo: 01/06/2026, 21:30"
        actions={
          <Button variant="secondary" onClick={() => onNavigate?.('presupuesto')}>
            Editar presupuesto
          </Button>
        }
      />

      {sinDatos ? (
        <EmptyState
          icon={IconCoste}
          title="Sin gasto real cargado"
          action={<Button variant="accent" onClick={() => onNavigate?.('presupuesto')}>Ver presupuesto</Button>}
        >
          El presupuesto ya está disponible. El gasto y la proyección aparecerán cuando se registren facturas y partes.
        </EmptyState>
      ) : (
        <>
      {capituloActivo && (
        <Card className="mb-3 border-[var(--accent)] bg-[var(--accent-soft)]/45 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-2xs font-semibold text-[color:var(--accent)]">Capítulo seleccionado</div>
              <div className="mt-0.5 text-sm font-bold text-ink">{capituloActivo.id} {capituloActivo.nombre}</div>
              <p className="mt-1 text-xs text-muted">
                Presupuesto {eur(capituloActivo.presupuesto)} · gastado {eur(capituloActivo.gastado)} · proyección {eur(capituloActivo.proyeccion)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => onNavigate?.('compras', { capituloId: capituloActivo.id })}>Ver órdenes</Button>
              <Button size="sm" variant="secondary" onClick={() => onNavigate?.('facturas', { capituloId: capituloActivo.id })}>Ver gastos</Button>
              <Button size="sm" variant="accent" onClick={() => onNavigate?.('elegibilidad', { capituloId: capituloActivo.id })}>Ver base fiscal</Button>
            </div>
          </div>
        </Card>
      )}

      {recurrente ? (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          <IconAlert size={16} className="mt-0.5 shrink-0" />
          <span>El control de «{proyecto?.titulo}» es por temporada/programa (presupuesto recurrente), no por obra única.</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KPI label="Presupuesto" value={eur(totales.presupuesto)} sub="Aprobado" />
        <KPI label="Comprometido" value={eur(totales.comprometido)} sub="Pedidos y contratos" />
        <KPI label="Gastado a hoy" value={eur(totales.gastado)} sub={pctCoste(totales.presupuesto ? totales.gastado / totales.presupuesto : 0)} />
        <KPI label="Día de rodaje" value={`${RODAJE.diaActual}/${RODAJE.diasRodaje}`} sub="Mitad del plan" />
        <div className="col-span-2 xl:col-span-1">
          <KPI
            label="Proyección a cierre"
            value={eur(totales.proyeccion)}
            tone={desviacionTotal > 0 ? 'text-warning' : 'text-ink'}
            footer={<Chip tone={desviacionTotal > 0 ? 'warning' : 'positive'} dot>{pctSigned(desviacionTotalPct)} ({eurSigned(desviacionTotal)})</Chip>}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <PanelAlertas capitulos={capitulos} totales={totales} />
        <BurnChart totales={totales} costeDia={costeDia} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id ? 'bg-[var(--accent)] text-[color:var(--accent-contrast)]' : 'border border-line bg-canvas text-muted hover:bg-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'capitulo' && <TablaCapitulos capitulos={capitulos} totales={totales} capituloActivoId={capituloActivoId} onNavigate={onNavigate} />}
      {tab === 'dia' && <TablaDias costeDia={costeDia} />}
      {tab === 'localizacion' && <TablaLocalizaciones presupuestoTotal={totales.presupuesto} />}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button variant="primary" onClick={() => pushToast?.('Generando informe de coste… (demo)')}>Generar informe de coste</Button>
        <Button variant="secondary" icon={IconDownload} onClick={() => pushToast?.('Exportando a Movie Magic Budgeting… (demo)')}>Exportar a Movie Magic Budgeting</Button>
      </div>
        </>
      )}
    </div>
  )
}

function PanelAlertas({ capitulos, totales }) {
  const alertas = capitulos
    .filter((c) => c.desviacionPct > 0.08)
    .sort((a, b) => b.desviacion - a.desviacion)
    .slice(0, 2)
    .map((c) => ({ tone: 'negative', texto: `${c.id} ${c.nombre}: ${pctSigned(c.desviacionPct)} sobre presupuesto` }))
  if (totales.desviacion > 0) {
    alertas.push({ tone: 'warning', texto: `Cierre previsto: ${eurSigned(totales.desviacion)} sobre presupuesto` })
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Alertas de coste</h2>
        <Chip tone={alertas.length ? 'warning' : 'positive'} dot>{alertas.length ? `${alertas.length} activas` : 'En rango'}</Chip>
      </div>
      <div className="space-y-2">
        {alertas.map((a) => (
          <div
            key={a.texto}
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${
              a.tone === 'negative'
                ? 'border-negative/25 bg-negative-soft text-negative'
                : 'border-warning/30 bg-warning-soft text-warning'
            }`}
          >
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            <span className="leading-relaxed">{a.texto}</span>
          </div>
        ))}
        {alertas.length === 0 && <p className="py-3 text-xs text-muted">No hay desviaciones superiores al 8 % ni sobrecoste previsto.</p>}
      </div>
    </Card>
  )
}

function BurnChart({ totales, costeDia }) {
  const width = 760
  const height = 230
  const pad = 28
  const max = Math.max(2_650_000, totales.proyeccion * 1.05, totales.presupuesto * 1.05)
  const previsto = Array.from({ length: RODAJE.diasRodaje }, (_, idx) => ({
    dia: idx + 1,
    valor: Math.round((totales.presupuesto / RODAJE.diasRodaje) * (idx + 1)),
  }))
  const real = costeDia.map((d) => ({ dia: d.dia, valor: d.real }))
  const proyeccion = [
    { dia: RODAJE.diaActual, valor: totales.gastado },
    ...Array.from({ length: 15 }, (_, idx) => {
      const dia = idx + 16
      const span = (dia - 15) / 15
      return { dia, valor: Math.round(totales.gastado + (totales.proyeccion - totales.gastado) * span) }
    }),
  ]

  const previstoPath = puntosPath(previsto, 'valor', max, width, height, pad)
  const realPath = puntosPath(real, 'valor', max, width, height, pad)
  const proyeccionPath = puntosPath(proyeccion, 'valor', max, width, height, pad)

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-extrabold text-ink">Burn de rodaje</h2>
        <div className="flex flex-wrap items-center gap-3 text-2xs font-bold text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-line-strong" /> Previsto</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-[var(--accent)]" /> Real</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-negative" /> Proyección</span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px]" role="img" aria-label="Burn de rodaje real frente a previsto">
          {[0, 0.25, 0.5, 0.75, 1].map((n) => {
            const y = height - pad - n * (height - pad * 2)
            return (
              <g key={n}>
                <line x1={pad} y1={y} x2={width - pad} y2={y} stroke="#DED2D8" strokeWidth="1" />
                <text x="4" y={y + 4} className="fill-faint text-[10px] font-semibold">
                  {n === 0 ? '0' : `${(max * n / 1e6).toFixed(1)}M`}
                </text>
              </g>
            )
          })}
          {[1, 10, 15, 20, 30].map((dia) => {
            const x = pad + ((dia - 1) / 29) * (width - pad * 2)
            return (
              <g key={dia}>
                <line x1={x} y1={pad} x2={x} y2={height - pad} stroke="#F4F1E8" strokeWidth="1" />
                <text x={x - 8} y={height - 8} className="fill-faint text-[10px] font-semibold">
                  {dia}
                </text>
              </g>
            )
          })}
          <polyline points={previstoPath} fill="none" stroke="#A895A1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={realPath} fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={proyeccionPath} fill="none" stroke="#A8383D" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" />
          <circle
            cx={pad + ((RODAJE.diaActual - 1) / (RODAJE.diasRodaje - 1)) * (width - pad * 2)}
            cy={height - pad - (totales.gastado / max) * (height - pad * 2)}
            r="5"
            fill="var(--accent)"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <text x={width - 116} y={pad + 12} className="fill-muted text-[11px] font-semibold">
            Día 15 · {eur(totales.gastado)}
          </text>
        </svg>
      </div>
    </Card>
  )
}

function TablaCapitulos({ capitulos, totales, capituloActivoId, onNavigate }) {
  const desviacionTotal = totales.proyeccion - totales.presupuesto
  const desviacionTotalPct = totales.presupuesto ? desviacionTotal / totales.presupuesto : 0
  return (
    <Card className="mt-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Coste por capítulo</h2>
          <p className="text-2xs text-faint">Corte demo 01/06/2026, 21:30 · 18 facturas + 6 partes diarios.</p>
        </div>
        <span className="text-2xs text-faint">{capitulos.length} capítulos ICAA</span>
      </div>
      <div className="mt-2 overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1140px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Capítulo</Th>
                <Th align="right">Presupuesto</Th>
                <Th align="right">Comprometido</Th>
                <Th align="right">Gastado real</Th>
                <Th align="right">Desviación</Th>
                <Th align="right">Proyección a cierre</Th>
                <Th align="right">Conectar</Th>
              </tr>
            </thead>
            <tbody>
            {capitulos.map((c) => {
              const activo = c.id === capituloActivoId
              return (
              <tr key={c.id} className={`border-t border-line ${activo ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]' : c.fueraRango ? 'bg-negative-soft/45' : 'hover:bg-surface/70'}`}>
                <Td>
                  <span className="inline-flex items-center gap-2.5">
                    <span className="tnum text-2xs font-semibold text-faint">{c.id}</span>
                    <span className={`font-medium ${c.fueraRango ? 'text-negative' : 'text-ink'}`}>{c.nombre}</span>
                  </span>
                </Td>
                <Td align="right" tabular className="text-muted">{eur(c.presupuesto)}</Td>
                <Td align="right" tabular className="text-muted">{eur(c.comprometido)}</Td>
                <Td align="right" tabular className="text-ink">{eur(c.gastado)}</Td>
                <Td align="right" tabular>
                  <span className={c.fueraRango ? 'font-semibold text-negative' : 'text-muted'}>
                    {eurSigned(c.desviacion)} · {pctSigned(c.desviacionPct)}
                  </span>
                </Td>
                <Td align="right" tabular className={`font-semibold ${c.fueraRango ? 'text-negative' : 'text-ink'}`}>
                  {eur(c.proyeccion)}
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => onNavigate?.('compras', { capituloId: c.id })}>Órdenes</Button>
                    <Button size="sm" variant="ghost" onClick={() => onNavigate?.('facturas', { capituloId: c.id })}>Gastos</Button>
                    <Button size="sm" variant="ghost" icon={IconChevronRight} onClick={() => onNavigate?.('elegibilidad', { capituloId: c.id })}>Fiscalidad</Button>
                  </div>
                </Td>
              </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink/10 bg-surface font-semibold">
              <Td className="text-ink">Total proyecto</Td>
              <Td align="right" tabular className="text-ink">{eur(totales.presupuesto)}</Td>
              <Td align="right" tabular className="text-ink">{eur(totales.comprometido)}</Td>
              <Td align="right" tabular className="text-ink">{eur(totales.gastado)}</Td>
              <Td align="right" tabular className="text-negative">{eurSigned(desviacionTotal)} · {pctCoste(desviacionTotalPct)}</Td>
              <Td align="right" tabular className="text-ink">{eur(totales.proyeccion)}</Td>
              <Td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

function TablaDias({ costeDia }) {
  return (
    <Card className="mt-3 overflow-hidden">
      <div className="px-5 pt-4">
        <h2 className="text-sm font-semibold text-ink">Coste por día</h2>
        <p className="text-2xs text-faint">Seguimiento diario acumulado hasta el día 15 de rodaje.</p>
      </div>
      <div className="mt-2 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Día</Th>
              <Th align="right">Previsto acumulado</Th>
              <Th align="right">Real acumulado</Th>
              <Th align="right">Delta</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {costeDia.map((d) => (
              <tr key={d.dia} className={`border-t border-line ${d.dia === RODAJE.diaActual ? 'bg-[var(--accent-soft)]' : 'hover:bg-surface/70'}`}>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <IconClock size={14} className="text-faint" />
                    <span className="font-medium text-ink">Día {d.dia}</span>
                  </span>
                </Td>
                <Td align="right" tabular className="text-muted">{eur(d.previsto)}</Td>
                <Td align="right" tabular className="font-semibold text-ink">{eur(d.real)}</Td>
                <Td align="right" tabular className={d.delta > 0 ? 'text-negative' : 'text-positive'}>{eurSigned(d.delta)}</Td>
                <Td><Chip tone={d.delta > 0 ? 'warning' : 'neutral'} dot>{d.delta > 0 ? 'Sobre previsto' : 'En rango'}</Chip></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function TablaLocalizaciones({ presupuestoTotal }) {
  const factor = presupuestoTotal ? presupuestoTotal / 2_400_000 : 0
  return (
    <Card className="mt-3 overflow-hidden">
      <div className="px-5 pt-4">
        <h2 className="text-sm font-semibold text-ink">Coste por localización</h2>
        <p className="text-2xs text-faint">Lectura de producción por bloques principales de rodaje.</p>
      </div>
      <div className="mt-2 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[660px] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Localización</Th>
              <Th align="right">Presupuesto asignado</Th>
              <Th align="right">Gastado</Th>
              <Th align="right">% ejecución</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {LOCALIZACIONES.map((l) => {
              const presupuesto = Math.round(l.presupuestoBase * factor)
              return (
              <tr key={l.nombre} className="border-t border-line hover:bg-surface/70">
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <IconLocation size={14} className="text-faint" />
                    <span className="font-medium text-ink">{l.nombre}</span>
                  </span>
                </Td>
                <Td align="right" tabular className="text-muted">{eur(presupuesto)}</Td>
                <Td align="right" tabular className="font-semibold text-ink">{eur(l.gastado)}</Td>
                <Td align="right" tabular className="text-muted">{pctCoste(presupuesto ? l.gastado / presupuesto : 0)}</Td>
                <Td><Chip tone={estadoLocalizacionTone(l.estado)} dot>{l.estado}</Chip></Td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
