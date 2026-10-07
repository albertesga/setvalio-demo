// Estado inicial, redactor, sugerencias y barra del recorrido guiado.

import { useEffect, useRef, useState } from 'react'
import { FilmpilotButton, StateChip } from '../../brand/Filmpilot.jsx'
import { IconArrowUp, IconChevronRight, IconPlay, IconClock } from '../../components/icons.jsx'
import { AGENTES } from '../agentes.js'
import { CASOS, GRUPOS_CASOS } from '../casos.js'
import { decisionesAbiertas } from '../pendientes.js'
import { evaluarRiesgos } from '../rodaje.js'
import { useCtx } from './contexto.js'
import { AutonomyBadge, Desplegable, nombresCortos } from './Piezas.jsx'
import { AgentesPorFamilia } from './Paneles.jsx'

const ETIQUETA_CAPACIDAD = { exploratoria: 'Exploratorio', posterior: 'Fase posterior', propuesta: 'Por validar' }

function TarjetaCaso({ caso, onElegir, deshabilitado }) {
  return (
    <button type="button" className="ag-caso" onClick={() => onElegir(caso.prompt)} disabled={deshabilitado}>
      <span className="flex items-start justify-between gap-2">
        <strong className="ag-caso-titulo">{caso.titulo}</strong>
        {ETIQUETA_CAPACIDAD[caso.capacidad] && <span className="ag-etiqueta-capacidad">{ETIQUETA_CAPACIDAD[caso.capacidad]}</span>}
      </span>
      <span className="ag-caso-desc">{caso.descripcion}</span>
      <span className="ag-caso-prompt">«{caso.prompt}»</span>
      <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
        <span className="text-xs text-flp-muted">{nombresCortos(caso.agentes.map((a) => AGENTES[a].nombre))}</span>
        <AutonomyBadge nivel={caso.nivel} />
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

/** Inicio: tres accesos (informe, cómo vamos, recorrido) y el resto plegado. */
export function Inicio({ persona, estados, onAbrirAgente, onRecorrido }) {
  const { enviar: enviarCtx, mundo, ocupado } = useCtx()
  const listo = useListo(400)
  const enviar = (texto) => listo && enviarCtx(texto)
  const hero = CASOS.find((x) => x.grupo === 'hero')
  const otros = CASOS.filter((x) => x.grupo !== 'hero')
  const nombre = persona.nombre.split(' ')[0]
  const pendientes = decisionesAbiertas(mundo).length
  const altos = evaluarRiesgos(mundo).filter((r) => r.severidad === 'alta').length
  return (
    <div className="ag-inicio">
      <p className="flp-kicker text-flp-muted">
        {mundo.proyecto.titulo} · Rodaje, día {mundo.proyecto.diaActual} de {mundo.proyecto.diasRodaje} · lunes 1 de junio de 2026
      </p>
      <h1 className="ag-inicio-titulo">
        Buenos días, {nombre}. <span className="block">¿Qué revisamos hoy?</span>
      </h1>
      <p className="ag-inicio-lead">
        Un equipo de agentes. Una producción bajo control. <span className="text-flp-muted">Hacen solos lo rutinario, te proponen lo dudoso y te piden aprobación cuando hay dinero o riesgo en juego.</span>
      </p>

      <div className="ag-accesos">
        <button type="button" className="ag-acceso ag-acceso--principal" onClick={() => enviar(hero.prompt)} disabled={ocupado}>
          <span className="flp-kicker text-flp-muted">Empieza aquí</span>
          <strong className="ag-acceso-titulo">{hero.titulo}</strong>
          <span className="ag-acceso-desc">{hero.descripcion}</span>
          <span className="text-xs text-flp-muted">Con {nombresCortos(hero.agentes.map((a) => AGENTES[a].nombre))}</span>
          <span className="flp-button flp-button--primary ag-acceso-cta" aria-hidden="true">
            Pedir el informe <IconChevronRight size={16} />
          </span>
        </button>

        <div className="ag-acceso">
          <span className="flp-kicker text-flp-muted">Ahora mismo</span>
          <strong className="ag-acceso-titulo">¿Cómo vamos?</strong>
          <span className="flex flex-wrap gap-1.5">
            <StateChip state={pendientes ? 'review' : 'idle'}>{pendientes ? `${pendientes} por revisar` : 'Nada por revisar'}</StateChip>
            <StateChip state={altos ? 'error' : 'idle'}>{altos ? `${altos} ${altos === 1 ? 'riesgo alto' : 'riesgos altos'}` : 'Sin riesgos altos'}</StateChip>
          </span>
          <span className="ag-acceso-desc">Lo que espera tu decisión y lo que puede alterar las próximas jornadas. Riesgos de producción es exploratorio.</span>
          <span className="mt-auto flex flex-wrap gap-2 pt-2">
            <FilmpilotButton size="sm" variant="secondary" disabled={ocupado} onClick={() => enviar('¿Cómo vamos?')}>
              Ver el resumen
            </FilmpilotButton>
            <FilmpilotButton size="sm" variant="ghost" disabled={ocupado} onClick={() => enviar('¿Qué riesgos hay para las próximas jornadas?')}>
              Ver los riesgos
            </FilmpilotButton>
          </span>
        </div>

        <div className="ag-acceso">
          <span className="flp-kicker text-flp-muted">Primera vez</span>
          <strong className="ag-acceso-titulo">Recorrido guiado</strong>
          <span className="ag-acceso-desc">Un paso por cada caso de uso, con una nota en cada uno. Unos cinco minutos; en el segundo decides tú.</span>
          <FilmpilotButton size="sm" variant="secondary" icon={IconPlay} className="mt-auto self-start" onClick={() => listo && onRecorrido()} disabled={ocupado}>
            Empezar recorrido
          </FilmpilotButton>
        </div>
      </div>

      <div className="ag-inicio-mas">
        <Desplegable titulo={`Más casos de uso (${otros.length})`} resumen="Presupuesto y proveedores, cierre de semana, facturas, dossier fiscal y riesgos">
          {GRUPOS_CASOS.map((g) => (
            <section key={g.id} className="mt-4 first:mt-1" aria-labelledby={`grupo-${g.id}`}>
              <h3 id={`grupo-${g.id}`} className="flp-kicker mb-2 text-flp-muted">
                {g.titulo}
              </h3>
              <div className="ag-casos-grid">
                {CASOS.filter((x) => x.grupo === g.id).map((x) => (
                  <TarjetaCaso key={x.id} caso={x} onElegir={enviar} deshabilitado={ocupado} />
                ))}
              </div>
            </section>
          ))}
        </Desplegable>

        <Desplegable titulo="Cómo actúan los agentes" resumen="Ejecutan, proponen o piden aprobación">
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
        </Desplegable>

        <Desplegable className="xl:hidden" titulo="Conoce a los agentes" resumen="El Orquestador y tres familias: presupuesto, financiación y documentación">
          <AgentesPorFamilia estados={estados} onAbrir={onAbrirAgente} />
        </Desplegable>
      </div>
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

export function BarraRecorrido({ tour, onSiguiente, onSalir }) {
  if (!tour) return null
  return (
    <div className="ag-tourbar flp-dark" role="region" aria-label="Recorrido guiado">
      <div className="min-w-0 flex-1">
        <span className="flp-kicker text-flp-muted">
          Recorrido guiado · <span className="tnum">{tour.indice + 1}/{tour.total}</span>
        </span>
        <span className="block truncate text-sm font-medium text-flp-ink">{tour.paso.titulo}</span>
        {!tour.puedeAvanzar && tour.paso.espera && (
          <span className="flex items-center gap-1 text-xs text-flp-ink">
            <IconClock size={13} aria-hidden="true" /> Decide en la tarjeta para continuar.
          </span>
        )}
      </div>
      <div className="flex flex-none gap-2">
        <FilmpilotButton variant="ghost" onClick={onSalir}>
          Salir
        </FilmpilotButton>
        <FilmpilotButton variant="primary" onClick={onSiguiente} disabled={!tour.puedeAvanzar}>
          {tour.ultimo ? 'Terminar' : 'Siguiente'}
        </FilmpilotButton>
      </div>
    </div>
  )
}
