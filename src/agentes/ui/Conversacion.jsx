// Redactor y sugerencias de la conversación abierta.

import { useEffect, useRef, useState } from 'react'
import { IconArrowUp } from '../../components/icons.jsx'

/**
 * Sugerencias para seguir: van al final de la última respuesta, no en el pie fijo.
 * items = sugerenciasDe(s); onElegir recibe la sugerencia entera (envía `entrada` si la trae).
 */
export function Sugerencias({ items, onElegir, deshabilitado }) {
  if (!items.length) return null
  return (
    <div className="ag-sugerencias-hilo" role="group" aria-labelledby="ag-para-seguir">
      <h3 id="ag-para-seguir" className="flp-kicker mb-2 text-flp-muted">
        Para seguir
      </h3>
      <div className="ag-sugerencias">
        {items.map((x) => (
          <button key={x.texto} type="button" className="ag-sugerencia" onClick={() => onElegir(x)} disabled={deshabilitado} title={x.etiqueta !== x.texto ? x.texto : undefined}>
            {x.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Redactor({ ocupado, onEnviar, onEscribir, inputRef, placeholder = 'Escribe a los agentes…' }) {
  const [texto, setTexto] = useState('')
  const historial = useRef([])
  const ref = inputRef
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    // La barra de desplazamiento, solo cuando el texto no cabe en el alto máximo.
    el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden'
  }, [texto, ref])

  const enviar = () => {
    const limpio = texto.trim()
    // Mientras los agentes trabajan, el texto se queda en el campo hasta que terminen.
    if (!limpio || ocupado) return
    historial.current.push(limpio)
    onEnviar(limpio)
    setTexto('')
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      enviar()
    }
    if (e.key === 'ArrowUp' && !texto && historial.current.length) {
      e.preventDefault()
      setTexto(historial.current[historial.current.length - 1])
    }
  }
  return (
    <form
      className="ag-redactor"
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
    >
      <label htmlFor="ag-entrada" className="sr-only">
        {placeholder.replace('…', '')}
      </label>
      <textarea
        id="ag-entrada"
        ref={ref}
        rows={1}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          onEscribir?.()
        }}
        onFocus={() => onEscribir?.()}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="ag-redactor-campo"
        autoComplete="off"
        enterKeyHint="send"
      />
      <button type="submit" className="ag-redactor-boton" aria-label={ocupado ? 'Enviar (espera a que terminen los agentes)' : 'Enviar'} disabled={!texto.trim() || ocupado}>
        <IconArrowUp size={18} strokeWidth={2.4} />
      </button>
    </form>
  )
}
