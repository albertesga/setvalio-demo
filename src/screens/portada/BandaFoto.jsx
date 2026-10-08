// Banda de la foto B/N: el contraplano del hero, visto por la cámara B. Capas, de lejos a
// cerca: la foto (más lenta que la página y con un leve acercamiento), una capa de
// exposición que se aclara al entrar, el texto (algo más rápido, cada línea a su ritmo),
// dos bandas de cine y el visor de la cámara B. Solo se mueve con el scroll y todo se
// deshace al volver.
//
// Las bandas están abiertas al entrar y al salir, y se cierran con la sección en el centro,
// como dicen la guía de identidad y Landing.css: es el encuadre de la cámara B. Casi
// cerradas, llevan sus rótulos (cámara y formato arriba; rodaje, día y código de tiempo
// abajo), y las esquinas del visor ajustan el encuadre al ritmo del cierre. Así se ven
// mientras la sección está a la vista y no bajo la cabecera fija. Con movimiento reducido
// quedan la foto quieta y las esquinas; los rótulos se van con las bandas.

import { useEffect, useRef } from 'react'
import { ProductionPhoto } from '../../brand/Filmpilot.jsx'
import { codigoDeTiempo } from '../../brand/CinematicSymbol.jsx'
import { Container } from './comun.jsx'
import { RODAJE } from './datos.js'
import { limitar, pedirFrame, suave, useProgresoScroll } from './movimiento.js'
import './BandaFoto.css'

const CAPAS_TEXTO = [1, 0.86, 0.72, 0.5]

// La cámara B rueda a 24 FPS, como la A del hero; la sección entera son 40 s de cinta.
const FPS = 24
const SEGUNDOS = 40

// Pasado el centro, «Menos / seguimiento.» baja al 55 %. Solo con la capa de contraste
// horizontal de Landing.css: por debajo de 640 px es vertical, la parte alta del titular
// queda casi sin velo y al 55 % no llegaría a 3:1 sobre la foto.
const RETIRADA = 0.45
const CAPA_VERTICAL = '(max-width: 640px)'

// Esquinas del visor en cajas de 24 × 24, con el vértice en la esquina de la caja. Cada una
// es su propio SVG: uno solo estirado a la banda apaisada deformaría los brazos.
const ESQUINAS = [
  ['is-arriba is-izquierda', 'M0 24V0H24'],
  ['is-arriba is-derecha', 'M0 0H24V24'],
  ['is-abajo is-derecha', 'M24 0V24H0'],
  ['is-abajo is-izquierda', 'M0 0V24H24'],
]

export function BandaFoto() {
  const raiz = useRef(null)
  const foto = useRef(null)
  const exposicion = useRef(null)
  const capas = useRef([])
  const bandas = useRef([])
  const encuadre = useRef(null)
  const datos = useRef([])
  const tc = useRef(null)
  const capaVertical = useRef(false)

  // pintar() no consulta media queries: la capa de contraste se lee aquí y se guarda.
  useEffect(() => {
    const mq = window.matchMedia?.(CAPA_VERTICAL)
    if (!mq) return
    const leer = () => {
      capaVertical.current = mq.matches
      pedirFrame()
    }
    leer()
    mq.addEventListener?.('change', leer)
    return () => mq.removeEventListener?.('change', leer)
  }, [])

  useProgresoScroll(raiz, ({ rect, vh }) => {
    // 0 cuando la sección asoma por abajo, 1 cuando sale por arriba.
    const p = limitar((vh - rect.top) / (vh + rect.height))
    const c = p - 0.5
    foto.current.style.transform = `translate3d(0, ${(c * 14).toFixed(2)}%, 0) scale(${(1.1 - p * 0.07).toFixed(4)})`
    // Sube la exposición mientras el titular aparece: la capa carbón pasa de .45 a 0.
    exposicion.current.style.opacity = (0.45 * (1 - suave(limitar((p - 0.15) / 0.3)))).toFixed(3)

    const aparece = limitar((p - 0.14) / 0.24)
    // El seguimiento se retira y la producción queda en primer plano. Al volver, se recupera.
    const retira = capaVertical.current ? 0 : limitar((c + 0.02) / 0.22)
    capas.current.forEach((n, i) => {
      if (!n) return
      n.style.transform = `translate3d(0, ${(-c * CAPAS_TEXTO[i] * 84).toFixed(1)}px, 0)`
      n.style.opacity = ((0.25 + 0.75 * aparece) * (i < 2 ? 1 - RETIRADA * retira : 1)).toFixed(3)
    })

    // Cerradas del todo entre p = 0.4 y 0.6, abiertas antes de 0.08 y después de 0.92.
    const cierre = 1 - limitar((Math.abs(c) - 0.1) / 0.32)
    bandas.current.forEach((n) => n && (n.style.transform = `scaleY(${cierre.toFixed(3)})`))
    // El operador ajusta el encuadre; los rótulos solo salen con las bandas casi cerradas,
    // para ir siempre en tiza sobre carbón.
    encuadre.current.style.transform = `scale(${(1.06 - 0.06 * cierre).toFixed(4)})`
    const rotulos = limitar((cierre - 0.8) / 0.2)
    const opacidad = rotulos.toFixed(3)
    datos.current.forEach((n) => n && (n.style.opacity = opacidad))
    // Con los rótulos apagados el TC no se toca: así no hay texto que maquetar en cada frame.
    if (rotulos > 0) {
      const t = codigoDeTiempo(Math.round(p * FPS * SEGUNDOS))
      if (tc.current.textContent !== t) tc.current.textContent = t
    }
  })

  const capa = (i) => (n) => (capas.current[i] = n)
  return (
    <section id="foto" ref={raiz} className="landing-photo-band flp-dark" aria-labelledby="landing-photo-title">
      <div ref={foto} className="landing-photo-media">
        <ProductionPhoto sizes="100vw" />
      </div>
      <span ref={exposicion} className="foto-exposicion" aria-hidden="true" />
      <span ref={(n) => (bandas.current[0] = n)} className="landing-photo-banda is-arriba" aria-hidden="true" />
      <span ref={(n) => (bandas.current[1] = n)} className="landing-photo-banda is-abajo" aria-hidden="true" />
      {/* Visor de la cámara B. Hermano de las bandas, no hijo: ellas escalan en Y y deformarían el texto. */}
      <div className="foto-visor" aria-hidden="true">
        <div ref={encuadre} className="landing-container foto-encuadre">
          {ESQUINAS.map(([lado, trazo]) => (
            <svg key={lado} className={`foto-esquina ${lado}`} viewBox="0 0 24 24" focusable="false">
              <path d={trazo} />
            </svg>
          ))}
        </div>
        <div ref={(n) => (datos.current[0] = n)} className="foto-datos is-arriba">
          <Container className="foto-datos-fila">
            <span>B · CAM · {FPS} FPS</span>
            <span>2.39:1</span>
          </Container>
        </div>
        <div ref={(n) => (datos.current[1] = n)} className="foto-datos is-abajo">
          <Container className="foto-datos-fila">
            <span>
              <span className="foto-datos-titulo">{`${RODAJE.titulo} · `}</span>
              {`Día ${RODAJE.dia} de ${RODAJE.jornadas}`}
            </span>
            <span ref={tc} className="foto-tc">
              {codigoDeTiempo(0)}
            </span>
          </Container>
        </div>
      </div>
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
