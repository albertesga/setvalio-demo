import {
  SALDO_HOY,
  CASHFLOW_PROYECTADO,
  PCT_CANARIAS_DEFECTO,
  PROYECTO_DEMO_ID,
} from '../lib/data.js'
import { costeProyectoDemo } from '../lib/coste.js'
import { calcularEscenario } from '../lib/incentivos.js'
import { etiquetaTipologia, aplicaV2 } from '../lib/proyectos.js'
import { eur, eurSigned, pct, pctSigned } from '../lib/format.js'
import {
  Card,
  KPI,
  Delta,
  ProgressBar,
  SectionTitle,
  Button,
  toneForDesviacion,
} from '../components/ui.jsx'
import {
  IconChevronRight,
  IconAlert,
  IconCheckCircle,
  IconSparkle,
  IconClock,
  IconCoste,
  IconTesoreria,
} from '../components/icons.jsx'
import { Contador, TermometroCoste, DesviacionesMovers, GraficoTesoreria } from '../components/PanelCharts.jsx'

function EmptyInline({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] border border-line bg-surface text-[color:var(--accent)]">
        <Icon size={20} />
      </div>
      <p className="font-display text-base font-extrabold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-2xs font-medium leading-relaxed text-muted">{children}</p>
    </div>
  )
}

