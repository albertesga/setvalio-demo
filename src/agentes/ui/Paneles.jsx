// Carril: lo que puedes ver (las seis historias y el epílogo), cómo actúan los
// agentes y el equipo (el Orquestador y las tres familias), y el detalle de cada agente.

import { useId, useRef } from 'react'
import { AgentGlyph } from '../../brand/Filmpilot.jsx'
import { IconCheck, IconChevronRight } from '../../components/icons.jsx'
import { AGENTES, ORDEN_AGENTES, AUTONOMIA, FAMILIAS, ORDEN_FAMILIAS, agentesDeFamilia } from '../agentes.js'
import { HISTORIAS, EPILOGO, ETIQUETA_CAPACIDAD, ETIQUETA_NIVEL, entradaDeHistoria } from '../casos.js'
import { useCtx } from './contexto.js'
import { Tx, AgentAvatar, AutonomyBadge, Hoja } from './Piezas.jsx'
import { ListaDecisiones, decisionesAbiertas } from './Bloques.jsx'

// Qué agente sostiene cada tipo de decisión pendiente.
const AGENTE_DE_EXCEPCION = { confianza: 'facturas', sin_pedido: 'conciliacion', manual: 'conciliacion', fiscal: 'cumplimiento', orden: 'costes', prevision: 'prevision', propuesta: 'proveedores', riesgo: 'riesgos', informe: 'informes' }

// Historias cuyo arco ya dice su nivel («Lo hace solo», «Te lo propone», «Te pide
// aprobación»): no repiten la insignia. Las demás la llevan (el parte, la lluvia, el informe).
const ARCO_DICE_NIVEL = new Set(['solo', 'propone', 'aprueba'])

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

/** Una historia: antetítulo del arco, título entero y, si hace falta, su nivel. Flecha → check al verla. */
function FilaHistoria({ h, visto, onElegir, deshabilitado }) {
  const etiquetaCapacidad = ETIQUETA_CAPACIDAD[h.capacidad]
  const nivel = h.nivel && !ARCO_DICE_NIVEL.has(h.id) ? ETIQUETA_NIVEL[h.nivel] : null
  return (
    <li>
      <button type="button" className={`ag-caso-fila ${visto ? 'is-visto' : ''}`} disabled={deshabilitado} onClick={() => onElegir(h)}>
        <span className="ag-caso-icono" aria-hidden="true">
          {visto ? <IconCheck size={14} strokeWidth={2.6} /> : <IconChevronRight size={16} />}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="ag-caso-arco">{h.arco}</span>
          <span className="ag-caso-titulo">{h.titulo}</span>
          {(nivel || etiquetaCapacidad) && (
            <span className="ag-caso-meta">
              {nivel && <span className="ag-caso-nivel">{nivel}</span>}
              {etiquetaCapacidad && <span className="ag-etiqueta-capacidad">{etiquetaCapacidad}</span>}
            </span>
          )}
          <span className="sr-only">{visto ? '(vista)' : '(sin ver)'}</span>
        </span>
      </button>
    </li>
  )
}

/** «Lo que puedes ver»: el índice de la demo, arriba del carril y abierto. */
export function LoQuePuedesVer({ nivel = 2, epilogoVisto = false }) {
  const { mundo, vistos, enviarEntrada, ocupado } = useCtx()
  const uid = useId().replace(/:/g, '')
  const H = `h${nivel}`
  const n = vistos.length
  const elegir = (h) => enviarEntrada(entradaDeHistoria(h, mundo))
  return (
    <section className="ag-casos" aria-labelledby={`${uid}-ver`}>
      <div className="ag-casos-cab">
        <H id={`${uid}-ver`} className="flp-kicker text-flp-muted">
          Lo que puedes ver
        </H>
        <span className="ag-casos-cuenta">
          <span className="tnum">{n}</span> de <span className="tnum">{HISTORIAS.length}</span> vistas
        </span>
      </div>
      <ul className="ag-casos-lista">
        {HISTORIAS.map((h) => (
          <FilaHistoria key={h.id} h={h} visto={vistos.includes(h.id)} onElegir={elegir} deshabilitado={ocupado} />
        ))}
      </ul>
      {/* El epílogo lleva la misma etiqueta de exploración que la lluvia, en su fila. */}
      <p className="ag-casos-despues flp-kicker text-flp-muted">{EPILOGO.arco}</p>
      <ul>
        <li>
          <button type="button" className={`ag-caso-fila ag-caso-fila--epilogo ${epilogoVisto ? 'is-visto' : ''}`} disabled={ocupado} onClick={() => elegir(EPILOGO)}>
            <span className="ag-caso-icono" aria-hidden="true">
              {epilogoVisto ? <IconCheck size={14} strokeWidth={2.6} /> : <IconChevronRight size={16} />}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="ag-caso-titulo">{EPILOGO.titulo}</span>
              <span className="ag-caso-desc">{EPILOGO.unaLinea}</span>
              <span className="ag-caso-meta">
                <span className="ag-etiqueta-capacidad">{ETIQUETA_CAPACIDAD[EPILOGO.capacidad]}</span>
              </span>
              <span className="sr-only">{epilogoVisto ? '(visto)' : '(sin ver)'}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  )
}

