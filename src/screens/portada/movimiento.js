// Movimiento de la portada: hooks compartidos, sin dependencias.
//
// Reglas de la marca que aplican todos:
// - Nada en bucle: un frame solo se pide si hay algo que pintar.
// - Con prefers-reduced-motion la portada se queda en su estado final, quieta.
// - Solo se anima transform y opacity (y clip-path donde se dice).
//
// Hay una trampa: src/index.css acorta duraciones con movimiento reducido, pero no
// anula los retardos. Por eso ningún estado de partida oculto existe sin dos guardas:
// la toma armada por JS (usePrefiereMovimiento) y su CSS dentro de
// @media (prefers-reduced-motion: no-preference).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

export const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** La misma curva suave que el hero (smoothstep). */
export const suave = (t) => t * t * (3 - 2 * t)

// ── ¿Hay movimiento? ─────────────────────────────────────────────────────────

const CONSULTA = '(prefers-reduced-motion: no-preference)'
function suscribirMovimiento(cb) {
  const mq = typeof window !== 'undefined' ? window.matchMedia?.(CONSULTA) : null
  mq?.addEventListener?.('change', cb)
  return () => mq?.removeEventListener?.('change', cb)
}
const leerMovimiento = () => typeof window !== 'undefined' && !!window.matchMedia?.(CONSULTA).matches

/** true si la persona no ha pedido movimiento reducido. Correcto desde el primer render. */
export function usePrefiereMovimiento() {
  return useSyncExternalStore(suscribirMovimiento, leerMovimiento, () => false)
}

// ── ¿Está a la vista? ────────────────────────────────────────────────────────

/** IntersectionObserver de un solo uso (o continuo con una: false). Sin IO, da el bloque por visto. */
export function useEnVista(ref, { umbral = 0.4, margen = '0px 0px -10% 0px', una = true } = {}) {
  const [visto, setVisto] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisto(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true)
          if (una) io.disconnect()
        } else if (!una) setVisto(false)
      },
      { threshold: umbral, rootMargin: margen },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, umbral, margen, una])
  return visto
}

// ── Toma: una secuencia que se reproduce una vez al entrar en pantalla ────────

/**
 * Fases: 'final' (por defecto: lo que se ve sin movimiento, el render de siempre),
 * 'lista' (estado de partida, antes de pintar), 'rodando' y 'hecha'.
 *
 * Solo se arma ('lista') si hay movimiento, hay IntersectionObserver y el bloque está
 * por debajo del pliegue al montar: lo que ya se ve al cargar no se esconde. Pasa a
 * 'rodando' cuando lleva `espera` ms a la vista (así no se dispara al pasar de largo con
 * un ancla) y a 'hecha' tras `duracion` ms. repetir() la vuelve a poner en marcha.
 *
 * `vuelta` sube cada vez que empieza una toma: sirve de key y para CifraCinta.
 * Pinta data-fase={fase} en el contenedor y pon el CSS de 'lista' y 'rodando' dentro de
 * @media (prefers-reduced-motion: no-preference).
 */
export function useToma(ref, { umbral = 0.45, duracion = 1000, margen = '0px', espera = 150 } = {}) {
  const movimiento = usePrefiereMovimiento()
  const [fase, setFase] = useState('final')
  const [vuelta, setVuelta] = useState(0)
  const repitiendo = useRef(false)

  // Armar antes de pintar: sin parpadeo del estado final al de partida.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !movimiento || typeof IntersectionObserver === 'undefined') return
    if (el.getBoundingClientRect().top > window.innerHeight) setFase((f) => (f === 'final' ? 'lista' : f))
  }, [ref, movimiento])

  // Si la persona pide movimiento reducido en caliente, todo a su estado final.
  useEffect(() => {
    if (!movimiento) setFase('final')
  }, [movimiento])

  // Lista → rodando cuando lleva un momento a la vista.
  useEffect(() => {
    if (fase !== 'lista') return
    const arrancar = () => {
      setVuelta((v) => v + 1)
      setFase('rodando')
    }
    if (repitiendo.current) {
      repitiendo.current = false
      // Dos frames: el navegador pinta el estado de partida antes de animar.
      let r2 = null
      const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(arrancar)))
      return () => {
        cancelAnimationFrame(r1)
        if (r2 !== null) cancelAnimationFrame(r2)
      }
    }
    const el = ref.current
    if (!el) return
    let t = null
    const io = new IntersectionObserver(
      ([e]) => {
        clearTimeout(t)
        if (e.isIntersecting) t = setTimeout(arrancar, espera)
      },
      { threshold: umbral, rootMargin: margen },
    )
    io.observe(el)
    return () => {
      clearTimeout(t)
      io.disconnect()
    }
  }, [fase, ref, umbral, margen, espera])

  // Rodando → hecha. En un efecto propio para que StrictMode lo limpie y lo rearme.
  useEffect(() => {
    if (fase !== 'rodando') return
    const t = setTimeout(() => setFase('hecha'), duracion)
    return () => clearTimeout(t)
  }, [fase, duracion])

  const repetir = useCallback(() => {
    if (!movimiento) return
    repitiendo.current = true
    setFase('lista')
  }, [movimiento])

  return { fase, vuelta, repetir, corriendo: fase === 'lista' || fase === 'rodando' }
}

