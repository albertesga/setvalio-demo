// Composición orbital del kit en 3D, para el hero de la portada.
//
// En reposo el símbolo y las órbitas están como en graphics/orbit-signal.svg, sin sombra,
// y un visor de cámara los enmarca. Se mueve una vez al llegar y después solo con la
// persona, nunca en bucle:
// - al cargar, la cámara A enfoca: el bloque amarillo se abre como un iris, el diafragma
//   se cierra en el logo y las esquinas del visor encuadran con un pequeño rebote. No hay
//   entrada si la página carga con el bloque ya pasado o con un ancla; si está bajo el
//   pliegue (móvil), espera abierta a que se vea;
// - el cursor inclina la escena como un movimiento de cámara (los gestos del símbolo
//   están a distinta profundidad y tienen grosor, así que se ve el volumen);
// - el scroll abre los gestos como las láminas de un diafragma y acerca el satélite a
//   cámara; las órbitas giran como los aros de un gimbal y sus puntos recorren el
//   trazo; el visor lleva un código de tiempo que avanza con el scroll.
// Con prefers-reduced-motion se queda quieta. Es decorativa: aria-hidden.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

// Esquinas del visor, una por trazo: en la entrada cada una llega desde fuera por su lado.
const ESQUINAS = [
  ['no', 'M44 92V44H92'],
  ['ne', 'M628 44H676V92'],
  ['se', 'M676 628V676H628'],
  ['so', 'M92 676H44V628'],
]

// Entrada de cámara. El iris, las esquinas y los datos del visor van en
// cinematic-symbol.css (0–650, 450–830 y 800–1000 ms); aquí, el diafragma.
const ENTRADA_ESPERA = 150 // ms con el diafragma abierto antes de empezar a cerrarse
const ENTRADA_AMORTIGUA = 0.07 // por frame de 60 fps: ≈ 1 s hasta el logo
const ENTRADA_APERTURA = 0.5 // cuánto abierto arranca: lo que da el scroll a media altura
// Por debajo, el diafragma ya está cerrado a menos de una décima de píxel: se da por
// acabado (≈ 1050 ms) y el rAF se para, en vez de seguir casi un segundo sin mover nada.
const ENTRADA_FIN = 0.02
const ENTRADA_CSS = 1100 // ms: lo último del CSS (los datos del visor) ya ha acabado
const ENTRADA_UMBRAL = 0.4 // bajo el pliegue, cuánto bloque se ve antes de arrancar

