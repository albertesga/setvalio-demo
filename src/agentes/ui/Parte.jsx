// Bloques del parte de la mañana: lo que han hecho solos (hecho), «Para hoy», la tira
// del rodaje y el índice de conversaciones.
// La tira y «Para hoy» leen el mundo actual: lo que decides en la conversación se
// tacha aquí también.

import { useId, useState } from 'react'
import { IconCheck, IconChevronRight, IconClock } from '../../components/icons.jsx'
import * as c from '../calculos.js'
import { AGENTES } from '../agentes.js'
import { CONVERSACIONES, ETIQUETA_CAPACIDAD } from '../casos.js'
import { decisionesAbiertas } from '../pendientes.js'
import { evaluarRiesgos, riesgo as riesgoDe, HECHAS } from '../rodaje.js'
import { renderTexto, fechaDia } from '../texto.js'
import { useCtx } from './contexto.js'
import { Tx, Tono, AgentAvatar, AutonomyBadge, rangoFechas } from './Piezas.jsx'
import { ESTADO_DECISION, ESTADO_RIESGO } from './Bloques.jsx'
import './parte.css'

const PESO = { alta: 0, media: 1, baja: 2, controlado: 3 }
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

/** Etiqueta de alcance: solo lo exploratorio lleva («En exploración»). */
function Capacidad({ capacidad }) {
  const etiqueta = ETIQUETA_CAPACIDAD[capacidad]
  return etiqueta ? <span className="ag-etiqueta-capacidad">{etiqueta}</span> : null
}

/** Todas las jornadas del rodaje: las rodadas y el plan vivo (con los cambios de orden). */
function todasLasJornadas(mundo) {
  return [...HECHAS, ...mundo.rodaje.jornadas]
}

/** Jornadas agrupadas por semana, en orden. */
function porSemana(js) {
  const out = []
  for (const j of js) {
    const g = out[out.length - 1]
    if (g && g.semana === j.semana) g.jornadas.push(j)
    else out.push({ semana: j.semana, jornadas: [j] })
  }
  return out
}

/** El riesgo más grave de cada jornada. */
function riesgoPorJornada(riesgos) {
  const marca = {}
  for (const r of riesgos) for (const n of r.jornadas) if (!marca[n] || PESO[r.severidad] < PESO[marca[n].severidad]) marca[n] = r
  return marca
}

const tipo = (j) => `${j.tipo === 'EXT' ? 'Exterior' : 'Interior'} · ${j.franja.toLowerCase()}`

// ── Ya hecho, sin pedírtelo ──────────────────────────────────────────────────

