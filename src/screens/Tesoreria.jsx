import { eur, eurSigned, pct } from '../lib/format.js'
import { Button, Card, Chip, KPI, PageHeader, ProgressBar, SectionTitle, Td, Th } from '../components/ui.jsx'
import { IconAlert, IconCheckCircle, IconDownload } from '../components/icons.jsx'

const FUENTES_BASE = [
  {
    id: 'aportacion-productora',
    fuente: 'Aportación productora',
    tipo: 'Equity',
    ratio: 0.175,
    estado: 'Confirmado',
    fechaCobro: '2026-05-15',
    afectaBaseDeduccion: false,
    reembolsable: false,
  },
  {
    id: 'preventa-tv',
    fuente: 'Preventa TV',
    tipo: 'Preventa',
    ratio: 0.1458333333,
    estado: 'Confirmado',
    fechaCobro: '2026-06-10',
    afectaBaseDeduccion: false,
    reembolsable: false,
  },
  {
    id: 'aie-inversor',
    fuente: 'AIE / inversor privado',
    tipo: 'Inversor',
    ratio: 0.1875,
    estado: 'Confirmado',
    fechaCobro: '2026-06-25',
    afectaBaseDeduccion: false,
    reembolsable: false,
  },
  {
    id: 'anticipo-distribuidor',
    fuente: 'Anticipo distribuidor',
    tipo: 'Anticipo',
    ratio: 0.125,
    estado: 'Confirmado',
    fechaCobro: '2026-07-15',
    afectaBaseDeduccion: false,
    reembolsable: true,
  },
  {
    id: 'icaa-generales',
    fuente: 'ICAA Generales',
    tipo: 'Subvención',
    ratio: 0.2083333333,
    estado: 'Probable',
    fechaCobro: '2026-11-30',
    afectaBaseDeduccion: true,
    reembolsable: false,
  },
  {
    id: 'incentivo-fiscal',
    fuente: 'Incentivo fiscal monetizable',
    tipo: 'Tax credit',
    ratio: 0.1583333334,
    estado: 'Estimado',
    fechaCobro: '2027-03-31',
    afectaBaseDeduccion: false,
    reembolsable: false,
  },
]

const MESES = [
  { id: '2026-05', label: 'may', nombre: 'Mayo 2026', salidaRatio: 0.14 },
  { id: '2026-06', label: 'jun', nombre: 'Junio 2026', salidaRatio: 0.24 },
  { id: '2026-07', label: 'jul', nombre: 'Julio 2026', salidaRatio: 0.21 },
  { id: '2026-08', label: 'ago', nombre: 'Agosto 2026', salidaRatio: 0.15 },
  { id: '2026-09', label: 'sep', nombre: 'Septiembre 2026', salidaRatio: 0.1 },
  { id: '2026-10', label: 'oct', nombre: 'Octubre 2026', salidaRatio: 0.08 },
  { id: '2026-11', label: 'nov', nombre: 'Noviembre 2026', salidaRatio: 0.05 },
  { id: '2026-12', label: 'dic', nombre: 'Diciembre 2026', salidaRatio: 0.03 },
  { id: '2027-01', label: 'ene', nombre: 'Enero 2027', salidaRatio: 0 },
  { id: '2027-02', label: 'feb', nombre: 'Febrero 2027', salidaRatio: 0 },
  { id: '2027-03', label: 'mar', nombre: 'Marzo 2027', salidaRatio: 0 },
  { id: '2027-04', label: 'abr', nombre: 'Abril 2027', salidaRatio: 0 },
]

const ESTADO_TONE = {
  Confirmado: 'positive',
  Probable: 'warning',
  Estimado: 'primary',
  Pendiente: 'neutral',
}

