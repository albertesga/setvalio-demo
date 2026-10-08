// Bloques del parte de la mañana: la tira del rodaje, «Para hoy», la semana y
// lo que ha hecho cada agente. La tira, «Para hoy» y la semana leen el mundo
// actual: lo que decides en la conversación se tacha aquí también.

import { useId } from 'react'
import { IconCheck, IconChevronRight, IconClock } from '../../components/icons.jsx'
import * as c from '../calculos.js'
import { AGENTES } from '../agentes.js'
import { decisionesAbiertas } from '../pendientes.js'
import { evaluarRiesgos, riesgo as riesgoDe, HECHAS, PREGUNTA } from '../rodaje.js'
import { renderTexto, fechaDia } from '../texto.js'
import { useCtx } from './contexto.js'
import { Tx, Tono, AgentAvatar, ChipSeveridad, diaCorto, rangoFechas } from './Piezas.jsx'
import { ESTADO_DECISION, ESTADO_RIESGO, irATarjeta } from './Bloques.jsx'

const PESO = { alta: 0, media: 1, baja: 2, controlado: 3 }
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

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

// «Madrid centro · interiores» → «Madrid centro».
const sitio = (loc) => loc.split(' · ')[0]
const minuscula = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const tipo = (j) => `${j.tipo === 'EXT' ? 'Exterior' : 'Interior'} · ${j.franja.toLowerCase()}`

// ── Tira del rodaje ──────────────────────────────────────────────────────────

/** Las jornadas del rodaje en una tira: rodadas, hoy y por rodar, con los riesgos encima. */
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
        <h4 id={`${id}-t`} className="text-sm font-semibold text-flp-ink">
          Rodaje · día <span className="tnum">{hoy}</span> de <span className="tnum">{total}</span>
        </h4>
        <span className="text-xs text-flp-muted">
          <span className="tnum">{hoy - 1}</span> rodadas · <span className="tnum">{total - hoy}</span> por rodar después de hoy · cierre el {fechaDia(fin.fecha)}
        </span>
      </div>
      <div className="ag-tira-progreso" aria-hidden="true">
        <span style={{ width: `${((hoy - 1) / total) * 100}%` }} />
      </div>
      <ol className="ag-tira-semanas" aria-label={`Plan de rodaje: ${total} jornadas`}>
        {semanas.map((g) => {
          const lugares = [...new Set(g.jornadas.map((j) => sitio(j.localizacion)))]
          return (
            <li key={g.semana} className="ag-tira-semana">
              <span className="ag-tira-sem">
                {g.semana} · {rangoFechas(g.jornadas[0].fecha, g.jornadas[g.jornadas.length - 1].fecha)}
                {lugares.length === 1 && <span className="block truncate text-flp-ink">{lugares[0]}</span>}
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
          )
        })}
      </ol>
      <ul className="ag-tira-leyenda" aria-label="Leyenda">
        <li>
          <i className="is-hecha" aria-hidden="true" /> Rodada
        </li>
        <li>
          <i className="is-hoy" aria-hidden="true" /> Hoy
        </li>
        <li>
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

function Sublinea({ su }) {
  const { mundo, enviar, ocupado } = useCtx()
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
        <button
          type="button"
          className="ag-boton-fila"
          disabled={ocupado}
          aria-label={`${su.etiqueta}: ${renderTexto(su.titulo)}`}
          onClick={() => {
            if (su.ref?.tipo !== 'orden' || !irATarjeta(su.ref)) enviar(su.entrada)
          }}
        >
          {su.etiqueta} <IconChevronRight size={15} aria-hidden="true" />
        </button>
      )}
    </li>
  )
}

