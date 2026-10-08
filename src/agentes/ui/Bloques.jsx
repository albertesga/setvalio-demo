// Bloques de respuesta de los agentes. Los que reflejan una decisión (aprobación,
// cola de decisiones, informe, borrador) leen el mundo actual: si decides en una
// tarjeta, todas las vistas de esa decisión cambian a la vez.

import { useEffect, useId, useState } from 'react'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconCheck, IconClose, IconChevronRight, IconChevronDown, IconAlert, IconDownload, IconPlay, IconClock } from '../../components/icons.jsx'
import { formatear, renderTexto, fecha as fechaLarga } from '../texto.js'
import * as c from '../calculos.js'
import { puedeDecidir } from '../politicas.js'
import { AGENTES, AUTONOMIA } from '../agentes.js'
import { useCtx } from './contexto.js'
import { totalesPropuesta, capitulosPropuesta, ALTERNATIVAS_POR_ID, REQUISITOS } from '../propuesta.js'
import { decisionesAbiertas } from '../pendientes.js'
import { evaluarRiesgos, PREGUNTA } from '../rodaje.js'
import { useMovimientoReducido } from '../useAgentes.js'
import { Tx, AutonomyBadge, Tono, AgentAvatar, Desplegable, ChipSeveridad, diaCorto } from './Piezas.jsx'
import { BloqueTira, BloqueAgenda, BloqueSemana, BloqueEquipo } from './Parte.jsx'
import { PERSONAS } from '../mundo.js'

const fmt = (valor, formato) => (formato ? formatear(valor, formato) : String(valor ?? ''))

function Titulo({ children, extra }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold text-flp-ink">{children}</h4>
      {extra}
    </div>
  )
}

// ── Texto, aviso, lista ──────────────────────────────────────────────────────

function BloqueTexto({ b }) {
  return (
    <p className={b.destacado ? 'ag-prosa ag-prosa--lead' : 'ag-prosa'}>
      <Tx value={b.texto} />
    </p>
  )
}

const AVISOS_DE_ALCANCE = new Set(['exploratorio', 'porvalidar', 'fase'])

function BloqueAviso({ b, mensajeId }) {
  const { primerAviso } = useCtx()
  const [abierto, setAbierto] = useState(false)
  const etiqueta = { exploratorio: 'Exploratorio', porvalidar: 'Sin validar', fase: 'Fase posterior', aviso: 'Atención', info: 'Nota' }[b.tono] ?? 'Nota'
  const tono = { exploratorio: 'neutral', porvalidar: 'neutral', fase: 'neutral', aviso: 'atencion', info: 'info' }[b.tono] ?? 'info'
  // El aviso de alcance entero sale la primera vez; después basta la etiqueta (y el texto, si se pide).
  if (AVISOS_DE_ALCANCE.has(b.tono) && primerAviso?.[b.tono] && mensajeId && primerAviso[b.tono] !== mensajeId && !abierto) {
    return (
      <p className="ag-aviso-breve" role="note">
        <Tono tono={tono}>{etiqueta}</Tono>
        <span className="text-xs text-flp-muted">Datos de ejemplo, como se explica más arriba.</span>
        <button type="button" className="ag-link" onClick={() => setAbierto(true)}>
          Qué significa
        </button>
      </p>
    )
  }
  return (
    <div className={`ag-aviso ag-aviso--${b.tono}`} role="note">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Tono tono={tono}>
          {b.tono === 'aviso' && <IconAlert size={12} strokeWidth={2.6} aria-hidden="true" />}
          {etiqueta}
        </Tono>
        {b.titulo && b.titulo !== etiqueta && <strong className="text-sm text-flp-ink">{b.titulo}</strong>}
      </div>
      <p className="text-sm leading-relaxed text-flp-muted">
        <Tx value={b.texto} />
      </p>
    </div>
  )
}