// ── Progreso de scroll: un solo planificador para toda la página ──────────────

// Cada registro: { el, pintar (ref a la función), activo, pagina }. Un listener de scroll,
// uno de resize y como mucho un requestAnimationFrame pendiente. En cada frame se leen
// primero todas las medidas y después se pinta: nada de lecturas y escrituras mezcladas.
const registros = new Set()
let raf = null
let escuchando = false

function frame() {
  raf = null
  const vh = window.innerHeight
  const scrollY = window.scrollY
  const lecturas = []
  for (const r of registros) {
    if (!r.activo) continue
    if (r.pagina) {
      const max = Math.max(1, document.documentElement.scrollHeight - vh)
      lecturas.push([r, { p: limitar(scrollY / max), vh, scrollY }])
    } else {
      lecturas.push([r, { rect: r.el.getBoundingClientRect(), vh, scrollY }])
    }
  }
  for (const [r, datos] of lecturas) r.pintar.current(datos)
}

/** Pide un frame si hay algo activo. Útil tras un cambio de tamaño que no mueve el scroll. */
export function pedirFrame() {
  if (raf !== null) return
  for (const r of registros) {
    if (r.activo) {
      raf = requestAnimationFrame(frame)
      return
    }
  }
}

function escuchar() {
  if (escuchando) return
  escuchando = true
  window.addEventListener('scroll', pedirFrame, { passive: true })
  window.addEventListener('resize', pedirFrame)
}

function dejarDeEscuchar() {
  if (registros.size || !escuchando) return
  escuchando = false
  window.removeEventListener('scroll', pedirFrame)
  window.removeEventListener('resize', pedirFrame)
  if (raf !== null) cancelAnimationFrame(raf)
  raf = null
}

/**
 * Llama a pintar({ rect, vh, scrollY }) en cada frame de scroll mientras `ref` esté cerca
 * de la pantalla. Con { pagina: true } no hace falta ref y pintar recibe { p, vh, scrollY },
 * con p de 0 (arriba) a 1 (abajo del todo). pintar no debe leer la maquetación: solo
 * escribir estilos (las medidas que necesite, cacheadas con un ResizeObserver).
 * Sin movimiento no se registra nada: el componente se queda en su estado final.
 */
export function useProgresoScroll(ref, pintar, { activo = true, pagina = false } = {}) {
  const movimiento = usePrefiereMovimiento()
  const pintarRef = useRef(pintar)
  pintarRef.current = pintar
  useEffect(() => {
    if (!movimiento || !activo) return
    const el = ref?.current ?? null
    if (!pagina && !el) return
    // Activo desde el principio: el primer frame pinta aunque el IO aún no haya contestado.
    const r = { el, pintar: pintarRef, activo: true, pagina }
    registros.add(r)
    escuchar()
    let io = null
    if (!pagina) {
      if (typeof IntersectionObserver === 'undefined') r.activo = true
      else {
        // Un 10 % de margen para no empezar tarde ni cortar el último frame.
        io = new IntersectionObserver(
          ([e]) => {
            r.activo = e.isIntersecting
            pedirFrame()
          },
          { rootMargin: '10% 0px 10% 0px' },
        )
        io.observe(el)
      }
    }
    pedirFrame()
    return () => {
      io?.disconnect()
      registros.delete(r)
      dejarDeEscuchar()
    }
  }, [ref, movimiento, activo, pagina])
}

// ── Sección activa ───────────────────────────────────────────────────────────

/** Id de la sección que cruza la franja central de la pantalla. Solo cambia de estado al cambiar de sección. */
// Franja de lectura: la sección activa es la que cruza la pantalla entre el 45 % y el 50 %.
// La pista de montaje pone su punto de lectura en el centro de esa franja.
export const FRANJA_LECTURA = { arriba: 0.45, abajo: 0.5 }
const MARGEN_LECTURA = `-${FRANJA_LECTURA.arriba * 100}% 0px -${FRANJA_LECTURA.abajo * 100}% 0px`

export function useSeccionActiva(ids, rootMargin = MARGEN_LECTURA) {
  const [activa, setActiva] = useState(null)
  const clave = ids.join(',')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setActiva(e.target.id)
      },
      { rootMargin },
    )
    for (const id of clave.split(',')) {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [clave, rootMargin])
  return activa
}
