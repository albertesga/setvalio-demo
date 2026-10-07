// Composición orbital del kit en 3D, para el hero de la portada.
//
// En reposo el símbolo y las órbitas están como en graphics/orbit-signal.svg, sin sombra,
// y un visor de cámara los enmarca. Se mueve solo con la persona, nunca en bucle:
// - el cursor inclina la escena como un movimiento de cámara (los gestos del símbolo
//   están a distinta profundidad y tienen grosor, así que se ve el volumen);
// - el scroll abre los gestos como las láminas de un diafragma y acerca el satélite a
//   cámara; las órbitas giran como los aros de un gimbal y sus puntos recorren el
//   trazo; el visor lleva un código de tiempo que avanza con el scroll.
// Con prefers-reduced-motion se queda quieta. Es decorativa: aria-hidden.

import { useEffect, useRef, useState } from 'react'
import { SIMBOLO } from './glifos.js'
import './cinematic-symbol.css'

const LADO = 720 // sistema de coordenadas de orbit-signal.svg
const SIMBOLO_EN_ESCENA = 'translate(144 160) scale(2.4)'
const CAPAS = 5 // láminas por gesto: dan grosor al tirar de la cámara
const GROSOR = 3 // separación entre láminas, en unidades de la escena

// Por gesto (mismo orden que SIMBOLO.trazos): hacia dónde se abre, cuánto, a qué
// profundidad está en reposo, cuánto se acerca con el scroll, cuánto gira y su centro.
const GESTOS = [
  { dir: [-0.69, -0.72], abre: 44, z: 34, acerca: 30, gira: -16, centro: ['36.7%', '37.2%'] },
  { dir: [0.48, -0.88], abre: 56, z: 60, acerca: 70, gira: 22, centro: ['63.3%', '26.3%'] },
  { dir: [0.94, -0.35], abre: 44, z: 44, acerca: 40, gira: -14, centro: ['65.7%', '44.9%'] },
  { dir: [-0.95, 0.32], abre: 44, z: 26, acerca: 24, gira: 14, centro: ['35%', '55.8%'] },
  { dir: [0.37, 0.93], abre: 44, z: 50, acerca: 50, gira: -16, centro: ['55.3%', '64.9%'] },
]

const ORBITAS = ['M100 418C35 257 231 59 511 79', 'M583 267C728 441 513 682 299 642']
// Cada punto viaja por su órbita: [órbita, de dónde parte (0 inicio, 1 final), cuánto recorre].
const PUNTOS = [
  { orbita: 0, desde: 1, recorre: -0.55, r: 5, color: 'var(--flp-carbon)' },
  { orbita: 0, desde: 0, recorre: 0.3, r: 8, color: 'var(--flp-silver)' },
  { orbita: 1, desde: 1, recorre: -0.5, r: 5, color: 'var(--flp-silver)' },
]

const FPS = 24
function codigoDeTiempo(fotogramas) {
  const ff = fotogramas % FPS
  const s = Math.floor(fotogramas / FPS)
  const dos = (n) => String(n).padStart(2, '0')
  return `TC 00:${dos(Math.floor(s / 60))}:${dos(s % 60)}:${dos(ff)}`
}

const suave = (t) => t * t * (3 - 2 * t)
const limitar = (v, a = -1, b = 1) => Math.min(b, Math.max(a, v))

