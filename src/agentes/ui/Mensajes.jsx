// Mensajes de la conversación y línea de trabajo de los agentes.

import { useState } from 'react'
import { IconChevronDown, IconBell, IconStop, IconArrowDown } from '../../components/icons.jsx'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { AGENTES } from '../agentes.js'
import { PERSONAS } from '../mundo.js'
import { useCtx } from './contexto.js'
import { Tx, AgentAvatar, AutonomyBadge, StatusChip, nombresCortos } from './Piezas.jsx'
import { Bloque, aprobacionPendiente, bloquePrincipal } from './Bloques.jsx'

function nombresAgentes(ids) {
  return ids.filter((a) => a !== 'orquestador').map((a) => AGENTES[a].nombre)
}

// Acciones que no cambian nada que deshacer: recibir una novedad o redactar un borrador.
const SIN_EFECTO = new Set(['evento/recibir', 'borrador/crear'])

/** Quién hizo lo que se puede deshacer en un turno automático (p. ej. Conciliación al contabilizar). */
function agenteQueActuo(turno) {
  const pasos = turno.pasos.filter((p) => p.agente !== 'orquestador' && p.muta)
  const p = [...pasos].reverse().find((x) => x.acciones?.some((a) => !SIN_EFECTO.has(a.tipo))) ?? pasos[pasos.length - 1]
  return p ? AGENTES[p.agente].nombre : 'los agentes'
}

const reducido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Deja el inicio de la respuesta arriba del hilo y le pasa el foco sin otro desplazamiento. */
function mostrarTitulo(tituloId, { desplazar = true } = {}) {
  // Dos fotogramas: el primero pinta los bloques que acaban de salir; el segundo ya los mide.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const h = document.getElementById(tituloId)
      if (!h) return
      const art = h.closest('article')
      const hilo = art?.closest('.ag-scroll')
      if (desplazar && art && hilo) {
        const top = art.getBoundingClientRect().top - hilo.getBoundingClientRect().top + hilo.scrollTop - 12
        hilo.scrollTo({ top, behavior: 'auto' })
      }
      h.focus({ preventScroll: true })
    }),
  )
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
              <div className="flex items-center gap-x-2">
                <span className="min-w-0 truncate text-sm font-medium text-flp-ink">{a.nombre}</span>
                {conPrevio && <span className="flex-none text-xs text-flp-muted">· a la vez</span>}
                <StatusChip estado={estado} className="ml-auto flex-none" />
              </div>
              <div className="text-sm text-flp-muted">
                <span className="mr-1.5 inline-flex align-middle">
                  <AutonomyBadge nivel={p.autonomia} compacto />
                </span>
                <span aria-hidden="true">· </span>
                <Tx value={p.titulo} />
              </div>
              {estado === 'hecho' && p.salida && (
                <div className="ag-linea-salida">
                  <Tx value={p.salida} />
                </div>
              )}
            </div>
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

// «Buenos días» hasta las dos, «Buenas tardes» hasta las nueve.
function saludoDe(hora) {
  const h = Number(String(hora).slice(0, 2))
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'
}

/** Cabecera del parte: como cualquier mensaje del chat, con el saludo como primera línea. */
function CabeceraSaludo({ msg, tituloId, enCurso, onSaltar, onDetener }) {
  const { persona } = useCtx()
  const e = msg.turno.entidades
  const nombre = (PERSONAS[e.persona] ?? persona).nombre.split(' ')[0]
  const n = nombresAgentes(msg.turno.agentes).length
  return (
    <header className="ag-msg-cab">
      <AgentAvatar id="orquestador" size={32} trabajando={enCurso} />
      <div className="min-w-0 flex-1">
        <p className="ag-msg-autor">
          <span className="font-medium text-flp-ink">Parte de la mañana</span> · <span className="tnum">{msg.hora}</span>
          {!enCurso && <> · lo han preparado {n} agentes</>}
        </p>
        <h3 id={tituloId} tabIndex={-1} className="ag-saludo-linea focus:outline-none">
          {saludoDe(msg.hora)}, {nombre}. Hoy es el día {e.dia} de rodaje.
        </h3>
      </div>
      {enCurso && (
        <div className="ag-msg-controles">
          <button type="button" className="ag-boton-fila" onClick={onSaltar}>
            Saltar al resultado
          </button>
          <button type="button" className="ag-boton-fila" onClick={onDetener}>
            <IconStop size={14} aria-hidden="true" /> Detener
          </button>
        </div>
      )}
    </header>
  )
}

