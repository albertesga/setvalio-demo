import { useState } from 'react'
import { eur, eurSigned, pct, pctSigned } from '../lib/format.js'
import { Button, Card, Chip, KPI, Modal, ProgressBar, Td, Th } from '../components/ui.jsx'
import { BrandLockup, SetvalioMark } from '../components/Brand.jsx'
import {
  IconAlert,
  IconAyudas,
  IconCheck,
  IconCheckCircle,
  IconChevronDown,
  IconCoste,
  IconFacturas,
  IconIncentivos,
  IconPanel,
  IconPresupuesto,
  IconProveedores,
  IconTesoreria,
  IconUpload,
} from '../components/icons.jsx'

const sections = [
  ['marca', 'Marca'],
  ['color', 'Color'],
  ['tipografia', 'Tipografía'],
  ['layout', 'Layout'],
  ['datos', 'Datos'],
  ['componentes', 'Componentes'],
  ['graficos', 'Gráficos'],
  ['copy', 'Voz'],
  ['accesibilidad', 'Accesibilidad'],
  ['revision', 'Revisión'],
  ['tokens', 'Tokens'],
  ['ejemplo', 'Ejemplo'],
]

const primaryScale = [
  { name: 'Ciruela', value: '#311B2E', use: 'Logotipo, titulares, navegación y comandos principales.' },
  { name: 'Papel', value: '#F4F1E8', use: 'Fondo cálido del espacio de trabajo y portada.' },
  { name: 'Lima', value: '#D4F26A', use: 'Llamada de marca y contraste sobre ciruela; nunca estado positivo.' },
  { name: 'Arena', value: '#D7C9BB', use: 'Superficie secundaria editorial y separación de bloques.' },
  { name: 'Blanco cálido', value: '#FFFEFA', use: 'Superficie de trabajo, formularios y tablas.' },
]

const pastelScale = [
  { name: 'Tinte ciruela', value: '#F1E8ED', use: 'Selección y contexto sin usar un estado financiero.' },
  { name: 'Línea', value: 'rgb(49 27 46 / 0.18)', use: 'Divisores; controles usan el borde fuerte #9A8492.' },
  { name: 'Borde fuerte', value: '#9A8492', use: 'Campos y controles que necesitan más definición.' },
]

const statusScale = [
  { name: 'success', value: '#236847', soft: '#E9F4EB', use: 'Completo, validado, dentro de objetivo.' },
  { name: 'warning', value: '#91601C', soft: '#FCF2DD', use: 'Pendiente, revisar, próximo vencimiento.' },
  { name: 'danger', value: '#A8383D', soft: '#FBEAEC', use: 'Bloqueante, error o desviación crítica.' },
  { name: 'info', value: '#315F83', soft: '#E6F0F5', use: 'Ayuda contextual y datos informativos.' },
  { name: 'neutral', value: '#655461', soft: '#F4F1E8', use: 'Cerrado, histórico, baja prioridad.' },
]

const typeTokens = [
  ['display', '70 / 76', '700', 'Titular de portada en Manrope; énfasis editorial en Newsreader.'],
  ['h1', '40 / 48', '800', 'Título de pantalla y secciones principales.'],
  ['h2', '30 / 38', '800', 'Secciones operativas.'],
  ['h3', '20 / 28', '800', 'Tarjetas y bloques de proceso.'],
  ['body', '16 / 26', '400–500', 'Copy editorial, formularios y tablas. Manrope.'],
  ['caption', '12 / 18', '500–600', 'Metadatos, ayuda, estado y origen del dato.'],
  ['overline', '12 / 18', '600', 'Etiquetas cortas, preferentemente en caja normal.'],
]

const spacingTokens = [
  ['4', '4px', 'Distancia mínima entre icono y texto.'],
  ['8', '8px', 'Controles relacionados y chips.'],
  ['12', '12px', 'Filas compactas, badges y celdas densas.'],
  ['16', '16px', 'Padding interno compacto de card.'],
  ['24', '24px', 'Padding base de panel operativo.'],
  ['32', '32px', 'Separación entre bloques principales.'],
  ['48', '48px', 'Respiración editorial y secciones de guía.'],
  ['64', '64px', 'Bloques hero o cierre de página.'],
]

const budgetRows = [
  { capitulo: '03 Equipo técnico', presupuesto: 540000, real: 250000, proyeccion: 640000, delta: 100000, tone: 'negative' },
  { capitulo: '07 Viajes, hoteles y comidas', presupuesto: 150000, real: 100000, proyeccion: 168000, delta: 18000, tone: 'negative' },
  { capitulo: '02 Personal artístico', presupuesto: 480000, real: 235000, proyeccion: 470000, delta: -10000, tone: 'neutral' },
  { capitulo: '11 Gastos generales', presupuesto: 240000, real: 90000, proyeccion: 249000, delta: 9000, tone: 'neutral' },
]

