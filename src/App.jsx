import { lazy, Suspense, useEffect, useState } from 'react'
import { IconCheckCircle } from './components/icons.jsx'
import Landing from './screens/Landing.jsx'

const Agentes = lazy(() => import('./screens/Agentes.jsx'))

// Dos pantallas: la portada y el prototipo de agentes.
// ?vista=agentes abre directamente los agentes (enlace compartible en GitHub Pages).
function rutaInicial() {
  if (typeof window === 'undefined') return 'landing'
  return new URLSearchParams(window.location.search).get('vista') === 'agentes' ? 'agentes' : 'landing'
}

// Cada cambio de pantalla deja una entrada en el historial: «Atrás» vuelve a la anterior.
function urlDe(route) {
  const url = new URL(window.location.href)
  if (route === 'agentes') url.searchParams.set('vista', 'agentes')
  else url.searchParams.delete('vista')
  return url.pathname + url.search
}

export default function App() {
  const [route, setRoute] = useState(rutaInicial)
  // Lo que la portada pide a los agentes al abrirlos: { tour } o { pregunta }.
  const [contexto, setContexto] = useState(null)
  const [toast, setToast] = useState(null)

  // El encargo de la portada se consume una vez: al salir de los agentes se olvida,
  // así que «Adelante» no repite la pregunta.
  const navegar = (id, ctx) => {
    setContexto(id === 'agentes' ? ctx ?? null : null)
    if (id !== route && typeof window !== 'undefined') window.history.pushState({ route: id }, '', urlDe(id))
    setRoute(id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  const pushToast = (text) => setToast({ text, id: Date.now() })

  // «Atrás» y «Adelante» del navegador cambian de pantalla.
  useEffect(() => {
    window.history.replaceState({ ...(window.history.state ?? {}), route: rutaInicial() }, '', window.location.href)
    // Las anclas de la portada (#agentes…) no guardan pantalla: se deduce de la URL.
    const alVolver = (e) => {
      setRoute(e.state?.route ?? rutaInicial())
      setContexto(null)
    }
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="min-h-screen">
      {route === 'agentes' ? (
        <Suspense fallback={<div className="flp-theme flex min-h-screen items-center justify-center text-sm text-flp-muted" role="status">Cargando agentes…</div>}>
          <Agentes onNavigate={navegar} contexto={contexto} pushToast={pushToast} />
        </Suspense>
      ) : (
        <Landing onNavigate={navegar} />
      )}

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0">
          <div className="flp-theme flp-entra flex items-center gap-2.5 rounded-flp-md bg-flp-carbon px-4 py-3 text-sm text-flp-chalk shadow-[var(--flp-shadow)]">
            <IconCheckCircle size={18} className="text-flp-chalk" />
            {toast.text}
          </div>
        </div>
      )}
    </div>
  )
}