/** Leyenda de autonomía: tres líneas, una por forma de actuar. */
export function LeyendaAutonomia({ nivel = 2 }) {
  const uid = useId().replace(/:/g, '')
  const H = `h${nivel}`
  return (
    <section className="ag-leyenda" aria-labelledby={`${uid}-ley`}>
      <H id={`${uid}-ley`} className="flp-kicker text-flp-muted">
        Cómo actúan
      </H>
      <dl>
        {Object.values(AUTONOMIA).map((a) => (
          <div key={a.id} className="ag-leyenda-fila">
            <dt>{a.etiqueta}</dt>
            <dd>{a.descripcion}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function FilaAgente({ id, e, onAbrir }) {
  const a = AGENTES[id]
  const trabajando = e.estado === 'trabajando'
  const revisar = !trabajando && e.espera > 0
  return (
    <li>
      <button type="button" className={`ag-agente ${trabajando ? 'is-working' : ''}`} onClick={() => onAbrir(id)}>
        <AgentAvatar id={id} size={24} trabajando={trabajando} revisar={revisar} />
        <span className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-flp-ink">{a.nombre}</span>
            {a.exploratorio && <span className="ag-etiqueta-capacidad">{ETIQUETA_CAPACIDAD.exploratoria}</span>}
          </span>
          {/* Segunda línea solo si hay algo que contar: trabaja o tiene algo por revisar. */}
          {trabajando ? (
            <span className="block truncate text-xs text-flp-muted">
              <span className="font-medium text-flp-ink">Trabajando · </span>
              <Tx value={e.detalle} />
            </span>
          ) : revisar ? (
            <span className="block text-xs font-medium text-flp-ink">
              <span className="tnum">{e.espera}</span> por revisar
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}

/** El equipo: el Orquestador arriba y las tres familias de la marca debajo. */
export function AgentesPorFamilia({ estados, onAbrir, nivel = 2 }) {
  const uid = useId().replace(/:/g, '')
  const H = `h${nivel}`
  const Hf = `h${Math.min(nivel + 1, 6)}`
  return (
    <section className="ag-familias" aria-labelledby={`${uid}-equipo`}>
      <H id={`${uid}-equipo`} className="flp-kicker text-flp-muted">
        El equipo · el Orquestador y <span className="tnum">{ORDEN_AGENTES.length - 1}</span> agentes en <span className="tnum">{ORDEN_FAMILIAS.length}</span> familias
      </H>
      <ul>
        <FilaAgente id="orquestador" e={estados.orquestador} onAbrir={onAbrir} />
      </ul>
      {ORDEN_FAMILIAS.map((f) => (
        <section key={f} className="ag-familia" aria-labelledby={`${uid}-${f}`}>
          <div className="ag-familia-cab" title={FAMILIAS[f].descriptor}>
            <AgentGlyph family={f} size={16} />
            <Hf id={`${uid}-${f}`} className="ag-familia-nombre">
              {FAMILIAS[f].nombre}
            </Hf>
          </div>
          <ul>
            {agentesDeFamilia(f).map((id) => (
              <FilaAgente key={id} id={id} e={estados[id]} onAbrir={onAbrir} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  )
}

export function DetalleAgente({ id, onCerrar }) {
  const { enviar, mundo } = useCtx()
  // Conserva el último agente mientras la hoja se cierra, para que no se vacíe a medio camino.
  const ultimo = useRef(null)
  if (id) ultimo.current = id
  const aid = ultimo.current
  const a = aid ? AGENTES[aid] : null
  const preguntas = a?.preguntas ?? []
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
              {a.exploratorio && <span className="ag-etiqueta-capacidad mt-2">{ETIQUETA_CAPACIDAD.exploratoria}</span>}
            </div>
          </div>
          {nSuyas > 0 && (
            <div>
              <h3 className="flp-kicker mb-2 text-flp-muted">
                Por revisar · <span className="tnum">{nSuyas}</span>
              </h3>
              <ListaDecisiones filtro={suyas} onElegir={onCerrar} />
            </div>
          )}
          <div>
            <h3 className="flp-kicker mb-2 text-flp-muted">Cómo actúa</h3>
            <ul className="space-y-2">
              {a.niveles.map((n) => (
                <li key={n} className="flex flex-col items-start gap-1">
                  <AutonomyBadge nivel={n} />
                  <span className="text-sm text-flp-muted">{AUTONOMIA[n].descripcion}</span>
                </li>
              ))}
            </ul>
          </div>
          {preguntas.length > 0 && (
            <div>
              <h3 className="flp-kicker mb-2 text-flp-muted">Pídele algo</h3>
              <div className="flex flex-wrap gap-2">
                {preguntas.map((texto) => (
                  <button
                    key={texto}
                    type="button"
                    className="ag-sugerencia"
                    onClick={() => {
                      onCerrar()
                      enviar(texto)
                    }}
                  >
                    {texto}
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
