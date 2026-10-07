import { useEffect, useRef } from 'react'
import { IconClose, IconArrowUp, IconArrowDown } from './icons.jsx'

const TONE = {
  neutral: { text: 'text-muted', bg: 'bg-surface', dot: 'bg-faint' },
  primary: { text: 'text-ink', bg: 'bg-primary-soft', dot: 'bg-primary-hover' },
  info: { text: 'text-info', bg: 'bg-info-soft', dot: 'bg-info' },
  positive: { text: 'text-positive', bg: 'bg-positive-soft', dot: 'bg-positive' },
  warning: { text: 'text-warning', bg: 'bg-warning-soft', dot: 'bg-warning' },
  negative: { text: 'text-negative', bg: 'bg-negative-soft', dot: 'bg-negative' },
}

/** Tono según una desviación (umbral relativo en %). */
export function toneForDesviacion(desviacionPct, { warnAt = 0.02 } = {}) {
  if (desviacionPct > warnAt) return 'negative'
  if (desviacionPct > 0.0005) return 'warning'
  if (desviacionPct < -0.0005) return 'positive'
  return 'neutral'
}

export function Card({ className = '', children, as: Tag = 'div', ...rest }) {
  return <Tag className={`fp-card-shell fp-flat-card rounded-2xl border border-line bg-canvas ${className}`} {...rest}>{children}</Tag>
}

export function Chip({ tone = 'neutral', children, dot = false, className = '' }) {
  const t = TONE[tone] || TONE.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border border-current/10 px-2.5 py-1 text-xs font-semibold ${t.bg} ${t.text} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Variación con signo y flecha, coloreada. positiveIsGood invierte el color. */
export function Delta({ value, format, positiveIsGood = false, className = '', showArrow = true }) {
  const isUp = value > 0
  const isFlat = Math.abs(value) < 0.0005
  let tone = 'text-muted'
  if (!isFlat) tone = (positiveIsGood ? isUp : !isUp) ? 'text-positive' : 'text-negative'
  const Arrow = isUp ? IconArrowUp : IconArrowDown
  return (
    <span className={`inline-flex items-center gap-0.5 tnum font-semibold ${tone} ${className}`}>
      {showArrow && !isFlat && <Arrow size={13} strokeWidth={2.2} aria-hidden="true" />}
      {format ? format(value) : value}
    </span>
  )
}

export function KPI({ label, value, sub, tone, footer, onClick }) {
  const clickable = typeof onClick === 'function'
  return (
    <Card
      as={clickable ? 'button' : 'div'}
      onClick={onClick}
      className={`fp-kpi flex min-h-[126px] min-w-0 flex-col gap-2 p-4 text-left sm:min-h-[148px] sm:p-5 ${clickable ? 'transition-colors hover:border-line-strong hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary-hover' : ''}`}
    >
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className={`fp-kpi-value font-display tnum text-[1.9rem] font-bold leading-tight ${tone || 'text-ink'}`}>{value}</span>
      {sub && <span className="text-xs leading-relaxed text-muted">{sub}</span>}
      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </Card>
  )
}

/** Barra de progreso con posibilidad de marcar sobrecoste por encima del 100 %. */
export function ProgressBar({ value, tone = 'primary', overflow = false, className = '', height = 'h-2' }) {
  const t = TONE[tone] || TONE.primary
  const percentage = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-line/70 ${height} ${className}`} role="progressbar" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${overflow ? TONE.negative.dot : t.dot}`} style={{ width: `${percentage}%` }} />
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="fp-page-header mb-5 flex flex-wrap items-end justify-between gap-3 pb-4 pt-1">
      <div className="max-w-3xl">
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight text-ink md:text-[2rem]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-base font-extrabold text-ink">{children}</h2>
      {right}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action, nota, className = '' }) {
  return (
    <Card className={`flex flex-col items-center px-6 py-16 text-center ${className}`}>
      {Icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-surface text-primary-hover"><Icon size={22} /></div>}
      <h3 className="font-display text-xl font-extrabold text-ink">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
      {nota && <p className="mx-auto mt-3 max-w-md text-xs text-faint">{nota}</p>}
    </Card>
  )
}

export function Button({ variant = 'secondary', size = 'md', children, className = '', icon: Icon, loading = false, disabled, ...rest }) {
  const base = 'fp-button inline-flex items-center justify-center gap-2 rounded-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-hover focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
  const sizes = {
    sm: 'min-h-[40px] px-4 py-2 text-xs',
    md: 'min-h-[44px] px-5 py-2.5 text-sm',
    lg: 'min-h-[48px] px-6 py-3 text-sm',
  }
  const variants = {
    primary: 'bg-ink text-surface hover:bg-primary-hover active:bg-primary-active',
    accent: 'bg-lima text-ink hover:bg-bloom active:bg-primary-soft',
    secondary: 'border border-line-strong bg-canvas text-ink hover:border-ink hover:bg-surface',
    ghost: 'text-ink hover:bg-surface',
    subtle: 'border border-line bg-primary-soft text-ink hover:bg-ease',
    danger: 'bg-negative text-white hover:bg-red-800 active:bg-red-900',
  }
  return (
    <button className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.secondary} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) {
  const closeRef = useRef(null)
  const modalRef = useRef(null)
  // onClose en un ref: si el padre lo recrea en cada render, el foco no debe saltar al botón de cerrar.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    closeRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
      if (event.key !== 'Tab') return
      const focusable = modalRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="fp-backdrop-enter fixed inset-0 bg-ink/40" onClick={onClose} />
      <div ref={modalRef} className={`fp-card-shell fp-dialog-enter relative z-10 mt-6 w-full ${width} overflow-hidden rounded-2xl border border-line bg-canvas shadow-modal`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-5">
          <div><h3 className="font-display text-base font-extrabold text-ink">{title}</h3>{subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}</div>
          <button ref={closeRef} onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label="Cerrar"><IconClose size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-surface/70 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Th({ children, align = 'left', className = '' }) {
  return <th className={`sticky top-0 z-10 border-y border-line bg-surface px-4 py-3.5 text-xs font-semibold text-muted ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>{children}</th>
}

export function Td({ children, align = 'left', className = '', tabular = false }) {
  return <td className={`px-4 py-3.5 align-middle text-sm ${align === 'right' ? 'text-right' : 'text-left'} ${tabular ? 'tnum' : ''} ${className}`}>{children}</td>
}
