// Titular que sube palabra a palabra desde una máscara al entrar en pantalla.
// Solo se usa donde cuenta algo (Agentes y Preguntas): no es el patrón de todos los h2.
// El nombre accesible es la frase entera; las palabras visibles van con aria-hidden.

import { Fragment, useRef } from 'react'
import { useToma } from './movimiento.js'
import './Titular.css'

export function Titular({ as: Tag = 'h2', id, className = '', pausaAntes = null, children }) {
  const ref = useRef(null)
  const { fase } = useToma(ref, { umbral: 0.6, duracion: 1400 })
  const texto = String(children)
  const palabras = texto.split(' ')
  return (
    <Tag ref={ref} id={id} className={`titular ${className}`} data-fase={fase}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {palabras.map((p, i) => (
          <Fragment key={i}>
            <span className="titular-ventana">
              <span style={{ '--i': i, '--pausa': pausaAntes != null && i >= pausaAntes ? '260ms' : '0ms' }}>{p}</span>
            </span>
            {i < palabras.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  )
}