const prototypeReview = [
  ['Proyectos', 'Hero, KPIs, avisos, termómetro, flujo recomendado', 'Aprobado', 'Debe explicar el proyecto como sistema conectado, no como dashboard de métricas sueltas.'],
  ['Presupuesto ICAA', 'Editor por capítulos, total derivado, inputs financieros', 'Aprobado', 'Mantener capítulos como fuente única para Coste y Optimizador.'],
  ['Optimizador de incentivos', 'Formulario, escenarios, intensidad y navegación a ayudas', 'Aprobado', 'Evitar “simular” en copy principal; usar decisión financiera y retorno neto.'],
  ['Ayudas compatibles', 'Tabla, filtros, timeline, combinación deducción + ayudas', 'Aprobado', 'El valor está en el trade-off: subvención, minoración de base y tope de intensidad.'],
  ['Plan de financiación', 'Fuentes, calendario de cobros, gap de caja', 'Aprobado', 'Debe aparecer como puente entre optimización fiscal y control de gasto.'],
  ['Control de costes', 'KPIs, alertas, burn chart, tabla por capítulo', 'Aprobado', 'Rojo/ámbar/verde son semántica financiera, no decoración.'],
  ['Órdenes de compra', 'Aprobaciones previas, bloqueo de gasto', 'Aprobado', 'Pantalla clave para prevenir coste antes de factura.'],
  ['Bandeja de gastos', 'Factura-e, OCR, confianza, panel lateral', 'Aprobado', 'La confianza baja se comunica con texto, chip e icono.'],
  ['Elegibilidad fiscal', 'Gasto recuperable, evidencias, riesgo fiscal', 'Aprobado', 'Conecta gasto real con dinero recuperable.'],
  ['Dossier fiscal', 'Checklist, bloqueantes, validación', 'Aprobado', 'Debe sentirse como sala de revisión para fiscalista y productora.'],
  ['Consola Despacho', 'Multi-cliente, vista auditor, exportación fiscal', 'Aprobado', 'Separar claramente cartera del despacho y proyecto activo.'],
]

const cssVariablesCode = `:root {
  --fp-primary-depth: #311b2e;
  --fp-primary-pulse: #d4f26a;
  --fp-primary-bloom: #e3f5a4;
  --fp-primary-ease: #f1e8ed;
  --fp-color-canvas: #fffefa;
  --fp-color-surface: #f4f1e8;
  --fp-color-line: rgb(49 27 46 / .18);
  --fp-color-line-strong: #9a8492;
  --fp-color-ink: #311b2e;
  --fp-color-muted: #655461;
  --fp-color-faint: #655461;
  --fp-color-positive: #236847;
  --fp-color-positive-soft: #e9f4eb;
  --fp-color-warning: #91601c;
  --fp-color-warning-soft: #fcf2dd;
  --fp-color-negative: #a8383d;
  --fp-color-negative-soft: #fbeaec;
  --fp-color-info: #315f83;
  --fp-color-info-soft: #e6f0f5;
  --fp-radius-sm: 6px;
  --fp-radius-md: 8px;
  --fp-radius-lg: 10px;
  --fp-radius-xl: 10px;
  --fp-shadow-card: 0 1px 2px rgb(49 27 46 / .04), 0 5px 14px rgb(49 27 46 / .04);
  --fp-shadow-soft: 0 4px 14px rgb(49 27 46 / .06);
  --fp-shadow-modal: 0 24px 64px rgb(49 27 46 / .18);
  --fp-motion-fast: 160ms;
  --fp-motion-base: 240ms;
  --fp-ease-standard: cubic-bezier(0.23, 1, 0.32, 1);
}`

const tailwindCode = `export default {
  theme: {
    extend: {
      colors: {
        canvas: '#FFFEFA',
        surface: '#F4F1E8',
        ink: '#311B2E',
        muted: '#655461',
        faint: '#655461',
        line: 'rgb(49 27 46 / 0.18)',
        'line-strong': '#9A8492',
        lima: '#D4F26A',
        primary: '#311B2E',
        'primary-hover': '#50304A',
        'primary-soft': '#F1E8ED',
        info: '#315F83',
        'info-soft': '#E6F0F5',
        positive: '#236847',
        'positive-soft': '#E9F4EB',
        warning: '#91601C',
        'warning-soft': '#FCF2DD',
        negative: '#A8383D',
        'negative-soft': '#FBEAEC',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
        editorial: ['Newsreader', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '8px',
        xl: '10px',
        '2xl': '10px',
      },
      boxShadow: {
        soft: '0 4px 14px rgb(49 27 46 / .06)',
        card: '0 1px 2px rgb(49 27 46 / .04), 0 5px 14px rgb(49 27 46 / .04)',
        modal: '0 24px 64px rgb(49 27 46 / .18)',
      },
    },
  },
}`

