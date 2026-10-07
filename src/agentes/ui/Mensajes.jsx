// Mensajes de la conversación y línea de trabajo de los agentes.

import { useState } from 'react'
import { IconChevronDown, IconBell, IconStop, IconArrowDown } from '../../components/icons.jsx'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { AGENTES } from '../agentes.js'
import { useCtx } from './contexto.js'
import { Tx, AgentAvatar, AutonomyBadge, StatusChip, nombresCortos } from './Piezas.jsx'
import { Bloque, aprobacionPendiente } from './Bloques.jsx'

function nombresAgentes(ids) {
  return ids.filter((a) => a !== 'orquestador').map((a) => AGENTES[a].nombre)
}

/** Línea de trabajo: cada paso con su agente, autonomía y estado. */
function LineaTrabajo({ msg }) {
  const pasos = msg.turno.pasos
  return (
    <ol className="ag-linea">
      {pasos.map((p, i) => {
        const estado = msg.estadoPasos[i]
        const a = AGENTES[p.agente]
        const conPrevio = p.paralelo && i > 0
        return (
          <li key={p.id} className={`ag-linea-paso is-${estado}`}>
            <AgentAvatar id={p.agente} size={28} trabajando={estado === 'en_curso'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-flp-ink">{a.nombre}</span>
                {conPrevio && <span className="ag-paralelo">a la vez</span>}
                {p.autonomia !== 'ejecuta' && <AutonomyBadge nivel={p.autonomia} />}
              </div>
              <div className="text-sm text-flp-muted">
                <Tx value={p.titulo} />
              </div>
              {estado === 'hecho' && p.salida && (
                <div className="ag-linea-salida">
                  <Tx value={p.salida} />
                </div>
              )}
            </div>
            <StatusChip estado={estado} />
          </li>
        )
      })}
    </ol>
  )
}

function Traza({ msg }) {
  const [abierta, setAbierta] = useState(false)
  const t = msg.turno
  const agentes = nombresAgentes(t.agentes)
  const id = `traza-${msg.id}`
  return (
    <div className="ag-traza">
      <button type="button" className="ag-traza-boton" aria-expanded={abierta} aria-controls={id} onClick={() => setAbierta((v) => !v)}>
        <span className="min-w-0 flex-1 text-left">
          <strong className="font-medium text-flp-ink">Cómo lo han hecho</strong>
          <span className="block truncate text-xs text-flp-muted">
            {agentes.length ? `${nombresCortos(agentes)} · ` : ''}
            {t.pasos.length} {t.pasos.length === 1 ? 'paso' : 'pasos'}
            {msg.estado === 'detenido' ? ' · detenido' : ''}
          </span>
        </span>
        <IconChevronDown size={18} className={`transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={id} className={`ag-plegable ${abierta ? 'is-open' : ''}`} inert={abierta ? undefined : ''} aria-hidden={!abierta || undefined}>
        <div className="ag-plegable-dentro">
          <LineaTrabajo msg={msg} />
          {(t.fuentes.length > 0 || t.reglas.length > 0 || t.noHecho.length > 0) && (
            <div className="ag-traza-meta">
              {t.fuentes.length > 0 && (
                <div>
                  <h5>Fuentes</h5>
                  <p>{t.fuentes.join(' · ')}</p>
                </div>
              )}
              {t.reglas.length > 0 && (
                <div>
                  <h5>Reglas aplicadas</h5>
                  <ul>
                    {t.reglas.map((r, i) => (
                      <li key={i}>
                        <Tx value={r} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {t.noHecho.length > 0 && (
                <div>
                  <h5>Lo que no ha hecho</h5>
                  <ul>
                    {t.noHecho.map((r, i) => (
                      <li key={i}>
                        <Tx value={r} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MensajeAgentes({ msg, ultimo }) {
  const { despachar, deshacible, ocupado, mundo } = useCtx()
  const t = msg.turno
  const enCurso = msg.estado === 'en_curso'
  const bloques = t.bloques.slice(0, msg.bloquesVisibles)
  const tituloId = `${msg.id}-titulo`
  const enfocarTitulo = () => requestAnimationFrame(() => document.getElementById(tituloId)?.focus())
  // Al terminar: cuántas decisiones de esta respuesta siguen esperando a una persona.
  const porDecidir = !enCurso && msg.estado === 'hecho' ? t.bloques.filter((b) => aprobacionPendiente(mundo, b)).length : 0
  const irADecision = () => {
    const tarjeta = document.querySelector(`#msg-${msg.id} .ag-aprobacion:not(.is-decidida)`)
    if (!tarjeta) return
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    tarjeta.scrollIntoView({ block: 'start', behavior: reducido ? 'auto' : 'smooth' })
    tarjeta.querySelector('h4')?.focus({ preventScroll: true })
  }
  return (
    <article id={`msg-${msg.id}`} className={`ag-msg-agentes ${msg.deshecho ? 'is-deshecho' : ''}`} aria-labelledby={tituloId} aria-busy={enCurso || undefined}>
      <header className="flex items-center gap-2.5">
        <AgentAvatar id="orquestador" size={32} trabajando={enCurso} />
        <div className="min-w-0 flex-1">
          <h3 id={tituloId} tabIndex={-1} className="text-base font-medium leading-snug text-flp-ink focus:outline-none">
            {t.titulo}
          </h3>
          <p className="text-xs text-flp-muted">
            <span className="tnum">{msg.hora}</span> · {msg.origen === 'evento' ? 'Novedad que llega sola' : msg.origen === 'accion' ? 'Los agentes aplican tu decisión' : 'Orquestador'}
            {msg.deshecho && <strong className="font-semibold text-flp-ink"> · Deshecho</strong>}
          </p>
          {ultimo && msg.estado === 'hecho' && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusChip estado="hecho" />
              {porDecidir > 0 && (
                <button type="button" className="ag-link ag-link--salto" onClick={irADecision}>
                  {porDecidir === 1 ? '1 decisión para ti' : `${porDecidir} decisiones para ti`} <IconArrowDown size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
        {enCurso && (
          <div className="flex flex-none gap-2">
            <button
              type="button"
              className="ag-boton-fila"
              onClick={() => {
                despachar({ tipo: 'saltar' })
                enfocarTitulo()
              }}
            >
              Saltar al resultado
            </button>
            <button
              type="button"
              className="ag-boton-fila"
              onClick={() => {
                despachar({ tipo: 'detener' })
                enfocarTitulo()
              }}
            >
              <IconStop size={14} aria-hidden="true" /> Detener
            </button>
          </div>
        )}
      </header>

      {enCurso ? (
        <div className="mt-3">
          <LineaTrabajo msg={msg} />
        </div>
      ) : (
        <div className="mt-3">
          <Traza msg={msg} />
        </div>
      )}

      {msg.estado === 'detenido' && <p className="mt-3 text-sm text-flp-muted">Detenido. Los pasos completados quedan registrados; el resto no se ha hecho.</p>}

      {bloques.length > 0 && (
        <div className="ag-bloques">
          {bloques.map((b) => (
            <div key={b.clave} className="ag-bloque-entrada">
              <Bloque b={b} mensajeId={msg.id} />
            </div>
          ))}
        </div>
      )}

      {!enCurso && deshacible === msg.id && !msg.deshecho && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-flp-muted">
          <span>¿No era esto?</span>
          <FilmpilotButton
            size="sm"
            variant="secondary"
            disabled={ocupado}
            onClick={() => {
              despachar({ tipo: 'deshacer', mensajeId: msg.id })
              enfocarTitulo()
            }}
          >
            Deshacer esta decisión
          </FilmpilotButton>
        </div>
      )}
    </article>
  )
}

function MensajeUsuario({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="ag-msg-usuario">
        <p>{msg.texto}</p>
        <span className="tnum">{msg.hora}</span>
      </div>
    </div>
  )
}

function MensajeDecision({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="ag-msg-decision">
        <span className="ag-msg-decision-quien">
          {msg.por} · {msg.rolPersona}
        </span>
        <p>{msg.texto}</p>
      </div>
    </div>
  )
}

function MensajeNovedad({ msg, ultimaNovedad }) {
  const { despachar, eventosPausados } = useCtx()
  return (
    <div className="ag-msg-novedad" role="note">
      <span className="ag-msg-novedad-icono" aria-hidden="true">
        <IconBell size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="font-medium">Novedad</strong> · {msg.titulo}
        <span className="block text-xs text-flp-muted">
          <span className="tnum">{msg.hora}</span> · Llega sola, sin que la pidas: así avisan los agentes.
        </span>
      </span>
      {ultimaNovedad && (
        <button type="button" className="ag-link" onClick={() => despachar({ tipo: 'pausarEventos', valor: !eventosPausados })}>
          {eventosPausados ? 'Reanudar novedades' : 'Pausar novedades'}
        </button>
      )}
    </div>
  )
}

function MensajeGuia({ msg }) {
  return (
    <div className="ag-msg-guia" role="note">
      <span className="flp-kicker text-flp-muted">
        Recorrido guiado · paso {msg.indice + 1} de {msg.total}
      </span>
      <strong className="mt-0.5 block text-sm text-flp-ink">{msg.titulo}</strong>
      <p className="mt-1 text-sm leading-relaxed text-flp-muted">{msg.nota}</p>
    </div>
  )
}

function MensajeNota({ msg }) {
  return <p className="ag-msg-nota">{msg.texto}</p>
}

export function Mensaje({ msg, ultimo, ultimaNovedad }) {
  switch (msg.rol) {
    case 'usuario':
      return <MensajeUsuario msg={msg} />
    case 'decision':
      return <MensajeDecision msg={msg} />
    case 'novedad':
      return <MensajeNovedad msg={msg} ultimaNovedad={ultimaNovedad} />
    case 'guia':
      return <MensajeGuia msg={msg} />
    case 'nota':
      return <MensajeNota msg={msg} />
    case 'agentes':
      return <MensajeAgentes msg={msg} ultimo={ultimo} />
    default:
      return null
  }
}