function BloqueLista({ b }) {
  const { enviar, ocupado } = useCtx()
  const lista = (
      <ul className={b.numerada ? 'ag-lista-numerada space-y-2' : 'space-y-2'}>
        {b.items.map((it, i) =>
          it.entrada ? (
            <li key={i}>
              <button type="button" className="ag-opcion" disabled={ocupado} onClick={() => enviar(it.entrada)}>
                <Tx value={it.texto} />
                <IconChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          ) : (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-flp-muted">
              {b.numerada ? (
                <span className="ag-numero tnum" aria-hidden="true">
                  {i + 1}
                </span>
              ) : (
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-flp-control" aria-hidden="true" />
              )}
              <span>
                <Tx value={it.texto} />
              </span>
            </li>
          ),
        )}
      </ul>
  )
  if (b.plegado) {
    return (
      <div className="ag-panel ag-panel--plegable">
        <Desplegable titulo={b.titulo} resumen={`${b.items.length} pasos`} nivel={4}>
          {lista}
        </Desplegable>
      </div>
    )
  }
  return (
    <div className="ag-panel">
      <Titulo extra={b.nivel && <AutonomyBadge nivel={b.nivel} />}>{b.titulo}</Titulo>
      {lista}
    </div>
  )
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

function BloqueKpis({ b }) {
  return (
    <div className="ag-panel ag-panel--flush">
      {b.titulo && <div className="border-b border-flp-line px-4 py-2.5 text-xs font-semibold text-flp-muted">{b.titulo}</div>}
      <dl className="ag-kpis">
        {b.items.map((k) => (
          <div key={k.id} className="ag-kpi">
            <dt>{k.etiqueta}</dt>
            <dd className="tnum text-flp-ink">{fmt(k.valor, k.formato)}</dd>
            {k.antes !== undefined ? (
              <span className="ag-kpi-antes">
                antes <s className="tnum">{fmt(k.antes, k.formato)}</s>
              </span>
            ) : (
              k.sub && (
                <span className="ag-kpi-sub">
                  <Tx value={k.sub} />
                </span>
              )
            )}
          </div>
        ))}
      </dl>
    </div>
  )
}

// ── Tabla ────────────────────────────────────────────────────────────────────

function Check({ ok }) {
  if (ok === true)
    return (
      <span className="ag-check ag-check--ok">
        <IconCheck size={14} strokeWidth={2.6} aria-hidden="true" />
        <span className="sr-only">Sí</span>
      </span>
    )
  if (ok === false)
    return (
      <span className="ag-check ag-check--no">
        <IconClose size={14} strokeWidth={2.6} aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    )
  return (
    <span className="ag-check ag-check--pend">
      <span aria-hidden="true">·</span>
      <span className="sr-only">Pendiente</span>
    </span>
  )
}

function BloqueTabla({ b }) {
  const [todas, setTodas] = useState(false)
  const limite = b.visibles && !todas ? b.visibles : b.filas.length
  const filas = b.filas.slice(0, limite)
  const celda = (col, fila) => {
    const val = fila[col.id]
    if (col.formato === 'check') return <Check ok={val} />
    if (col.id === 'agente' && fila.agenteId)
      return (
        <span className="flex items-center gap-2">
          <AgentAvatar id={fila.agenteId} size={28} />
          <strong className="text-flp-ink">{val}</strong>
        </span>
      )
    const texto = fmt(val, col.formato)
    if (col.tono && typeof val === 'number') {
      const tono = val > 0.0005 ? 'text-flp-error' : val < -0.0005 ? 'text-flp-success' : 'text-flp-muted'
      return <span className={`font-semibold ${tono}`}>{texto}</span>
    }
    return texto
  }
  return (
    <div className="ag-panel ag-panel--flush">
      {b.titulo && <div className="px-4 pt-3.5 text-sm font-semibold text-flp-ink">{b.titulo}</div>}
      <div className="ag-tabla-scroll" tabIndex={0} role="region" aria-label={b.titulo || 'Tabla'}>
        <table className="ag-tabla">
          <thead>
            <tr>
              {b.columnas.map((col) => (
                <th key={col.id} scope="col" className={col.alinear === 'right' ? 'text-right' : col.alinear === 'center' ? 'text-center' : 'text-left'}>
                  {col.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className={fila.alerta ? 'is-alerta' : ''}>
                {b.columnas.map((col, i) => {
                  const Tag = i === 0 ? 'th' : 'td'
                  return (
                    <Tag key={col.id} scope={i === 0 ? 'row' : undefined} className={`${col.alinear === 'right' ? 'text-right tnum' : col.alinear === 'center' ? 'text-center' : 'text-left'} ${col.texto ? 'is-texto' : ''}`}>
                      {celda(col, fila)}
                      {i === 0 && fila.alerta && (
                        <Tono tono="negative" className="ml-2 align-middle">
                          Fuera de umbral
                        </Tono>
                      )}
                    </Tag>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {b.total && (
            <tfoot>
              <tr>
                {b.columnas.map((col, i) => {
                  const Tag = i === 0 ? 'th' : 'td'
                  return (
                    <Tag key={col.id} scope={i === 0 ? 'row' : undefined} className={col.alinear === 'right' ? 'text-right tnum' : 'text-left'}>
                      {b.total[col.id] !== undefined ? fmt(b.total[col.id], col.formato) : ''}
                    </Tag>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {b.visibles && b.filas.length > b.visibles && (
        <button type="button" className="ag-mas" onClick={() => setTodas((v) => !v)} aria-expanded={todas}>
          {todas ? 'Ver menos' : `Ver las ${b.filas.length} filas`}
          <IconChevronDown size={15} className={todas ? 'rotate-180' : ''} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// ── Desviaciones ─────────────────────────────────────────────────────────────

function chipDesviacion(x, umbral) {
  if (x.fueraRango) return <Tono tono="negative">Fuera de umbral</Tono>
  if (x.desviacionPct > 0 && x.desviacionPct > umbral * 0.75) return <Tono tono="warning">Cerca del umbral</Tono>
  if (x.desviacionPct > 0) return <Tono tono="neutral">Vigilar</Tono>
  return <Tono tono="positive">Por debajo</Tono>
}

function BloqueDesviaciones({ b }) {
  const escala = Math.max(b.umbral * 1.4, ...b.items.map((x) => Math.abs(x.desviacionPct)))
  const contenido = (
    <>
      <ul className="space-y-3">
        {b.items.map((x) => {
          const ancho = Math.min(50, (Math.abs(x.desviacionPct) / escala) * 50)
          return (
            <li key={x.id}>
              <div className="ag-desv-fila">
                <span className="ag-desv-nombre">
                  <span className="tnum text-flp-muted">{x.id}</span> {x.nombre}
                </span>
                <span className="ag-desv-barra" aria-hidden="true">
                  <span className="ag-desv-eje" />
                  <span className="ag-desv-umbral" style={{ left: `${50 + (b.umbral / escala) * 50}%` }} />
                  <span className={`ag-desv-valor ${x.desviacion > 0 ? 'is-sobre' : 'is-bajo'}`} style={x.desviacion > 0 ? { left: '50%', width: `${ancho}%` } : { right: '50%', width: `${ancho}%` }} />
                </span>
                <span className="ag-desv-cifra tnum">
                  <strong className={x.desviacion > 0 ? 'text-flp-error' : 'text-flp-success'}>{formatear(x.desviacion, 'eurSigned')}</strong>
                  <span className="text-flp-muted"> {formatear(x.desviacionPct, 'pctSigned')}</span>
                </span>
                <span className="ag-desv-chip">{chipDesviacion(x, b.umbral)}</span>
              </div>
              {x.causas?.length > 0 && (
                <ul className="ag-causas">
                  {x.causas.map((p) => (
                    <li key={p.codigo}>
                      <span>
                        <span className="tnum text-flp-muted">{p.codigo}</span> {p.nombre}
                      </span>
                      <span className="tnum font-semibold text-flp-ink">{formatear(p.desviacion, 'eurSigned')}</span>
                      {p.desviacion > 0 && <Tono tono={p.consolidada ? 'neutral' : 'info'}>{p.consolidada ? 'Consolidada' : `Prevista · quedan ${formatear(p.pendiente, 'eur')}`}</Tono>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
      {b.resumen && (
        <p className="mt-4 border-t border-flp-line pt-3 text-xs text-flp-muted">
          Sobrecostes <strong className="tnum text-flp-ink">{formatear(b.resumen.sobrecostes, 'eurSigned')}</strong> · ahorros <strong className="tnum text-flp-ink">{formatear(b.resumen.ahorros, 'eurSigned')}</strong> {b.resumen.reservas > 0 && (
            <>
              {' '}
              · reservas de riesgos <strong className="tnum text-flp-ink">{formatear(b.resumen.reservas, 'eurSigned')}</strong>
            </>
          )}{' '}
          · neto <strong className="tnum text-flp-ink">{formatear(b.resumen.neto, 'eurSigned')}</strong>
        </p>
      )}
    </>
  )
  if (b.plegado) {
    const fuera = b.items.filter((x) => x.fueraRango).length
    return (
      <div className="ag-panel ag-panel--plegable">
        <Desplegable titulo="Detalle por capítulo" resumen={`${fuera ? `${fuera} fuera del umbral del ${formatear(b.umbral, 'pct0')}` : `Umbral del ${formatear(b.umbral, 'pct0')}`} · causas y partidas`} nivel={4}>
          {contenido}
        </Desplegable>
      </div>
    )
  }
  return (
    <div className="ag-panel">
      <Titulo extra={<span className="text-xs text-flp-muted">Umbral {formatear(b.umbral, 'pct0')}</span>}>Desviación por capítulo</Titulo>
      {contenido}
    </div>
  )
}

// ── Documento ────────────────────────────────────────────────────────────────

function Confianza({ valor }) {
  if (valor == null) return <span className="text-xs text-flp-muted">Dato estructurado</span>
  const baja = valor < 0.8
  return (
    <span className="flex items-center gap-2">
      <span className="ag-meter" aria-hidden="true">
        <span className={baja ? 'is-baja' : ''} style={{ width: `${valor * 100}%` }} />
      </span>
      <span className="tnum text-xs font-semibold text-flp-ink">
        {formatear(valor, 'pct0')}
        {baja && ' · baja'}
      </span>
    </span>
  )
}

function BloqueDocumento({ b }) {
  const { mundo } = useCtx()
  const d = mundo.documentos[b.docId]
  if (!d) return null
  const conc = b.conciliacion
  return (
    <div className="ag-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-flp-muted">
            {d.tipo === 'ticket' ? 'Ticket' : 'Factura'} {d.id} · {fechaLarga(d.fecha)}
          </div>
          <div className="mt-0.5 text-base font-semibold text-flp-ink">{d.proveedor}</div>
          <div className="text-sm text-flp-muted">{d.concepto}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tono tono="neutral">{d.origen}</Tono>
          {d.estado === 'contabilizada' ? (
            <Tono tono="positive">
              <IconCheck size={12} strokeWidth={2.6} aria-hidden="true" />
              Contabilizada
            </Tono>
          ) : (
            <Tono tono="neutral">En la bandeja</Tono>
          )}
        </div>
      </div>
      <dl className="ag-importes">
        <div>
          <dt>Base</dt>
          <dd className="tnum">{formatear(d.base, 'eurCents')}</dd>
        </div>
        <div>
          <dt>
            {d.impuesto.tipo} {d.impuesto.tasa ? formatear(d.impuesto.tasa / 100, 'pct0') : ''}
          </dt>
          <dd className="tnum">{formatear(d.impuesto.importe, 'eurCents')}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd className="tnum font-semibold">{formatear(d.total, 'eurCents')}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-flp-line pt-3">
        <div className="mb-2 text-xs font-semibold text-flp-muted">Lectura de Facturas</div>
        <ul className="space-y-2">
          {b.campos.map((f) => (
            <li key={f.etiqueta} className="ag-campo">
              <span className="text-xs text-flp-muted">{f.etiqueta}</span>
              <span className="truncate text-sm font-semibold text-flp-ink">{f.formato ? formatear(f.valor, f.formato) : f.valor}</span>
              <Confianza valor={f.confianza} />
            </li>
          ))}
        </ul>
      </div>
      {conc && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-flp-line pt-3 text-sm">
          <span className="text-xs font-semibold text-flp-muted">Conciliación</span>
          {conc.resultado === 'ok' && (
            <Tono tono="positive">
              <IconCheck size={12} strokeWidth={2.6} aria-hidden="true" />
              Casa con {conc.oc}
            </Tono>
          )}
          {conc.resultado === 'sin_oc' && <Tono tono="warning">Sin pedido{d.contrato ? ' · contrato marco' : ''}</Tono>}
          {conc.resultado === 'diferencia' && <Tono tono="warning">Diferencia con {conc.oc}: {formatear(conc.diferencia, 'eurCents')}</Tono>}
          {conc.resultado === 'oc_no_aprobada' && <Tono tono="warning">{conc.oc} no está aprobado</Tono>}
        </div>
      )}
      {b.elegibilidad && (
        <div className="mt-3 border-t border-flp-line pt-3">
          <div className="mb-2 text-xs font-semibold text-flp-muted">Elegibilidad fiscal · Cumplimiento</div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {b.elegibilidad.criterios.map((cr) => (
              <li key={cr.id} className="flex items-start gap-2 text-sm">
                <Check ok={cr.ok} />
                <span>
                  <span className="font-semibold text-flp-ink">{cr.etiqueta}</span>
                  <span className="block text-xs text-flp-muted">{cr.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Aprobación ───────────────────────────────────────────────────────────────

// Estados que cierran la decisión. «Pedida a otro rol» y «en revisión» siguen abiertas.
export const ESTADO_DECISION = {
  aprobada: { etiqueta: 'Aprobada', tono: 'positive' },
  rechazada: { etiqueta: 'Rechazada', tono: 'neutral' },
  preparada: { etiqueta: 'Paquete preparado · no enviado', tono: 'info' },
  mitigado: { etiqueta: 'Plan cambiado', tono: 'positive' },
  reservado: { etiqueta: 'Reserva aprobada', tono: 'info' },
  aceptado: { etiqueta: 'Riesgo asumido', tono: 'neutral' },
  desactualizada: { etiqueta: 'La previsión ha cambiado desde esta tarjeta', tono: 'neutral' },
}
const ICONO_DECISION = { aprobada: IconCheck, mitigado: IconCheck, reservado: IconCheck, preparada: IconCheck, rechazada: IconClose, aceptado: IconClose, desactualizada: IconClock }

const MOTIVO_INFORME = {
  cifras: 'Han cambiado el gasto o el coste estimado final desde esta edición',
  decisiones: 'Han cambiado las decisiones por revisar desde esta edición',
  reservas: 'Ha cambiado la reserva de riesgos desde esta edición',
  riesgos: 'Han cambiado los riesgos altos desde esta edición',
  caja: 'Ha cambiado la previsión de caja desde esta edición',
}

export function BloqueAprobacion({ b }) {
  const { mundo, persona, decidir, ocupado, enviar, despachar } = useCtx()
  const ed = c.estadoDecision(mundo, b.ref)
  const decidida = ESTADO_DECISION[ed.estado]
  const tieneRolPropio = (a) => !a.rol || puedeDecidir(persona.rol, a.rol)
  const sinPermiso = b.acciones.some((a) => a.rol && !a.soloSinPermiso) && !b.acciones.some((a) => !a.soloSinPermiso && tieneRolPropio(a))
  const yaPedida = !!ed.escaladaA
  const visibles = b.acciones.filter((a) => (a.soloSinPermiso ? sinPermiso && !yaPedida : true))
  const etiquetaRef = renderTexto(b.titulo)
  const informeViejo = b.ref?.tipo === 'informe' ? c.motivoInformeDesactualizado(mundo, b.ref.id) : null
  // Quién decide: «Decides tú», «Decide: X» o, si las acciones son de dos roles, «Deciden: X y Y».
  const rolesAcciones = [...new Set(visibles.filter((a) => !a.soloSinPermiso && a.rol).map((a) => a.rol))]
  const quienDecide =
    rolesAcciones.length > 1
      ? `Deciden: ${rolesAcciones.map((r, i) => (i ? r.toLowerCase() : r)).join(' y ')}`
      : b.rol && puedeDecidir(persona.rol, b.rol)
        ? 'Decides tú'
        : b.rol
          ? `Decide: ${b.rol}`
          : null
  // Si otra persona de la demo puede decidir lo que esta no, se ofrece verla como ella.
  const otraPersona = Object.values(PERSONAS).find((p) => p.id !== persona.id && visibles.some((a) => !a.soloSinPermiso && a.rol && !tieneRolPropio(a) && puedeDecidir(p.rol, a.rol)))
  const lineaPermiso = !sinPermiso && visibles.some((a) => !a.soloSinPermiso && !tieneRolPropio(a))

  return (
    <section className={`ag-aprobacion ${decidida ? 'is-decidida' : ''}`} aria-label={`Decisión: ${etiquetaRef}`} data-ref={b.ref ? `${b.ref.tipo}-${b.ref.id}` : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <AgentAvatar id={b.agente} size={28} />
        <span className="text-xs font-semibold text-flp-muted">{AGENTES[b.agente]?.nombre}</span>
        {b.nivel !== 'aprueba' && <AutonomyBadge nivel={b.nivel} />}
        {quienDecide && !decidida && <Tono tono="neutral">{quienDecide}</Tono>}
      </div>
      <h4 tabIndex={-1} className="mt-3 text-base font-semibold leading-snug text-flp-ink focus:outline-none">
        <Tx value={b.titulo} />
      </h4>
      {b.subtitulo && <p className="mt-0.5 text-xs text-flp-muted">{b.subtitulo}</p>}
      {b.resumen && (
        <p className="mt-2 text-sm leading-relaxed text-flp-muted">
          <Tx value={b.resumen} />
        </p>
      )}
      {b.motivos?.length > 0 && (
        <p className="mt-2 text-sm text-flp-muted">
          Pide aprobación porque{' '}
          {b.motivos.map((m, i) => (
            <span key={i}>
              {i > 0 && ' y '}
              <Tx value={m} />
            </span>
          ))}
          .
        </p>
      )}
      {b.impacto?.length > 0 && (
        <div className="ag-impacto" role="table" aria-label="Impacto de la decisión">
          <div role="row" className="ag-impacto-cab">
            <span role="columnheader">{b.impactoTitulo ?? 'Si se aprueba'}</span>
            <span role="columnheader" className="text-right">{b.impactoColumnas?.[0] ?? 'Ahora'}</span>
            <span role="columnheader" className="text-right">{b.impactoColumnas?.[1] ?? 'Después'}</span>
          </div>
          {b.impacto.map((f) => (
            <div role="row" key={f.etiqueta} className={f.alerta ? 'is-alerta' : ''}>
              <span role="cell">{f.etiqueta}</span>
              <span role="cell" className="tnum text-right text-flp-muted">
                {formatear(f.antes, f.formato)}
              </span>
              <span role="cell" className={`tnum text-right font-semibold ${f.alerta ? 'text-flp-error' : 'text-flp-ink'}`}>
                {formatear(f.despues, f.formato)}
                {f.alerta && <span className="sr-only"> (supera el umbral)</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {b.recomendacion && (
        <p className="mt-3 text-sm font-semibold text-flp-ink">
          <Tx value={b.recomendacion} />
        </p>
      )}
      {ed.estado === 'desactualizada' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-flp-muted">
          <IconClock size={14} aria-hidden="true" />
          <span>La previsión ha cambiado desde esta tarjeta.</span>
          {b.entradaActual && (
            <button type="button" className="ag-link" disabled={ocupado} onClick={() => enviar(b.entradaActual)}>
              Ver la situación actual
            </button>
          )}
        </div>
      ) : decidida ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Tono tono={decidida.tono}>
            {(() => {
              const I = ICONO_DECISION[ed.estado]
              return I ? <I size={12} strokeWidth={2.6} aria-hidden="true" /> : null
            })()}
            {b.ref?.tipo === 'llamadas' && ed.estado === 'rechazada' ? 'Sin llamadas · lo pides tú' : decidida.etiqueta}
          </Tono>
          {ed.por && <span className="text-xs text-flp-muted">por {ed.por}</span>}
          {ed.importe !== undefined && ed.importe !== null && <span className="text-xs text-flp-muted tnum">· {formatear(ed.importe, 'eur')}</span>}
        </div>
      ) : informeViejo ? (
        <div className="mt-4">
          <p className="text-sm text-flp-muted">{MOTIVO_INFORME[informeViejo] ?? 'Algo ha cambiado desde esta edición'}: regenera el informe para aprobar la versión al día.</p>
          <FilmpilotButton className="mt-2" variant="secondary" disabled={ocupado} onClick={() => enviar('Regenera el informe semanal de coste')}>
            Regenerar el informe
          </FilmpilotButton>
        </div>
      ) : (
        <>
          {ed.reservaActual !== undefined && (
            <div className="mt-4">
              <Tono tono="info">Reserva aprobada ahora: {formatear(ed.reservaActual, 'eur')}</Tono>
            </div>
          )}
          {(yaPedida || ed.aplazado) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {yaPedida && <Tono tono="info">Pendiente de {ed.escaladaA}{ed.por ? ` · pedido por ${ed.por}` : ''}</Tono>}
              {ed.aplazado && <Tono tono="neutral">En revisión{ed.por ? ` · ${ed.por}` : ''}</Tono>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {visibles.map((a) => {
              const permitido = a.soloSinPermiso || tieneRolPropio(a)
              return (
                <FilmpilotButton
                  key={a.id}
                  variant={a.variante === 'primary' && permitido ? 'primary' : 'secondary'}
                  size="md"
                  disabled={!permitido || ocupado}
                  onClick={() => decidir(a.accion, `${etiquetaRef} → ${a.etiqueta}`)}
                  title={a.detalle ? renderTexto(a.detalle) : undefined}
                >
                  {a.etiqueta}
                </FilmpilotButton>
              )
            })}
          </div>
          {lineaPermiso && (
            <p className="mt-2 text-xs text-flp-muted">
              Como {persona.rol.toLowerCase()} puedes {visibles.filter((a) => !a.soloSinPermiso && tieneRolPropio(a)).map((a) => a.etiqueta.toLowerCase()).join(' o ')}; {visibles.filter((a) => !a.soloSinPermiso && !tieneRolPropio(a)).map((a) => a.etiqueta.toLowerCase()).join(' y ')} lo decide {visibles.find((a) => !a.soloSinPermiso && !tieneRolPropio(a)).rol.toLowerCase()}.
            </p>
          )}
          {sinPermiso && (
            <p className="mt-2 text-xs text-flp-muted">
              Como {persona.rol.toLowerCase()} no puedes decidir esto: lo decide {b.rol.toLowerCase()}. {yaPedida ? 'Ya está pedido.' : 'Puedes pedir su aprobación.'}
            </p>
          )}
          {otraPersona && (sinPermiso || lineaPermiso) && (
            <FilmpilotButton className="mt-2" size="sm" variant="ghost" disabled={ocupado} onClick={() => despachar({ tipo: 'persona', persona: otraPersona.id })}>
              Decidir como {otraPersona.nombre} ({otraPersona.rol.toLowerCase()})
            </FilmpilotButton>
          )}
          {visibles.some((a) => a.detalle) && (
            <p className="mt-2 text-xs text-flp-muted">
              {visibles
                .filter((a) => a.detalle)
                .map((a) => (
                  <span key={a.id}>
                    {a.etiqueta}: <Tx value={a.detalle} />.
                  </span>
                ))}
            </p>
          )}
          {ocupado && <p className="mt-2 text-xs text-flp-muted">Los agentes están trabajando: podrás decidir en cuanto terminen.</p>}
        </>
      )}
      {/* La nota no repite lo que ya dice la línea de permisos. */}
      {b.nota && !(lineaPermiso && !decidida) && <p className="mt-2 text-xs text-flp-muted">{b.nota}</p>}
    </section>
  )
}

// ── Cola de decisiones (en directo) ────────────────────────────────────────────

export { decisionesAbiertas }

const CAPACIDAD_DECISION = { riesgo: 'Exploratorio', propuesta: 'Sin validar' }

/** Si la tarjeta ya está en la conversación y sigue abierta, «Revisar» lleva a ella en vez de repetir el trabajo. */
export function irATarjeta(ref) {
  if (!ref) return false
  const tarjetas = document.querySelectorAll(`.ag-aprobacion[data-ref="${ref.tipo}-${ref.id}"]:not(.is-decidida)`)
  const t = tarjetas[tarjetas.length - 1]
  if (!t) return false
  // Tras cerrar una hoja, el foco vuelve a su botón: se espera a que termine antes de moverlo.
  setTimeout(() => {
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    t.scrollIntoView({ block: 'center', behavior: reducido ? 'auto' : 'smooth' })
    t.querySelector('h4')?.focus({ preventScroll: true })
  }, 60)
  return true
}

export function ListaDecisiones({ filtro, onElegir }) {
  const { mundo, enviar, ocupado } = useCtx()
  const ex = decisionesAbiertas(mundo).filter(filtro ?? (() => true))
  if (!ex.length) return <p className="text-sm text-flp-muted">Nada por revisar.</p>
  return (
    <ul className="ag-decisiones">
      {ex.map((e) => (
        <li key={e.id}>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-flp-ink">{e.titulo}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-flp-muted">
              <span>
                {AUTONOMIA[e.nivel]?.etiqueta} · Decide: {e.rol.toLowerCase()}
                {e.aplazado ? ' · en revisión' : ''}
              </span>
              {CAPACIDAD_DECISION[e.tipo] && <span className="ag-etiqueta-capacidad">{CAPACIDAD_DECISION[e.tipo]}</span>}
            </div>
            {e.importe > 0 && <div className="tnum text-xs text-flp-muted">{e.tipo === 'propuesta' ? `Ahorro ${formatear(e.importe, 'eur')}` : e.tipo === 'riesgo' ? `Reserva propuesta ${formatear(e.importe, 'eur')}` : formatear(e.importe, e.importe % 1 ? 'eurCents' : 'eur')}</div>}
          </div>
          <button
            type="button"
            className="ag-boton-fila"
            disabled={ocupado}
            aria-label={`Revisar: ${e.titulo}`}
            onClick={() => {
              onElegir?.()
              if (!irATarjeta(e.ref)) enviar(e.entrada)
            }}
          >
            Revisar <IconChevronRight size={15} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function BloqueDecisiones() {
  const { mundo } = useCtx()
  const n = decisionesAbiertas(mundo).length
  return (
    <div className="ag-panel">
      <Titulo extra={<span className="text-xs text-flp-muted">Excepciones · en directo</span>}>{n ? `Por revisar (${n})` : 'Por revisar'}</Titulo>
      <ListaDecisiones />
    </div>
  )
}

// ── Informe ──────────────────────────────────────────────────────────────────

function BloqueInforme({ b }) {
  const { mundo, avisar, onNavigate, enviar } = useCtx()
  const inf = mundo.informes[b.id]
  if (!inf) return null
  const desact = c.informeDesactualizado(mundo, b.id)
  const t = inf.totales
  const r = inf.resumen
  return (
    <article className="ag-informe" aria-label={`Informe semanal de coste, ${inf.periodo.etiqueta}`}>
      <header className="ag-informe-cab">
        <div>
          <span>Informe semanal de coste</span>
          <strong>
            {mundo.proyecto.titulo} · {inf.periodo.etiqueta} · {inf.periodo.fechas}
          </strong>
        </div>
        {inf.estado === 'aprobado' ? (
          <Tono tono="positive">
            <IconCheck size={12} strokeWidth={2.6} aria-hidden="true" />
            Aprobado{inf.aprobadoPor ? ` por ${inf.aprobadoPor}` : ''}
          </Tono>
        ) : desact ? (
          <Tono tono="atencion">Desactualizado</Tono>
        ) : (
          <Tono tono="neutral">Borrador · por revisar</Tono>
        )}
      </header>
      <h4 className="ag-informe-titular">
        Coste estimado final <span className="tnum">{formatear(t.desviacion, 'eurSigned')}</span> sobre presupuesto ({formatear(t.desviacionPct, 'pctSigned')}).{' '}
        {r.capitulos[0] && r.capitulos[0].desviacion > 0 ? (
          <>
            La <em>mayor presión</em>, en {r.capitulos[0].nombre}.
          </>
        ) : (
          'Ningún capítulo por encima del plan.'
        )}
      </h4>
      <dl className="ag-informe-cifras">
        {[
          ['Presupuesto', t.presupuesto],
          ['Gastado', t.gastado],
          ['Comprometido', t.comprometido],
          ['Coste estimado final', t.cef],
        ].map(([k, val]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="tnum">{formatear(val, 'eur')}</dd>
          </div>
        ))}
      </dl>
      <div className="ag-informe-secciones">
        <section>
          <h5>Desviaciones</h5>
          <ul>
            {r.capitulos.map((x) => (
              <li key={x.id}>
                <span>
                  {x.id} {x.nombre}
                </span>
                <span className="tnum">
                  {formatear(x.desviacion, 'eurSigned')} ({formatear(x.desviacionPct, 'pctSigned')})
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h5>Para decidir esta semana</h5>
          <ul>
            <li>
              <span>Decisiones de coste por revisar (sin riesgos de rodaje)</span>
              <span className="tnum">{formatear(r.decisiones, 'num')}</span>
            </li>
            <li>
              <span>De ellas, piden aprobación</span>
              <span className="tnum">{formatear(r.conAprobacion, 'num')}</span>
            </li>
            <li>
              <span>{r.vencimiento.documento}</span>
              <span className="tnum">vence {fechaLarga(r.vencimiento.deadline)}</span>
            </li>
            <li>
              <span>Caja mínima · {r.cajaMinima.semana}</span>
              <span className="tnum">{formatear(r.cajaMinima.saldo, 'eur')}</span>
            </li>
            {r.reservas > 0 && (
              <li>
                <span>Reservas de riesgos (exploratorio)</span>
                <span className="tnum">{formatear(r.reservas, 'eur')}</span>
              </li>
            )}
            {r.riesgosAltos?.map((x) => (
              <li key={x.id}>
                <span>
                  Riesgo alto (exploratorio, datos de ejemplo): <Tx value={x.titulo} />
                </span>
                <span>abierto</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {desact && (
        <div className="ag-informe-aviso">
          <span>{MOTIVO_INFORME[c.motivoInformeDesactualizado(mundo, b.id)] ?? 'Algo ha cambiado desde esta edición'}.</span>
          <button type="button" className="ag-link" onClick={() => enviar('Regenera el informe semanal de coste')}>
            Regenerar
          </button>
        </div>
      )}
      <footer className="ag-informe-pie">
        <span>
          Redactado por Informes · edición {inf.edicion} · corte {fechaLarga(mundo.corte.fecha)}
        </span>
        <div className="flex flex-wrap gap-2">
          <FilmpilotButton size="md" variant="secondary" icon={IconDownload} onClick={() => avisar('Demo: la descarga del informe no está disponible.')}>
            Descargar (no disponible en la demo)
          </FilmpilotButton>
        </div>
      </footer>
    </article>
  )
}

// ── Borrador ─────────────────────────────────────────────────────────────────

function BloqueBorrador({ b }) {
  const { mundo, decidir, avisar, ocupado, despachar } = useCtx()
  const uid = useId()
  const bor = mundo.borradores[b.id]
  // Las ediciones se guardan en el mundo: otro mensaje con el mismo borrador las ve.
  const [asunto, setAsunto] = useState(() => (bor ? bor.textoAsunto ?? renderTexto(bor.asunto) : ''))
  const [cuerpo, setCuerpo] = useState(() => (bor ? bor.textoCuerpo ?? [...bor.cuerpo.map(renderTexto), bor.firma].join('\n\n') : ''))
  if (!bor) return null
  const guardar = () => despachar({ tipo: 'editarBorrador', id: b.id, asunto, cuerpo })
  const cerrado = bor.estado !== 'borrador'
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`${asunto}\n\n${cuerpo}`)
      avisar('Texto copiado.')
    } catch {
      avisar('No se ha podido copiar el texto.')
    }
  }
  return (
    <section className="ag-panel" aria-label={`Borrador para ${bor.para}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AutonomyBadge nivel="propone" />
          <span className="text-xs text-flp-muted">Borrador · {bor.canal === 'email' ? 'correo' : bor.canal}</span>
        </div>
        {bor.estado === 'listo' && <Tono tono="positive">Revisado{bor.listoPor ? ` por ${bor.listoPor}` : ''} · no enviado</Tono>}
        {bor.estado === 'descartado' && <Tono tono="neutral">Descartado</Tono>}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 flex-none text-flp-muted">Para</dt>
          <dd className="font-semibold text-flp-ink">{bor.para}</dd>
        </div>
      </dl>
      <label className="mt-3 block text-xs font-semibold text-flp-muted" htmlFor={`${uid}-asunto`}>
        Asunto
      </label>
      <input id={`${uid}-asunto`} className="flp-input mt-1 w-full px-3 text-[16px] sm:text-sm" value={asunto} onChange={(e) => setAsunto(e.target.value)} onBlur={guardar} disabled={cerrado} />
      <label className="mt-3 block text-xs font-semibold text-flp-muted" htmlFor={`${uid}-cuerpo`}>
        Mensaje
      </label>
      <textarea id={`${uid}-cuerpo`} className="flp-input mt-1 min-h-[180px] w-full px-3 py-2 text-[16px] leading-relaxed sm:text-sm" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} onBlur={guardar} disabled={cerrado} />
      {cuerpo.includes('[') && !cerrado && (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-flp-ink">
          <IconAlert size={13} aria-hidden="true" /> Completa los campos entre corchetes antes de enviarlo.
        </p>
      )}
      <p className="mt-3 rounded-flp-sm bg-flp-bg px-3 py-2 text-xs text-flp-muted">
        {bor.canal === 'email' ? 'En la demo no se envía nada: copia el texto y envíalo tú desde tu correo.' : 'En la demo no se envía nada: copia el texto y mándalo tú por el canal del equipo.'}
      </p>
      {!cerrado && (
        <div className="mt-3 flex flex-wrap gap-2">
          <FilmpilotButton variant="primary" disabled={ocupado} onClick={() => decidir({ tipo: 'borrador/marcarListo', id: b.id, asunto, cuerpo }, `Marcar como revisado · ${bor.para}`)}>
            Marcar como revisado
          </FilmpilotButton>
          <FilmpilotButton variant="secondary" onClick={copiar}>
            Copiar texto
          </FilmpilotButton>
          <FilmpilotButton variant="ghost" disabled={ocupado} onClick={() => decidir({ tipo: 'borrador/descartar', id: b.id }, `Descartar borrador · ${bor.para}`)}>
            Descartar
          </FilmpilotButton>
        </div>
      )}
    </section>
  )
}

// ── Checklist del dossier ────────────────────────────────────────────────────

function BloqueChecklist({ b }) {
  return (
    <div className="ag-panel">
      <Titulo>{b.titulo}</Titulo>
      <ul className="divide-y divide-flp-line">
        {b.items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-flp-ink">{it.documento}</div>
              <div className="text-xs text-flp-muted">
                {it.responsable} · {it.evidencia}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`tnum text-xs font-semibold ${it.dias <= 7 ? 'text-flp-error' : 'text-flp-muted'}`}>
                vence {fechaLarga(it.deadline)} · {formatear(it.dias, 'dias')}
              </span>
              <Tono tono="negative">
                <IconAlert size={12} strokeWidth={2.6} aria-hidden="true" />
                {it.estado}
              </Tono>
            </div>
          </li>
        ))}
      </ul>
      {b.nota && <p className="mt-3 border-t border-flp-line pt-3 text-xs text-flp-muted">{b.nota}</p>}
    </div>
  )
}

// ── Caja ─────────────────────────────────────────────────────────────────────

function BloqueCaja({ b }) {
  const [tabla, setTabla] = useState(false)
  const max = Math.max(...b.semanas.map((s) => Math.abs(s.saldo)), Math.abs(b.saldoHoy))
  return (
    <div className="ag-panel">
      <Titulo
        extra={
          <button type="button" className="ag-link" onClick={() => setTabla((v) => !v)} aria-pressed={tabla}>
            {tabla ? 'Ver gráfico' : 'Ver como tabla'}
          </button>
        }
      >
        Saldo previsto por semana
      </Titulo>
      {tabla ? (
        <div className="ag-tabla-scroll" tabIndex={0} role="region" aria-label="Saldo previsto por semana">
          <table className="ag-tabla">
            <thead>
              <tr>
                <th scope="col" className="text-left">Semana</th>
                <th scope="col" className="text-right">Cobros</th>
                <th scope="col" className="text-right">Pagos</th>
                <th scope="col" className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {b.semanas.map((s) => (
                <tr key={s.semana} className={s.saldo < 0 ? 'is-alerta' : ''}>
                  <th scope="row" className="text-left">
                    {s.semana} <span className="font-normal text-flp-muted">{s.fechas}</span>
                  </th>
                  <td className="tnum text-right">{formatear(s.cobros, 'eur')}</td>
                  <td className="tnum text-right">{formatear(s.pagos, 'eur')}</td>
                  <td className={`tnum text-right font-semibold ${s.saldo < 0 ? 'text-flp-error' : 'text-flp-ink'}`}>{formatear(s.saldo, 'eur')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="ag-caja" aria-label={`Saldo de hoy ${formatear(b.saldoHoy, 'eur')}. Mínimo ${formatear(b.minimo.saldo, 'eur')} en ${b.minimo.semana}.`}>
          {b.semanas.map((s) => {
            const h = (Math.abs(s.saldo) / max) * 100
            return (
              <li key={s.semana} className={s.saldo < 0 ? 'is-negativa' : ''}>
                <span className="ag-caja-valor tnum">{formatear(s.saldo, 'eur')}</span>
                <span className="ag-caja-zona">
                  <span className="ag-caja-barra" style={s.saldo >= 0 ? { bottom: '50%', height: `${h / 2}%` } : { top: '50%', height: `${h / 2}%` }} />
                  {s.antes !== undefined && <span className="ag-caja-antes" style={s.antes >= 0 ? { bottom: `${50 + ((s.antes / max) * 100) / 2}%` } : { top: `${50 + ((Math.abs(s.antes) / max) * 100) / 2}%` }} title={`Antes ${formatear(s.antes, 'eur')}`} />}
                </span>
                <span className="ag-caja-semana">{s.semana}</span>
              </li>
            )
          })}
        </ol>
      )}
      <p className="mt-3 text-xs text-flp-muted">
        Saldo hoy <strong className="tnum text-flp-ink">{formatear(b.saldoHoy, 'eur')}</strong>. Las semanas en negativo van en rojo y con su cifra.
        {b.semanas.some((s) => s.antes !== undefined) && ' La marca indica el saldo antes de tu decisión.'}
      </p>
    </div>
  )
}

// ── Acciones ───────────────────────────────────────────────────────

function BloqueAcciones({ b }) {
  const { enviarEntrada, ocupado } = useCtx()
  return (
    <div className="ag-panel flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-flp-muted">
        <Tx value={b.texto} />
      </p>
      <div className="flex flex-wrap gap-2">
        {b.acciones.map((a) => (
          <FilmpilotButton key={a.id} variant="secondary" icon={IconPlay} disabled={ocupado} onClick={() => enviarEntrada(a.entrada)}>
            {a.etiqueta}
          </FilmpilotButton>
        ))}
      </div>
    </div>
  )
}

// ── Propuesta de presupuesto ─────────────────────────────────────────────────

function FormularioCoste({ onCerrar }) {
  const { mundo, decidir, ocupado } = useCtx()
  const uid = useId()
  const [concepto, setConcepto] = useState('')
  const [partida, setPartida] = useState('06.02')
  const [proveedor, setProveedor] = useState('')
  const [importe, setImporte] = useState('')
  const [sustituye, setSustituye] = useState(true)
  const valor = Number(String(importe).replace(/\./g, '').replace(',', '.'))
  const valido = concepto.trim() && valor > 0
  const enviarForm = (e) => {
    e.preventDefault()
    if (!valido || ocupado) return
    decidir({ tipo: 'propuesta/anadirLinea', linea: { concepto: concepto.trim(), partida, proveedor: proveedor.trim(), importe: valor }, sustituyeEstimado: sustituye }, `Añadir «${concepto.trim()}» · ${formatear(valor, 'eur')}`)
    onCerrar()
  }
  return (
    <form className="ag-form-coste" onSubmit={enviarForm}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-flp-muted" htmlFor={`${uid}-c`}>
          Concepto
          <input id={`${uid}-c`} className="flp-input mt-1 w-full px-3 text-[16px] sm:text-sm" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej.: Dron, 2 jornadas" />
        </label>
        <label className="block text-xs font-semibold text-flp-muted" htmlFor={`${uid}-p`}>
          Partida
          <select id={`${uid}-p`} className="flp-input mt-1 w-full px-2 text-[16px] sm:text-sm" value={partida} onChange={(e) => setPartida(e.target.value)}>
            {mundo.capitulos.map((cap) => (
              <optgroup key={cap.id} label={`${cap.id} ${cap.nombre}`}>
                {cap.partidas.map((cod) => (
                  <option key={cod} value={cod}>
                    {cod} {mundo.partidas[cod].nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-flp-muted" htmlFor={`${uid}-v`}>
          Proveedor con el que has hablado
          <input id={`${uid}-v`} className="flp-input mt-1 w-full px-3 text-[16px] sm:text-sm" value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Opcional" />
        </label>
        <label className="block text-xs font-semibold text-flp-muted" htmlFor={`${uid}-i`}>
          Importe sin IVA (€)
          <input id={`${uid}-i`} className="flp-input tnum mt-1 w-full px-3 text-[16px] sm:text-sm" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="3.200" />
        </label>
      </div>
      <label className="mt-3 flex min-h-[44px] items-center gap-2 text-sm text-flp-ink">
        <input type="checkbox" className="h-5 w-5 accent-flp-carbon" checked={sustituye} onChange={(e) => setSustituye(e.target.checked)} />
        Sale de lo estimado por detallar en su capítulo
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <FilmpilotButton type="submit" variant="primary" disabled={!valido || ocupado}>
          Añadir a la propuesta
        </FilmpilotButton>
        <FilmpilotButton type="button" variant="ghost" onClick={onCerrar}>
          Cancelar
        </FilmpilotButton>
      </div>
    </form>
  )
}

function BloquePropuesta({ b }) {
  const { mundo } = useCtx()
  const p = mundo.propuesta
  const tot = totalesPropuesta(mundo)
  const caps = capitulosPropuesta(mundo)
  const [form, setForm] = useState(!!b.abrirFormulario)
  const [verEstimados, setVerEstimados] = useState(false)
  const conLineas = caps.filter((c) => c.lineas.length)
  const soloEstimados = caps.filter((c) => !c.lineas.length)
  const estimadoResto = soloEstimados.reduce((a, c) => a + c.porDetallar, 0)
  return (
    <article className="ag-propuesta" aria-label={`Propuesta de presupuesto de ${p.proyecto.titulo}`}>
      <header className="ag-propuesta-cab">
        <div>
          <span>Propuesta de presupuesto</span>
          <strong>
            {p.proyecto.titulo} · {p.proyecto.productora}
          </strong>
          <small>
            En desarrollo · edición {p.version} · objetivo {formatear(tot.objetivo, 'eur')}
          </small>
        </div>
        <Tono tono={tot.diferencia > 0 ? 'warning' : 'positive'}>
          {tot.diferencia > 0 ? `${formatear(tot.diferencia, 'eurSigned')} sobre el objetivo` : tot.diferencia < 0 ? `${formatear(-tot.diferencia, 'eur')} por debajo del objetivo` : 'En el objetivo'}
        </Tono>
      </header>
      <div className="ag-propuesta-total">
        <span>Total</span>
        <strong className="tnum">{formatear(tot.total, 'eur')}</strong>
        <span className="text-flp-muted">
          detallado {formatear(tot.detallado, 'eur')} · estimado {formatear(tot.estimado, 'eur')}
        </span>
      </div>
      <ul className="ag-propuesta-caps">
        {conLineas.map((cap) => (
          <li key={cap.id}>
            <div className="ag-propuesta-cap">
              <span>
                <span className="tnum text-flp-muted">{cap.id}</span> {cap.nombre}
              </span>
              <strong className="tnum">{formatear(cap.total, 'eur')}</strong>
            </div>
            <ul className="ag-propuesta-lineas">
              {cap.lineas.map((l) => (
                <li key={l.id}>
                  <div className="min-w-0">
                    <span className="font-semibold text-flp-ink">{l.concepto}</span>
                    {l.detalle && <span className="text-flp-muted"> · {l.detalle}</span>}
                    <span className="block text-xs text-flp-muted">
                      {l.proveedor} · <span className={l.origen === 'Confirmado por teléfono' ? 'font-semibold text-flp-success' : ''}>{l.origen}</span>
                      {l.anterior && <> · antes {l.anterior.proveedor}, <s className="tnum">{formatear(l.anterior.importe, 'eur')}</s></>}
                    </span>
                  </div>
                  <span className="tnum font-semibold text-flp-ink">{formatear(l.importe, 'eur')}</span>
                </li>
              ))}
              {cap.porDetallar > 0 && (
                <li className="is-estimado">
                  <span>Resto del capítulo, estimado por detallar</span>
                  <span className="tnum">{formatear(cap.porDetallar, 'eur')}</span>
                </li>
              )}
            </ul>
          </li>
        ))}
        <li>
          <button type="button" className="ag-propuesta-cap is-boton" onClick={() => setVerEstimados((x) => !x)} aria-expanded={verEstimados}>
            <span>
              {soloEstimados.length} capítulos aún sin detallar <span className="text-flp-muted">· estimados por el reparto ICAA</span>
            </span>
            <strong className="tnum">{formatear(estimadoResto, 'eur')}</strong>
            <IconChevronDown size={16} className={verEstimados ? 'rotate-180' : ''} aria-hidden="true" />
          </button>
          {verEstimados && (
            <ul className="ag-propuesta-lineas">
              {soloEstimados.map((cap) => (
                <li key={cap.id} className="is-estimado">
                  <span>
                    <span className="tnum">{cap.id}</span> {cap.nombre}
                  </span>
                  <span className="tnum">{formatear(cap.porDetallar, 'eur')}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
      {form ? (
        <FormularioCoste onCerrar={() => setForm(false)} />
      ) : (
        <button type="button" className="ag-boton-fila mt-3" onClick={() => setForm(true)}>
          + Añadir un coste
        </button>
      )}
    </article>
  )
}

// ── Llamada a un proveedor ───────────────────────────────────────────────────

// Llamadas que ya se han reproducido: al volver a pintarlas se enseñan enteras.
const llamadasVistas = new Set()

function BloqueLlamada({ b }) {
  const { mundo } = useCtx()
  const reducido = useMovimientoReducido()
  const a = ALTERNATIVAS_POR_ID[b.altId]
  const r = mundo.propuesta.llamadas[b.altId]
  const total = a?.llamada?.guion.length ?? 0
  const [abierta, setAbierta] = useState(!b.plegada || llamadasVistas.has(b.altId))
  const [n, setN] = useState(() => (llamadasVistas.has(b.altId) || reducido ? total : 0))
  useEffect(() => {
    if (!abierta) return
    if (n >= total) {
      llamadasVistas.add(b.altId)
      return
    }
    const id = setTimeout(() => setN((x) => x + 1), n === 0 ? 800 : 1000)
    return () => clearTimeout(id)
  }, [n, total, b.altId, abierta])
  if (!a || !r) return null
  if (!abierta) {
    return (
      <section className="ag-llamada" aria-label={`Llamada a ${a.proveedor}`}>
        <header className="ag-llamada-cab">
          <AgentAvatar id="proveedores" size={32} />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-flp-ink">Llamada a {a.proveedor}</h4>
            <p className="text-xs text-flp-muted">
              {r.cumple ? `Confirma ${formatear(r.precioFinal, 'eur')} y cumple los requisitos` : `No cumple: ${r.motivo}`} · {a.llamada.duracion}
            </p>
          </div>
          <Tono tono={r.cumple ? 'positive' : 'warning'}>{r.cumple ? 'Cumple' : 'No cumple'}</Tono>
        </header>
        <button type="button" className="ag-boton-fila mt-3" onClick={() => setAbierta(true)}>
          <IconPlay size={14} aria-hidden="true" /> Ver cómo fue la llamada
        </button>
      </section>
    )
  }
  const linea = mundo.propuesta.lineas.find((l) => l.id === a.linea)
  const visibles = a.llamada.guion.slice(0, n)
  const confirmados = {}
  for (const [, , conf] of visibles) if (conf) Object.assign(confirmados, conf)
  const terminada = n >= total
  const estado = terminada ? `Terminada · ${a.llamada.duracion}` : 'Reproduciendo la llamada'
  return (
    <section className="ag-llamada" aria-label={`Llamada a ${a.proveedor}`}>
      <header className="ag-llamada-cab">
        <AgentAvatar id="proveedores" size={32} trabajando={!terminada} />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-flp-ink">Llamada a {a.proveedor}</h4>
          <p className="text-xs text-flp-muted">
            {linea.concepto} · alternativa a {linea.anterior?.proveedor ?? linea.proveedor} · simulada: no se llama a nadie
          </p>
        </div>
        <Tono tono={terminada ? (r.cumple ? 'positive' : 'warning') : 'info'}>
          {!terminada && <span className="ag-onda" aria-hidden="true"><i /><i /><i /></span>}
          {estado}
        </Tono>
      </header>
      <p className="ag-llamada-meta">Llama desde el número de Gau Films · se presenta como asistente automático · graba solo con permiso · no reserva ni negocia</p>
      <div className="ag-llamada-cuerpo">
        <ol className="ag-transcripcion" aria-label="Transcripción">
          {visibles.map(([quien, txt], i) => (
            <li key={i} className={`is-${quien}`}>
              {quien !== 'sistema' && <span className="ag-transcripcion-quien">{quien === 'agente' ? 'Agente de Proveedores' : a.proveedor}</span>}
              <p>{txt}</p>
            </li>
          ))}
          {!terminada && (
            <li className="is-sistema">
              <span className="ag-puntos" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </li>
          )}
        </ol>
        <div className="ag-llamada-lado">
          <h5>Requisitos</h5>
          <ul>
            {linea.requisitos.map((req) => (
              <li key={req}>
                <Check ok={confirmados[req] === undefined ? null : confirmados[req]} />
                <span>{REQUISITOS[req]}</span>
              </li>
            ))}
          </ul>
          {terminada && (
            <div className={`ag-llamada-resultado ${r.cumple ? 'is-ok' : 'is-ko'}`}>
              <span className="text-xs font-semibold text-flp-muted">Precio final confirmado</span>
              <strong className="tnum">{formatear(r.precioFinal, 'eur')}</strong>
              <span className="text-xs text-flp-muted">
                Tarifa {formatear(a.referencia, 'eur')}
                {r.extras.map((e) => ` + ${e.concepto.toLowerCase()} ${formatear(e.importe, 'eur')}`).join('')}
              </span>
              <span className="mt-1 text-sm font-semibold text-flp-ink">{r.cumple ? 'Cumple todos los requisitos' : `No cumple: ${r.motivo}`}</span>
            </div>
          )}
        </div>
      </div>
      {!terminada && (
        <button type="button" className="ag-link" onClick={() => setN(total)}>
          <IconPlay size={14} aria-hidden="true" /> Ver la transcripción completa
        </button>
      )}
    </section>
  )
}

// ── Riesgos de producción ────────────────────────────────────────────────────

export { ChipSeveridad }

export const ESTADO_RIESGO = { aviso: 'Aviso preparado · sin enviar', reservado: 'Reserva aprobada', mitigado: 'Plan cambiado', aceptado: 'Asumido · sigue vigilado' }

/** Radar en directo: lee el mundo actual, así que cambia con cada novedad o decisión. */
export function RadarRiesgos({ compacto = false }) {
  const { mundo, enviar, ocupado } = useCtx()
  const riesgos = evaluarRiesgos(mundo)
  return (
    <ul className="ag-radar">
      {riesgos.map((r) => (
        <li key={r.id} className={`ag-radar-item is-${r.severidad}`}>
          <div className="flex flex-wrap items-center gap-2">
            <ChipSeveridad severidad={r.severidad} />
            <span className="text-xs font-semibold text-flp-muted">{r.tipo}</span>
            {ESTADO_RIESGO[r.estado] && (
              <span className="text-xs font-semibold text-flp-ink">
                · {ESTADO_RIESGO[r.estado]}
                {r.estado === 'reservado' && r.reservaAprobada ? ` ${formatear(r.reservaAprobada, 'eur')}` : ''}
                {r.reservaCorta ? ` · se queda corta (${formatear(r.reserva, 'eur')})` : ''}
              </span>
            )}
          </div>
          <strong className="mt-1 block text-sm text-flp-ink">
            <Tx value={r.titulo} />
          </strong>
          <span className="block text-xs text-flp-muted">
            {r.jornadas.length > 1 ? `Jornadas ${r.jornadas.join(' y ')}` : `Jornada ${r.jornadas[0]}`} · {fechaLarga(r.fecha)} · {r.dias === 1 ? 'mañana' : `en ${formatear(r.dias, 'dias')}`}
            {r.probabilidad != null && ` · lluvia ${formatear(r.probabilidad, 'pct0')}`}
            {r.exposicion != null && r.exposicion > 0 && ` · si ocurre, hasta ${formatear(r.exposicion, 'eur')}`}
            {r.exposicion == null && ' · impacto por estimar'}
          </span>
          {!compacto && (
            <p className="mt-1 text-sm text-flp-muted">
              <Tx value={r.respuesta} />
            </p>
          )}
          <button type="button" className="ag-link" disabled={ocupado} onClick={() => enviar(PREGUNTA[r.id])} aria-label={`${r.aviso && r.estado === 'abierto' ? 'Preparar aviso' : 'Ver qué propone'}: ${renderTexto(r.titulo)}`}>
            {r.aviso && r.estado === 'abierto' ? 'Preparar aviso' : 'Ver qué propone'} <IconChevronRight size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function BloqueRiesgos() {
  return (
    <div className="ag-panel">
      <Titulo extra={<span className="text-xs text-flp-muted">Riesgos de producción · en directo</span>}>Riesgos de las próximas jornadas</Titulo>
      <RadarRiesgos />
    </div>
  )
}

function BloquePlan() {
  const { mundo } = useCtx()
  const riesgos = evaluarRiesgos(mundo)
  const marca = {}
  for (const r of riesgos) for (const n of r.jornadas) if (!marca[n] || (SEVERIDAD_ORDEN[r.severidad] ?? 9) < (SEVERIDAD_ORDEN[marca[n].severidad] ?? 9)) marca[n] = r
  const semanas = [...new Set(mundo.rodaje.jornadas.map((j) => j.semana))]
  const js = mundo.rodaje.jornadas
  const altos = riesgos.filter((r) => r.severidad === 'alta').length
  const medios = riesgos.filter((r) => r.severidad === 'media').length
  const resumen = `Jornadas ${js[0].n} a ${js[js.length - 1].n} · ${altos} ${altos === 1 ? 'riesgo alto' : 'riesgos altos'} y ${medios} ${medios === 1 ? 'medio' : 'medios'} · plan de ejemplo`
  return (
    <div className="ag-panel ag-panel--plegable">
      <Desplegable titulo="Calendario de las próximas jornadas" resumen={resumen} nivel={4}>
      {semanas.map((sem) => (
        <section key={sem} className="mt-3 first:mt-0" aria-label={sem}>
          <h5 className="mb-1.5 text-xs font-semibold text-flp-muted">{sem}</h5>
          <ol className="ag-plan">
            {mundo.rodaje.jornadas
              .filter((j) => j.semana === sem)
              .map((j) => {
                const r = marca[j.n]
                return (
                  <li key={j.n} className={`ag-plan-dia ${r ? `is-${r.severidad}` : ''} ${j.n === mundo.proyecto.diaActual ? 'is-hoy' : ''}`}>
                    <span className="ag-plan-n tnum">
                      J{j.n} · {diaCorto(j.fecha)}
                      {j.n === mundo.proyecto.diaActual && <strong> · hoy</strong>}
                    </span>
                    <span className="min-w-0">
                      <span className="ag-plan-loc">{j.localizacion}</span>
                      <span className="block text-xs text-flp-muted">
                        {j.tipo === 'EXT' ? 'Exterior' : 'Interior'} · {j.franja.toLowerCase()}
                      </span>
                    </span>
                    {r ? <ChipSeveridad severidad={r.severidad} /> : <span aria-hidden="true" />}
                  </li>
                )
              })}
          </ol>
        </section>
      ))}
      </Desplegable>
    </div>
  )
}

const SEVERIDAD_ORDEN = { alta: 0, media: 1, baja: 2, controlado: 3 }

const REGISTRO = {
  texto: BloqueTexto,
  aviso: BloqueAviso,
  lista: BloqueLista,
  kpis: BloqueKpis,
  tabla: BloqueTabla,
  desviaciones: BloqueDesviaciones,
  documento: BloqueDocumento,
  aprobacion: BloqueAprobacion,
  decisiones: BloqueDecisiones,
  informe: BloqueInforme,
  borrador: BloqueBorrador,
  checklist: BloqueChecklist,
  caja: BloqueCaja,
  acciones: BloqueAcciones,
  propuesta: BloquePropuesta,
  llamada: BloqueLlamada,
  riesgos: BloqueRiesgos,
  plan: BloquePlan,
  tira: BloqueTira,
  agenda: BloqueAgenda,
  semana: BloqueSemana,
  equipo: BloqueEquipo,
}

export function Bloque({ b, mensajeId }) {
  const C = REGISTRO[b.tipo]
  return C ? <C b={b} mensajeId={mensajeId} /> : null
}

/** Una tarjeta de aprobación sigue esperando decisión. */
export function aprobacionPendiente(mundo, b) {
  return b.tipo === 'aprobacion' && !ESTADO_DECISION[c.estadoDecision(mundo, b.ref).estado]
}
