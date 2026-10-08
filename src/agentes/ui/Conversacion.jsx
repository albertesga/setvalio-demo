// Estado inicial, redactor, sugerencias y barra del recorrido guiado.

import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconArrowUp, IconChevronRight, IconPlay, IconClock } from '../../components/icons.jsx'
import { AGENTES, AUTONOMIA } from '../agentes.js'
import { CASOS, GRUPOS_CASOS, ETIQUETA_CAPACIDAD, LEYENDA_CAPACIDAD, RECORRIDO } from '../casos.js'
import { POLITICAS } from '../politicas.js'
import { formatear } from '../texto.js'
import { useCtx } from './contexto.js'
import { AutonomyBadge, Desplegable, nombresCortos } from './Piezas.jsx'
import { AgentesPorFamilia } from './Paneles.jsx'

const UMBRAL = formatear(POLITICAS.umbralDesviacion, 'pct0')
const PASOS_CON_DECISION = RECORRIDO.filter((p) => p.espera).length

function TarjetaCaso({ caso, onElegir, deshabilitado, destacado = false }) {
  const id = useId().replace(/:/g, '')
  // Lo que es de una fase posterior no actúa todavía: no se le pone nivel de autonomía.
  const como = caso.capacidad === 'posterior' ? null : AUTONOMIA[caso.nivel]?.etiqueta
  return (
    <button type="button" className="ag-caso" onClick={() => onElegir(caso.prompt)} disabled={deshabilitado} aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
      <span className="flex flex-wrap items-start justify-between gap-2">
        <strong id={`${id}-t`} className="ag-caso-titulo">
          {caso.titulo}
        </strong>
        {destacado && <span className="ag-etiqueta-capacidad">Empieza aquí</span>}
        {ETIQUETA_CAPACIDAD[caso.capacidad] && <span className="ag-etiqueta-capacidad">{ETIQUETA_CAPACIDAD[caso.capacidad]}</span>}
      </span>
      <span id={`${id}-d`} className="contents">
        <span className="ag-caso-desc">{caso.descripcion}</span>
        <span className="ag-caso-prompt">«{caso.prompt}»</span>
        <span className="mt-auto pt-2 text-xs text-flp-muted">
          {[como, nombresCortos(caso.agentes.map((a) => AGENTES[a].nombre))].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  )
}

// Evita que el segundo clic de un doble clic en la portada caiga sobre una tarjeta recién montada.
function useListo(ms) {
  const [listo, setListo] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setListo(true), ms)
    return () => clearTimeout(id)
  }, [ms])
  return listo
}

/**
 * Otras formas de empezar: van debajo del parte de la mañana mientras la
 * conversación no ha empezado. El informe semanal es la acción principal.
 */
