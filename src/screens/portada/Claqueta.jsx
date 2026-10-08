// Claqueta de la toma (K1): decorativa (aria-hidden), en HTML y CSS. Estilos en
// Cierre.css, que importa Cierre.jsx.
//
// El palo está abierto 16° y se cierra de golpe al pasar por «Probar los agentes» o al
// llegar a él con el teclado: es el «¡acción!» antes de entrar en los agentes. Eso es
// solo CSS (:has en Cierre.css). En táctil no hay hover: se cierra una sola vez al verla.
//
// El palo abierto es el estado de partida, así que solo existe con movimiento y la
// claqueta armada (data-armada). Sin movimiento se ve cerrada y quieta.

import { useRef, useSyncExternalStore } from 'react'
import { useEnVista, usePrefiereMovimiento } from './movimiento.js'
import { RODAJE } from './datos.js'

// ¿Pantalla sin hover (táctil)? Igual que usePrefiereMovimiento: correcto desde el
// primer render y atento a cambios en caliente.
const TACTIL = '(hover: none)'
function suscribirTactil(cb) {
  const mq = typeof window !== 'undefined' ? window.matchMedia?.(TACTIL) : null
  mq?.addEventListener?.('change', cb)
  return () => mq?.removeEventListener?.('change', cb)
}
const leerTactil = () => typeof window !== 'undefined' && !!window.matchMedia?.(TACTIL).matches

// Ref vacía: con cursor no hace falta observar nada (useEnVista no crea el observador).
const SIN_REF = { current: null }

export function Claqueta() {
  const ref = useRef(null)
  const movimiento = usePrefiereMovimiento()
  const tactil = useSyncExternalStore(suscribirTactil, leerTactil, () => false)
  const vista = useEnVista(movimiento && tactil ? ref : SIN_REF, { umbral: 0.6 })

  return (
    <div ref={ref} className={`claqueta${tactil && vista ? ' is-accion' : ''}`} data-armada={movimiento || undefined} aria-hidden="true">
      <span className="claqueta-palo" />
      <span className="claqueta-base" />
      <div className="claqueta-cuerpo">
        <div className="claqueta-campo">
          <span className="claqueta-etiqueta">PROD.</span>
          <span className="claqueta-valor">{RODAJE.titulo}</span>
        </div>
        <div className="claqueta-campo">
          <span className="claqueta-etiqueta">ESC.</span>
          <span className="claqueta-valor">Agentes</span>
        </div>
        <div className="claqueta-campo">
          <span className="claqueta-etiqueta">DÍA</span>
          <span className="claqueta-valor">
            {RODAJE.dia} DE {RODAJE.jornadas}
          </span>
        </div>
      </div>
    </div>
  )
}