function Section({ id, title, kicker, children }) {
  return (
    <section id={id} className="scroll-mt-8 border-b border-line/80 py-12 last:border-b-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {kicker && <p className="mb-2 text-2xs font-extrabold uppercase tracking-[0.16em] text-faint">{kicker}</p>}
          {id === 'marca' ? (
            <h1 className="font-display text-3xl font-bold leading-tight text-ink">{title}</h1>
          ) : (
            <h2 className="font-display text-3xl font-bold leading-tight text-ink">{title}</h2>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function SpecTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-canvas shadow-soft scrollbar-thin">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead>
          <tr>{columns.map((column) => <Th key={column}>{column}</Th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-canvas' : 'bg-surface/45'}>
              {row.map((cell, j) => (
                <Td key={j} className={j === 0 ? 'font-bold text-ink' : 'text-muted'}>
                  {cell}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Swatch({ name, value, use, soft }) {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="h-24" style={{ background: soft ? `linear-gradient(90deg, ${value} 0 50%, ${soft} 50% 100%)` : value }} />
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink">{name}</h3>
          <span className="font-mono text-xs font-semibold text-muted">{value}</span>
        </div>
        {soft && <p className="mt-1 font-mono text-2xs text-faint">soft {soft}</p>}
        <p className="mt-2 text-xs font-medium leading-relaxed text-muted">{use}</p>
      </div>
    </Card>
  )
}

function HeroIllustration() {
  return (
    <div className="flex min-h-[530px] flex-col justify-between rounded-2xl bg-ink p-7 text-white shadow-card md:p-9">
        <div className="flex items-center justify-between">
          <BrandLockup light />
          <span className="text-xs text-white/70">Identidad / 01</span>
        </div>
        <div className="my-10 max-w-2xl">
          <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-xl bg-lima text-ink"><SetvalioMark size={61} /></div>
          <p className="text-xs font-semibold text-lima">Control financiero audiovisual</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-6xl">
            Libertad para crear.<br /><em className="font-editorial font-normal text-lima">Claridad para producir.</em>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75">
            SetValio une el rigor de una mesa de producción con la claridad de una herramienta financiera. Sin gestos de cine obvios ni promesas vacías.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-white/20 pt-5">
          {[
            ['Presupuesto', eur(2400000)],
            ['Retorno neto', eur(851420)],
            ['Día rodaje', '15/30'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-white/65">{label}</div>
              <div className="tnum mt-1 font-display text-sm font-bold text-white sm:text-lg">{value}</div>
            </div>
          ))}
        </div>
    </div>
  )
}

function BrandSection() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <HeroIllustration />
      <div className="grid gap-4">
        {[
          ['Un símbolo reconocible', 'La S angular conserva su silueta desde favicon hasta cabecera. Su geometría enmarca cifras, decisiones y producción.'],
          ['Editorial y preciso', 'Manrope sostiene la interfaz completa y Newsreader introduce un acento editorial puntual.'],
          ['Color con significado', 'Ciruela identifica la marca y lima llama a la acción. Verde, ámbar y rojo quedan reservados para estados financieros.'],
        ].map(([title, text]) => (
          <Card key={title} className="p-7">
            <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function BrandPrinciples() {
  const steps = [
    ['01', 'Entender', 'Presupuesto, coproductores, financiación y calendario fiscal.'],
    ['02', 'Cuadrar', 'Deducción, ayudas, cashflow y tope de intensidad en una vista.'],
    ['03', 'Controlar', 'Compras, facturas, elegibilidad y desviaciones por capítulo.'],
    ['04', 'Cerrar', 'Dossier fiscal, anexos, revisión del fiscalista y exportación.'],
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex min-h-[360px] flex-col justify-between rounded-2xl bg-lima p-8 text-ink">
        <p className="text-xs font-semibold">Símbolo / wordmark</p>
        <div className="flex items-center justify-center"><BrandLockup className="!w-[min(100%,300px)]" /></div>
        <p className="text-xs">Una marca propia sin el cliché de la claqueta.</p>
      </div>
      <div className="rounded-2xl border border-line bg-canvas p-8">
        <p className="text-xs font-semibold text-primary-hover">Sistema de expresión</p>
        <h3 className="mt-3 max-w-lg font-display text-3xl font-bold leading-tight text-ink">
          Precisión visible, carácter contenido.
        </h3>
        <div className="mt-8 space-y-3">
          {steps.map(([n, title, text]) => (
            <div key={n} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-line pt-3">
              <span className="tnum font-display text-lg font-bold text-muted">{n}</span>
              <span>
                <span className="block font-display text-lg font-bold text-ink">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FieldShowcase() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <label className="block">
        <span className="text-xs font-bold text-ink">Productora</span>
        <input className="mt-1 min-h-12 w-full rounded-lg border border-line bg-canvas px-4 text-sm font-semibold text-ink placeholder:text-faint focus:border-primary-hover focus:ring-2 focus:ring-primary-hover/30" placeholder="Candilejas Films S.L." />
        <span className="mt-1.5 block text-xs font-medium text-muted">Usa la razón social que figura en factura.</span>
      </label>
      <label className="block">
        <span className="text-xs font-bold text-ink">Presupuesto</span>
        <div className="mt-1 flex min-h-12 overflow-hidden rounded-lg border border-line bg-canvas focus-within:border-primary-hover focus-within:ring-2 focus-within:ring-primary-hover/30">
          <input className="min-w-0 flex-1 px-4 text-sm font-semibold outline-none tnum" defaultValue="2.400.000" inputMode="numeric" />
          <span className="flex items-center border-l border-line bg-surface px-4 text-sm font-bold text-muted">€</span>
        </div>
      </label>
      <label className="block">
        <span className="text-xs font-bold text-ink">Territorio fiscal</span>
        <select className="fp-input mt-1 w-full px-4 text-sm font-semibold">
          <option>Régimen común</option>
          <option>Canarias</option>
          <option>Navarra</option>
          <option>Bizkaia</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-bold text-negative">NIF emisor</span>
        <input aria-invalid="true" className="mt-1 min-h-12 w-full rounded-lg border border-negative bg-negative-soft px-4 text-sm font-semibold text-ink focus:border-negative focus:ring-2 focus:ring-negative/20" defaultValue="B-000" />
        <span className="mt-1.5 block text-xs font-bold text-negative">Formato incompleto. Revisa el NIF antes de validar la factura.</span>
      </label>
      <div className="rounded-xl border border-line bg-surface/55 p-4">
        <div className="mb-3 text-xs font-bold text-ink">Fases</div>
        <div className="flex flex-wrap gap-2">
          <Chip tone="primary">Desarrollo</Chip>
          <Chip tone="primary">Producción</Chip>
          <Chip>Coproducción</Chip>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-surface/55 p-4">
        <div className="mb-3 text-xs font-bold text-ink">Coproducción UE</div>
        <button className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-canvas p-1 pr-4 text-sm font-bold text-ink shadow-soft">
          <span className="rounded-full bg-primary px-4 py-2 text-primary-soft">Sí</span>
          <span className="text-muted">No</span>
        </button>
      </div>
    </div>
  )
}

function ButtonShowcase() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary">Primario</Button>
      <Button variant="accent">Acento</Button>
      <Button variant="secondary">Secundario</Button>
      <Button variant="ghost">Fantasma</Button>
      <Button variant="danger">Peligro</Button>
      <Button size="sm">Pequeño</Button>
      <Button size="lg">Grande</Button>
      <Button variant="primary" className="ring-2 ring-primary-hover ring-offset-2 ring-offset-canvas">Focus</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  )
}

function DenseFinancialTable() {
  const totals = budgetRows.reduce((acc, row) => ({
    presupuesto: acc.presupuesto + row.presupuesto,
    real: acc.real + row.real,
    proyeccion: acc.proyeccion + row.proyeccion,
    delta: acc.delta + row.delta,
  }), { presupuesto: 0, real: 0, proyeccion: 0, delta: 0 })

  return (
    <div className="overflow-x-auto rounded-xl border border-line shadow-soft scrollbar-thin">
      <table className="w-full min-w-[760px] divide-y divide-line text-sm">
        <thead>
          <tr>
            <Th>Capítulo</Th>
            <Th align="right">Presupuesto</Th>
            <Th align="right">Gastado real</Th>
            <Th align="right">Desviación</Th>
            <Th align="right">Proyección</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-canvas">
          {budgetRows.map((row, i) => (
            <tr key={row.capitulo} className={row.tone === 'negative' ? 'bg-negative-soft' : i % 2 ? 'bg-canvas' : 'bg-surface/45'}>
              <Td className="font-bold text-ink">{row.capitulo}</Td>
              <Td align="right" tabular>{eur(row.presupuesto)}</Td>
              <Td align="right" tabular>{eur(row.real)}</Td>
              <Td align="right" tabular>
                <span className={row.tone === 'negative' ? 'font-bold text-negative' : 'font-bold text-muted'}>{eurSigned(row.delta)}</span>
              </Td>
              <Td align="right" tabular>{eur(row.proyeccion)}</Td>
            </tr>
          ))}
          <tr className="bg-primary text-primary-soft">
            <Td className="font-bold text-primary-soft">Total muestra</Td>
            <Td align="right" tabular>{eur(totals.presupuesto)}</Td>
            <Td align="right" tabular>{eur(totals.real)}</Td>
            <Td align="right" tabular>{eurSigned(totals.delta)}</Td>
            <Td align="right" tabular>{eur(totals.proyeccion)}</Td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ScenarioCard() {
  return (
    <Card className="rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xs font-extrabold uppercase tracking-[0.16em] text-faint">Escenario</p>
          <h3 className="mt-1 font-display text-xl font-bold text-ink">Rodaje base + Canarias</h3>
        </div>
        <Chip tone="positive" dot>Recomendado</Chip>
      </div>
      <div className="tnum mt-5 font-display text-4xl font-bold text-ink">{eur(851420)}</div>
      <p className="mt-1 text-sm font-semibold text-muted">Retorno neto estimado</p>
      <div className="mt-5 rounded-xl border border-line bg-surface/70 p-4">
        <div className="mb-2 flex justify-between text-xs font-bold text-muted">
          <span>Banda de confianza</span>
          <span className="tnum">Alta · 87 %</span>
        </div>
        <ProgressBar value={0.87} tone="positive" height="h-3" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip tone="primary">ICAA Generales</Chip>
        <Chip tone="warning">Eurimages próxima</Chip>
      </div>
      <p className="mt-4 text-xs font-medium leading-relaxed text-muted">Estimación orientativa. No sustituye el criterio de tu asesor fiscal.</p>
    </Card>
  )
}

function BannerShowcase() {
  const items = [
    ['info', 'La suma de deducción y subvenciones no puede superar el 50 % del coste.'],
    ['warning', 'Esta partida se desvía más de un 8 %.'],
    ['negative', 'Proyección a cierre por encima del presupuesto.'],
  ]
  return (
    <div className="space-y-3">
      {items.map(([tone, text]) => (
        <div
          key={text}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
            tone === 'negative'
              ? 'border-negative/25 bg-negative-soft text-negative'
              : tone === 'warning'
                ? 'border-warning/25 bg-warning-soft text-warning'
                : 'border-info/20 bg-info-soft text-info'
          }`}
        >
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{text}</span>
        </div>
      ))}
      <div className="inline-flex items-center gap-2 rounded-full border border-primary-soft/20 bg-ink px-4 py-3 text-sm font-bold text-primary-soft shadow-modal">
        <IconCheckCircle size={17} />
        Partida reasignada. La confianza sube al 100 %.
      </div>
    </div>
  )
}

function SidebarMini() {
  const items = [
    ['Resumen', IconPanel],
    ['Presupuesto ICAA', IconPresupuesto],
    ['Optimizador', IconIncentivos],
    ['Ayudas compatibles', IconAyudas],
    ['Plan de financiación', IconTesoreria],
    ['Control de costes', IconCoste],
    ['Bandeja de gastos', IconFacturas],
  ]
  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-canvas p-4 shadow-card">
      <div className="flex items-center gap-3 px-2 py-2">
        <BrandLockup compact />
      </div>
      <button className="my-3 flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left">
        <span>
          <span className="block text-xs text-faint">Proyecto activo</span>
          <span className="block text-sm font-bold text-ink">La última función</span>
        </span>
        <IconChevronDown size={16} className="text-faint" />
      </button>
      <div className="space-y-1">
        {items.map(([label, Icon], i) => (
          <div key={label} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${i === 0 ? 'bg-primary-soft text-ink' : 'text-muted hover:bg-surface'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md ${i === 0 ? 'bg-ink text-white' : 'bg-surface text-ink'}`}>
              <Icon size={17} />
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartShowcase() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl p-6">
        <h3 className="mb-5 font-display text-xl font-bold text-ink">Barras horizontales</h3>
        {[
          ['Presupuesto', 1, '#311B2E'],
          ['Comprometido', 0.55, '#9A8492'],
          ['Gastado', 0.49, '#315F83'],
          ['Desviación', 0.08, '#A8383D'],
        ].map(([label, value, color]) => (
          <div key={label} className="mb-4">
            <div className="mb-2 flex justify-between text-xs font-bold text-muted">
              <span>{label}</span>
              <span className="tnum">{pct(value)}</span>
            </div>
            <div className="h-3 rounded-full bg-line/70">
              <div className="h-3 rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </Card>
      <Card className="rounded-2xl p-6">
        <h3 className="mb-3 font-display text-xl font-bold text-ink">Burn de rodaje</h3>
        <svg viewBox="0 0 420 190" className="w-full" role="img" aria-label="Línea de burn real y previsto">
          {[0, 1, 2, 3].map((n) => <line key={n} x1="28" x2="398" y1={34 + n * 36} y2={34 + n * 36} stroke="#DED2D8" />)}
          <polyline points="28,146 90,126 152,106 214,86 276,66 398,42" fill="none" stroke="#A895A1" strokeWidth="3" strokeLinecap="round" />
          <polyline points="28,146 90,128 152,106 214,80 276,55" fill="none" stroke="#311B2E" strokeWidth="4" strokeLinecap="round" />
          <polyline points="276,55 338,43 398,26" fill="none" stroke="#A8383D" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" />
          <circle cx="276" cy="55" r="6" fill="#D4F26A" stroke="#311B2E" strokeWidth="3" />
          <text x="28" y="174" className="fill-muted text-[10px] font-bold">día 1</text>
          <text x="248" y="174" className="fill-muted text-[10px] font-bold">día 15</text>
          <text x="364" y="174" className="fill-muted text-[10px] font-bold">día 30</text>
        </svg>
      </Card>
    </div>
  )
}

function EmptyAndLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex min-h-56 flex-col items-start justify-center rounded-2xl p-7">
        <div className="mb-4 rounded-lg bg-primary-soft p-3 text-ink">
          <IconUpload size={22} />
        </div>
        <h3 className="font-display text-xl font-bold text-ink">Sube tu presupuesto</h3>
        <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-muted">Sube tu presupuesto o impórtalo de Movie Magic para empezar a controlar el gasto.</p>
        <Button className="mt-5" variant="primary">Subir archivo</Button>
      </Card>
      <Card className="space-y-4 rounded-2xl p-7" aria-label="Estado de carga">
        <div className="h-5 w-48 animate-pulse rounded-full bg-line-strong" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-surface" />
        <div className="h-12 w-11/12 animate-pulse rounded-lg bg-surface" />
        <div className="h-12 w-4/5 animate-pulse rounded-lg bg-surface" />
        <p className="text-xs font-bold text-muted">Cargando gastos pendientes...</p>
      </Card>
    </div>
  )
}

function ExampleScreen() {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="bg-ink p-7 text-primary-soft">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-2xs font-extrabold uppercase tracking-[0.16em] text-primary-soft/70">Largometraje · producción</p>
            <h3 className="mt-2 font-display text-4xl font-bold text-canvas">La última función</h3>
            <p className="mt-2 text-sm font-semibold text-primary-soft/85">Presupuesto conectado: <span className="tnum font-bold text-canvas">{eur(2400000)}</span></p>
          </div>
          <Button variant="secondary" className="border-primary-soft/25 bg-primary-soft text-ink hover:bg-mint-strong">Revisar decisión</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
        <KPI label="Presupuesto" value={eur(2400000)} />
        <KPI label="Gastado a hoy" value={eur(1176000)} sub="49,0 %" />
        <KPI label="Retorno neto" value={eur(851420)} sub="Escenario recomendado" />
        <KPI label="Proyección" value={eur(2520000)} tone="text-negative" footer={<Chip tone="negative">{pctSigned(0.05)} ({eurSigned(120000)})</Chip>} />
      </div>
      <div className="px-5 pb-6">
        <DenseFinancialTable />
      </div>
    </Card>
  )
}

export default function DesignSystem() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="mx-auto flex max-w-[1500px] gap-6">
      <aside className="fp-shell-surface sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 overflow-y-auto rounded-2xl border border-line bg-canvas p-4 shadow-card xl:block">
        <div className="rounded-xl bg-ink p-4 text-white">
          <BrandLockup light compact />
          <h2 className="mt-4 font-display text-lg font-bold text-white">Sistema visual</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/70">Guía viva aplicada al prototipo.</p>
        </div>
        <nav className="mt-4 space-y-1">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink focus:bg-ink focus:text-white">
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <Section id="marca" title="Sistema visual SetValio" kicker="Dirección de marca">
          <BrandSection />
          <div className="mt-4">
            <BrandPrinciples />
          </div>
        </Section>

        <Section id="color" title="Color" kicker="Ciruela / Papel / Lima / Arena">
          <p className="mb-3 text-xs font-semibold uppercase text-muted">Paleta de marca</p>
          <div className="grid gap-4 xl:grid-cols-5">
            {primaryScale.map((token) => <Swatch key={token.name} {...token} />)}
          </div>
          <p className="mb-3 mt-7 text-xs font-semibold uppercase text-muted">Soporte de interfaz</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pastelScale.map((token) => <Swatch key={token.name} {...token} />)}
          </div>
          <p className="mb-3 mt-7 text-xs font-semibold uppercase text-muted">Estados financieros</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {statusScale.map((token) => <Swatch key={token.name} {...token} />)}
          </div>
          <Card className="mt-4 rounded-2xl p-5">
            <p className="text-sm font-semibold leading-relaxed text-muted">
              La tinta ciruela y el texto secundario se reservan para superficies claras. Lima se usa con tinta oscura, nunca como texto pequeño sobre blanco; los estados financieros mantienen tonos propios y etiqueta explícita.
            </p>
          </Card>
        </Section>

        <Section id="tipografia" title="Tipografía" kicker="Manrope / Newsreader">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-2xl bg-ink p-7 text-primary-soft">
              <p className="text-2xs font-extrabold uppercase tracking-[0.16em] text-primary-soft/70">Display</p>
              <p className="mt-3 font-display text-5xl font-extrabold leading-[0.92] text-canvas">Control financiero sin ruido.</p>
              <p className="mt-4 text-sm leading-relaxed text-primary-soft/80">Manrope sostiene titulares, formularios, tablas y cifras. Newsreader aporta énfasis editorial puntual. Los importes usan cifras tabulares.</p>
            </Card>
            <SpecTable columns={['Token', 'Tamaño / línea', 'Peso', 'Uso']} rows={typeTokens} />
          </div>
          <Card className="mt-4 rounded-2xl p-5">
            <p className="text-sm font-semibold text-muted">
              Regla obligatoria: todos los importes, porcentajes, fechas de tabla, KPIs y gráficos usan números tabulares. Ejemplo: <span className="tnum font-bold text-ink">{eur(1170000)} · {pct(0.4875, 2)} · 05/06/2026</span>.
            </p>
          </Card>
        </Section>

        <Section id="layout" title="Espaciado, radios, bordes y movimiento" kicker="Sistema 4px">
          <div className="grid gap-4 lg:grid-cols-2">
            <SpecTable columns={['Token', 'Valor', 'Uso']} rows={spacingTokens} />
            <div className="grid gap-4">
              <Card className="rounded-xl p-6">
                <h3 className="font-display text-xl font-bold text-ink">Radios contenidos</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">6px para botones y chips; 8-10px para controles, paneles y cards. El radio no sustituye a la jerarquía.</p>
              </Card>
              <Card className="rounded-2xl p-6 shadow-card">
                <h3 className="font-display text-xl font-bold text-ink">Sombras discretas</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">Máximo dos niveles: card y modal. La jerarquía viene de tamaño, contraste y agrupación, no de sombras pesadas.</p>
              </Card>
              <Card className="rounded-2xl p-6">
                <h3 className="font-display text-xl font-bold text-ink">Movimiento con propósito</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">160-240 ms para botones, menús y modales. La fotografía de portada se desplaza con el scroll; tablas y métricas permanecen estables. Transformación y opacidad, con alternativa sin movimiento.</p>
              </Card>
            </div>
          </div>
        </Section>

        <Section id="datos" title="Formato de datos es-ES" kicker="Finanzas">
          <SpecTable
            columns={['Tipo', 'Patrón', 'Ejemplo', 'Regla']}
            rows={[
              ['Moneda', 'miles con punto, euro al final', eur(1170000), 'Sin decimales en KPIs; dos decimales en factura.'],
              ['Decimal', 'coma decimal', '78,40 €', 'Usar Intl.NumberFormat es-ES.'],
              ['Porcentaje', 'coma decimal y espacio antes de %', pct(0.4875, 2), 'Signo explícito solo en variaciones.'],
              ['Fecha', 'dd/mm/aaaa', '05/06/2026', 'Evitar fechas relativas en fiscalidad.'],
            ]}
          />
        </Section>

        <Section id="componentes" title="Librería de componentes" kicker="Estados reales">
          <div className="space-y-6">
            <Card className="rounded-2xl p-6">
              <h3 className="mb-4 font-display text-xl font-bold text-ink">Botones</h3>
              <ButtonShowcase />
            </Card>

            <Card className="rounded-2xl p-6">
              <h3 className="mb-4 font-display text-xl font-bold text-ink">Inputs y formularios</h3>
              <FieldShowcase />
            </Card>

            <Card className="rounded-2xl p-6">
              <h3 className="mb-4 font-display text-xl font-bold text-ink">Chips y badges</h3>
              <div className="flex flex-wrap gap-2">
                <Chip tone="positive" dot>Abierta</Chip>
                <Chip tone="warning" dot>Próxima</Chip>
                <Chip tone="neutral" dot>Cerrada</Chip>
                <Chip tone="positive">Alta</Chip>
                <Chip tone="warning">Media</Chip>
                <Chip tone="negative">Baja</Chip>
                <Chip tone="positive">Completa</Chip>
                <Chip tone="warning">Pendiente</Chip>
                <Chip tone="positive">Factura-e fiable</Chip>
                <Chip>OCR 92 %</Chip>
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-4">
              <KPI label="Presupuesto" value={eur(2400000)} sub="Capítulos ICAA" />
              <KPI label="Gastado a hoy" value={eur(1176000)} sub="49,0 %" />
              <KPI label="Retorno neto" value={eur(851420)} sub="Escenario recomendado" />
              <KPI label="Proyección" value={eur(2520000)} tone="text-negative" footer={<Chip tone="negative">{pctSigned(0.05)}</Chip>} />
            </div>

            <Card className="rounded-2xl p-6">
              <h3 className="mb-4 font-display text-xl font-bold text-ink">Tabla financiera densa</h3>
              <DenseFinancialTable />
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <ScenarioCard />
              <Card className="rounded-2xl p-6">
                <h3 className="mb-4 font-display text-xl font-bold text-ink">Banners, toast y tooltip</h3>
                <BannerShowcase />
                <div className="group relative mt-5 inline-flex">
                  <button className="rounded-full border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink" title="Leída como dato estructurado de la factura electrónica. Sin OCR, sin errores de lectura.">
                    Factura-e XML
                  </button>
                  <span className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-80 rounded-lg border border-primary-soft/20 bg-ink px-4 py-3 text-xs font-semibold leading-relaxed text-primary-soft shadow-modal group-hover:block group-focus-within:block">
                    Leída como dato estructurado de la factura electrónica. Sin OCR, sin errores de lectura.
                  </span>
                </div>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-2xl p-6">
                <h3 className="mb-4 font-display text-xl font-bold text-ink">Modal</h3>
                <Button variant="primary" onClick={() => setModalOpen(true)}>Abrir checklist documental</Button>
                <Modal
                  open={modalOpen}
                  onClose={() => setModalOpen(false)}
                  title="Checklist documental"
                  subtitle="La última función"
                  footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cerrar</Button><Button variant="primary">Confirmar</Button></>}
                >
                  <div className="space-y-2">
                    {['Certificado de nacionalidad española', 'Certificado cultural ICAA', 'Plan de financiación', 'Presupuesto detallado por capítulos', 'Contrato de coproducción si aplica', 'Memoria del proyecto'].map((item, idx) => (
                      <label key={item} className="flex items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3 text-sm font-semibold">
                        <input type="checkbox" defaultChecked={idx < 2} className="h-4 w-4 rounded border-line text-primary" />
                        {item}
                      </label>
                    ))}
                    <p className="pt-2 text-sm font-semibold text-muted">El gestor/fiscalista valida y firma. SetValio prepara la documentación.</p>
                  </div>
                </Modal>
              </Card>
              <Card className="rounded-2xl p-6">
                <h3 className="mb-4 font-display text-xl font-bold text-ink">Navegación y medidor</h3>
                <SidebarMini />
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs font-bold text-muted">
                    <span>Consumo de presupuesto</span>
                    <span className="tnum">49,0 %</span>
                  </div>
                  <ProgressBar value={0.49} tone="primary" height="h-3" />
                </div>
              </Card>
            </div>

            <EmptyAndLoading />
          </div>
        </Section>

        <Section id="graficos" title="Estilo para gráficos" kicker="Datos precisos">
          <ChartShowcase />
        </Section>

        <Section id="copy" title="Voz y copy" kicker="Lenguaje de decisión financiera">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-2xl p-6">
              <h3 className="font-display text-xl font-bold text-ink">Reglas</h3>
              <ul className="mt-4 space-y-3 text-sm font-medium leading-relaxed text-muted">
                <li className="flex gap-2"><IconCheck size={16} className="mt-0.5 shrink-0 text-positive" /> Usa verbos de oficio: calcula, controla, justifica, cuadra, valida.</li>
                <li className="flex gap-2"><IconCheck size={16} className="mt-0.5 shrink-0 text-positive" /> Da números concretos y origen del dato cuando haya riesgo fiscal.</li>
                <li className="flex gap-2"><IconCheck size={16} className="mt-0.5 shrink-0 text-positive" /> Presenta la IA como utilidad discreta con validación profesional.</li>
                <li className="flex gap-2"><IconAlert size={16} className="mt-0.5 shrink-0 text-warning" /> Evita revolución, magia, automatización total o promesas de ahorro sin contexto.</li>
              </ul>
            </Card>
            <SpecTable
              columns={['Sí', 'No']}
              rows={[
                ['Optimiza tu retorno neto', 'Revoluciona tu producción con IA'],
                ['Controla el gasto antes de aprobarlo', 'Olvídate de tus costes para siempre'],
                ['Justifica la deducción con documentación trazable', 'Deducciones sin esfuerzo'],
                ['Revisa esta factura: confianza baja en la clasificación', 'La IA lo ha hecho por ti'],
              ]}
            />
          </div>
          <Card className="mt-4 rounded-2xl p-6">
            <h3 className="font-display text-xl font-bold text-ink">Microcopy de referencia</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                'Estimación orientativa. No sustituye el criterio de tu asesor fiscal.',
                'Tu fiscalista firma. SetValio prepara la documentación.',
                'Leída como dato estructurado de la factura electrónica. Sin OCR, sin errores de lectura.',
                'La suma de deducción y subvenciones no puede superar el 50 % del coste.',
              ].map((copy) => (
                <div key={copy} className="rounded-lg border border-line bg-surface/70 p-4 text-sm font-semibold leading-relaxed text-muted">{copy}</div>
              ))}
            </div>
          </Card>
        </Section>

        <Section id="accesibilidad" title="Accesibilidad" kicker="AA mínimo">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Contraste', 'Texto principal y controles superan AA sobre Papel y Tinte ciruela.'],
              ['Foco visible', 'Anillo Ink con offset; no depende de sombra ni color suave.'],
              ['Táctil', 'Botones, inputs y filas accionables mantienen 44px mínimo.'],
              ['No solo color', 'Estados usan icono, etiqueta, signo y texto además del tono.'],
            ].map(([title, text]) => (
              <Card key={title} className="rounded-2xl p-5">
                <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section id="revision" title="Revisión del prototipo" kicker="Pantalla por pantalla">
          <SpecTable columns={['Pantalla', 'Componentes revisados', 'Estado', 'Criterio']} rows={prototypeReview} />
        </Section>

        <Section id="tokens" title="Tokens para copiar" kicker="Implementación">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl">
              <div className="border-b border-line bg-surface px-5 py-4">
                <h3 className="font-display text-lg font-bold text-ink">Variables CSS</h3>
              </div>
              <pre className="max-h-[560px] overflow-auto p-5 text-xs leading-relaxed text-muted scrollbar-thin"><code>{cssVariablesCode}</code></pre>
            </Card>
            <Card className="overflow-hidden rounded-2xl">
              <div className="border-b border-line bg-surface px-5 py-4">
                <h3 className="font-display text-lg font-bold text-ink">Fragmento tailwind.config</h3>
              </div>
              <pre className="max-h-[560px] overflow-auto p-5 text-xs leading-relaxed text-muted scrollbar-thin"><code>{tailwindCode}</code></pre>
            </Card>
          </div>
        </Section>

        <Section id="ejemplo" title="Pantalla de ejemplo" kicker="Sistema aplicado">
          <ExampleScreen />
        </Section>
      </div>
    </div>
  )
}