function fechaES(iso) {
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${iso}T12:00:00`))
}

function fuentesDesdePresupuesto(presupuesto) {
  const fuentes = FUENTES_BASE.map((f) => ({ ...f, importe: Math.round(presupuesto * f.ratio) }))
  const diff = presupuesto - fuentes.reduce((acc, f) => acc + f.importe, 0)
  if (fuentes.length && diff) fuentes[fuentes.length - 1] = { ...fuentes[fuentes.length - 1], importe: fuentes[fuentes.length - 1].importe + diff }
  return fuentes
}

function mesDeFecha(iso) {
  return iso.slice(0, 7)
}

function cashflowMensual({ presupuesto, fuentes, saldoInicial }) {
  let saldo = saldoInicial
  return MESES.map((mes) => {
    const entradas = fuentes.filter((f) => mesDeFecha(f.fechaCobro) === mes.id).reduce((acc, f) => acc + f.importe, 0)
    const salidas = Math.round(presupuesto * mes.salidaRatio)
    const flujo = entradas - salidas
    saldo += flujo
    return { ...mes, entradas, salidas, flujo, saldo }
  })
}

function LineChart({ rows }) {
  const width = 720
  const height = 220
  const pad = 28
  const values = rows.map((r) => r.saldo)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const span = Math.max(1, max - min)
  const x = (i) => pad + (i / Math.max(1, rows.length - 1)) * (width - pad * 2)
  const y = (v) => pad + ((max - v) / span) * (height - pad * 2)
  const zeroY = y(0)
  const path = rows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(r.saldo)}`).join(' ')

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px]">
        <line x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} className="stroke-line" strokeDasharray="4 4" />
        {rows.map((r, i) => {
          const barHeight = Math.abs(y(0) - y(r.salidas))
          return (
            <g key={r.id}>
              <rect
                x={x(i) - 12}
                y={Math.min(zeroY, zeroY - barHeight)}
                width="24"
                height={barHeight}
                rx="5"
                className="fill-slate-200"
              />
              <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-faint text-[10px] font-semibold uppercase">
                {r.label}
              </text>
            </g>
          )
        })}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {rows.map((r, i) => (
          <g key={`${r.id}-dot`}>
            <circle cx={x(i)} cy={y(r.saldo)} r="4.5" className={r.saldo < 0 ? 'fill-negative' : 'fill-[var(--accent)]'} />
            {(r.saldo < 0 || i === rows.length - 1) && (
              <text x={x(i)} y={y(r.saldo) - 10} textAnchor="middle" className={r.saldo < 0 ? 'fill-negative text-[10px] font-bold' : 'fill-ink text-[10px] font-bold'}>
                {eurSigned(r.saldo)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function Tesoreria({ proyecto, pushToast }) {
  const presupuesto = proyecto?.presupuesto ?? 0
  const fuentes = fuentesDesdePresupuesto(presupuesto)
  const saldoInicial = Math.round(presupuesto * 0.075)
  const cashflow = cashflowMensual({ presupuesto, fuentes, saldoInicial })
  const confirmado = fuentes.filter((f) => f.estado === 'Confirmado').reduce((acc, f) => acc + f.importe, 0)
  const pendiente = Math.max(0, presupuesto - confirmado)
  const saldoMin = Math.min(...cashflow.map((r) => r.saldo))
  const mesGap = cashflow.find((r) => r.saldo === saldoMin)
  const necesidadPuente = Math.max(0, -saldoMin)
  const subvenciones = fuentes.filter((f) => f.afectaBaseDeduccion).reduce((acc, f) => acc + f.importe, 0)
  const incentivo = fuentes.find((f) => f.id === 'incentivo-fiscal')?.importe ?? 0
  const intensidad = presupuesto ? (subvenciones + incentivo) / presupuesto : 0
  const porcentajeConfirmado = presupuesto ? confirmado / presupuesto : 0
  const porcentajePendiente = presupuesto ? pendiente / presupuesto : 0

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Plan de financiación"
        subtitle="Cobros, pagos y necesidades de caja."
        actions={
          <Button variant="secondary" icon={IconDownload} onClick={() => pushToast?.('Preparando plan de financiación…')}>
            Preparar plan de financiación
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KPI label="Financiación confirmada" value={eur(confirmado)} sub={`${pct(porcentajeConfirmado)} del presupuesto`} tone="text-positive" footer={<ProgressBar value={porcentajeConfirmado} tone="positive" />} />
        <KPI label="Pendiente de cerrar" value={eur(pendiente)} sub={`${pct(porcentajePendiente)} del presupuesto`} tone={pendiente > 0 ? 'text-warning' : 'text-positive'} />
        <KPI label="Necesidad de caja" value={eur(necesidadPuente)} sub={necesidadPuente > 0 ? mesGap?.nombre : 'Sin déficit previsto'} tone={necesidadPuente > 0 ? 'text-negative' : 'text-positive'} />
        <KPI label="Intensidad ayudas + deducción" value={pct(intensidad, 2)} sub="Tope general 50 %" tone={intensidad > 0.5 ? 'text-negative' : 'text-ink'} />
      </div>

      {necesidadPuente > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-warning/25 bg-warning-soft/55 px-4 py-3 text-sm font-semibold text-warning">
          <IconAlert size={17} className="shrink-0" />
          <span>Prever {eur(necesidadPuente)} de financiación puente para {mesGap?.nombre}.</span>
        </div>
      )}

      <Card className="mt-4 p-5">
        <SectionTitle right={<span className="text-2xs text-faint">Saldo inicial {eur(saldoInicial)}</span>}>Caja mes a mes</SectionTitle>
        <LineChart rows={cashflow} />
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="px-5 pt-4">
          <SectionTitle right={<span className="tnum text-xs text-muted">Presupuesto {eur(presupuesto)}</span>}>Fuentes de financiación</SectionTitle>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Fuente</Th>
                <Th>Tipo</Th>
                <Th align="right">Importe</Th>
                <Th>Estado</Th>
                <Th>Fecha prevista de cobro</Th>
                <Th>Afecta base deducción</Th>
                <Th>Reembolsable</Th>
              </tr>
            </thead>
            <tbody>
              {fuentes.map((f) => (
                <tr key={f.id} className="border-t border-line hover:bg-surface/70">
                  <Td className="font-semibold text-ink">{f.fuente}</Td>
                  <Td className="text-muted">{f.tipo}</Td>
                  <Td align="right" tabular className="font-semibold text-ink">{eur(f.importe)}</Td>
                  <Td><Chip tone={ESTADO_TONE[f.estado] || 'neutral'} dot>{f.estado}</Chip></Td>
                  <Td className="text-muted">{fechaES(f.fechaCobro)}</Td>
                  <Td>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${f.afectaBaseDeduccion ? 'text-warning' : 'text-muted'}`}>
                      {f.afectaBaseDeduccion ? <IconAlert size={14} /> : <IconCheckCircle size={14} />}
                      {f.afectaBaseDeduccion ? 'Sí, minora base' : 'No'}
                    </span>
                  </Td>
                  <Td>
                    <Chip tone={f.reembolsable ? 'warning' : 'neutral'}>{f.reembolsable ? 'Sí' : 'No'}</Chip>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="px-5 pt-4">
          <SectionTitle>Detalle mensual</SectionTitle>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Mes</Th>
                <Th align="right">Entradas</Th>
                <Th align="right">Salidas presupuesto</Th>
                <Th align="right">Flujo neto</Th>
                <Th align="right">Saldo acumulado</Th>
              </tr>
            </thead>
            <tbody>
              {cashflow.map((r) => (
                <tr key={r.id} className={`border-t border-line ${r.saldo < 0 ? 'bg-negative-soft/45' : ''}`}>
                  <Td>
                    <span className="font-semibold text-ink">{r.nombre}</span>
                    {r.saldo < 0 && <span className="ml-2 text-2xs font-bold text-negative">tensión de caja</span>}
                  </Td>
                  <Td align="right" tabular className="text-positive">{r.entradas ? eur(r.entradas) : '—'}</Td>
                  <Td align="right" tabular className="text-muted">{r.salidas ? eur(r.salidas) : '—'}</Td>
                  <Td align="right" tabular className={r.flujo < 0 ? 'text-negative' : 'text-ink'}>{eurSigned(r.flujo)}</Td>
                  <Td align="right" tabular className={`font-bold ${r.saldo < 0 ? 'text-negative' : 'text-ink'}`}>{eurSigned(r.saldo)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted">La subvención ICAA minora la base deducible. Contrasta la combinación en Ayudas antes de cerrar el plan.</p>
    </div>
  )
}
