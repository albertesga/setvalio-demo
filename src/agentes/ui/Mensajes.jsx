// Mensajes de la conversación y línea de trabajo de los agentes.

import { useState } from 'react'
import { IconChevronDown, IconBell, IconStop } from '../../components/icons.jsx'
import { AGENTES } from '../agentes.js'
import { useCtx } from './contexto.js'
import { Tx, AgentTile, AutonomyBadge, StatusChip } from './Piezas.jsx'
import { Bloque } from './Bloques.jsx'

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
            <AgentTile id={p.agente} size={28} trabajando={estado === 'en_curso'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-bold text-ink">{a.nombre}</span>
                {conPrevio && <span className="ag-paralelo">a la vez</span>}
                {p.autonomia !== 'ejecuta' && <AutonomyBadge nivel={p.autonomia} />}
              </div>
              <div className="text-sm text-muted">
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
        <span className="flex -space-x-1.5" aria-hidden="true">
          {t.agentes.slice(0, 5).map((a) => (
            <AgentTile key={a} id={a} size={28} className="ring-2 ring-canvas" />
          ))}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <strong className="text-ink">Cómo lo han hecho</strong>
          <span className="block truncate text-xs text-muted">
            {agentes.length ? `${agentes.length} ${agentes.length === 1 ? 'agente' : 'agentes'} · ` : ''}
            {t.pasos.length} pasos{msg.estado === 'detenido' ? ' · detenido' : ''}
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
  const { despachar, deshacible, ocupado } = useCtx()
  const t = msg.turno
  const enCurso = msg.estado === 'en_curso'
  const bloques = t.bloques.slice(0, msg.bloquesVisibles)
  const tituloId = `${msg.id}-titulo`
  return (
    <article id={`msg-${msg.id}`} className={`ag-msg-agentes ${msg.deshecho ? 'is-deshecho' : ''}`} aria-labelledby={tituloId} aria-busy={enCurso || undefined}>
      <header className="flex items-center gap-2.5">
        <AgentTile id="orquestador" size={32} trabajando={enCurso} />
        <div className="min-w-0 flex-1">
          <h3 id={tituloId} tabIndex={-1} className="text-sm font-extrabold text-ink focus:outline-none">
            {t.titulo}
          </h3>
          <p className="text-xs text-muted">
            <span className="tnum">{msg.hora}</span> · {msg.origen === 'evento' ? 'Novedad recibida' : msg.origen === 'accion' ? 'Los agentes aplican la decisión' : 'Orquestador'}
            {msg.deshecho && <strong className="font-bold text-ink"> · Deshecho</strong>}
          </p>
        </div>
        {enCurso && (
          <div className="flex flex-none gap-2">
            <button
              type="button"
              className="ag-boton-fila"
              onClick={() => {
                despachar({ tipo: 'saltar' })
                requestAnimationFrame(() => document.getElementById(tituloId)?.focus())
              }}
            >
              Ver resultado
            </button>
            <button type="button" className="ag-boton-fila" onClick={() => despachar({ tipo: 'detener' })}>
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

      {msg.estado === 'detenido' && <p className="mt-3 text-sm text-muted">Detenido. Los pasos completados quedan registrados; el resto no se ha hecho.</p>}

      {bloques.length > 0 && (
        <div className="ag-bloques">
          {bloques.map((b) => (
            <div key={b.clave} className="ag-bloque-entrada">
              <Bloque b={b} />
            </div>
          ))}
        </div>
      )}

      {!enCurso && deshacible === msg.id && !msg.deshecho && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>¿No era esto?</span>
          <button type="button" className="ag-link" disabled={ocupado} onClick={() => despachar({ tipo: 'deshacer', mensajeId: msg.id })}>
            Deshacer
          </button>
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

function MensajeNovedad({ msg }) {
  return (
    <div className="ag-msg-novedad" role="note">
      <span className="ag-msg-novedad-icono" aria-hidden="true">
        <IconBell size={15} />
      </span>
      <span>
        <strong>Novedad</strong> · {msg.titulo}
      </span>
      <span className="tnum text-xs text-muted">{msg.hora}</span>
    </div>
  )
}

function MensajeGuia({ msg }) {
  return (
    <div className="ag-msg-guia" role="note">
      <span className="text-xs font-bold text-muted">
        Recorrido guiado · paso {msg.indice + 1} de {msg.total}
      </span>
      <strong className="mt-0.5 block text-sm text-ink">{msg.titulo}</strong>
      <p className="mt-1 text-sm leading-relaxed text-muted">{msg.nota}</p>
    </div>
  )
}

function MensajeNota({ msg }) {
  return <p className="ag-msg-nota">{msg.texto}</p>
}

export function Mensaje({ msg, ultimo }) {
  switch (msg.rol) {
    case 'usuario':
      return <MensajeUsuario msg={msg} />
    case 'decision':
      return <MensajeDecision msg={msg} />
    case 'novedad':
      return <MensajeNovedad msg={msg} />
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
