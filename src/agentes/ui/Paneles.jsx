// Carril de agentes: el Orquestador y las tres familias, el detalle de cada agente y los casos de uso.

import { useId, useRef } from 'react'
import { AgentGlyph } from '../../brand/Filmpilot.jsx'
import { IconCheck } from '../../components/icons.jsx'
import { AGENTES, ORDEN_AGENTES, AUTONOMIA, FAMILIAS, ORDEN_FAMILIAS, agentesDeFamilia } from '../agentes.js'
import { CASOS, ETIQUETA_CAPACIDAD } from '../casos.js'
import { useCtx } from './contexto.js'
import { Tx, AgentAvatar, AutonomyBadge, Hoja } from './Piezas.jsx'
import { ListaDecisiones, decisionesAbiertas } from './Bloques.jsx'

// Qué agente sostiene cada tipo de decisión pendiente.
const AGENTE_DE_EXCEPCION = { confianza: 'facturas', sin_pedido: 'conciliacion', fiscal: 'cumplimiento', orden: 'costes', prevision: 'prevision', propuesta: 'proveedores', riesgo: 'riesgos' }

export function estadoAgentes(s) {
  const out = Object.fromEntries(ORDEN_AGENTES.map((id) => [id, { estado: 'disponible', detalle: null, espera: 0 }]))
  const activo = s.activo && s.mensajes.find((m) => m.id === s.activo.id)
  if (activo) {
    activo.turno.pasos.forEach((p, i) => {
      if (activo.estadoPasos[i] === 'en_curso') out[p.agente] = { ...out[p.agente], estado: 'trabajando', detalle: p.titulo }
    })
  }
  for (const e of decisionesAbiertas(s.mundo)) {
    const a = AGENTE_DE_EXCEPCION[e.tipo]
    if (a) out[a].espera += 1
  }
  return out
}

function FilaAgente({ id, e, onAbrir }) {
  const a = AGENTES[id]
  const trabajando = e.estado === 'trabajando'
  const revisar = !trabajando && e.espera > 0
  return (
    <li>
      <button type="button" className={`ag-agente ${trabajando ? 'is-working' : ''}`} onClick={() => onAbrir(id)}>
        <AgentAvatar id={id} size={32} trabajando={trabajando} revisar={revisar} />
        <span className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-flp-ink">{a.nombre}</span>
            {a.exploratorio && <span className="ag-etiqueta-capacidad">Exploratorio</span>}
          </span>
          {trabajando ? (
            <span className="block truncate text-xs text-flp-muted">
              <span className="font-medium text-flp-ink">Trabajando · </span>
              <Tx value={e.detalle} />
            </span>
          ) : revisar ? (
            <span className="block text-xs font-medium text-flp-ink">{e.espera} por revisar</span>
          ) : (
            <span className="block text-xs text-flp-muted">En espera</span>
          )}
        </span>
      </button>
    </li>
  )
}

