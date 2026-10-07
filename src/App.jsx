import { lazy, Suspense, useEffect, useState } from 'react'
import Sidebar, { SUBNAV, grupoRaiz } from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import ProjectWorkflowBar from './components/ProjectWorkflowBar.jsx'
import {
  IconPanel,
  IconPresupuesto,
  IconCoste,
  IconFacturas,
  IconTesoreria,
  IconIncentivos,
  IconAyudas,
  IconProveedores,
  IconCheckCircle,
  IconBookmark,
  IconFilm,
  IconSearch,
  IconArrowLeft,
} from './components/icons.jsx'

import Landing from './screens/Landing.jsx'
import { normalizarProyecto, PROYECTOS } from './lib/proyectos.js'
import { temaDe } from './lib/theme.js'

const Panel = lazy(() => import('./screens/Panel.jsx'))
const Proyectos = lazy(() => import('./screens/Proyectos.jsx'))
const Presupuesto = lazy(() => import('./screens/Presupuesto.jsx'))
const Coste = lazy(() => import('./screens/Coste.jsx'))
const Facturas = lazy(() => import('./screens/Facturas.jsx'))
const Compras = lazy(() => import('./screens/Compras.jsx'))
const Elegibilidad = lazy(() => import('./screens/Elegibilidad.jsx'))
const Tesoreria = lazy(() => import('./screens/Tesoreria.jsx'))
const Incentivos = lazy(() => import('./screens/Incentivos.jsx'))
const Escenarios = lazy(() => import('./screens/Escenarios.jsx'))
const Ayudas = lazy(() => import('./screens/Ayudas.jsx'))
const Proveedores = lazy(() => import('./screens/Proveedores.jsx'))
const Informes = lazy(() => import('./screens/Informes.jsx'))
const Documental = lazy(() => import('./screens/Documental.jsx'))
const Despacho = lazy(() => import('./screens/Despacho.jsx'))
const DesignSystem = lazy(() => import('./screens/DesignSystem.jsx'))
const Agentes = lazy(() => import('./screens/Agentes.jsx'))

const NAV_ICONS = {
  proyectos: IconFilm,
  panel: IconPanel,
  presupuesto: IconPresupuesto,
  coste: IconCoste,
  compras: IconPresupuesto,
  facturas: IconFacturas,
  elegibilidad: IconCheckCircle,
  tesoreria: IconTesoreria,
  incentivos: IconIncentivos,
  escenarios: IconBookmark,
  ayudas: IconAyudas,
  proveedores: IconProveedores,
  documental: IconSearch,
  informes: IconBookmark,
  despacho: IconProveedores,
  'design-system': IconBookmark,
}

// ?vista=agentes abre directamente el prototipo conversacional (enlace compartible en GitHub Pages).
function rutaInicial() {
  if (typeof window === 'undefined') return 'landing'
  return new URLSearchParams(window.location.search).get('vista') === 'agentes' ? 'agentes' : 'landing'
}

function sincronizarVista(route) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const actual = url.searchParams.get('vista')
  if (route === 'agentes' && actual !== 'agentes') url.searchParams.set('vista', 'agentes')
  else if (route !== 'agentes' && actual) url.searchParams.delete('vista')
  else return
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}

