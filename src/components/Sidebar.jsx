import { useEffect, useRef } from 'react'
import { IconClose } from './icons.jsx'
import { temaDe } from '../lib/theme.js'
import { BrandLockup } from './Brand.jsx'

export const NAV_GROUPS = [
  {
    title: 'Proyecto',
    description: 'Base común',
    items: [
      { id: 'panel', label: 'Resumen' },
      { id: 'presupuesto', label: 'Presupuesto ICAA' },
    ],
  },
  {
    title: 'Optimizar retorno',
    description: 'Deducción, ayudas y límites',
    items: [
      { id: 'incentivos', label: 'Optimizador de incentivos' },
      { id: 'ayudas', label: 'Ayudas compatibles' },
    ],
  },
  {
    title: 'Financiar',
    description: 'Cobros, pagos y gap',
    items: [
      { id: 'tesoreria', label: 'Plan de financiación' },
    ],
  },
  {
    title: 'Rodaje y gasto',
    description: 'Control antes y después',
    items: [
      { id: 'coste', label: 'Control de costes' },
      { id: 'compras', label: 'Órdenes de compra' },
      { id: 'facturas', label: 'Bandeja de gastos' },
    ],
  },
  {
    title: 'Justificación fiscal',
    description: 'Base defendible y evidencias',
    items: [
      { id: 'elegibilidad', label: 'Elegibilidad fiscal' },
      { id: 'documental', label: 'Dossier fiscal' },
      { id: 'informes', label: 'Informes' },
    ],
  },
  {
    title: 'Sistema',
    items: [{ id: 'design-system', label: 'Design system' }],
  },
]

export const NAV = NAV_GROUPS.flatMap((group) => group.items)

// «Ver como» (rol): solo resalta ítems, no restringe nada.
// TODO: permisos finos por rol → capa D3 media (ver Notion subpágina 11)
const ROLE_HIGHLIGHT = {
  Fiscalista: ['elegibilidad', 'documental', 'informes', 'despacho'],
  'Line producer': ['presupuesto', 'coste', 'compras', 'facturas'],
}

export const BOTTOM_GROUPS = [
  {
    title: 'Cartera',
    items: [{ id: 'proyectos', label: 'Proyectos' }],
  },
  {
    title: 'Despacho',
    items: [{ id: 'despacho', label: 'Consola Despacho' }],
  },
]

// Sub-pestañas: agrupan pantallas relacionadas bajo un ítem de la navegación.
export const SUBNAV = {
  incentivos: [
    { id: 'incentivos', label: 'Optimizador' },
    { id: 'escenarios', label: 'Escenarios guardados' },
  ],
  coste: [
    { id: 'coste', label: 'Costes' },
    { id: 'proveedores', label: 'Proveedores' },
  ],
}

/** Ruta raíz (ítem de navegación) a la que pertenece una pantalla. */
export function grupoRaiz(route) {
  for (const root in SUBNAV) {
    if (SUBNAV[root].some((i) => i.id === route)) return root
  }
  return route
}

function NavList({ current, onNavigate, icons, items = NAV, verComo, compact = false }) {
  const resaltados = ROLE_HIGHLIGHT[verComo] || []
  return (
    <nav className={`flex flex-col ${compact ? '' : 'px-3'}`}>
      {items.map((item) => {
        const Icon = icons[item.id]
        const active = current === item.id || grupoRaiz(current) === item.id
        const resaltado = !active && resaltados.includes(item.id)
        const theme = temaDe(item.id)
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{ '--item-accent': theme.accent, '--item-soft': theme.soft }}
            className={`group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
              active
                ? 'bg-[var(--item-soft)] text-ink font-semibold'
                : resaltado
                  ? 'bg-surface text-ink'
                  : 'text-muted hover:bg-surface hover:text-ink'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {active && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-ink" aria-hidden="true" />}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? 'bg-ink text-white' : 'bg-surface text-muted group-hover:text-ink'}`}
            >
              {Icon && <Icon size={16} />}
            </span>
            <span className="flex-1">{item.label}</span>
            {resaltado && <span className="h-1.5 w-1.5 rounded-full bg-primary-hover" aria-hidden="true" />}
          </button>
        )
      })}
    </nav>
  )
}

function NavGroups({ current, onNavigate, icons, groups = NAV_GROUPS, verComo }) {
  return (
    <div className="space-y-1 px-3 pb-2 pt-2">
      {groups.map((group) => (
        <section key={group.title}>
          <div className="mb-1 px-3">
            <div className="text-[11px] font-semibold text-faint">{group.title}</div>
          </div>
          <NavList current={current} onNavigate={onNavigate} icons={icons} items={group.items} verComo={verComo} compact />
        </section>
      ))}
    </div>
  )
}

function Brand({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Ir a la página de inicio"
      className="flex w-full items-center gap-3 border-b border-line px-5 py-5 text-left transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-hover"
    >
      <BrandLockup compact decorative />
    </button>
  )
}

export default function Sidebar({ current, onNavigate, icons, mobileOpen, onCloseMobile, verComo }) {
  const closeRef = useRef(null)
  const onCloseRef = useRef(onCloseMobile)
  onCloseRef.current = onCloseMobile

  useEffect(() => {
    if (!mobileOpen) return
    const previousFocus = document.activeElement
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus?.()
    }
  }, [mobileOpen])

  return (
    <>
      {/* Escritorio */}
      <aside className="fp-shell-surface hidden w-[270px] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-card lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)]">
        <Brand onClick={() => onNavigate('landing')} />
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <NavGroups current={current} onNavigate={onNavigate} icons={icons} verComo={verComo} />
        </div>
        <div className="border-t border-line pb-2">
          <NavGroups current={current} onNavigate={onNavigate} icons={icons} groups={BOTTOM_GROUPS} verComo={verComo} />
        </div>
      </aside>

      {/* Móvil (cajón) */}
      <div className={`fp-mobile-nav fixed inset-0 z-50 lg:hidden${mobileOpen ? ' is-open' : ''}`} aria-hidden={!mobileOpen} inert={mobileOpen ? undefined : ''}>
          <div className="fp-mobile-nav-backdrop absolute inset-0 bg-ink/40" onClick={onCloseMobile} />
          <aside className="fp-mobile-nav-panel fp-shell-surface absolute left-0 top-0 flex h-full w-80 max-w-[88vw] flex-col border-r border-line bg-canvas shadow-modal" aria-label="Navegación del producto">
            <div className="flex items-center justify-between">
              <Brand
                onClick={() => {
                  onNavigate('landing')
                  onCloseMobile?.()
                }}
              />
              <button
                ref={closeRef}
                onClick={onCloseMobile}
                className="mr-3 flex h-11 w-11 items-center justify-center rounded-lg text-faint hover:bg-surface hover:text-ink"
                aria-label="Cerrar menú"
              >
                <IconClose size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              <NavGroups
                current={current}
                onNavigate={(id) => {
                  onNavigate(id)
                  onCloseMobile?.()
                }}
                icons={icons}
                verComo={verComo}
              />
            </div>
            <div className="border-t border-line pb-2">
              <NavGroups
                current={current}
                onNavigate={(id) => {
                  onNavigate(id)
                  onCloseMobile?.()
                }}
                icons={icons}
                groups={BOTTOM_GROUPS}
                verComo={verComo}
              />
            </div>
          </aside>
        </div>
    </>
  )
}
