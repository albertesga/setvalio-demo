// Cifra de cinta: como el contador de un magnetoscopio. En reposo enseña siempre la
// cifra real; cada vez que cambia `vuelta`, cada dígito da una vuelta completa (0–9) y
// se para otra vez en su valor. Las unidades se paran primero. Puntos, «€», «−», «+»,
// «%», espacios y letras no se mueven. Nunca enseña ceros ni valores intermedios quietos.
//
// Sin movimiento: el texto tal cual, sin envoltorios.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePrefiereMovimiento } from './movimiento.js'
import './CifraCinta.css'

const DURACION = 700
const ESCALON = 35
const FILAS = [...'01234567890123456789']

export function CifraCinta({ texto, vuelta = 0, retardo = 0, className = '' }) {
  const movimiento = usePrefiereMovimiento()
  const [girando, setGirando] = useState(false)
  const anterior = useRef(vuelta)
  const caracteres = [...String(texto)]
  const digitos = caracteres.filter((ch) => ch >= '0' && ch <= '9').length

  // Cada cambio de vuelta: dos frames para pintar el reposo y después girar una vez.
  useLayoutEffect(() => {
    if (!movimiento || vuelta === anterior.current) return
    anterior.current = vuelta
    setGirando(false)
    let r2 = null
    const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setGirando(true))))
    return () => {
      cancelAnimationFrame(r1)
      if (r2 !== null) cancelAnimationFrame(r2)
    }
  }, [vuelta, movimiento])

  // Al acabar la vuelta, se recoloca sin transición: la columna repite 0–9, así que no se nota.
  useEffect(() => {
    if (!girando) return
    const t = setTimeout(() => setGirando(false), retardo + DURACION + digitos * ESCALON + 60)
    return () => clearTimeout(t)
  }, [girando, retardo, digitos])

  if (!movimiento) return <span className={className}>{texto}</span>

  let i = digitos
  return (
    <span className={`cinta ${className}`} data-girando={girando || undefined} style={{ '--retardo': `${retardo}ms` }}>
      <span className="sr-only">{texto}</span>
      <span className="cinta-visual" aria-hidden="true">
        {caracteres.map((ch, k) => {
          if (ch < '0' || ch > '9') return <span key={k}>{ch}</span>
          i -= 1
          return (
            <span key={k} className="cinta-col">
              <span className="cinta-tira" style={{ '--d': Number(ch), '--i': i }}>
                {FILAS.map((f, n) => (
                  <span key={n}>{f}</span>
                ))}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