export function CinematicSymbol({ className = '' }) {
  const raiz = useRef(null)
  const escena = useRef(null)
  const simbolo = useRef(null)
  const gestos = useRef([])
  const orbitas = useRef(null)
  const trazosOrbita = useRef([])
  const puntos = useRef([])
  const sombra = useRef(null)
  const tc = useRef(null)
  // Factor de escala: las profundidades están en unidades de 720 y se pasan a píxeles.
  const [f, setF] = useState(0.5)
  // Al cambiar de tamaño, React repone los estilos de reposo: se vuelve a pintar el estado actual.
  const repintar = useRef(null)
  useEffect(() => {
    repintar.current?.()
  }, [f])

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const medir = () => setF(el.clientWidth / LADO || 0.5)
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (reducido?.matches) return
    const conCursor = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

    const objetivo = { x: 0, y: 0, p: 0 }
    const actual = { x: 0, y: 0, p: 0 }
    let raf = null
    let visible = true
    const largos = trazosOrbita.current.map((t) => t?.getTotalLength?.() ?? 0)

    const pintar = () => {
      const { x, y } = actual
      const e = suave(actual.p)
      const k = el.clientWidth / LADO
      // Cámara: el cursor inclina; el scroll baja la grúa y se acerca.
      escena.current.style.transform = `rotateX(${(-y * 12 + e * 12).toFixed(2)}deg) rotateY(${(x * 16).toFixed(2)}deg) translateZ(${(e * 20 * k).toFixed(1)}px)`
      // Diafragma: todo el símbolo gira un poco y cada gesto se abre hacia fuera.
      simbolo.current.style.transform = `rotateZ(${(-e * 12).toFixed(2)}deg)`
      GESTOS.forEach((g, i) => {
        const nodo = gestos.current[i]
        if (!nodo) return
        const d = g.abre * e * k
        nodo.style.transform = `translate3d(${(g.dir[0] * d).toFixed(1)}px, ${(g.dir[1] * d).toFixed(1)}px, ${((g.z + g.acerca * e) * k).toFixed(1)}px) rotateZ(${(g.gira * e).toFixed(2)}deg)`
      })
      // Las órbitas giran como los aros de un gimbal.
      orbitas.current.style.transform = `translateZ(${(14 * k).toFixed(1)}px) rotateZ(${(e * 32 + x * 6).toFixed(2)}deg)`
      PUNTOS.forEach((pt, i) => {
        const trazo = trazosOrbita.current[pt.orbita]
        const nodo = puntos.current[i]
        if (!trazo || !nodo || !largos[pt.orbita]) return
        const t = limitar(pt.desde + pt.recorre * e, 0, 1)
        const q = trazo.getPointAtLength(t * largos[pt.orbita])
        nodo.setAttribute('cx', q.x.toFixed(1))
        nodo.setAttribute('cy', q.y.toFixed(1))
      })
      // La sombra solo aparece con movimiento: en reposo el logo va sin sombra.
      const mov = Math.min(1, Math.hypot(x, y) * 0.9 + e * 1.4)
      sombra.current.style.opacity = (mov * 0.2).toFixed(3)
      sombra.current.style.transform = `translate3d(${(-x * 12 * k).toFixed(1)}px, ${((-y * 10 + 8 * e) * k).toFixed(1)}px, ${k.toFixed(2)}px)`
      if (tc.current) tc.current.textContent = codigoDeTiempo(Math.round(e * FPS * 12))
    }

    repintar.current = pintar

    const paso = () => {
      raf = null
      let quieto = true
      for (const c of ['x', 'y', 'p']) {
        const dif = objetivo[c] - actual[c]
        if (Math.abs(dif) > 0.0005) {
          actual[c] += dif * 0.12
          quieto = false
        } else actual[c] = objetivo[c]
      }
      pintar()
      // Sin bucles: solo sigue mientras quede camino hasta el objetivo.
      if (!quieto && visible) raf = requestAnimationFrame(paso)
    }
    const pedir = () => {
      if (raf === null && visible) raf = requestAnimationFrame(paso)
    }

    const alScroll = () => {
      const r = el.getBoundingClientRect()
      // 0 con la página arriba; 1 cuando la composición sale por arriba.
      objetivo.p = limitar(window.scrollY / Math.max(1, r.bottom + window.scrollY), 0, 1)
      pedir()
    }
    const alCursor = (ev) => {
      if (ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen') return
      const r = el.getBoundingClientRect()
      objetivo.x = limitar((ev.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))
      objetivo.y = limitar((ev.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))
      pedir()
    }
    const alSalir = () => {
      objetivo.x = 0
      objetivo.y = 0
      pedir()
    }
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entrada]) => {
            visible = entrada.isIntersecting
            if (visible) pedir()
          })
        : null
    io?.observe(el)

    window.addEventListener('scroll', alScroll, { passive: true })
    if (conCursor) {
      window.addEventListener('pointermove', alCursor, { passive: true })
      document.documentElement.addEventListener('pointerleave', alSalir)
    }
    alScroll()
    return () => {
      repintar.current = null
      if (raf !== null) cancelAnimationFrame(raf)
      io?.disconnect()
      window.removeEventListener('scroll', alScroll)
      window.removeEventListener('pointermove', alCursor)
      document.documentElement.removeEventListener('pointerleave', alSalir)
    }
  }, [])

  const capa = (contenido, z, extra = '', key) => (
    <svg key={key} className={`flp-cine-capa ${extra}`} viewBox={`0 0 ${LADO} ${LADO}`} style={{ transform: `translateZ(${(z * f).toFixed(2)}px)` }} focusable="false">
      {contenido}
    </svg>
  )

  return (
    <div ref={raiz} className={`flp-cine ${className}`} aria-hidden="true">
      <div ref={escena} className="flp-cine-escena">
        <div className="flp-cine-fondo" />
        <svg ref={sombra} className="flp-cine-capa flp-cine-sombra" viewBox={`0 0 ${LADO} ${LADO}`} focusable="false">
          <g transform={SIMBOLO_EN_ESCENA}>
            {SIMBOLO.trazos.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </svg>
        <svg ref={orbitas} className="flp-cine-capa flp-cine-orbitas" viewBox={`0 0 ${LADO} ${LADO}`} focusable="false">
          {ORBITAS.map((d, i) => (
            <path key={d} ref={(n) => (trazosOrbita.current[i] = n)} d={d} />
          ))}
          {PUNTOS.map((pt, i) => {
            const [x, y] = pt.orbita === 0 ? (pt.desde ? [511, 79] : [100, 418]) : [299, 642]
            return <circle key={i} ref={(n) => (puntos.current[i] = n)} cx={x} cy={y} r={pt.r} style={{ fill: pt.color }} />
          })}
        </svg>
        <div ref={simbolo} className="flp-cine-simbolo">
          {SIMBOLO.trazos.map((d, i) => (
            <div key={d} ref={(n) => (gestos.current[i] = n)} className="flp-cine-gesto" style={{ transformOrigin: `${GESTOS[i].centro[0]} ${GESTOS[i].centro[1]}`, transform: `translateZ(${(GESTOS[i].z * f).toFixed(2)}px)` }}>
              {Array.from({ length: CAPAS }, (_, c) =>
                capa(
                  <g transform={SIMBOLO_EN_ESCENA}>
                    <path d={d} />
                  </g>,
                  -c * GROSOR,
                  c === 0 ? 'is-frente' : 'is-canto',
                  c,
                ),
              )}
            </div>
          ))}
        </div>
        {/* Visor de cámara: esquinas, formato y código de tiempo. */}
        <div className="flp-cine-visor">
          <svg className="flp-cine-capa" viewBox={`0 0 ${LADO} ${LADO}`} focusable="false">
            <path d="M44 92V44H92 M628 44H676V92 M676 628V676H628 M92 676H44V628" />
          </svg>
          <span className="flp-cine-etiqueta is-arriba is-izquierda">A · CAM · {FPS} FPS</span>
          <span className="flp-cine-etiqueta is-arriba is-derecha">2.39:1</span>
          <span ref={tc} className="flp-cine-etiqueta is-abajo is-derecha">
            {codigoDeTiempo(0)}
          </span>
        </div>
      </div>
    </div>
  )
}
