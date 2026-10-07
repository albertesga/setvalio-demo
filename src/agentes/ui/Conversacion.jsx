// Estado inicial, redactor, sugerencias y barra del recorrido guiado.

import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui.jsx'
import { IconArrowUp, IconStop, IconChevronRight, IconPlay } from '../../components/icons.jsx'
import { AGENTES, ORDEN_AGENTES } from '../agentes.js'
import { CASOS, GRUPOS_CASOS } from '../casos.js'
import { useCtx } from './contexto.js'
import { AgentTile, AutonomyBadge } from './Piezas.jsx'

const ETIQUETA_CAPACIDAD = { exploratoria: 'Exploratorio', posterior: 'Fase posterior' }

function TarjetaCaso({ caso, onElegir, destacado = false, deshabilitado }) {
  return (
    <button type="button" className={`ag-caso ${destacado ? 'ag-caso--hero' : ''}`} onClick={() => onElegir(caso.prompt)} disabled={deshabilitado}>
      {destacado && <span className="ag-caso-kicker">Recorrido completo</span>}
      <span className="flex items-start justify-between gap-2">
        <strong className="ag-caso-titulo">{caso.titulo}</strong>
        {ETIQUETA_CAPACIDAD[caso.capacidad] && <span className="ag-etiqueta-capacidad">{ETIQUETA_CAPACIDAD[caso.capacidad]}</span>}
      </span>
      <span className="ag-caso-desc">{caso.descripcion}</span>
      <span className="ag-caso-prompt">«{caso.prompt}»</span>
      <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <span className="flex -space-x-1.5" aria-label={`Agentes: ${caso.agentes.map((a) => AGENTES[a].nombre).join(', ')}`}>
          {caso.agentes.slice(0, 6).map((a) => (
            <AgentTile key={a} id={a} size={28} className="ring-2 ring-canvas" />
          ))}
        </span>
        <AutonomyBadge nivel={caso.nivel} />
      </span>
      {destacado && (
        <span className="ag-caso-cta">
          Pedir el informe <IconChevronRight size={16} aria-hidden="true" />
        </span>
      )}
    </button>
  )
}

export function Inicio({ persona, onAbrirAgente, onRecorrido }) {
  const { enviar, mundo, ocupado } = useCtx()
  const hero = CASOS.find((x) => x.grupo === 'hero')
  const nombre = persona.nombre.split(' ')[0]
  return (
    <div className="ag-inicio">
      <p className="ag-inicio-kicker">
        {mundo.proyecto.titulo} · Rodaje, día {mundo.proyecto.diaActual} de {mundo.proyecto.diasRodaje} · lunes 1 de junio de 2026
      </p>
      <h1 className="ag-inicio-titulo">
        Buenos días, {nombre}. ¿Qué <em>revisamos</em> hoy?
      </h1>
      <p className="ag-inicio-lead">
        Ocho agentes preparan el control de coste del rodaje. Hacen solos lo rutinario y reversible, te proponen lo dudoso y te piden aprobación cuando hay dinero comprometido o riesgo fiscal.
      </p>

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
          <span>Una compra que deja un capítulo por encima del umbral.</span>
        </li>
      </ul>

      <div className="ag-casos-hero">
        <TarjetaCaso caso={hero} onElegir={enviar} destacado deshabilitado={ocupado} />
        <div className="ag-recorrido-card">
          <span className="ag-caso-kicker">Primera vez</span>
          <strong className="ag-caso-titulo">Recorrido guiado</strong>
          <span className="ag-caso-desc">Diez pasos por todos los casos de uso, con una nota en cada uno. Unos cuatro minutos; en el segundo decides tú.</span>
          <Button variant="secondary" className="mt-auto self-start" icon={IconPlay} onClick={onRecorrido} disabled={ocupado}>
            Empezar recorrido
          </Button>
        </div>
      </div>

      {GRUPOS_CASOS.map((g) => (
        <section key={g.id} className="mt-7" aria-labelledby={`grupo-${g.id}`}>
          <h2 id={`grupo-${g.id}`} className="mb-3 text-sm font-extrabold text-ink">
            {g.titulo}
          </h2>
          <div className="ag-casos-grid">
            {CASOS.filter((x) => x.grupo === g.id).map((x) => (
              <TarjetaCaso key={x.id} caso={x} onElegir={enviar} deshabilitado={ocupado} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-7 xl:hidden" aria-labelledby="conoce-agentes">
        <h2 id="conoce-agentes" className="mb-3 text-sm font-extrabold text-ink">
          Conoce a los agentes
        </h2>
        <div className="ag-agentes-scroll">
          {ORDEN_AGENTES.map((id) => (
            <button key={id} type="button" className="ag-agente-mini" onClick={() => onAbrirAgente(id)}>
              <AgentTile id={id} size={32} />
              <span>{AGENTES[id].nombre}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export function Sugerencias({ items, onElegir, deshabilitado }) {
  if (!items.length) return null
  return (
    <div className="ag-sugerencias" role="group" aria-label="Sugerencias">
      {items.map((x) => (
        <button key={x.texto} type="button" className="ag-sugerencia" onClick={() => onElegir(x.texto)} disabled={deshabilitado}>
          {x.etiqueta}
        </button>
      ))}
    </div>
  )
}

export function Redactor({ ocupado, onEnviar, onDetener, inputRef }) {
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
    if (!limpio) return
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
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Pregunta a los agentes… por ejemplo, ¿por qué se desvía Viajes?"
        className="ag-redactor-campo"
        autoComplete="off"
        enterKeyHint="send"
      />
      {ocupado ? (
        <button type="button" className="ag-redactor-boton is-stop" onClick={onDetener} aria-label="Detener a los agentes">
          <IconStop size={18} />
        </button>
      ) : (
        <button type="submit" className="ag-redactor-boton" aria-label="Enviar" disabled={!texto.trim()}>
          <IconArrowUp size={18} strokeWidth={2.4} />
        </button>
      )}
    </form>
  )
}

export function BarraRecorrido({ tour, onSiguiente, onSalir }) {
  if (!tour) return null
  return (
    <div className="ag-tourbar" role="region" aria-label="Recorrido guiado">
      <div className="min-w-0 flex-1">
        <span className="text-xs font-bold text-muted">
          Recorrido guiado · {tour.indice + 1}/{tour.total}
        </span>
        <span className="block truncate text-sm font-extrabold text-ink">{tour.paso.titulo}</span>
        {!tour.puedeAvanzar && tour.paso.espera && <span className="block text-xs text-warning">Decide en la tarjeta para continuar.</span>}
      </div>
      <div className="flex flex-none gap-2">
        <Button size="sm" variant="ghost" onClick={onSalir}>
          Salir
        </Button>
        <Button size="sm" variant="accent" onClick={onSiguiente} disabled={!tour.puedeAvanzar}>
          {tour.ultimo ? 'Terminar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  )
}
