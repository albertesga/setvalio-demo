// Paneles laterales: agentes, casos de uso, actividad y decisiones.

import { Modal } from '../../components/ui.jsx'
import { IconCheck, IconPlay, IconPause } from '../../components/icons.jsx'
import { AGENTES, ORDEN_AGENTES, AUTONOMIA } from '../agentes.js'
import { CASOS } from '../casos.js'
import { EVENTOS } from '../sesion.js'
import * as c from '../calculos.js'
import { fechaCorta } from '../texto.js'
import { useCtx } from './contexto.js'
import { Tx, AgentTile, AutonomyBadge, Tono } from './Piezas.jsx'
import { ListaDecisiones, decisionesAbiertas } from './Bloques.jsx'

// Qué agente sostiene cada tipo de decisión pendiente.
const AGENTE_DE_EXCEPCION = { confianza: 'facturas', sin_pedido: 'conciliacion', fiscal: 'cumplimiento', orden: 'costes', prevision: 'prevision', propuesta: 'proveedores' }

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

export function AgentRail({ estados, onAbrir, compacto = false }) {
  return (
    <ul className={compacto ? 'flex flex-col items-center gap-1.5' : 'space-y-0.5'}>
      {ORDEN_AGENTES.map((id) => {
        const a = AGENTES[id]
        const e = estados[id]
        const trabajando = e.estado === 'trabajando'
        return (
          <li key={id}>
            <button type="button" className={`ag-agente ${compacto ? 'is-compacto' : ''} ${trabajando ? 'is-working' : ''}`} onClick={() => onAbrir(id)} aria-label={compacto ? `${a.nombre}: ${trabajando ? 'trabajando' : e.espera ? `${e.espera} decisiones pendientes` : 'disponible'}` : undefined} title={compacto ? a.nombre : undefined}>
              <AgentTile id={id} size={32} trabajando={trabajando} esperando={!trabajando && e.espera > 0} />
              {!compacto && (
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-bold text-ink">{a.nombre}</span>
                  <span className="block truncate text-xs text-muted">
                    {trabajando ? (
                      <>
                        <span className="font-semibold text-info">Trabajando · </span>
                        <Tx value={e.detalle} />
                      </>
                    ) : e.espera ? (
                      <span className="font-semibold text-warning">
                        {e.espera} {e.espera === 1 ? 'decisión espera' : 'decisiones esperan'} a una persona
                      </span>
                    ) : (
                      'Disponible'
                    )}
                  </span>
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function DetalleAgente({ id, onCerrar }) {
  const { enviar } = useCtx()
  const a = id ? AGENTES[id] : null
  const casos = a ? CASOS.filter((x) => x.agentes.includes(id)).slice(0, 3) : []
  return (
    <Modal open={!!a} onClose={onCerrar} title={a?.nombre ?? ''} subtitle={a?.rol} width="max-w-lg">
      {a && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <AgentTile id={id} size={48} />
            <p className="text-sm leading-relaxed text-muted">{a.hace}</p>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold text-muted">Cómo actúa</h4>
            <ul className="space-y-2">
              {a.niveles.map((n) => (
                <li key={n} className="flex items-start gap-3">
                  <AutonomyBadge nivel={n} />
                  <span className="text-sm text-muted">{AUTONOMIA[n].descripcion}</span>
                </li>
              ))}
            </ul>
          </div>
          {casos.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold text-muted">Pídele algo</h4>
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
    </Modal>
  )
}

const ETIQUETA_CAPACIDAD = { exploratoria: 'Exploratorio', posterior: 'Fase posterior', propuesta: 'Por validar' }

export function CasosTracker({ vistos }) {
  const { enviar, ocupado } = useCtx()
  const n = CASOS.filter((x) => vistos.includes(x.id)).length
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-muted">Casos de uso</h2>
        <span className="tnum text-xs font-semibold text-ink">
          {n} de {CASOS.length} vistos
        </span>
      </div>
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
      <span className="tnum w-12 flex-none pt-1 text-xs text-muted">{it.previa ? fechaCorta(it.fecha) : it.hora}</span>
      {it.agente ? (
        <AgentTile id={it.agente} size={28} />
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
        <p className="text-sm leading-snug text-ink">
          {it.agente && <strong>{AGENTES[it.agente].nombre} · </strong>}
          <Tx value={it.texto} />
        </p>
        {it.salida && (
          <p className="mt-0.5 text-xs text-muted">
            <Tx value={it.salida} />
          </p>
        )}
        {(it.autonomia || it.evento) && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {it.evento && <Tono tono="info">Novedad</Tono>}
            {it.autonomia && it.autonomia !== 'ejecuta' ? <AutonomyBadge nivel={it.autonomia} /> : it.autonomia === 'ejecuta' ? <AutonomyBadge nivel="ejecuta" /> : null}
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
          {s.tour ? 'Pausado durante el recorrido' : enDirecto ? 'En directo' : 'Entradas en pausa'}
        </span>
        <div className="flex gap-1.5">
          <button type="button" className="ag-boton-fila" aria-pressed={s.eventosPausados} onClick={() => despachar({ tipo: 'pausarEventos', valor: !s.eventosPausados })}>
            {s.eventosPausados ? <IconPlay size={14} aria-hidden="true" /> : <IconPause size={14} aria-hidden="true" />}
            {s.eventosPausados ? 'Reanudar' : 'Pausar'}
          </button>
        </div>
      </div>
      {quedan > 0 && (
        <div className="mb-4 rounded-lg border border-dashed border-line-strong px-3 py-2.5 text-xs text-muted">
          {s.mensajes.some((m) => m.rol === 'agentes')
            ? `Quedan ${quedan} ${quedan === 1 ? 'novedad' : 'novedades'} de ejemplo por llegar mientras conversas.`
            : 'Cuando empieces a conversar irán llegando facturas y solicitudes de ejemplo.'}
          <button type="button" className="ag-link ml-1" disabled={ocupado} onClick={() => despachar({ tipo: 'simularEvento' })}>
            Traer la siguiente ahora
          </button>
        </div>
      )}
      {sesion.length > 0 && (
        <>
          <h3 className="mb-1 text-xs font-bold text-muted">Esta sesión</h3>
          <ul className="mb-4">
            {sesion.map((it) => (
              <ItemActividad key={it.id} it={it} />
            ))}
          </ul>
        </>
      )}
      <h3 className="mb-1 text-xs font-bold text-muted">Antes de entrar</h3>
      <ul>
        {previas.map((it) => (
          <ItemActividad key={it.id} it={it} />
        ))}
      </ul>
    </div>
  )
}

export function PanelDecisiones({ s }) {
  const decididas = [...s.mundo.historial].reverse().filter((h) => h.por && h.ref && ['orden', 'documento', 'revision', 'cef', 'informe', 'borrador', 'llamadas', 'eleccion', 'linea'].includes(h.ref.tipo) && !['Conciliación', 'Informes'].includes(h.por))
  const VERBO = {
    'orden/aprobar': 'aprueba',
    'orden/rechazar': 'rechaza',
    'orden/escalar': 'pide aprobación de',
    'documento/contabilizar': 'contabiliza',
    'documento/aplazar': 'deja en revisión',
    'documento/revision': 'envía al fiscalista',
    'partida/ajustarCef': 'ajusta la previsión de',
    'informe/aprobar': 'aprueba el informe',
    'borrador/marcarListo': 'revisa el borrador',
    'borrador/descartar': 'descarta el borrador',
    'propuesta/autorizarLlamadas': 'autoriza las llamadas',
    'propuesta/noLlamar': 'decide no llamar',
    'propuesta/elegir': 'elige proveedor para',
    'propuesta/anadirLinea': 'añade a la propuesta',
  }
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold text-muted">Pendientes</h3>
      <ListaDecisiones compacta />
      {decididas.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-xs font-bold text-muted">Decididas en esta sesión</h3>
          <ul className="space-y-2">
            {decididas.map((h) => (
              <li key={h.version} className="text-sm text-muted">
                <strong className="text-ink">{h.por}</strong> {VERBO[h.tipo] ?? 'decide'} <span className="font-semibold text-ink">{h.ref.id}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export { CASOS }
