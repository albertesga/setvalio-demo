// Hook de React sobre el almacén: reloj de reproducción, movimiento reducido y
// pestaña oculta. Solo navegador.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { obtener, suscribir, despachar } from './store.js'
import { conversacionIniciada } from './sesion.js'

export const RITMOS = {
  pausado: { etiqueta: 'Lento', factor: 0.6 },
  normal: { etiqueta: 'Normal', factor: 1 },
  rapido: { etiqueta: 'Rápido', factor: 2.5 },
}

export function useMovimientoReducido() {
  const [reducido, setReducido] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const fn = () => setReducido(mq.matches)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])
  return reducido
}

export function useAgentes({ ritmo = 'normal' } = {}) {
  const s = useSyncExternalStore(suscribir, obtener, obtener)
  const reducido = useMovimientoReducido()
  const factor = RITMOS[ritmo]?.factor ?? 1

  const activo = !!s.activo
  const activoId = s.activo?.id ?? null
  const hayCola = s.cola.length > 0
  const esperaEventos = !s.tour && !s.eventosPausados && s.mundo.entrantes.length > 0 && conversacionIniciada(s)

  useEffect(() => {
    if (activo && reducido) {
      despachar({ tipo: 'saltar' })
      return
    }
    if (!activo && !hayCola && !esperaEventos) return
    const intervalo = activo || hayCola ? 100 : 500
    let ultimo = performance.now()
    const id = setInterval(() => {
      if (document.hidden) {
        ultimo = performance.now()
        return
      }
      const ahora = performance.now()
      const ms = Math.min(5000, ahora - ultimo)
      ultimo = ahora
      despachar({ tipo: 'avanzar', ms: activo ? ms * factor : ms })
    }, intervalo)
    return () => clearInterval(id)
  }, [activo, activoId, hayCola, esperaEventos, reducido, factor])

  return { s, despachar }
}