export function Inicio({ estados, onAbrirAgente, onRecorrido }) {
  const { enviar: enviarCtx, mundo, ocupado } = useCtx()
  const listo = useListo(400)
  const enviar = (texto) => listo && enviarCtx(texto)
  const hero = CASOS.find((x) => x.grupo === 'hero')
  const informe = mundo.informes[mundo.periodo.id]
  const idAcceso = useId().replace(/:/g, '')
  return (
    <div className="ag-inicio">
      <h2 className="flp-kicker text-flp-muted">Otras formas de empezar</h2>
      <div className="ag-accesos">
        <button type="button" className="ag-acceso ag-acceso--principal" onClick={() => enviar(hero.prompt)} disabled={ocupado} aria-labelledby={`${idAcceso}-t`} aria-describedby={`${idAcceso}-d`}>
          <span className="flp-kicker text-flp-muted">{informe ? 'Informe semanal' : `Pendiente · ${mundo.periodo.etiqueta}, ${mundo.periodo.fechas}`}</span>
          <strong id={`${idAcceso}-t`} className="ag-acceso-titulo">
            {hero.titulo}
          </strong>
          <span id={`${idAcceso}-d`} className="ag-acceso-desc">
            {hero.descripcion} Lo preparan {nombresCortos(hero.agentes.map((a) => AGENTES[a].nombre))}.
          </span>
          <span className="flp-button flp-button--primary ag-acceso-cta" aria-hidden="true">
            {informe ? 'Ver el informe' : 'Pedir el informe'} <IconChevronRight size={16} />
          </span>
        </button>

        <div className="ag-acceso">
          <span className="flp-kicker text-flp-muted">Con guía</span>
          <strong className="ag-acceso-titulo">Recorrido guiado</strong>
          <span className="ag-acceso-desc">
            Te enseña los {RECORRIDO.length} casos de uso uno a uno, con una nota en cada paso. Unos cinco minutos; en {PASOS_CON_DECISION} pasos decides tú para seguir.
          </span>
          <FilmpilotButton size="sm" variant="secondary" icon={IconPlay} className="mt-auto self-start" onClick={() => listo && onRecorrido()} disabled={ocupado}>
            Empezar el recorrido guiado
          </FilmpilotButton>
        </div>

        <div className="ag-acceso">
          <span className="flp-kicker text-flp-muted">Con tus palabras</span>
          <strong className="ag-acceso-titulo">Pregunta lo que necesites</strong>
          <span className="ag-acceso-desc">Escribe abajo como se lo dirías a tu equipo. Por ejemplo:</span>
          <span className="mt-auto flex flex-wrap gap-2 pt-1">
            {['¿Por qué se desvía Escenografía?', '¿Cómo cerraremos el proyecto y llegamos con la caja?'].map((p) => (
              <button key={p} type="button" className="ag-sugerencia" disabled={ocupado} onClick={() => enviar(p)}>
                {p}
              </button>
            ))}
          </span>
        </div>
      </div>

      <div className="ag-inicio-mas">
        <Desplegable nivel={3} titulo={`Todos los casos de uso (${CASOS.length})`} resumen="Presupuesto y proveedores, cierre de semana, facturas, dossier fiscal y riesgos">
          <p className="mb-3 text-xs text-flp-muted">{LEYENDA_CAPACIDAD}</p>
          <section className="mt-1" aria-labelledby="grupo-hero">
            <h4 id="grupo-hero" className="flp-kicker mb-2 text-flp-muted">
              Recomendado
            </h4>
            <div className="ag-casos-grid">
              <TarjetaCaso caso={hero} onElegir={enviar} deshabilitado={ocupado} destacado />
            </div>
          </section>
          {GRUPOS_CASOS.map((g) => (
            <section key={g.id} className="mt-4" aria-labelledby={`grupo-${g.id}`}>
              <h4 id={`grupo-${g.id}`} className="flp-kicker mb-2 text-flp-muted">
                {g.titulo}
              </h4>
              <div className="ag-casos-grid">
                {CASOS.filter((x) => x.grupo === g.id).map((x) => (
                  <TarjetaCaso key={x.id} caso={x} onElegir={enviar} deshabilitado={ocupado} />
                ))}
              </div>
            </section>
          ))}
        </Desplegable>

        <Desplegable nivel={3} titulo="Cómo actúan los agentes" resumen="Ejemplos de cada nivel">
          <ul className="ag-leyenda" aria-label="Niveles de autonomía">
            <li>
              <AutonomyBadge nivel="ejecuta" />
              <span>Contabiliza una factura que casa con su pedido.</span>
            </li>
            <li>
              <AutonomyBadge nivel="propone" />
              <span>Sugiere la partida de un ticket dudoso.</span>
            </li>
            <li>
              <AutonomyBadge nivel="aprueba" />
              <span>Una compra que deja un capítulo más de un {UMBRAL} por encima de su presupuesto.</span>
            </li>
          </ul>
        </Desplegable>

        <Desplegable nivel={3} className="xl:hidden" titulo="Conoce a los agentes" resumen="El Orquestador y tres familias: presupuesto, financiación y documentación">
          <AgentesPorFamilia estados={estados} onAbrir={onAbrirAgente} />
        </Desplegable>
      </div>
    </div>
  )
}

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