const FPS = 24
export function codigoDeTiempo(fotogramas) {
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
  // El mismo factor, para pintar(): se mide al cambiar de tamaño y no en cada frame.
  const escala = useRef(0.5)
  // Entrada de cámara: null (no hay o ya acabó), 'lista' (armada bajo el pliegue, quieta
  // en su primer fotograma) o 'rodando'. Solo la pone el efecto, y solo con movimiento.
  const [entrada, setEntrada] = useState(null)
  // Al cambiar de tamaño, React repone los estilos de reposo: se vuelve a pintar el estado
  // actual. Antes de pintar, para que la entrada no enseñe un fotograma con el logo cerrado.
  const repintar = useRef(null)
  useLayoutEffect(() => {
    repintar.current?.()
  }, [f])

  useLayoutEffect(() => {
    const el = raiz.current
    if (!el) return
    const medir = () => {
      escala.current = el.clientWidth / LADO || 0.5
      setF(escala.current)
    }
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // Cuando acaba el CSS de la entrada se quita la clase: el reposo es su último fotograma.
  useEffect(() => {
    if (entrada !== 'rodando') return
    const t = setTimeout(() => setEntrada(null), ENTRADA_CSS)
    return () => clearTimeout(t)
  }, [entrada])

  // En layout: la entrada se arma y se pinta abierta antes del primer fotograma.
  useLayoutEffect(() => {
    const el = raiz.current
    if (!el) return
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (reducido?.matches) return
    const conCursor = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

    // x, y y p siguen a su objetivo; a (apertura de la entrada, de 1 a 0) se cierra sola.
    const objetivo = { x: 0, y: 0, p: 0 }
    const actual = { x: 0, y: 0, p: 0, a: 0 }
    let raf = null
    let visible = true
    let entradaDesde = null // cuándo arrancó la entrada; null si no hay ninguna en curso
    let enEspera = false // armada bajo el pliegue: abierta y sin cerrarse hasta que se vea
    let quieta = false // movimiento reducido pedido en caliente: en reposo y sin seguir a nadie
    let imprimiendo = false // entre beforeprint y afterprint: en reposo, sin frames
    let tcEscrito = null // el TC solo se reescribe cuando cambia de fotograma
    const largos = trazosOrbita.current.map((t) => t?.getTotalLength?.() ?? 0)

    const pintar = () => {
      const { x, y } = actual
      // La cámara y el TC solo siguen al scroll (así el código de tiempo no rebobina en la
      // entrada); el diafragma, las órbitas y la sombra también se abren con la entrada.
      const e = suave(actual.p)
      const abierto = suave(Math.max(actual.p, actual.a * ENTRADA_APERTURA))
      // Medido por el ResizeObserver: pintar() solo escribe, no lee la maquetación.
      const k = escala.current
      // Cámara: el cursor inclina; el scroll baja la grúa y se acerca.
      escena.current.style.transform = `rotateX(${(-y * 12 + e * 12).toFixed(2)}deg) rotateY(${(x * 16).toFixed(2)}deg) translateZ(${(e * 20 * k).toFixed(1)}px)`
      // Diafragma: todo el símbolo gira un poco y cada gesto se abre hacia fuera.
      simbolo.current.style.transform = `rotateZ(${(-abierto * 12).toFixed(2)}deg)`
      GESTOS.forEach((g, i) => {
        const nodo = gestos.current[i]
        if (!nodo) return
        const d = g.abre * abierto * k
        nodo.style.transform = `translate3d(${(g.dir[0] * d).toFixed(1)}px, ${(g.dir[1] * d).toFixed(1)}px, ${((g.z + g.acerca * abierto) * k).toFixed(1)}px) rotateZ(${(g.gira * abierto).toFixed(2)}deg)`
      })
      // Las órbitas giran como los aros de un gimbal.
      orbitas.current.style.transform = `translateZ(${(14 * k).toFixed(1)}px) rotateZ(${(abierto * 32 + x * 6).toFixed(2)}deg)`
      PUNTOS.forEach((pt, i) => {
        const trazo = trazosOrbita.current[pt.orbita]
        const nodo = puntos.current[i]
        if (!trazo || !nodo || !largos[pt.orbita]) return
        const t = limitar(pt.desde + pt.recorre * abierto, 0, 1)
        const q = trazo.getPointAtLength(t * largos[pt.orbita])
        nodo.setAttribute('cx', q.x.toFixed(1))
        nodo.setAttribute('cy', q.y.toFixed(1))
      })
      // La sombra solo aparece con movimiento: en reposo el logo va sin sombra.
      const mov = Math.min(1, Math.hypot(x, y) * 0.9 + abierto * 1.4)
      sombra.current.style.opacity = (mov * 0.2).toFixed(3)
      sombra.current.style.transform = `translate3d(${(-x * 12 * k).toFixed(1)}px, ${((-y * 10 + 8 * abierto) * k).toFixed(1)}px, ${k.toFixed(2)}px)`
      const texto = codigoDeTiempo(Math.round(e * FPS * 12))
      if (tc.current && texto !== tcEscrito) {
        tc.current.textContent = texto
        tcEscrito = texto
      }
    }

    repintar.current = pintar

    const paso = (ahora) => {
      raf = null
      let quieto = true
      for (const c of ['x', 'y', 'p']) {
        const dif = objetivo[c] - actual[c]
        if (Math.abs(dif) > 0.0005) {
          actual[c] += dif * 0.12
          quieto = false
        } else actual[c] = objetivo[c]
      }
      // El diafragma de la entrada se cierra por tiempo y no por frames: dura lo mismo a
      // 60 que a 120 Hz y no se descuadra del CSS. Si el bloque sale de pantalla a mitad,
      // al volver ya está en su sitio.
      if (entradaDesde !== null) {
        const pasado = ahora - entradaDesde - ENTRADA_ESPERA
        actual.a = pasado <= 0 ? 1 : (1 - ENTRADA_AMORTIGUA) ** (pasado / (1000 / 60))
        if (actual.a > ENTRADA_FIN) quieto = false
        else {
          actual.a = 0
          entradaDesde = null
        }
      }
      pintar()
      // Sin bucles: solo sigue mientras quede camino hasta el objetivo.
      if (!quieto && visible) raf = requestAnimationFrame(paso)
    }
    const pedir = () => {
      if (raf === null && visible && !quieta && !imprimiendo) raf = requestAnimationFrame(paso)
    }

    const arrancar = () => {
      enEspera = false
      actual.a = 1
      entradaDesde = performance.now()
      setEntrada('rodando')
      pedir()
    }

    const alScroll = () => {
      if (quieta) return
      const r = el.getBoundingClientRect()
      // 0 con la página arriba; 1 cuando la composición sale por arriba.
      objetivo.p = limitar(window.scrollY / Math.max(1, r.bottom + window.scrollY), 0, 1)
      pedir()
    }
    const alCursor = (ev) => {
      if (quieta || (ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen')) return
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
    // Si la persona pide menos movimiento en caliente, la entrada se acaba en el acto y la
    // composición vuelve al reposo y deja de seguir al cursor y al scroll (la regla de
    // reduce del CSS solo anula la escena, el símbolo y los gestos; no las órbitas, los
    // puntos ni la sombra). Si lo vuelve a quitar, sigue al scroll como antes.
    const alCambiarPreferencia = () => {
      quieta = !!reducido?.matches
      if (!quieta) {
        alScroll()
        return
      }
      enEspera = false
      entradaDesde = null
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null
      Object.assign(objetivo, { x: 0, y: 0, p: 0 })
      Object.assign(actual, { x: 0, y: 0, p: 0, a: 0 })
      setEntrada(null)
      pintar()
    }

    // Al imprimir, el reposo (sin inclinación ni sombra, puntos en su sitio y TC a cero);
    // después vuelve a seguir al scroll. Una entrada armada bajo el pliegue sigue armada.
    const alImprimir = () => {
      imprimiendo = true
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null
      entradaDesde = null
      Object.assign(objetivo, { x: 0, y: 0, p: 0 })
      Object.assign(actual, { x: 0, y: 0, p: 0, a: 0 })
      pintar()
    }
    const trasImprimir = () => {
      imprimiendo = false
      if (enEspera) actual.a = 1
      alScroll()
    }

    // Entrada: solo si el bloque no se ha pasado ya al montar (si la página carga con
    // scroll, no hay). A la vista arranca ya; bajo el pliegue espera a verse. Con un ancla
    // en la URL (#faq…) tampoco: el navegador baja hasta ella justo después de montar,
    // con scrollY aún a 0.
    const inicio = el.getBoundingClientRect()
    if (inicio.bottom > 0 && window.location.hash.length < 2) {
      if (inicio.top < window.innerHeight) arrancar()
      else if (typeof IntersectionObserver !== 'undefined') {
        enEspera = true
        actual.a = 1
        setEntrada('lista')
      }
    }

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entradas) => {
              // Con el hilo ocupado pueden llegar varias juntas: manda la última. Si se
              // leyera la primera, la entrada armada podría quedarse en espera a la vista.
              const vista = entradas[entradas.length - 1]
              visible = vista.isIntersecting
              if (enEspera && vista.intersectionRatio >= ENTRADA_UMBRAL) arrancar()
              if (visible) pedir()
            },
            { threshold: [0, ENTRADA_UMBRAL] },
          )
        : null
    io?.observe(el)

    window.addEventListener('scroll', alScroll, { passive: true })
    if (conCursor) {
      window.addEventListener('pointermove', alCursor, { passive: true })
      document.documentElement.addEventListener('pointerleave', alSalir)
    }
    reducido?.addEventListener?.('change', alCambiarPreferencia)
    window.addEventListener('beforeprint', alImprimir)
    window.addEventListener('afterprint', trasImprimir)
    alScroll()
    // El primer fotograma ya sale con el diafragma de la entrada abierto.
    pintar()
    return () => {
      repintar.current = null
      if (raf !== null) cancelAnimationFrame(raf)
      io?.disconnect()
      window.removeEventListener('scroll', alScroll)
      window.removeEventListener('pointermove', alCursor)
      document.documentElement.removeEventListener('pointerleave', alSalir)
      reducido?.removeEventListener?.('change', alCambiarPreferencia)
      window.removeEventListener('beforeprint', alImprimir)
      window.removeEventListener('afterprint', trasImprimir)
    }
  }, [])

  const capa = (contenido, z, extra = '', key) => (
    <svg key={key} className={`flp-cine-capa ${extra}`} viewBox={`0 0 ${LADO} ${LADO}`} style={{ transform: `translateZ(${(z * f).toFixed(2)}px)` }} focusable="false">
      {contenido}
    </svg>
  )

  const claseEntrada = entrada ? ` is-entrando${entrada === 'lista' ? ' is-en-espera' : ''}` : ''

  return (
    <div ref={raiz} className={`flp-cine${claseEntrada} ${className}`} aria-hidden="true">
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
            {ESQUINAS.map(([lado, d]) => (
              <path key={lado} className={`flp-cine-esquina is-${lado}`} d={d} />
            ))}
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
