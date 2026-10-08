// Banda de la foto B/N. Capas, de lejos a cerca: la foto (más lenta que la página y con
// un leve acercamiento), el texto (algo más rápido, cada línea a su ritmo) y dos bandas
// de cine que se cierran cuando la sección llega al centro. Solo se mueve con el scroll.

import { useEffect, useRef } from 'react'
import { ProductionPhoto } from '../../brand/Filmpilot.jsx'
import { Container, movimientoReducido } from './comun.jsx'

const CAPAS_TEXTO = [1, 0.86, 0.72, 0.5]

export function BandaFoto() {
  const raiz = useRef(null)
  const foto = useRef(null)
  const capas = useRef([])
  const bandas = useRef([])

  useEffect(() => {
    const el = raiz.current
    if (!el || movimientoReducido()) return
    let raf = null
    let visible = false
    const pintar = () => {
      raf = null
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 cuando la sección asoma por abajo, 1 cuando sale por arriba.
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
      const c = p - 0.5
      foto.current.style.transform = `translate3d(0, ${(c * 14).toFixed(2)}%, 0) scale(${(1.1 - p * 0.07).toFixed(4)})`
      const aparece = Math.min(1, Math.max(0, (p - 0.14) / 0.24))
      capas.current.forEach((n, i) => {
        if (!n) return
        n.style.transform = `translate3d(0, ${(-c * CAPAS_TEXTO[i] * 84).toFixed(1)}px, 0)`
        n.style.opacity = (0.25 + 0.75 * aparece).toFixed(3)
      })
      const cierre = Math.min(1, Math.max(0, (Math.abs(c) - 0.1) / 0.32))
      bandas.current.forEach((n) => n && (n.style.transform = `scaleY(${cierre.toFixed(3)})`))
    }
    const pedir = () => {
      if (raf === null && visible) raf = requestAnimationFrame(pintar)
    }
    const io = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting
      pedir()
    })
    io.observe(el)
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
    }
  }, [])

  const capa = (i) => (n) => (capas.current[i] = n)
  return (
    <section id="foto" ref={raiz} className="landing-photo-band flp-dark" aria-labelledby="landing-photo-title">
      <div ref={foto} className="landing-photo-media">
        <ProductionPhoto sizes="100vw" />
      </div>
      <span ref={(n) => (bandas.current[0] = n)} className="landing-photo-banda is-arriba" aria-hidden="true" />
      <span ref={(n) => (bandas.current[1] = n)} className="landing-photo-banda is-abajo" aria-hidden="true" />
      <Container className="landing-photo-copy">
        <h2 id="landing-photo-title" className="flp-title">
          <span ref={capa(0)} className="landing-photo-capa">
            Menos
          </span>
          <span ref={capa(1)} className="landing-photo-capa">
            seguimiento.
          </span>
          <span ref={capa(2)} className="landing-photo-capa">
            Más producción.
          </span>
        </h2>
        <p ref={capa(3)} className="landing-photo-capa flp-body">
          Los agentes persiguen facturas, cuadran pedidos y vigilan el plan de rodaje. Tu equipo dedica el tiempo a producir.
        </p>
      </Container>
    </section>
  )
}
