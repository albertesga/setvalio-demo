// Redactor, sugerencias y barra del recorrido guiado.

import { forwardRef, useEffect, useRef, useState } from 'react'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconArrowUp, IconChevronDown } from '../../components/icons.jsx'

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
        Pide algo a los agentes
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
        placeholder="Pide algo a los agentes…"
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

/** Lleva a la tarjeta que espera la decisión del paso y le pasa el foco. Devuelve si la encontró. */
function irALaTarjeta(espera) {
  const abiertas = [...document.querySelectorAll(`.ag-aprobacion[data-ref="${espera.tipo}-${espera.id}"]:not(.is-decidida)`)]
  // Nunca otra tarjeta: decidirla no desbloquearía el paso.
  const t = abiertas[abiertas.length - 1]
  if (!t) return false
  const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  // Con un poco de aire arriba: la tarjeta no queda pegada a la barra del recorrido.
  const hilo = t.closest('.ag-scroll')
  if (hilo) hilo.scrollTo({ top: t.getBoundingClientRect().top - hilo.getBoundingClientRect().top + hilo.scrollTop - 16, behavior: reducido ? 'auto' : 'smooth' })
  else t.scrollIntoView({ block: 'start', behavior: reducido ? 'auto' : 'smooth' })
  const foco = t.querySelector('h4') ?? t
  if (!foco.hasAttribute('tabindex') && foco.tabIndex < 0) foco.setAttribute('tabindex', '-1')
  foco.focus({ preventScroll: true })
  return true
}

/**
 * Barra fija del recorrido: en qué paso estás y qué mirar, sin subir a buscarlo.
 * En móvil ocupa una línea («2/6 · Lo hace solo») y la nota se abre al tocarla;
 * en escritorio, la nota va entera.
 */
export const BarraRecorrido = forwardRef(function BarraRecorrido({ tour, ocupado, onSiguiente, onSalir, onPedirTarjeta }, ref) {
  const [nota, setNota] = useState(false)
  // Cada paso empieza con la nota plegada en móvil.
  const indice = tour?.indice
  useEffect(() => setNota(false), [indice])
  if (!tour) return null
  const { paso } = tour
  const bloqueado = !tour.puedeAvanzar
  // Si espera una decisión y los agentes ya han terminado, el botón lleva a la tarjeta.
  const esperaDecision = bloqueado && !ocupado && !!paso.espera
  const n = tour.indice + 1
  return (
    <div ref={ref} tabIndex={-1} className={`ag-tourbar flp-dark ${nota ? 'is-nota' : ''}`} role="region" aria-label={`Recorrido guiado, paso ${n} de ${tour.total}`}>
      <div className="ag-tourbar-texto">
        {/* Móvil: una línea que abre la nota. */}
        <button type="button" className="ag-tourbar-linea" aria-expanded={nota} aria-controls="ag-tourbar-nota" onClick={() => setNota((v) => !v)}>
          <span className="tnum">
            {n}/{tour.total}
          </span>
          <span aria-hidden="true">·</span>
          <span className="min-w-0 truncate">{paso.arco}</span>
          <IconChevronDown size={16} className={`flex-none transition-transform motion-reduce:transition-none ${nota ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="sr-only">{nota ? 'Ocultar la explicación' : 'Ver la explicación'}</span>
        </button>
        {/* Escritorio: paso, título y nota entera. */}
        <span className="ag-tourbar-kicker flp-kicker">
          Recorrido · paso <span className="tnum">{n}</span> de <span className="tnum">{tour.total}</span> · {paso.arco}
        </span>
        <span className="ag-tourbar-titulo">{paso.titulo}</span>
        <span id="ag-tourbar-nota" className="ag-tourbar-nota">
          {paso.nota}
        </span>
      </div>
      <div className="ag-tourbar-botones">
        <FilmpilotButton variant="ghost" onClick={onSalir} aria-label="Salir del recorrido">
          Salir
        </FilmpilotButton>
        {esperaDecision ? (
          <FilmpilotButton variant="secondary" onClick={() => irALaTarjeta(paso.espera) || onPedirTarjeta?.()} aria-label="Decide en la tarjeta para seguir: ir a la tarjeta">
            <span className="hidden sm:inline">Decide en la tarjeta</span>
            <span className="sm:hidden">Decide</span>
            <span aria-hidden="true">↓</span>
          </FilmpilotButton>
        ) : bloqueado ? (
          // aria-disabled y no disabled: el foco se queda en el botón mientras los agentes terminan.
          <FilmpilotButton variant="secondary" aria-disabled="true" className="is-bloqueado" title="Espera a que terminen los agentes">
            {tour.ultimo ? 'Terminar' : 'Siguiente'}
          </FilmpilotButton>
        ) : (
          <FilmpilotButton variant="primary" onClick={onSiguiente}>
            {tour.ultimo ? 'Terminar' : 'Siguiente'}
          </FilmpilotButton>
        )}
      </div>
    </div>
  )
})
