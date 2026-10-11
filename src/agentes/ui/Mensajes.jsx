// Mensajes de la conversación y línea de trabajo de los agentes.

import { useState } from 'react'
import { IconChevronDown, IconBell, IconStop, IconArrowDown } from '../../components/icons.jsx'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { AGENTES } from '../agentes.js'
import { PERSONAS } from '../mundo.js'
import { RECORRIDO } from '../casos.js'
import { fechaDia } from '../texto.js'
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

/** Cabecera del parte de la mañana: el saludo sale al instante; el parte, cuando lo terminan los agentes. */
function CabeceraSaludo({ msg, tituloId, enCurso, onSaltar, onDetener }) {
  const { persona } = useCtx()
  const e = msg.turno.entidades
  const nombre = (PERSONAS[e.persona] ?? persona).nombre.split(' ')[0]
  const fecha = fechaDia(e.fecha)
  const n = nombresAgentes(msg.turno.agentes).length
  return (
    <header className="ag-saludo">
      <p className="flp-kicker text-flp-muted">
        {fecha.charAt(0).toUpperCase() + fecha.slice(1)} · {e.proyecto}
      </p>
      <h3 id={tituloId} tabIndex={-1} className="ag-saludo-titulo focus:outline-none">
        {saludoDe(msg.hora)}, {nombre}. <span className="block text-flp-muted">Hoy es el día {e.dia} de rodaje.</span>
      </h3>
      <div className="ag-saludo-meta">
        <AgentAvatar id="orquestador" size={28} trabajando={enCurso} />
        <p className="min-w-0 flex-1 text-sm text-flp-muted">
          {enCurso ? (
            <span className="font-medium text-flp-ink">Los agentes preparan el parte de la mañana…</span>
          ) : (
            <>
              <span className="font-medium text-flp-ink">Parte de la mañana</span> · <span className="tnum">{msg.hora}</span> · lo han preparado {n} agentes
            </>
          )}
        </p>
        {enCurso ? (
          <div className="ag-msg-controles">
            <button type="button" className="ag-boton-fila" onClick={onSaltar}>
              Saltar al resultado
            </button>
            <button type="button" className="ag-boton-fila" onClick={onDetener}>
              <IconStop size={14} aria-hidden="true" /> Detener
            </button>
          </div>
        ) : (
          msg.estado === 'hecho' && <StatusChip estado="hecho" />
        )}
      </div>
    </header>
  )
}

function MensajeAgentes({ msg, ultimo }) {
  const { despachar, deshacible, ocupado, mundo, enRecorrido } = useCtx()
  const [detalle, setDetalle] = useState(false)
  const t = msg.turno
  const enCurso = msg.estado === 'en_curso'
  const bloques = t.bloques.slice(0, msg.bloquesVisibles)
  const tituloId = `${msg.id}-titulo`
  // Al terminar: cuántas decisiones de esta respuesta siguen esperando a una persona.
  const porDecidir = !enCurso && msg.estado === 'hecho' ? t.bloques.filter((b) => aprobacionPendiente(mundo, b)).length : 0
  // El amarillo, en un solo bloque de la respuesta.
  const principal = bloquePrincipal(mundo, bloques)
  const automatico = msg.origen === 'evento'
  const puedeDeshacer = !enCurso && deshacible === msg.id && !msg.deshecho
  const quien = automatico ? agenteQueActuo(t) : null
  // Una novedad que llega sola y no pide nada cabe en una línea: lo hecho y «Ver detalle».
  // En el recorrido se enseña entera, porque es lo que el paso quiere enseñar.
  // Se decide al llegar: lo que llegó en el recorrido no se pliega al salir de él.
  const [llegoEnRecorrido] = useState(enRecorrido)
  const plegado = automatico && !!t.resumen && msg.estado === 'hecho' && porDecidir === 0 && !detalle && !llegoEnRecorrido

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
    const antes = [...document.querySelectorAll('.ag-aprobacion:not(.is-decidida)')].filter((x) => x.compareDocumentPosition(art) & Node.DOCUMENT_POSITION_FOLLOWING)
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
          <AgentAvatar id="orquestador" size={32} trabajando={enCurso} />
          <div className="min-w-0 flex-1">
            {t.proyecto && (
              <p className="flp-kicker text-flp-muted">
                {/* La productora ya la nombra la respuesta: el antetítulo cabe en una línea en móvil. */}
                Otro proyecto · {t.proyecto.titulo}
                {t.proyecto.estado ? ` · ${t.proyecto.estado}` : ''}
              </p>
            )}
            <h3 id={tituloId} tabIndex={-1} className="ag-msg-titulo focus:outline-none">
              {msg.deshecho ? `Deshecho: ${t.titulo}` : t.titulo}
            </h3>
            <p className="text-xs text-flp-muted">
              <span className="tnum">{msg.hora}</span> · {automatico ? 'Novedad que llega sola' : msg.origen === 'accion' ? 'Los agentes aplican tu decisión' : 'Orquestador'}
            </p>
            {ultimo && msg.estado === 'hecho' && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusChip estado="hecho" />
                {porDecidir > 0 && !enRecorrido && (
                  <button type="button" className="ag-salto-decision" onClick={irADecision}>
                    <span className="flp-state flp-state--review">
                      {porDecidir === 1 ? '1 decisión aquí' : `${porDecidir} decisiones aquí`} <IconArrowDown size={13} aria-hidden="true" />
                    </span>
                  </button>
                )}
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

      {msg.deshecho && msg.origen === 'accion' && (
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
          <span>{automatico ? 'Lo hizo sin preguntarte.' : '¿No era esto?'}</span>
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
  const { despachar, eventosPausados, enRecorrido } = useCtx()
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
      {/* En el recorrido las novedades las trae cada paso: no hay nada que pausar. */}
      {ultimaNovedad && !enRecorrido && (
        <button type="button" className="ag-link" onClick={() => despachar({ tipo: 'pausarEventos', valor: !eventosPausados })}>
          {eventosPausados ? 'Reanudar novedades' : 'Pausar novedades'}
        </button>
      )}
    </div>
  )
}

/** Inicio de un paso del recorrido: un separador fino. La nota vive en la barra del recorrido. */
function MensajeGuia({ msg }) {
  // El paso sin entrada (el parte) ya está arriba: un separador debajo señalaría a nada.
  if (RECORRIDO[msg.indice]?.entrada === null) return null
  return (
    <p className="ag-msg-guia flp-kicker">
      <span>
        Paso <span className="tnum">{msg.indice + 1}</span> de <span className="tnum">{msg.total}</span> · {msg.arco ?? msg.titulo}
      </span>
    </p>
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
