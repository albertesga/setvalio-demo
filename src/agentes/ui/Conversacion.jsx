// Redactor, sugerencias y barra del recorrido guiado.

import { forwardRef, useEffect, useRef, useState } from 'react'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconArrowUp, IconClock } from '../../components/icons.jsx'

/** Sugerencias para seguir: van al final de la última respuesta, no en el pie fijo. */
export function Sugerencias({ items, onElegir, deshabilitado }) {
  if (!items.length) return null
  return (
    <div className="ag-sugerencias-hilo" role="group" aria-labelledby="ag-para-seguir">
      <h3 id="ag-para-seguir" className="flp-kicker mb-2 text-flp-muted">
        Para seguir
      </h3>
      <div className="ag-sugerencias">
        {items.map((x) => (
          <button key={x.texto} type="button" className="ag-sugerencia" onClick={() => onElegir(x.texto)} disabled={deshabilitado}>
            {x.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Redactor({ ocupado, onEnviar, onEscribir, inputRef }) {
  const [texto, setTexto] = useState('')
  const historial = useRef([])
  const ref = inputRef
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
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
        Pregunta a los agentes
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
        placeholder="Pregunta a los agentes… por ejemplo, ¿por qué se desvía Viajes?"
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

/** Barra fija del recorrido: dice en qué paso estás y qué mirar, sin tener que subir a buscarlo. */
export const BarraRecorrido = forwardRef(function BarraRecorrido({ tour, onSiguiente, onSalir }, ref) {
  if (!tour) return null
  const bloqueado = !tour.puedeAvanzar
  const esperaDecision = bloqueado && tour.paso.espera
  return (
    <div ref={ref} tabIndex={-1} className="ag-tourbar flp-dark" role="region" aria-label="Recorrido guiado">
      <div className="min-w-0 flex-1">
        <span className="flp-kicker text-flp-muted">
          Recorrido guiado · paso <span className="tnum">{tour.indice + 1}</span> de <span className="tnum">{tour.total}</span>
        </span>
        <span className="block text-sm font-medium text-flp-ink">{tour.paso.titulo}</span>
        <span className="ag-tourbar-nota">{tour.paso.nota}</span>
        {esperaDecision && (
          <span id="ag-tour-espera" className="mt-1 flex items-center gap-1 text-xs font-medium text-flp-ink">
            <IconClock size={13} aria-hidden="true" /> Decide en la tarjeta para continuar.
          </span>
        )}
      </div>
      <div className="flex flex-none gap-2">
        <FilmpilotButton variant="ghost" onClick={onSalir}>
          Salir
        </FilmpilotButton>
        {/* aria-disabled y no disabled: el foco se queda en el botón mientras los agentes terminan. */}
        <FilmpilotButton
          variant="primary"
          aria-disabled={bloqueado || undefined}
          aria-describedby={esperaDecision ? 'ag-tour-espera' : undefined}
          className={bloqueado ? 'is-bloqueado' : ''}
          onClick={() => !bloqueado && onSiguiente()}
        >
          {tour.ultimo ? 'Terminar' : 'Siguiente'}
        </FilmpilotButton>
      </div>
    </div>
  )
})
