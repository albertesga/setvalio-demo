// Pista de montaje: el borde inferior de la cabecera es la línea de tiempo de una mesa
// de montaje. Un clip por sección, tan ancho como alta es la sección, y un cabezal que
// sigue al scroll uno a uno: sin inercia, sin animación propia y quieto si no hay scroll.
// Es decoración (aria-hidden): nada de la página depende de ella.
//
// Con movimiento reducido la pista se queda con sus clips y sin cabezal.

import { memo, useLayoutEffect, useRef, useState } from 'react'
import { limitar, usePrefiereMovimiento, useProgresoScroll } from './movimiento.js'
import './PistaMontaje.css'

// Corte entre clips, en px: el mismo que el gap de .pista-montaje.
const CORTE = 2
// Punto de lectura, en fracción de la pantalla: el centro de la franja en la que
// useSeccionActiva marca la sección ('-45% 0px -50% 0px', la que usa Cabecera.jsx).
// Así el cabezal cambia de clip cuando cambia el enlace marcado.
const LECTURA = 0.475

// Posición en el documento sin transformaciones: si una sección se anima con transform,
// la pista no se entera.
function arribaEnDocumento(nodo) {
  let y = 0
  for (let n = nodo; n; n = n.offsetParent) y += n.offsetTop
  return y
}

// Dónde empieza y cuánto mide cada clip, con la misma cuenta que hace flex-grow.
function geometria(medidas, ancho) {
  const conAlto = medidas.filter((m) => m.alto > 0)
  const total = conAlto.reduce((s, m) => s + m.alto, 0)
  const libre = Math.max(0, ancho - CORTE * (conAlto.length - 1))
  let x = 0
  const tramos = conAlto.map((m) => {
    const w = total ? (libre * m.alto) / total : 0
    const tramo = { arriba: m.arriba, alto: m.alto, x, w }
    x += w + CORTE
    return tramo
  })
  return { ancho, tramos }
}

// Scroll → x en la pista. Cada clip ocupa el tramo de scroll en el que su sección es la
// activa: empieza cuando su borde superior cruza el punto de lectura. El primero arranca
// en 0 y el último acaba con la página, así que el cabezal sale del principio, llega al
// final y no salta. Cada clip se lleva el corte que le sigue. `max` es el scroll máximo.
function posicion({ ancho, tramos }, scrollY, vh, max) {
  const s = Math.max(0, scrollY)
  if (s >= max) return ancho
  if (!tramos.length) return (s / max) * ancho
  const lectura = LECTURA * vh
  let desde = 0
  for (let i = 0; i < tramos.length; i++) {
    const ultimo = i === tramos.length - 1
    const hasta = ultimo ? max : limitar(tramos[i + 1].arriba - lectura, desde, max)
    // s >= desde siempre aquí, así que hasta > desde: un tramo vacío no se pinta.
    if (s < hasta) {
      const t = tramos[i]
      return t.x + ((s - desde) / (hasta - desde)) * (ultimo ? t.w : t.w + CORTE)
    }
    desde = hasta
  }
  return ancho
}

export const PistaMontaje = memo(function PistaMontaje({ secciones }) {
  const movimiento = usePrefiereMovimiento()
  const pista = useRef(null)
  const cabezal = useRef(null)
  const [altos, setAltos] = useState(null)
  // Medidas cacheadas: se toman al montar y con el ResizeObserver, nunca en el scroll.
  const geo = useRef({ ancho: 0, tramos: [] })
  const ultimo = useRef(null)

  // Solo escribe: la x llega calculada sobre las medidas cacheadas.
  const colocar = (x) => {
    const n = cabezal.current
    const { ancho } = geo.current
    if (!n || ancho < 8) return
    // En píxeles enteros la línea de 1 px sale nítida; el triángulo no se sale por los bordes.
    const px = Math.round(limitar(x, 3, ancho - 4))
    if (px === ultimo.current) return
    ultimo.current = px
    n.style.transform = `translate3d(${px - 2}px, 0, 0)`
  }

  // En cada frame de scroll. El scroll máximo no se lee: sale de p (= scrollY / máximo) y
  // en los extremos no hace falta (arriba, el principio; abajo del todo, el final).
  useProgresoScroll(
    null,
    ({ p, vh, scrollY }) => colocar(posicion(geo.current, scrollY, vh, p >= 1 ? scrollY : p > 0 ? scrollY / p : Infinity)),
    { pagina: true },
  )

  // colocar solo usa refs: no hace falta rearmar el efecto en cada render.
  const clave = secciones.join(',')
  useLayoutEffect(() => {
    const el = pista.current
    if (!el) return
    const nodos = clave.split(',').map((id) => document.getElementById(id))
    const medir = () => {
      const medidas = nodos.map((n) => (n?.isConnected ? { arriba: arribaEnDocumento(n), alto: n.offsetHeight } : { arriba: 0, alto: 0 }))
      geo.current = geometria(medidas, el.clientWidth)
      const nuevos = medidas.map((m) => m.alto)
      setAltos((antes) => (antes && antes.length === nuevos.length && antes.every((a, i) => a === nuevos[i]) ? antes : nuevos))
    }
    // Fuera del scroll (al montar y al cambiar de tamaño) sí se puede leer: la maquetación
    // ya está hecha y se escribe una sola vez, al final.
    const colocarAhora = () => {
      if (!movimiento) return
      const vh = window.innerHeight
      colocar(posicion(geo.current, window.scrollY, vh, Math.max(1, document.documentElement.scrollHeight - vh)))
    }
    // Antes de pintar: si la portada se monta con scroll, el cabezal ya sale en su sitio.
    ultimo.current = null
    medir()
    colocarAhora()
    if (typeof ResizeObserver === 'undefined') return
    // Abrir una pregunta, cargar una fuente o girar el móvil cambia las alturas. Se recoloca
    // en el mismo frame, antes de pintar: un frame pedido aquí llegaría al siguiente.
    const ro = new ResizeObserver(() => {
      medir()
      colocarAhora()
    })
    ro.observe(el)
    const main = document.getElementById('landing-main')
    if (main) ro.observe(main)
    for (const n of nodos) if (n) ro.observe(n)
    return () => ro.disconnect()
  }, [clave, movimiento])

  return (
    <div ref={pista} className="pista-montaje" aria-hidden="true">
      {secciones.map((id, i) => (
        <span key={id} className="pista-clip" style={altos ? { flexGrow: altos[i] } : undefined} hidden={altos ? altos[i] === 0 : undefined} />
      ))}
      {movimiento && <span ref={cabezal} className="pista-cabezal" />}
    </div>
  )
})
