import { useEffect, useRef, useState } from 'react'
import { IconMenu, IconChevronDown, IconBell, IconCheck, IconProveedores } from './icons.jsx'
import { Chip } from './ui.jsx'
import { etiquetaTipologia } from '../lib/proyectos.js'

const ROLES = ['Productor ejecutivo', 'Line producer', 'Fiscalista']

function iniciales(titulo = '') {
  return (
    titulo
      .replace(/[^\p{L} ]/gu, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '—'
  )
}

export default function Topbar({
  onOpenMobile,
  alertCount = 0,
  proyectos = [],
  proyectoActivo,
  onSelectProyecto,
  verComo = 'Productor ejecutivo',
  onChangeVerComo,
  onNavigate,
  enDespacho = false,
}) {
  const [abierto, setAbierto] = useState(false)
  const projectButtonRef = useRef(null)
  const esAuditor = verComo === 'Fiscalista'

  useEffect(() => {
    if (!abierto) return
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setAbierto(false)
      projectButtonRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [abierto])

  return (
    <header className="fp-shell-surface sticky top-0 z-30 mx-3 mt-3 flex min-h-[68px] items-center gap-2 rounded-xl border border-line bg-canvas px-2.5 py-2.5 shadow-soft sm:gap-3 sm:px-4 lg:top-4 lg:mx-0 lg:mt-0 lg:px-5">
      <button
        onClick={onOpenMobile}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:bg-canvas lg:hidden"
        aria-label="Abrir menú"
      >
        <IconMenu size={20} />
      </button>

      {/* Contexto multi-cliente: la consola del despacho no se ata a un proyecto. */}
      {enDespacho && (
        <div className="flex items-center gap-2.5 px-1 py-2">
          <span className="hidden h-8 w-8 items-center justify-center rounded-md bg-ink text-white sm:flex">
            <IconProveedores size={15} />
          </span>
          <span className="text-sm font-semibold text-ink">Cartera de clientes</span>
        </div>
      )}

      {/* Selector de proyecto (cambia el activo) — oculto en la consola multi-cliente */}
      {!enDespacho && (
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <button
          ref={projectButtonRef}
          onClick={() => setAbierto((v) => !v)}
          className="flex min-h-11 w-full min-w-0 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2 py-2 text-left transition hover:border-line-strong hover:bg-surface sm:gap-2.5 sm:px-3"
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-controls="topbar-project-list"
        >
          <span className="hidden h-8 w-8 items-center justify-center rounded-md bg-ink text-xs font-semibold text-canvas sm:flex">
            {iniciales(proyectoActivo?.titulo)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block max-w-[180px] truncate text-sm font-semibold text-ink">{proyectoActivo?.titulo}</span>
            <span className="block truncate text-xs text-faint">{proyectoActivo?.productora}</span>
          </span>
          <IconChevronDown size={15} className={`shrink-0 text-faint transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`} />
        </button>

        {abierto && <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />}
            <div id="topbar-project-list" className={`fp-project-popover absolute left-0 z-50 mt-2 w-80 max-w-[calc(100vw-5rem)] overflow-hidden rounded-xl border border-line bg-canvas shadow-modal${abierto ? ' is-open' : ''}`} role="listbox" aria-hidden={!abierto} inert={abierto ? undefined : ''}>
              <div className="border-b border-line bg-surface px-4 py-3 text-xs font-semibold text-faint">Cambiar de proyecto</div>
              {proyectos.map((p) => {
                const activo = p.id === proyectoActivo?.id
                return (
                  <button
                    key={p.id}
                    role="option"
                    aria-selected={activo}
                    onClick={() => {
                      onSelectProyecto?.(p.id)
                      setAbierto(false)
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface ${activo ? 'bg-[var(--accent-soft)]' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{p.titulo}</span>
                      <span className="block truncate text-xs text-faint">{etiquetaTipologia(p.tipologia)} · {p.productora}</span>
                    </span>
                    {activo && <IconCheck size={15} className="shrink-0 text-[color:var(--accent)]" />}
                  </button>
                )
              })}
            </div>
      </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {esAuditor && !enDespacho && <Chip tone="primary" dot>Vista auditor</Chip>}

        {/* Ver como (rol) — solo demo, no restringe */}
        <label className="hidden items-center gap-1.5 rounded-lg border border-line bg-canvas py-1 pl-3 pr-1 xl:flex">
          <span className="text-xs font-medium text-faint">Ver como</span>
          <select
            value={verComo}
            onChange={(e) => onChangeVerComo?.(e.target.value)}
            className="rounded-md bg-transparent px-1 py-1 text-xs font-semibold text-ink"
            aria-label="Ver como"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onNavigate?.('facturas')}
          className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-canvas text-muted hover:bg-surface"
          aria-label={`${alertCount} gastos pendientes`}
          title="Abrir bandeja de gastos"
        >
          <IconBell size={19} />
          {alertCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-negative px-1 text-[10px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>
        <div className="hidden items-center gap-2 rounded-lg border border-line bg-canvas py-1 pl-1 pr-2.5 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-xs font-semibold text-white">
            MC
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-xs font-semibold text-ink">Marta Cobo</span>
            <span className="block text-xs text-faint">{verComo}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