/** Carril de agentes: el Orquestador arriba y las tres familias de la marca debajo. */
export function AgentesPorFamilia({ estados, onAbrir, nivel = 3 }) {
  const uid = useId().replace(/:/g, '')
  const H = `h${nivel}`
  return (
    <div className="ag-familias">
      <div>
        <ul>
          <FilaAgente id="orquestador" e={estados.orquestador} onAbrir={onAbrir} />
        </ul>
        <p className="ag-familia-desc">{AGENTES.orquestador.rol}</p>
      </div>
      {ORDEN_FAMILIAS.map((f) => (
        <section key={f} className="ag-familia" aria-labelledby={`${uid}-${f}`}>
          <div className="ag-familia-cab">
            <AgentGlyph family={f} size={20} />
            <H id={`${uid}-${f}`} className="flp-kicker">
              {FAMILIAS[f].nombre}
            </H>
          </div>
          <p className="ag-familia-desc">{FAMILIAS[f].descriptor}</p>
          <ul>
            {agentesDeFamilia(f).map((id) => (
              <FilaAgente key={id} id={id} e={estados[id]} onAbrir={onAbrir} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function DetalleAgente({ id, onCerrar }) {
  const { enviar, mundo } = useCtx()
  // Conserva el último agente mientras la hoja se cierra, para que no se vacíe a medio camino.
  const ultimo = useRef(null)
  if (id) ultimo.current = id
  const aid = ultimo.current
  const a = aid ? AGENTES[aid] : null
  const casos = a ? CASOS.filter((x) => x.agentes.includes(aid)).slice(0, 3) : []
  const suyas = (e) => AGENTE_DE_EXCEPCION[e.tipo] === aid
  const nSuyas = a ? decisionesAbiertas(mundo).filter(suyas).length : 0
  return (
    <Hoja abierta={!!id} onCerrar={onCerrar} titulo={a?.nombre ?? 'Agente'} subtitulo={a ? (a.familia ? `Familia ${FAMILIAS[a.familia].nombre}` : 'Reparte el trabajo entre los demás') : undefined} id="ag-hoja-agente">
      {a && (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <AgentAvatar id={aid} size={48} />
            <div>
              <p className="text-sm font-medium text-flp-ink">{a.rol}</p>
              <p className="mt-1 text-sm leading-relaxed text-flp-muted">{a.hace}</p>
              {a.exploratorio && <span className="ag-etiqueta-capacidad mt-2">Exploratorio</span>}
            </div>
          </div>
          {nSuyas > 0 && (
            <div>
              <h3 className="flp-kicker mb-2 text-flp-muted">Por revisar ({nSuyas})</h3>
              <ListaDecisiones filtro={suyas} onElegir={onCerrar} />
            </div>
          )}
          <div>
            <h3 className="flp-kicker mb-2 text-flp-muted">Cómo actúa</h3>
            <ul className="space-y-2">
              {a.niveles.map((n) => (
                <li key={n} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <AutonomyBadge nivel={n} />
                  <span className="text-sm text-flp-muted">{AUTONOMIA[n].descripcion}</span>
                </li>
              ))}
            </ul>
          </div>
          {casos.length > 0 && (
            <div>
              <h3 className="flp-kicker mb-2 text-flp-muted">Pídele algo</h3>
              <div className="flex flex-wrap gap-2">
                {casos.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="ag-sugerencia"
                    onClick={() => {
                      onCerrar()
                      enviar(x.prompt)
                    }}
                  >
                    {x.prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Hoja>
  )
}

export function casosVistos(vistos) {
  return CASOS.filter((x) => vistos.includes(x.id)).length
}

export function CasosTracker({ vistos, cabecera = true }) {
  const { enviar, ocupado } = useCtx()
  const n = casosVistos(vistos)
  return (
    <div>
      {cabecera && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flp-kicker text-flp-muted">Casos de uso</h2>
          <span className="tnum text-xs font-medium text-flp-ink">
            {n} de {CASOS.length} vistos
          </span>
        </div>
      )}
      <div className="ag-progreso" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={CASOS.length} aria-label="Casos de uso vistos">
        <span style={{ width: `${(n / CASOS.length) * 100}%` }} />
      </div>
      <ul className="mt-2 space-y-0.5">
        {CASOS.map((x) => {
          const visto = vistos.includes(x.id)
          return (
            <li key={x.id}>
              <button type="button" className="ag-caso-fila" disabled={ocupado} onClick={() => enviar(x.prompt)}>
                <span className={`ag-caso-check ${visto ? 'is-visto' : ''}`} aria-hidden="true">
                  {visto && <IconCheck size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{x.titulo}</span>
                {ETIQUETA_CAPACIDAD[x.capacidad] && <span className="ag-etiqueta-capacidad">{ETIQUETA_CAPACIDAD[x.capacidad]}</span>}
                <span className="sr-only">{visto ? '(visto)' : '(sin ver)'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { CASOS }