export default function App() {
  const [route, setRoute] = useState(rutaInicial)
  const [desdeAgentes, setDesdeAgentes] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [gastosPendientes, setGastosPendientes] = useState(12)
  const [toast, setToast] = useState(null)
  const [routeContext, setRouteContext] = useState({})

  // Core data layer en memoria: cartera + proyecto activo + rol de visualización.
  const [proyectos, setProyectos] = useState(() => PROYECTOS.map(normalizarProyecto))
  const [proyectoActivoId, setProyectoActivoId] = useState(PROYECTOS[0].id)
  const [verComo, setVerComo] = useState('Productor ejecutivo')
  const proyectoActivo = proyectos.find((p) => p.id === proyectoActivoId) || proyectos[0]

  const navegar = (id, context) => {
    setRouteContext((prev) => {
      if (context !== undefined) return { ...prev, [id]: context }
      if (!prev[id]) return prev
      return { ...prev, [id]: null }
    })
    if (route === 'agentes' && id !== 'agentes' && id !== 'landing') setDesdeAgentes(true)
    if (id === 'agentes' || id === 'landing') setDesdeAgentes(false)
    setRoute(id)
    sincronizarVista(id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  const guardarProyecto = (p) => {
    const normalizado = normalizarProyecto(p)
    setProyectos((prev) => {
      if (normalizado.id && prev.some((x) => x.id === normalizado.id)) return prev.map((x) => (x.id === normalizado.id ? normalizado : x))
      const slug = (normalizado.titulo || 'proyecto').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18)
      return [...prev, normalizarProyecto({ ...normalizado, id: `p-${prev.length + 1}-${slug}` })]
    })
  }

  const actualizarProyectoActivo = (updater) => {
    setProyectos((prev) =>
      prev.map((p) => {
        if (p.id !== proyectoActivoId) return p
        const next = typeof updater === 'function' ? updater(p) : updater
        return normalizarProyecto(next)
      }),
    )
  }

  const abrirProyecto = (id) => {
    setProyectoActivoId(id)
    navegar('panel')
  }

  // «Ver como» lleva a cada rol a su espacio de trabajo (no solo resalta el menú).
  const ROLE_HOME = { 'Productor ejecutivo': 'panel', 'Line producer': 'coste', Fiscalista: 'despacho' }
  const cambiarVerComo = (rol) => {
    setVerComo(rol)
    navegar(ROLE_HOME[rol] || 'panel')
  }

  const pushToast = (text) => setToast({ text, id: Date.now() })
  const grupo = grupoRaiz(route)
  const tema = temaDe(grupo)
  const subtabs = SUBNAV[grupo]

  // Portada y agentes llevan la marca Filmpilot (tiza); las pantallas clásicas, SetValio (ciruela).
  const conMarcaNueva = route === 'landing' || route === 'agentes'
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', conMarcaNueva ? '#F5F4EF' : '#311B2E')
  }, [conMarcaNueva])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(t)
  }, [toast])

  const pantallas = {
    proyectos: (
      <Proyectos
        proyectos={proyectos}
        proyectoActivoId={proyectoActivoId}
        onAbrir={abrirProyecto}
        onGuardar={guardarProyecto}
        pushToast={pushToast}
      />
    ),
    panel: <Panel proyecto={proyectoActivo} onNavigate={navegar} />,
    presupuesto: <Presupuesto proyecto={proyectoActivo} onActualizarProyecto={actualizarProyectoActivo} pushToast={pushToast} onNavigate={navegar} />,
    coste: <Coste proyecto={proyectoActivo} pushToast={pushToast} onNavigate={navegar} contexto={routeContext.coste} />,
    facturas: <Facturas proyecto={proyectoActivo} pushToast={pushToast} onNavigate={navegar} contexto={routeContext.facturas} onPendingCountChange={setGastosPendientes} />,
    compras: <Compras proyecto={proyectoActivo} pushToast={pushToast} onNavigate={navegar} contexto={routeContext.compras} />,
    elegibilidad: <Elegibilidad proyecto={proyectoActivo} pushToast={pushToast} onNavigate={navegar} contexto={routeContext.elegibilidad} />,
    tesoreria: <Tesoreria proyecto={proyectoActivo} pushToast={pushToast} />,
    incentivos: <Incentivos key={proyectoActivo?.id} proyecto={proyectoActivo} onActualizarProyecto={actualizarProyectoActivo} pushToast={pushToast} onNavigate={navegar} />,
    escenarios: <Escenarios proyecto={proyectoActivo} onActualizarProyecto={actualizarProyectoActivo} pushToast={pushToast} onNavigate={navegar} />,
    ayudas: <Ayudas proyecto={proyectoActivo} onNavigate={navegar} contexto={routeContext.ayudas} />,
    proveedores: <Proveedores proyecto={proyectoActivo} />,
    documental: <Documental proyecto={proyectoActivo} pushToast={pushToast} contexto={routeContext.documental} />,
    informes: <Informes proyecto={proyectoActivo} pushToast={pushToast} />,
    despacho: <Despacho pushToast={pushToast} />,
    'design-system': <DesignSystem />,
  }

  return (
    <div
      className="min-h-screen bg-transparent text-ink"
      style={{ '--accent': tema.accent, '--accent-soft': tema.soft, '--accent-contrast': tema.contrast }}
    >
      {route === 'landing' ? (
        <Landing onNavigate={navegar} />
      ) : route === 'agentes' ? (
        <Suspense fallback={<div className="flp-theme flex min-h-screen items-center justify-center text-sm text-flp-muted" role="status">Cargando agentes…</div>}>
          <Agentes onNavigate={navegar} contexto={routeContext.agentes} pushToast={pushToast} />
        </Suspense>
      ) : (
        <div className="flex min-h-screen lg:p-4">
      <Sidebar
        current={route}
        onNavigate={navegar}
        icons={NAV_ICONS}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        verComo={verComo}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:gap-4">
        <Topbar
          onOpenMobile={() => setMobileNavOpen(true)}
          alertCount={gastosPendientes}
          proyectos={proyectos}
          proyectoActivo={proyectoActivo}
          onSelectProyecto={setProyectoActivoId}
          verComo={verComo}
          onChangeVerComo={cambiarVerComo}
          onNavigate={navegar}
          enDespacho={route === 'despacho'}
        />
        <ProjectWorkflowBar proyecto={proyectoActivo} route={route} onNavigate={navegar} />
        <main className="flex-1 px-4 pb-8 pt-5 lg:px-6 lg:pb-10 lg:pt-0">
          {subtabs && (
            <div className="mx-auto mb-4 max-w-[1240px]">
              <nav aria-label="Vistas de la sección" className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-canvas p-1">
                {subtabs.map((t) => {
                  const on = route === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => navegar(t.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`min-h-11 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                        on ? 'bg-ink text-canvas' : 'text-muted hover:bg-surface hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          )}
          <Suspense fallback={<div className="mx-auto max-w-[1240px] py-12 text-sm text-muted" role="status">Cargando espacio de trabajo…</div>}>
            {pantallas[route]}
          </Suspense>
        </main>
      </div>
        </div>
      )}

      {desdeAgentes && route !== 'agentes' && route !== 'landing' && (
        <button
          type="button"
          onClick={() => navegar('agentes')}
          className="fixed bottom-5 left-4 z-[55] inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-surface shadow-modal hover:bg-primary-hover lg:left-6"
        >
          <IconArrowLeft size={16} aria-hidden="true" />
          Volver a la conversación
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0">
          {conMarcaNueva ? (
            <div className="flp-theme fp-fade-up flex items-center gap-2.5 rounded-flp-md bg-flp-carbon px-4 py-3 text-sm text-flp-chalk shadow-modal">
              <IconCheckCircle size={18} className="text-flp-signal" />
              {toast.text}
            </div>
          ) : (
            <div className="fp-fade-up flex items-center gap-2.5 rounded-xl border border-line bg-ink px-4 py-3 text-sm text-white shadow-modal">
              <IconCheckCircle size={18} className="text-primary-soft" />
              {toast.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