function Linea({ it, n }) {
  const { mundo, enviar, ocupado } = useCtx()
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
          {it.capacidad === 'exploratoria' && <span className="ag-etiqueta-capacidad">Exploratorio</span>}
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
            <p className="ag-agenda-meta">
              <span className="inline-flex items-center gap-1 font-medium text-flp-ink">
                <IconClock size={13} aria-hidden="true" />
                <Tx value={it.cuando} />
              </span>
              <span>
                {it.rolEtiqueta ?? 'Decide'}: {it.decide.toLowerCase()}
              </span>
              {e.parcial && <span className="font-medium text-flp-ink">{e.etiqueta}</span>}
            </p>
          </>
        )}
        {it.subitems?.length > 0 && (
          <ul className="ag-agenda-sub" aria-label={`Detalle: ${titulo}`}>
            {it.subitems.map((su) => (
              <Sublinea key={su.id} su={su} />
            ))}
          </ul>
        )}
        {!e.hecho && it.acciones?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {it.acciones.map((a) => (
              <button key={a.etiqueta} type="button" className="ag-boton-fila" disabled={ocupado} aria-label={`${a.etiqueta}: ${titulo}`} onClick={() => enviar(a.entrada)}>
                {a.etiqueta} <IconChevronRight size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

/** «Para hoy»: lo urgente, ordenado; se tacha en cuanto se decide. */
export function BloqueAgenda({ b }) {
  const { mundo, verPorRevisar } = useCtx()
  const id = useId().replace(/:/g, '')
  const estados = b.items.map((it) => estadoLinea(mundo, it.ref))
  const hechas = estados.filter((e) => e.hecho).length
  // Lo que queda en «Por revisar» fuera de esta lista, en directo.
  const cubiertas = new Set(b.items.flatMap((it) => [it.ref, ...(it.ref?.refs ?? []), ...(it.subitems ?? []).map((su) => su.ref)]).map(clave))
  const resto = decisionesAbiertas(mundo).filter((d) => !cubiertas.has(clave(d.ref)))
  return (
    <section className="ag-panel ag-agenda" aria-labelledby={`${id}-t`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 id={`${id}-t`} className="text-sm font-semibold text-flp-ink">
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
      {resto.length > 0 && (
        <p className="ag-agenda-resto">
          <span>
            Y {plural(resto.length, 'decisión más', 'decisiones más')}, menos urgentes, en «Por revisar».
          </span>
          {verPorRevisar && (
            <button type="button" className="ag-link" onClick={verPorRevisar}>
              Ver todo lo que está por revisar
            </button>
          )}
        </p>
      )}
    </section>
  )
}

// ── Esta semana ──────────────────────────────────────────────────────────────

/** La semana de rodaje en curso, día a día, con los riesgos de cada jornada. */
export function BloqueSemana({ b }) {
  const { mundo, enviar, ocupado } = useCtx()
  const id = useId().replace(/:/g, '')
  const hoy = mundo.proyecto.diaActual
  const riesgos = evaluarRiesgos(mundo)
  const semanas = porSemana(todasLasJornadas(mundo))
  const i = semanas.findIndex((g) => g.semana === b.semana)
  if (i < 0) return null
  const { jornadas } = semanas[i]
  const siguiente = semanas[i + 1]
  const sigLugares = siguiente ? [...new Set(siguiente.jornadas.map((j) => sitio(j.localizacion)))] : []
  const sigNoches = siguiente ? siguiente.jornadas.filter((j) => j.franja === 'Noche').length : 0
  const sigRiesgos = siguiente ? riesgos.filter((r) => r.severidad !== 'controlado' && r.jornadas.some((n) => siguiente.jornadas.some((j) => j.n === n))) : []
  return (
    <section className="ag-panel" aria-labelledby={`${id}-t`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 id={`${id}-t`} className="text-sm font-semibold text-flp-ink">
          Esta semana en el rodaje · {b.semana}
        </h4>
        <span className="ag-etiqueta-capacidad">Exploratorio</span>
      </div>
      <ol className="ag-semana">
        {jornadas.map((j) => {
          const rs = j.n >= hoy ? riesgos.filter((r) => r.jornadas.includes(j.n)).sort((a, z) => PESO[a.severidad] - PESO[z.severidad]) : []
          const estado = j.n < hoy ? 'Rodada' : j.n === hoy ? 'Hoy' : j.n === hoy + 1 ? 'Mañana' : null
          return (
            <li key={j.n} className={`ag-semana-dia ${j.n < hoy ? 'is-hecha' : ''} ${j.n === hoy ? 'is-hoy' : ''}`}>
              <span className="ag-semana-fecha tnum">
                <span className="block">{diaCorto(j.fecha)}</span>
                <span className="block text-flp-muted">J{j.n}</span>
              </span>
              <div className="min-w-0">
                <span className="block text-sm font-medium text-flp-ink">{j.localizacion}</span>
                <span className="block text-xs text-flp-muted">
                  {tipo(j)}
                  {j.nota ? ` · ${j.nota}` : ''}
                </span>
                {rs.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {rs.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <ChipSeveridad severidad={r.severidad} />
                        <span className="text-xs text-flp-ink">
                          <Tx value={r.titulo} />
                        </span>
                        {r.severidad !== 'controlado' && (
                          <button type="button" className="ag-link ag-link--compacto" disabled={ocupado} onClick={() => enviar(PREGUNTA[r.id])} aria-label={`Ver qué propone: ${renderTexto(r.titulo)}`}>
                            Ver qué propone
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {estado ? <span className={`ag-semana-estado ${j.n === hoy ? 'is-hoy' : ''}`}>{estado}</span> : <span aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
      {siguiente && (
        <p className="ag-semana-siguiente">
          <strong className="font-medium text-flp-ink">
            La semana que viene, {rangoFechas(siguiente.jornadas[0].fecha, siguiente.jornadas[siguiente.jornadas.length - 1].fecha)}:
          </strong>{' '}
          {sigLugares.join(' y ')}, jornadas <span className="tnum">{siguiente.jornadas[0].n}</span> a <span className="tnum">{siguiente.jornadas[siguiente.jornadas.length - 1].n}</span>
          {sigNoches ? `, ${sigNoches === 1 ? 'una de noche' : `${sigNoches} de noche`}` : ''}.
          {sigRiesgos.length > 0 && ` ${plural(sigRiesgos.length, 'riesgo', 'riesgos')} a la vista: ${sigRiesgos.map((r) => minuscula(renderTexto(r.titulo))).join('; ')}.`}
        </p>
      )}
    </section>
  )
}

// ── Lo que ha hecho cada agente ──────────────────────────────────────────────

export function BloqueEquipo({ b }) {
  const id = useId().replace(/:/g, '')
  return (
    <section className="ag-panel" aria-labelledby={`${id}-t`}>
      <h4 id={`${id}-t`} className="mb-3 text-sm font-semibold text-flp-ink">
        {b.titulo}
      </h4>
      <ul className="ag-equipo">
        {b.items.map((it) => (
          <li key={it.agente}>
            <AgentAvatar id={it.agente} size={28} />
            <div className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-flp-ink">{AGENTES[it.agente].nombre}</span>
                {it.exploratorio && <span className="ag-etiqueta-capacidad">Exploratorio</span>}
              </span>
              <p className="text-sm leading-relaxed text-flp-muted">
                <Tx value={it.texto} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