function MensajeAgentes({ msg, ultimo }) {
  const { despachar, deshacible, ocupado, mundo, conversacion } = useCtx()
  const [detalle, setDetalle] = useState(false)
  const t = msg.turno
  const enCurso = msg.estado === 'en_curso'
  const bloques = t.bloques.slice(0, msg.bloquesVisibles)
  const tituloId = `${msg.id}-titulo`
  // Al terminar: cuántas decisiones de esta respuesta siguen esperando a una persona.
  const porDecidir = !enCurso && msg.estado === 'hecho' ? t.bloques.filter((b) => aprobacionPendiente(mundo, b)).length : 0
  // El amarillo, en un solo bloque de la respuesta.
  const principal = bloquePrincipal(mundo, bloques)
  // Quién escribe: el agente de la conversación (como en un chat) o, si no, el primero que trabajó.
  const autor = conversacion?.agente ?? t.agentes.find((a) => a !== 'orquestador') ?? 'orquestador'
  // Lo deshecho que sigue abierto: «Volver a decidir» lleva a su tarjeta.
  const refsAbiertas = (msg.deshechoRefs ?? []).filter((ref) => aprobacionPendiente(mundo, { tipo: 'aprobacion', ref }))
  const automatico = msg.origen === 'evento'
  const puedeDeshacer = !enCurso && deshacible === msg.id && !msg.deshecho
  const quien = automatico ? agenteQueActuo(t) : null
  // Una novedad que llega sola y no pide nada cabe en una línea: lo hecho y «Ver detalle».
  // Lo que se pide (o ya estaba escrito al abrir) se enseña entero: no se pliega.
  const plegado = automatico && msg.llegoSola && !!t.resumen && msg.estado === 'hecho' && porDecidir === 0 && !detalle

  const irADecision = () => {
    const tarjeta = document.querySelector(`#msg-${msg.id} .ag-aprobacion:not(.is-decidida)`)
    if (!tarjeta) return
    tarjeta.scrollIntoView({ block: 'start', behavior: reducido() ? 'auto' : 'smooth' })
    tarjeta.querySelector('h4')?.focus({ preventScroll: true })
  }
  // Tras deshacer, la tarjeta que se decidió vuelve a estar abierta más arriba.
  const volverADecidir = () => {
    const art = document.getElementById(`msg-${msg.id}`)
    if (!art) return
    const selector = refsAbiertas.map((r) => `.ag-aprobacion[data-ref="${r.tipo}-${r.id}"]:not(.is-decidida)`).join(', ')
    if (!selector) return
    const antes = [...document.querySelectorAll(selector)].filter((x) => x.compareDocumentPosition(art) & Node.DOCUMENT_POSITION_FOLLOWING)
    const tarjeta = antes[antes.length - 1]
    if (!tarjeta) return
    tarjeta.scrollIntoView({ block: 'center', behavior: reducido() ? 'auto' : 'smooth' })
    tarjeta.querySelector('h4')?.focus({ preventScroll: true })
  }
  const saltar = () => {
    despachar({ tipo: 'saltar' })
    mostrarTitulo(tituloId)
  }
  const detener = () => {
    despachar({ tipo: 'detener' })
    mostrarTitulo(tituloId)
  }
  const deshacer = () => {
    despachar({ tipo: 'deshacer', mensajeId: msg.id })
    mostrarTitulo(tituloId, { desplazar: false })
  }
  // Al desplegar, el foco pasa al título de la respuesta entera (el botón deja de existir).
  const verDetalle = () => {
    setDetalle(true)
    mostrarTitulo(tituloId, { desplazar: false })
  }

  if (plegado) {
    return (
      <article id={`msg-${msg.id}`} className={`ag-msg-agentes ag-msg-plegado ${msg.deshecho ? 'is-deshecho' : ''}`} aria-labelledby={tituloId}>
        <span className="ag-msg-novedad-icono" aria-hidden="true">
          <IconBell size={15} />
        </span>
        <h3 id={tituloId} tabIndex={-1} className="ag-msg-plegado-texto focus:outline-none">
          {msg.deshecho ? <strong className="font-medium">Deshecho: </strong> : <span className="sr-only">Novedad de las {msg.hora}: </span>}
          <Tx value={t.resumen} />
        </h3>
        <span className="ag-msg-plegado-acciones">
          <button type="button" className="ag-link" aria-expanded={false} onClick={verDetalle}>
            Ver detalle
          </button>
          {puedeDeshacer && (
            <button type="button" className="ag-link" disabled={ocupado} onClick={deshacer}>
              Deshacer<span className="sr-only"> lo que hizo {quien}</span>
            </button>
          )}
        </span>
      </article>
    )
  }

  return (
    <article id={`msg-${msg.id}`} className={`ag-msg-agentes ${msg.origen === 'saludo' ? 'ag-msg-saludo' : ''} ${msg.deshecho ? 'is-deshecho' : ''}`} aria-labelledby={tituloId} aria-busy={enCurso || undefined}>
      {msg.origen === 'saludo' ? (
        <CabeceraSaludo msg={msg} tituloId={tituloId} enCurso={enCurso} onSaltar={saltar} onDetener={detener} />
      ) : (
        <header className="ag-msg-cab">
          <AgentAvatar id={autor} size={32} trabajando={enCurso} />
          <div className="min-w-0 flex-1">
            {/* Como en un chat: quién escribe y cuándo. El título del turno, solo para lectores de pantalla. */}
            <p className="ag-msg-autor">
              <span className="font-medium text-flp-ink">{AGENTES[autor]?.nombre ?? 'Orquestador'}</span> · <span className="tnum">{msg.hora}</span>
              {t.proyecto && <> · otro proyecto: {t.proyecto.titulo}</>}
              {msg.deshecho && <> · <span className="font-medium text-flp-ink">deshecho</span></>}
            </p>
            <h3 id={tituloId} tabIndex={-1} className="sr-only">
              {msg.deshecho ? `Deshecho: ${t.titulo}` : t.titulo}
            </h3>
            {ultimo && msg.estado === 'hecho' && porDecidir > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button type="button" className="ag-salto-decision" onClick={irADecision}>
                  <span className="flp-state flp-state--review">
                    {porDecidir === 1 ? '1 decisión aquí' : `${porDecidir} decisiones aquí`} <IconArrowDown size={13} aria-hidden="true" />
                  </span>
                </button>
              </div>
            )}
          </div>
          {enCurso && (
            <div className="ag-msg-controles">
              <button type="button" className="ag-boton-fila" onClick={saltar}>
                Saltar al resultado
              </button>
              <button type="button" className="ag-boton-fila" onClick={detener}>
                <IconStop size={14} aria-hidden="true" /> Detener
              </button>
            </div>
          )}
        </header>
      )}

      {enCurso && (
        <div className="mt-3">
          <LineaTrabajo msg={msg} />
        </div>
      )}

      {msg.estado === 'detenido' && <p className="mt-3 text-sm text-flp-muted">Detenido. Los pasos completados quedan registrados; el resto no se ha hecho.</p>}

      {msg.deshecho && msg.origen === 'accion' && refsAbiertas.length > 0 && (
        <button type="button" className="ag-link ag-volver" onClick={volverADecidir}>
          Volver a decidir&nbsp;<span aria-hidden="true">↑</span>
        </button>
      )}

      {bloques.length > 0 && (
        <div className="ag-bloques">
          {bloques.map((b) => (
            <div key={b.clave} className="ag-bloque-entrada">
              <Bloque b={b} mensajeId={msg.id} principal={b.clave === principal} />
            </div>
          ))}
        </div>
      )}

      {puedeDeshacer && (
        <div className="ag-deshacer">
          {/* Lo que hizo solo, dicho con su resumen («Conciliación contabilizó sola…»), junto al botón. */}
          <span>{automatico && t.resumen ? <Tx value={t.resumen} /> : automatico ? 'Lo hizo sin preguntarte.' : '¿No era esto?'}</span>
          <FilmpilotButton size="sm" variant="secondary" disabled={ocupado} onClick={deshacer}>
            {automatico ? `Deshacer lo que hizo ${quien}` : 'Deshacer esta decisión'}
          </FilmpilotButton>
        </div>
      )}

      {/* Cómo lo han hecho: al final, tras la respuesta. Mientras trabajan, la línea va arriba. */}
      {!enCurso && (
        <div className="mt-3">
          <Traza msg={msg} />
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
          <span className="tnum">{msg.hora}</span> · {msg.llegoSola ? 'Llega sola, sin que la pidas: así avisan los agentes.' : 'En la demo la traes tú; en Filmpilot llegaría sola.'}
        </span>
      </span>
      {/* Solo lo que llega solo se puede pausar. */}
      {ultimaNovedad && msg.llegoSola && (
        <button type="button" className="ag-link" onClick={() => despachar({ tipo: 'pausarEventos', valor: !eventosPausados })}>
          {eventosPausados ? 'Reanudar novedades' : 'Pausar novedades'}
        </button>
      )}
    </div>
  )
}

// Identificadores como F-2026-079 u OC-104: no se parten por el guion.
const ID_DOC = /([A-Z]{1,4}-\d[\d-]*)/

function MensajeNota({ msg }) {
  return (
    <p className="ag-msg-nota">
      {String(msg.texto)
        .split(ID_DOC)
        .map((parte, i) => (i % 2 ? <span key={i} className="whitespace-nowrap">{parte}</span> : parte))}
    </p>
  )
}

export function Mensaje({ msg, ultimo, ultimaNovedad }) {
  switch (msg.rol) {
    case 'usuario':
      return <MensajeUsuario msg={msg} />
    case 'decision':
      return <MensajeDecision msg={msg} />
    case 'novedad':
      return <MensajeNovedad msg={msg} ultimaNovedad={ultimaNovedad} />
    case 'nota':
      return <MensajeNota msg={msg} />
    case 'agentes':
      return <MensajeAgentes msg={msg} ultimo={ultimo} />
    default:
      return null
  }
}
