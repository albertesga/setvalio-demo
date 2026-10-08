// Paneles laterales: agentes por familia, casos de uso, actividad, decisiones y riesgos.

import { useId, useRef } from 'react'
import { AgentGlyph, StateChip } from '../../brand/Filmpilot.jsx'
import { IconCheck, IconPlay, IconPause } from '../../components/icons.jsx'
import { AGENTES, ORDEN_AGENTES, AUTONOMIA, FAMILIAS, ORDEN_FAMILIAS, agentesDeFamilia } from '../agentes.js'
import { CASOS, ETIQUETA_CAPACIDAD } from '../casos.js'
import { EVENTOS } from '../sesion.js'
import * as c from '../calculos.js'
import { fechaCorta } from '../texto.js'
import { useCtx } from './contexto.js'
import { Tx, AgentAvatar, AutonomyBadge, Tono, Hoja } from './Piezas.jsx'
import { ListaDecisiones, decisionesAbiertas, RadarRiesgos } from './Bloques.jsx'
import { riesgosAltos } from '../rodaje.js'

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

function ItemActividad({ it }) {
  return (
    <li className="ag-actividad-item">
      <span className="tnum w-12 flex-none pt-1 text-xs text-flp-muted">{it.previa ? fechaCorta(it.fecha) : it.hora}</span>
      {it.agente ? (
        <AgentAvatar id={it.agente} size={28} />
      ) : (
        <span className="ag-persona" aria-hidden="true">
          {(it.persona ?? '?')
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-flp-ink">
          {it.agente && <strong>{AGENTES[it.agente].nombre} · </strong>}
          <Tx value={it.texto} />
        </p>
        {it.salida && (
          <p className="mt-0.5 text-xs text-flp-muted">
            <Tx value={it.salida} />
          </p>
        )}
        {(it.evento || (it.autonomia && it.autonomia !== 'ejecuta')) && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {it.evento && <Tono tono="info">Novedad</Tono>}
            {it.autonomia && it.autonomia !== 'ejecuta' && <AutonomyBadge nivel={it.autonomia} />}
          </div>
        )}
      </div>
    </li>
  )
}

export function PanelActividad({ s }) {
  const { despachar, ocupado } = useCtx()
  const sesion = s.actividad.filter((x) => !x.previa)
  const previas = s.actividad.filter((x) => x.previa)
  const quedan = EVENTOS.filter((e) => s.mundo.entrantes.includes(e.id)).length
  const enDirecto = !s.eventosPausados && !s.tour
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className={`ag-directo ${enDirecto ? 'is-on' : ''}`}>
          <span aria-hidden="true" />
          {s.tour ? 'Novedades en pausa durante el recorrido' : enDirecto ? 'Novedades en directo' : 'Novedades en pausa'}
        </span>
        <div className="flex gap-1.5">
          <button type="button" className="ag-boton-fila" aria-pressed={s.eventosPausados} onClick={() => despachar({ tipo: 'pausarEventos', valor: !s.eventosPausados })}>
            {s.eventosPausados ? <IconPlay size={14} aria-hidden="true" /> : <IconPause size={14} aria-hidden="true" />}
            {s.eventosPausados ? 'Reanudar novedades' : 'Pausar novedades'}
          </button>
        </div>
      </div>
      {quedan > 0 && (
        <div className="mb-4 rounded-flp-sm border border-dashed border-flp-control bg-flp-surface px-3 py-2.5 text-xs text-flp-muted">
          {s.mensajes.some((m) => m.rol === 'agentes')
            ? `Quedan ${quedan} ${quedan === 1 ? 'novedad' : 'novedades'} de ejemplo. Llegan solas cuando dejas de usar la pantalla unos segundos.`
            : 'Cuando empieces a conversar irán llegando avisos de riesgos, facturas y solicitudes de ejemplo.'}
          <button type="button" className="ag-link ml-1" disabled={ocupado} onClick={() => despachar({ tipo: 'simularEvento' })}>
            Traer la siguiente novedad
          </button>
        </div>
      )}
      {sesion.length > 0 && (
        <>
          <h3 className="flp-kicker mb-1 text-flp-muted">Esta sesión</h3>
          <ul className="mb-4">
            {sesion.map((it) => (
              <ItemActividad key={it.id} it={it} />
            ))}
          </ul>
        </>
      )}
      <h3 className="flp-kicker mb-1 text-flp-muted">Antes de esta sesión</h3>
      <ul>
        {previas.map((it) => (
          <ItemActividad key={it.id} it={it} />
        ))}
      </ul>
    </div>
  )
}

export function PanelDecisiones({ s }) {
  const decididas = [...s.mundo.historial].reverse().filter((h) => h.por && h.ref && ['orden', 'documento', 'revision', 'cef', 'informe', 'borrador', 'llamadas', 'eleccion', 'linea', 'riesgo'].includes(h.ref.tipo) && !['Conciliación', 'Informes'].includes(h.por))
  const VERBO = {
    'orden/aprobar': 'aprueba',
    'orden/rechazar': 'rechaza',
    'orden/escalar': 'pide aprobación de',
    'documento/contabilizar': 'contabiliza',
    'documento/aplazar': 'deja en revisión',
    'documento/revision': 'envía al fiscalista',
    'partida/ajustarCef': 'ajusta la previsión de',
    'informe/aprobar': 'aprueba el informe de',
    'borrador/marcarListo': 'revisa el borrador para',
    'borrador/descartar': 'descarta el borrador para',
    'propuesta/autorizarLlamadas': 'autoriza las llamadas',
    'propuesta/noLlamar': 'decide no llamar',
    'propuesta/elegir': 'elige proveedor de',
    'propuesta/anadirLinea': 'añade a la propuesta:',
    'riesgo/mitigar': 'cambia el plan por',
    'riesgo/reservar': 'aprueba una reserva por',
    'riesgo/aceptar': 'asume',
  }
  const NOMBRE_RIESGO = { 'RG-1': `la lluvia de la jornada ${s.mundo.rodaje.senales.lluvia.jornada}`, 'RG-5': 'las horas extra de noche' }
  const { ocupado } = useCtx()
  // Nombres legibles: las referencias internas (R1, L1…) no le dicen nada a nadie.
  const nombre = (ref) => {
    if (ref.tipo === 'riesgo') return NOMBRE_RIESGO[ref.id] ?? 'un riesgo'
    if (ref.tipo === 'llamadas') return 'las llamadas a proveedores de Itsasoa'
    if (ref.tipo === 'informe') return s.mundo.informes[ref.id]?.periodo?.etiqueta ?? ref.id
    if (ref.tipo === 'eleccion' || ref.tipo === 'linea') return (s.mundo.propuesta?.lineas ?? []).find((l) => l.id === ref.id)?.concepto?.toLowerCase() ?? 'una línea de la propuesta'
    if (ref.tipo === 'borrador') return s.mundo.borradores[ref.id]?.para ?? 'un borrador'
    return ref.id
  }
  return (
    <div>
      <p className="mb-3 text-sm text-flp-muted">Lo que espera tu decisión o la de tu equipo. Pulsa «Revisar» para ir a la tarjeta.</p>
      {ocupado && <p className="mb-3 text-xs font-medium text-flp-ink">Los agentes están trabajando: podrás revisar en cuanto terminen.</p>}
      <ListaDecisiones compacta />
      {decididas.length > 0 && (
        <>
          <h3 className="flp-kicker mb-2 mt-5 text-flp-muted">Decididas en esta sesión</h3>
          <ul className="space-y-2">
            {decididas.map((h) => (
              <li key={h.version} className="text-sm text-flp-muted">
                <strong className="font-medium text-flp-ink">{h.por}</strong> {VERBO[h.tipo] ?? 'decide'} <span className="font-medium text-flp-ink">{nombre(h.ref)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export { CASOS }

export function PanelRiesgos({ s }) {
  const altos = riesgosAltos(s.mundo).length
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AgentAvatar id="riesgos" size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-flp-ink">Riesgos de producción</p>
          <p className="text-xs text-flp-muted">{altos ? `${altos} ${altos === 1 ? 'riesgo alto abierto' : 'riesgos altos abiertos'}` : 'Sin riesgos altos abiertos'} · vigila las jornadas que quedan</p>
        </div>
        <span className="ag-etiqueta-capacidad">Exploratorio</span>
      </div>
      <RadarRiesgos compacto />
      <p className="mt-3 text-xs text-flp-muted">Plan, previsión del tiempo, convocatorias y permisos son de ejemplo.</p>
    </div>
  )
}