// Checklist de primer uso para proyectos aún sin datos cargados.
function OnboardingPasos({ proyecto, tieneTaxCredit, onNavigate }) {
  const pasos = [
    { done: true, titulo: 'Proyecto creado', desc: proyecto?.titulo, cta: null },
    {
      done: false,
      titulo: tieneTaxCredit ? 'Optimiza tus incentivos' : 'Revisa ayudas y financiación',
      desc: tieneTaxCredit ? 'Compara territorios y deducción.' : 'Consulta las ayudas disponibles.',
      cta: { label: tieneTaxCredit ? 'Optimizar incentivos' : 'Ver ayudas', destino: tieneTaxCredit ? 'incentivos' : 'ayudas' },
    },
    {
      done: false,
      titulo: 'Revisa el presupuesto',
      desc: 'Ajusta los capítulos ICAA del proyecto.',
      cta: { label: 'Abrir presupuesto', destino: 'presupuesto' },
    },
  ]
  return (
    <Card className="mt-4 p-5">
      <SectionTitle>Primeros pasos</SectionTitle>
      <div className="divide-y divide-line">
        {pasos.map((p, i) => (
          <div key={i} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold ${
                  p.done ? 'bg-positive text-canvas' : 'bg-[var(--accent-soft)] text-[color:var(--accent)]'
                }`}
              >
                {p.done ? <IconCheckCircle size={16} /> : i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{p.titulo}</span>
                <span className="block text-xs text-muted">{p.desc}</span>
              </span>
            </div>
            {p.cta ? (
              <Button variant="secondary" size="sm" className="w-fit sm:shrink-0" onClick={() => onNavigate(p.cta.destino)}>
                {p.cta.label}
              </Button>
            ) : (
              <span className="text-xs font-semibold text-positive">Completado</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function PanelIntro({ proyecto, conDatos, totales, tieneTaxCredit, onNavigate }) {
  const revisarCoste = conDatos && totales.desviacion > 0
  return (
    <div className="mb-5 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight text-ink md:text-[2rem]">{proyecto?.titulo}</h1>
        <p className="mt-1 text-sm text-muted">{proyecto?.productora} · {etiquetaTipologia(proyecto?.tipologia)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => onNavigate(revisarCoste ? 'coste' : 'presupuesto')}>
          {revisarCoste ? 'Revisar desviación' : 'Revisar presupuesto'}
        </Button>
        <Button variant="secondary" onClick={() => onNavigate(tieneTaxCredit ? 'incentivos' : 'ayudas')}>
          {tieneTaxCredit ? 'Optimizar retorno' : 'Ver ayudas'}
        </Button>
      </div>
    </div>
  )
}

export default function Panel({ proyecto, onNavigate }) {
  // Solo el proyecto de demostración tiene datos de coste/tesorería cargados.
  const conDatos = proyecto?.id === PROYECTO_DEMO_ID
  const tieneTaxCredit = aplicaV2(proyecto)
  const incentivo = tieneTaxCredit ? calcularEscenario(proyecto?.presupuesto ?? 0, PCT_CANARIAS_DEFECTO) : null

  const enRodaje = proyecto?.diaActual != null && proyecto?.diasRodaje != null
  const rodajePct = enRodaje ? proyecto.diaActual / proyecto.diasRodaje : 0
  const { capitulos, totales } = costeProyectoDemo(proyecto)
  const cefTone = toneForDesviacion(totales.desviacionPct)

  // Capítulos ordenados por magnitud de desviación.
  const movers = [...capitulos]
    .filter((c) => Math.abs(c.desviacion) >= 1000)
    .sort((a, b) => Math.abs(b.desviacion) - Math.abs(a.desviacion))
    .slice(0, 5)
  const maxMover = Math.max(...movers.map((c) => Math.abs(c.desviacion)), 1)

  const semanasNegativas = CASHFLOW_PROYECTADO.filter((s) => s.saldo < 0)
  const tesoreriaData = CASHFLOW_PROYECTADO.map((s) => ({
    name: s.semana.replace('Rodaje', 'Rod.').replace('Liquidación', 'Liq.'),
    full: s.semana,
    fechas: s.fechas,
    saldo: s.saldo,
  }))

  const avisos = []
  if (conDatos) {
    const capituloCritico = capitulos.filter((c) => c.desviacionPct > 0.08).sort((a, b) => b.desviacion - a.desviacion)[0]
    if (totales.desviacion > 0) {
      avisos.push({ tone: 'negative', texto: `Cierre previsto: ${eurSigned(totales.desviacion)} sobre presupuesto`, destino: 'coste', cta: 'Ver coste' })
    }
    if (capituloCritico) {
      avisos.push({
        tone: 'warning',
        texto: `${capituloCritico.id} ${capituloCritico.nombre}: ${pctSigned(capituloCritico.desviacionPct)}`,
        destino: 'coste',
        contexto: { capituloId: capituloCritico.id },
        cta: 'Ver capítulo',
      })
    }
    avisos.push(
      { tone: 'warning', texto: 'Ferretería El Tornillo: revisar clasificación', destino: 'facturas', contexto: { capituloId: '04', gastoId: 'g-004' }, cta: 'Abrir gasto' },
    )
  }
  if (tieneTaxCredit && incentivo) {
    avisos.push({
      tone: 'primary',
      texto: `Escenario Canarias: ${eurSigned(incentivo.beneficioCanarias)} estimados`,
      destino: 'incentivos',
      cta: 'Comparar',
    })
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PanelIntro proyecto={proyecto} conDatos={conDatos} totales={totales} tieneTaxCredit={tieneTaxCredit} onNavigate={onNavigate} />

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KPI label="Presupuesto" value={eur(proyecto?.presupuesto)} sub={`${capitulos.length} capítulos ICAA`} />
        <KPI
          label="Gastado a hoy"
          value={conDatos ? eur(totales.gastado) : '—'}
          sub={conDatos ? `${pct(totales.ejecucionPresupuestoPct)} del presupuesto` : 'Sin gastos cargados'}
        />
        <KPI
          label="Cierre previsto"
          value={conDatos ? eur(totales.cef) : '—'}
          tone={conDatos && cefTone === 'negative' ? 'text-negative' : 'text-ink'}
          footer={conDatos ? <Delta value={totales.desviacion} format={eurSigned} /> : null}
          sub={conDatos ? `${pctSigned(totales.desviacionPct)} frente al presupuesto` : 'Sin previsión de coste'}
        />
        <KPI
          label="Avance de rodaje"
          value={enRodaje ? `${proyecto.diaActual} / ${proyecto.diasRodaje} días` : '—'}
          sub={enRodaje ? `${pct(rodajePct)} completado` : 'Sin rodaje en curso'}
          footer={<ProgressBar value={rodajePct} tone="primary" />}
        />
      </div>

      {!conDatos && <OnboardingPasos proyecto={proyecto} tieneTaxCredit={tieneTaxCredit} onNavigate={onNavigate} />}

      {/* Control de coste + avisos */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            right={
              conDatos ? (
                <button
                  onClick={() => onNavigate('coste')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--accent)] hover:underline"
                >
                  Ver detalle <IconChevronRight size={14} />
                </button>
              ) : null
            }
          >
            Coste por capítulo
          </SectionTitle>

          {!conDatos ? (
            <EmptyInline icon={IconCoste} title="Aún sin datos de coste">
              Aún no hay gasto real cargado para este proyecto.
            </EmptyInline>
          ) : (
          <>
          {/* Termómetro: gastado · comprometido · estimación restante, frente al presupuesto */}
          <div className="mt-1">
            <TermometroCoste
              gastado={totales.gastado}
              comprometido={totales.comprometido}
              cef={totales.cef}
              presupuesto={totales.presupuesto}
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-muted">
              <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-positive" /> Gastado {eur(totales.gastado)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-soft)] ring-1 ring-[color:var(--accent)]/30" /> Comprometido {eur(totales.comprometido)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" /> Estimación restante {eur(totales.disponible)}
              </span>
            </div>
          </div>

          {/* Movers */}
          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-faint">
              Mayores desviaciones por capítulo
            </div>
            <DesviacionesMovers movers={movers} maxMover={maxMover} onSelect={(capitulo) => onNavigate('coste', { capituloId: capitulo.id })} />
          </div>
          </>
          )}
        </Card>

        {/* Avisos */}
        <Card className="flex flex-col p-5">
          <SectionTitle>Avisos</SectionTitle>
          {avisos.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
              <IconCheckCircle size={22} className="text-positive" />
              <p className="mt-2 text-sm font-semibold text-ink">Sin avisos por ahora</p>
              <p className="mt-1 text-2xs text-muted">No hay desviaciones ni vencimientos que requieran tu atención.</p>
            </div>
          ) : (
          <div className="flex flex-1 flex-col gap-2">
            {avisos.map((a, i) => (
              <button
                key={i}
                onClick={() => onNavigate(a.destino, a.contexto)}
                className="group flex items-start gap-2.5 rounded-2xl border border-line bg-canvas/75 p-3 text-left transition hover:border-line-strong hover:bg-surface"
              >
                <span
                  className={`mt-0.5 ${
                    a.tone === 'negative' ? 'text-negative' : a.tone === 'warning' ? 'text-warning' : 'text-[color:var(--accent)]'
                  }`}
                >
                  {a.tone === 'primary' ? <IconSparkle size={16} /> : <IconAlert size={16} />}
                </span>
                <span className="flex-1">
                  <span className="block text-xs leading-snug text-ink">{a.texto}</span>
                  <span className="mt-1 inline-flex items-center gap-0.5 text-2xs font-bold text-[color:var(--accent)]">
                    {a.cta} <IconChevronRight size={12} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          )}
        </Card>
      </div>

      {/* Tesorería + Incentivo */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            right={
              <button
                onClick={() => onNavigate('tesoreria')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--accent)] hover:underline"
              >
                Ver gap de caja <IconChevronRight size={14} />
              </button>
            }
          >
            Previsión de caja
          </SectionTitle>
          {!conDatos ? (
            <EmptyInline icon={IconTesoreria} title="Aún sin previsión de caja">
              Conecta el plan de financiación y los gastos de «{proyecto?.titulo}» para ver su previsión de tesorería.
            </EmptyInline>
          ) : (
            <>
              <div className="flex items-baseline justify-between border-b border-line pb-3">
                <span className="text-xs font-medium text-muted">Saldo a hoy</span>
                <Contador value={SALDO_HOY} format={eur} className="font-display tnum text-xl font-bold text-ink" />
              </div>
              <div className="mt-2">
                <GraficoTesoreria data={tesoreriaData} />
              </div>
              {semanasNegativas.length > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-2xs text-warning">
                  <IconClock size={13} />
                  {semanasNegativas.length} semanas con saldo negativo previsto.
                </p>
              )}
            </>
          )}
        </Card>

        {/* Incentivo fiscal */}
        <Card className="flex flex-col bg-ink p-5 text-canvas">
          <div className="flex items-center gap-2 text-lima">
            <IconSparkle size={16} />
            <span className="text-2xs font-semibold uppercase tracking-wide">Incentivo fiscal</span>
          </div>
          {tieneTaxCredit && incentivo ? (
            <>
              <div className="mt-3 text-2xs font-bold uppercase tracking-[0.12em] text-primary-soft/65">Deducción estimada (península)</div>
              <div className="tnum text-2xl font-semibold">{eur(incentivo.refPeninsula)}</div>
              <div className="mt-3 rounded-[20px] border border-canvas/10 bg-canvas/10 p-3">
                <div className="text-2xs font-semibold text-primary-soft/80">Con {PCT_CANARIAS_DEFECTO} % del gasto en Canarias</div>
                <div className="tnum text-xl font-extrabold text-canvas">{eur(incentivo.total)}</div>
                <div className="tnum mt-0.5 text-xs font-semibold text-primary-soft">
                  {eurSigned(incentivo.beneficioCanarias)} adicionales
                </div>
              </div>
              <button
                onClick={() => onNavigate('incentivos')}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-lima px-3 py-2 text-sm font-bold text-lima-ink transition hover:brightness-95"
              >
                Comparar territorios <IconChevronRight size={15} />
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-extrabold text-canvas">Este proyecto no accede al tax credit</p>
              <p className="mt-1.5 text-2xs leading-relaxed text-primary-soft/80">
                Los programas de televisión no se acogen a la deducción cultural del art. 36 LIS.
              </p>
              <button
                onClick={() => onNavigate('ayudas')}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-lima px-3 py-2 text-sm font-bold text-lima-ink transition hover:brightness-95"
              >
                Ver ayudas <IconChevronRight size={15} />
              </button>
            </>
          )}
        </Card>
      </div>

    </div>
  )
}