/** Lo que han hecho solos antes de que llegues: tres líneas como mucho. */
export function BloqueHecho({ b }) {
  const id = useId().replace(/:/g, '')
  return (
    <section className="ag-hecho" aria-labelledby={`${id}-t`}>
      <div className="ag-hecho-cab">
        <h4 id={`${id}-t`} className="flp-kicker text-flp-muted">
          {b.titulo}
        </h4>
        <AutonomyBadge nivel={b.nivel ?? 'ejecuta'} />
      </div>
      <ul className="ag-hecho-lista">
        {b.items.map((it) => (
          <li key={it.agente} className="ag-hecho-item">
            <AgentAvatar id={it.agente} size={24} />
            <p className="min-w-0 flex-1">
              <span className="font-medium text-flp-ink">{AGENTES[it.agente]?.nombre}</span> <Tx value={it.texto} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Tira del rodaje ──────────────────────────────────────────────────────────

/**
 * El plan de rodaje en una fila: las 20 jornadas por semana, rodadas en carbón, hoy
 * con borde y marca, y los riesgos como barra superior (alto, roja; medio, discontinua).
 */
export function BloqueTira() {
  const { mundo } = useCtx()
  const id = useId().replace(/:/g, '')
  const hoy = mundo.proyecto.diaActual
  const total = mundo.proyecto.diasRodaje
  const js = todasLasJornadas(mundo)
  const marca = riesgoPorJornada(evaluarRiesgos(mundo))
  const fin = js[js.length - 1]
  const semanas = porSemana(js)
  return (
    <section className="ag-panel ag-tira" aria-labelledby={`${id}-t`}>
      <div className="ag-tira-cab">
        <h4 id={`${id}-t`} className="flp-kicker text-flp-muted">
          Plan de rodaje
        </h4>
        <span className="text-xs text-flp-muted">
          <span className="tnum">{hoy - 1}</span> rodadas · <span className="tnum">{total - hoy}</span> por rodar · cierre el {fechaDia(fin.fecha)}
        </span>
      </div>
      <ol className="ag-tira-semanas" aria-label={`Plan de rodaje: ${total} jornadas`}>
        {semanas.map((g) => (
          <li key={g.semana} className="ag-tira-semana">
            <span className="ag-tira-sem">
              <span className="ag-tira-sem-nombre">{g.semana} · </span>
              {rangoFechas(g.jornadas[0].fecha, g.jornadas[g.jornadas.length - 1].fecha)}
            </span>
            <ol className="ag-tira-dias">
              {g.jornadas.map((j) => {
                const estado = j.n < hoy ? 'hecha' : j.n === hoy ? 'hoy' : 'pendiente'
                const r = j.n >= hoy ? marca[j.n] : null
                const aviso = r && (r.severidad === 'alta' || r.severidad === 'media') ? r : null
                const texto = `Jornada ${j.n}, ${fechaDia(j.fecha)}: ${j.localizacion}, ${tipo(j).toLowerCase()}. ${estado === 'hecha' ? 'Rodada.' : estado === 'hoy' ? 'Hoy.' : 'Por rodar.'}${aviso ? ` ${aviso.severidad === 'alta' ? 'Riesgo alto' : 'Riesgo medio'}: ${renderTexto(aviso.titulo)}.` : ''}`
                return (
                  <li key={j.n} className={`ag-tira-dia is-${estado} ${aviso ? `con-${aviso.severidad}` : ''}`} title={texto}>
                    <span className="ag-tira-n tnum" aria-hidden="true">
                      {j.n}
                    </span>
                    <span className="sr-only">{texto}</span>
                  </li>
                )
              })}
            </ol>
          </li>
        ))}
      </ol>
      <ul className="ag-tira-leyenda" aria-label="Leyenda">
        <li>
          <i className="is-hecha" aria-hidden="true" /> Rodada
        </li>
        <li>
          <i className="is-hoy" aria-hidden="true" /> Hoy
        </li>
        <li className="ag-solo-ancho">
          <i className="is-pendiente" aria-hidden="true" /> Por rodar
        </li>
        <li>
          <i className="is-pendiente con-alta" aria-hidden="true" /> Riesgo alto
        </li>
        <li>
          <i className="is-pendiente con-media" aria-hidden="true" /> Riesgo medio
        </li>
      </ul>
    </section>
  )
}

// ── Para hoy ─────────────────────────────────────────────────────────────────

/** ¿Está hecho lo que pedía una línea de «Para hoy»? Se lee del mundo actual. */
function estadoLinea(mundo, ref) {
  if (!ref) return { hecho: false }
  if (ref.tipo === 'grupo') {
    const partes = ref.refs.map((r) => estadoLinea(mundo, r))
    const hechas = partes.filter((p) => p.hecho).length
    return { hecho: hechas === partes.length, parcial: hechas > 0 && hechas < partes.length, etiqueta: `${hechas} de ${partes.length} hechas` }
  }
  if (ref.tipo === 'aviso') {
    const r = riesgoDe(mundo, ref.id)
    if (!r || r.estado === 'abierto') return { hecho: false }
    return { hecho: true, etiqueta: ESTADO_RIESGO[r.estado] ?? 'Hecho' }
  }
  const ed = c.estadoDecision(mundo, ref)
  const def = ESTADO_DECISION[ed.estado]
  if (!def || ed.estado === 'desactualizada') return { hecho: false }
  return { hecho: true, etiqueta: `${def.etiqueta}${ed.por ? ` · ${ed.por}` : ''}`, tono: def.tono }
}

function clave(ref) {
  return ref ? `${ref.tipo}-${ref.id}` : ''
}

/** Botón para ir a algo: siempre .ag-boton-fila con chevron, nunca amarillo. */
function BotonIr({ etiqueta, contexto, onClick }) {
  const { ocupado } = useCtx()
  return (
    <button type="button" className="ag-boton-fila" disabled={ocupado} aria-label={contexto ? `${etiqueta}: ${contexto}` : undefined} onClick={onClick}>
      {etiqueta} <IconChevronRight size={15} aria-hidden="true" />
    </button>
  )
}

function Sublinea({ su }) {
  const { mundo, enviar, irATarjeta } = useCtx()
  const e = estadoLinea(mundo, su.ref)
  return (
    <li className={`ag-agenda-sub-item ${e.hecho ? 'is-hecho' : ''}`}>
      <div className="ag-agenda-sub-texto">
        <span className="block text-sm font-medium text-flp-ink">
          <Tx value={su.titulo} />
        </span>
        <span className="block text-xs text-flp-muted">
          <Tx value={su.detalle} />
        </span>
      </div>
      {e.hecho ? (
        <Tono tono="positive">
          <IconCheck size={12} strokeWidth={2.6} aria-hidden="true" />
          {e.etiqueta}
        </Tono>
      ) : (
        <BotonIr
          etiqueta={su.etiqueta}
          contexto={renderTexto(su.titulo)}
          onClick={() => {
            if (su.ref?.tipo !== 'orden' || !irATarjeta(su.ref)) enviar(su.entrada, { ref: su.ref })
          }}
        />
      )}
    </li>
  )
}

/** Subpuntos plegados tras «Ver las compras ›» o «Verlos ›» (avisos): el punto ya dice lo esencial. */
function Plegados({ etiqueta, titulo, intro, subitems }) {
  const [abierto, setAbierto] = useState(false)
  const id = useId().replace(/:/g, '')
  return (
    <div className="ag-agenda-plegado">
      <button type="button" className="ag-agenda-plegar" aria-expanded={abierto} aria-controls={`${id}-l`} onClick={() => setAbierto((x) => !x)}>
        <Tx value={etiqueta} />
        {/* «Verlos» solo se entiende al lado del título: el lector de pantalla lo oye entero. */}
        <span className="sr-only">: {titulo}</span>
        <IconChevronRight size={15} aria-hidden="true" />
      </button>
      {abierto && (
        <div id={`${id}-l`} className="ag-agenda-plegado-cuerpo">
          {intro && (
            <p className="ag-agenda-detalle">
              <Tx value={intro} />
            </p>
          )}
          <ul className="ag-agenda-sub" aria-label={`Detalle: ${titulo}`}>
            {subitems.map((su) => (
              <Sublinea key={su.id} su={su} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Linea({ it, n }) {
  const { mundo, enviar } = useCtx()
  const e = estadoLinea(mundo, it.ref)
  const titulo = renderTexto(it.titulo)
  return (
    <li className={`ag-agenda-item ${e.hecho ? 'is-hecho' : ''}`}>
      <span className={`ag-agenda-n tnum ${e.hecho ? 'is-hecho' : ''}`} aria-hidden="true">
        {e.hecho ? <IconCheck size={13} strokeWidth={2.8} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h5 className="ag-agenda-titulo">
            <span className="sr-only">{e.hecho ? 'Hecho: ' : `${n}. `}</span>
            <Tx value={it.titulo} />
          </h5>
          <Capacidad capacidad={it.capacidad} />
        </div>
        {e.hecho ? (
          <p className="mt-1">
            <Tono tono={e.tono === 'neutral' ? 'neutral' : 'positive'}>
              <IconCheck size={12} strokeWidth={2.6} aria-hidden="true" />
              {e.etiqueta}
            </Tono>
          </p>
        ) : (
          <>
            <p className="ag-agenda-detalle">
              <Tx value={it.detalle} />
            </p>
            {/* Cuándo y quién decide a la izquierda; ir a algo, a la derecha; lo plegado, debajo. */}
            <div className="ag-agenda-pie">
              {/* En una línea que parte como texto: cuándo · quién decide. */}
              <p className="ag-agenda-meta">
                <IconClock size={13} aria-hidden="true" />
                <span className="font-medium text-flp-ink">
                  <Tx value={it.cuando} />
                </span>
                {' · '}
                {it.rolEtiqueta ?? (/ y /.test(it.decide) ? 'Deciden' : 'Decide')}: {it.decide.toLowerCase()}
                {e.parcial && <span className="font-medium text-flp-ink"> · {e.etiqueta}</span>}
              </p>
              {it.acciones?.length > 0 && (
                <div className="ag-agenda-acciones">
                  {it.acciones.map((a) => (
                    <BotonIr key={a.etiqueta} etiqueta={a.etiqueta} contexto={titulo} onClick={() => enviar(a.entrada)} />
                  ))}
                </div>
              )}
              {it.subitems?.length > 0 && <Plegados etiqueta={it.plegado ?? plural(it.subitems.length, 'punto', 'puntos')} titulo={titulo} subitems={it.subitems} />}
            </div>
          </>
        )}
      </div>
    </li>
  )
}

/** Los avisos al equipo: no son decisiones, van aparte y plegados. */
function Avisos({ av }) {
  const { mundo } = useCtx()
  const titulo = renderTexto(av.titulo)
  // En la demo nada sale: un aviso marcado queda revisado, no enviado.
  const total = av.subitems.length
  const revisados = av.subitems.filter((su) => estadoLinea(mundo, su.ref).hecho).length
  const estado = !revisados ? null : revisados === total ? (total === 1 ? 'revisado' : 'revisados') : `${revisados} de ${total} revisados`
  return (
    <div className="ag-agenda-avisos">
      <p className="text-sm text-flp-ink">
        <Tx value={av.titulo} />
        {estado && <span className="text-flp-muted"> · {estado}</span>}
      </p>
      <Plegados etiqueta={av.plegado} titulo={titulo} intro={av.detalle} subitems={av.subitems} />
    </div>
  )
}

/** «Para hoy»: tres puntos como mucho, por urgencia; se tachan en cuanto se deciden. */
export function BloqueAgenda({ b }) {
  const { mundo, enviar, ocupado } = useCtx()
  const id = useId().replace(/:/g, '')
  const estados = b.items.map((it) => estadoLinea(mundo, it.ref))
  const hechas = estados.filter((e) => e.hecho).length
  // Lo que queda en «Por revisar» fuera de esta lista, en directo.
  const cubiertas = new Set(b.items.flatMap((it) => [it.ref, ...(it.ref?.refs ?? []), ...(it.subitems ?? []).map((su) => su.ref)]).map(clave))
  const resto = decisionesAbiertas(mundo).filter((d) => !cubiertas.has(clave(d.ref)))
  return (
    <section className="ag-panel ag-agenda" aria-labelledby={`${id}-t`}>
      <div className="ag-agenda-cab">
        <h4 id={`${id}-t`} className="flp-kicker text-flp-ink">
          {b.titulo}
        </h4>
        <span className="text-xs text-flp-muted">{hechas ? `${hechas} de ${b.items.length} hechas` : 'Por orden de urgencia'}</span>
      </div>
      {b.items.length ? (
        <ol className="ag-agenda-lista">
          {b.items.map((it, i) => (
            <Linea key={it.id} it={it} n={i + 1} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-flp-muted">Nada urgente para hoy.</p>
      )}
      {(resto.length > 0 || b.avisos) && (
        <div className="ag-agenda-resto">
          {resto.length > 0 && (
            <p className="ag-agenda-resto-linea">
              <span>Y {plural(resto.length, 'decisión más', 'decisiones más')} por revisar.</span>
              <button type="button" className="ag-link" disabled={ocupado} onClick={() => enviar('¿Qué tengo que revisar?')}>
                Verlas todas
              </button>
            </p>
          )}
          {b.avisos && <Avisos av={b.avisos} />}
        </div>
      )}
    </section>
  )
}

// ── Conversaciones («¿Qué puedes hacer?») ─────────────────────────────────────

/** Las conversaciones de la demo, cada una con su agente y de qué trata: un toque la abre. */
export function BloqueConversaciones() {
  const ctx = useCtx()
  const id = useId().replace(/:/g, '')
  return (
    <section className="ag-indice" aria-labelledby={`${id}-t`}>
      <div className="ag-indice-cab">
        <h4 id={`${id}-t`} className="flp-kicker text-flp-muted">
          Conversaciones
        </h4>
      </div>
      <ul className="ag-indice-lista">
        {CONVERSACIONES.filter((c) => c.id !== 'parte').map((c) => (
          <li key={c.id} className="ag-indice-item">
            <p className="ag-indice-etiqueta">{c.etiqueta}</p>
            <h5 className="ag-indice-titulo">{c.titulo}</h5>
            <div className="ag-indice-meta">
              {/* El nombre del agente, solo si no es ya la etiqueta («Facturas · Facturas»). */}
              {AGENTES[c.agente]?.nombre.toLowerCase() !== c.etiqueta.toLowerCase() && <span className="text-xs text-flp-muted">{AGENTES[c.agente]?.nombre}</span>}
              <Capacidad capacidad={c.capacidad} />
            </div>
            <button type="button" className="ag-boton-fila ag-indice-boton" aria-label={`Abrir la conversación: ${c.titulo}`} onClick={() => ctx.abrirConversacion(c.id)}>
              <span>Abrir la conversación</span> <IconChevronRight size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Registro de los bloques de este archivo: Bloques.jsx los busca aquí por tipo al pintar.
export const BLOQUES_PARTE = { hecho: BloqueHecho, agenda: BloqueAgenda, tira: BloqueTira, conversaciones: BloqueConversaciones }
