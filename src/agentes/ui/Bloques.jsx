// Bloques de respuesta de los agentes. Los que reflejan una decisión (aprobación,
// cola de decisiones, informe, borrador) leen el mundo actual: si decides en una
// tarjeta, todas las vistas de esa decisión cambian a la vez.

import { useId, useState } from 'react'
import { Button } from '../../components/ui.jsx'
import { IconCheck, IconClose, IconChevronRight, IconChevronDown, IconAlert, IconDownload } from '../../components/icons.jsx'
import { formatear, renderTexto, fecha as fechaLarga } from '../texto.js'
import * as c from '../calculos.js'
import { puedeDecidir } from '../politicas.js'
import { AGENTES } from '../agentes.js'
import { useCtx } from './contexto.js'
import { Tx, AutonomyBadge, Tono, AgentTile } from './Piezas.jsx'

const fmt = (valor, formato) => (formato ? formatear(valor, formato) : String(valor ?? ''))

function Titulo({ children, extra }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-extrabold text-ink">{children}</h4>
      {extra}
    </div>
  )
}

// ── Texto, aviso, lista ──────────────────────────────────────────────────────

function BloqueTexto({ b }) {
  return (
    <p className="ag-prosa">
      <Tx value={b.texto} />
    </p>
  )
}

function BloqueAviso({ b }) {
  const etiqueta = { exploratorio: 'Exploratorio', fase: 'Fase posterior', aviso: 'Atención', info: 'Nota' }[b.tono] ?? 'Nota'
  const tono = { exploratorio: 'neutral', fase: 'neutral', aviso: 'warning', info: 'info' }[b.tono] ?? 'info'
  return (
    <div className={`ag-aviso ag-aviso--${b.tono}`} role="note">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Tono tono={tono}>
          {b.tono === 'aviso' && <IconAlert size={12} strokeWidth={2.6} aria-hidden="true" />}
          {etiqueta}
        </Tono>
        {b.titulo && b.titulo !== etiqueta && <strong className="text-sm text-ink">{b.titulo}</strong>}
      </div>
      <p className="text-sm leading-relaxed text-muted">
        <Tx value={b.texto} />
      </p>
    </div>
  )
}

function BloqueLista({ b }) {
  const { enviar, ocupado } = useCtx()
  return (
    <div className="ag-panel">
      <Titulo extra={b.nivel && <AutonomyBadge nivel={b.nivel} />}>{b.titulo}</Titulo>
      <ul className="space-y-2">
        {b.items.map((it, i) =>
          it.entrada ? (
            <li key={i}>
              <button type="button" className="ag-opcion" disabled={ocupado} onClick={() => enviar(it.entrada)}>
                <Tx value={it.texto} />
                <IconChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          ) : (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-line-strong" aria-hidden="true" />
              <span>
                <Tx value={it.texto} />
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

function BloqueKpis({ b }) {
  return (
    <div className="ag-panel ag-panel--flush">
      {b.titulo && <div className="border-b border-line px-4 py-2.5 text-xs font-bold text-muted">{b.titulo}</div>}
      <dl className="ag-kpis">
        {b.items.map((k) => (
          <div key={k.id} className="ag-kpi">
            <dt>{k.etiqueta}</dt>
            <dd className={`tnum ${k.tono === 'warning' ? 'text-warning' : 'text-ink'}`}>{fmt(k.valor, k.formato)}</dd>
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
          <AgentTile id={fila.agenteId} size={28} />
          <strong className="text-ink">{val}</strong>
        </span>
      )
    const texto = fmt(val, col.formato)
    if (col.tono && typeof val === 'number') {
      const tono = val > 0.0005 ? 'text-negative' : val < -0.0005 ? 'text-positive' : 'text-muted'
      return <span className={`font-semibold ${tono}`}>{texto}</span>
    }
    return texto
  }
  return (
    <div className="ag-panel ag-panel--flush">
      {b.titulo && <div className="px-4 pt-3.5 text-sm font-extrabold text-ink">{b.titulo}</div>}
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
                      {i === 0 && fila.alerta && <span className="ag-chip ag-chip--negative ml-2 align-middle">Fuera de umbral</span>}
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
  return (
    <div className="ag-panel">
      <Titulo extra={<span className="text-xs text-muted">Umbral {formatear(b.umbral, 'pct0')}</span>}>Desviación por capítulo</Titulo>
      <ul className="space-y-3">
        {b.items.map((x) => {
          const ancho = Math.min(50, (Math.abs(x.desviacionPct) / escala) * 50)
          return (
            <li key={x.id}>
              <div className="ag-desv-fila">
                <span className="ag-desv-nombre">
                  <span className="tnum text-muted">{x.id}</span> {x.nombre}
                </span>
                <span className="ag-desv-barra" aria-hidden="true">
                  <span className="ag-desv-eje" />
                  <span className="ag-desv-umbral" style={{ left: `${50 + (b.umbral / escala) * 50}%` }} />
                  <span className={`ag-desv-valor ${x.desviacion > 0 ? 'is-sobre' : 'is-bajo'}`} style={x.desviacion > 0 ? { left: '50%', width: `${ancho}%` } : { right: '50%', width: `${ancho}%` }} />
                </span>
                <span className="ag-desv-cifra tnum">
                  <strong className={x.desviacion > 0 ? 'text-negative' : 'text-positive'}>{formatear(x.desviacion, 'eurSigned')}</strong>
                  <span className="text-muted"> {formatear(x.desviacionPct, 'pctSigned')}</span>
                </span>
                <span className="ag-desv-chip">{chipDesviacion(x, b.umbral)}</span>
              </div>
              {x.causas?.length > 0 && (
                <ul className="ag-causas">
                  {x.causas.map((p) => (
                    <li key={p.codigo}>
                      <span>
                        <span className="tnum text-muted">{p.codigo}</span> {p.nombre}
                      </span>
                      <span className="tnum font-semibold text-ink">{formatear(p.desviacion, 'eurSigned')}</span>
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
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Sobrecostes <strong className="tnum text-ink">{formatear(b.resumen.sobrecostes, 'eurSigned')}</strong> · ahorros <strong className="tnum text-ink">{formatear(b.resumen.ahorros, 'eurSigned')}</strong> · neto <strong className="tnum text-ink">{formatear(b.resumen.neto, 'eurSigned')}</strong>
        </p>
      )}
    </div>
  )
}

// ── Documento ────────────────────────────────────────────────────────────────

function Confianza({ valor }) {
  if (valor == null) return <span className="text-xs text-muted">Dato estructurado</span>
  const baja = valor < 0.8
  return (
    <span className="flex items-center gap-2">
      <span className="ag-meter" aria-hidden="true">
        <span className={baja ? 'is-baja' : ''} style={{ width: `${valor * 100}%` }} />
      </span>
      <span className={`tnum text-xs font-bold ${baja ? 'text-warning' : 'text-ink'}`}>{formatear(valor, 'pct0')}</span>
      {baja && <span className="sr-only">confianza baja</span>}
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
          <div className="text-xs font-semibold text-muted">
            {d.tipo === 'ticket' ? 'Ticket' : 'Factura'} {d.id} · {fechaLarga(d.fecha)}
          </div>
          <div className="mt-0.5 text-base font-extrabold text-ink">{d.proveedor}</div>
          <div className="text-sm text-muted">{d.concepto}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tono tono="neutral">{d.origen}</Tono>
          {d.estado === 'contabilizada' ? (
            <Tono tono="positive">
              <IconCheck size={12} strokeWidth={2.6} aria-hidden="true" />
              Contabilizada
            </Tono>
          ) : (
            <Tono tono="warning">En la bandeja</Tono>
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
          <dd className="tnum font-extrabold">{formatear(d.total, 'eurCents')}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-2 text-xs font-bold text-muted">Lectura de Facturas</div>
        <ul className="space-y-2">
          {b.campos.map((f) => (
            <li key={f.etiqueta} className="ag-campo">
              <span className="text-xs text-muted">{f.etiqueta}</span>
              <span className="truncate text-sm font-semibold text-ink">{f.formato ? formatear(f.valor, f.formato) : f.valor}</span>
              <Confianza valor={f.confianza} />
            </li>
          ))}
        </ul>
      </div>
      {conc && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
          <span className="text-xs font-bold text-muted">Conciliación</span>
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
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-2 text-xs font-bold text-muted">Elegibilidad fiscal · Cumplimiento</div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {b.elegibilidad.criterios.map((cr) => (
              <li key={cr.id} className="flex items-start gap-2 text-sm">
                <Check ok={cr.ok} />
                <span>
                  <span className="font-semibold text-ink">{cr.etiqueta}</span>
                  <span className="block text-xs text-muted">{cr.detalle}</span>
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
const ESTADO_DECISION = {
  aprobada: { etiqueta: 'Aprobada', tono: 'positive' },
  rechazada: { etiqueta: 'Rechazada', tono: 'neutral' },
  preparada: { etiqueta: 'Paquete preparado · no enviado', tono: 'info' },
}

export function BloqueAprobacion({ b }) {
  const { mundo, persona, decidir, ocupado, enviar } = useCtx()
  const ed = c.estadoDecision(mundo, b.ref)
  const decidida = ESTADO_DECISION[ed.estado]
  const tieneRolPropio = (a) => !a.rol || puedeDecidir(persona.rol, a.rol)
  const sinPermiso = b.acciones.some((a) => a.rol && !a.soloSinPermiso) && !b.acciones.some((a) => !a.soloSinPermiso && tieneRolPropio(a))
  const yaPedida = !!ed.escaladaA
  const visibles = b.acciones.filter((a) => (a.soloSinPermiso ? sinPermiso && !yaPedida : true))
  const etiquetaRef = renderTexto(b.titulo)
  const informeViejo = b.ref?.tipo === 'informe' && c.informeDesactualizado(mundo, b.ref.id)

  return (
    <section className={`ag-aprobacion ${decidida ? 'is-decidida' : ''}`} aria-label={`Decisión: ${etiquetaRef}`}>
      <div className="flex flex-wrap items-center gap-2">
        <AgentTile id={b.agente} size={28} />
        <span className="text-xs font-bold text-muted">{AGENTES[b.agente]?.nombre}</span>
        <AutonomyBadge nivel={b.nivel} />
        {b.rol && <Tono tono="neutral">Decide: {b.rol}</Tono>}
      </div>
      <h4 className="mt-3 text-base font-extrabold leading-snug text-ink">
        <Tx value={b.titulo} />
      </h4>
      {b.subtitulo && <p className="mt-0.5 text-xs text-muted">{b.subtitulo}</p>}
      {b.resumen && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <Tx value={b.resumen} />
        </p>
      )}
      {b.motivos?.length > 0 && (
        <p className="mt-2 text-sm text-muted">
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
            <span role="columnheader" className="text-right">Ahora</span>
            <span role="columnheader" className="text-right">Después</span>
          </div>
          {b.impacto.map((f) => (
            <div role="row" key={f.etiqueta} className={f.alerta ? 'is-alerta' : ''}>
              <span role="cell">{f.etiqueta}</span>
              <span role="cell" className="tnum text-right text-muted">
                {formatear(f.antes, f.formato)}
              </span>
              <span role="cell" className={`tnum text-right font-bold ${f.alerta ? 'text-negative' : 'text-ink'}`}>
                {formatear(f.despues, f.formato)}
                {f.alerta && <span className="sr-only"> (supera el umbral)</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {b.recomendacion && (
        <p className="mt-3 text-sm font-semibold text-ink">
          <Tx value={b.recomendacion} />
        </p>
      )}
      {decidida ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Tono tono={decidida.tono}>
            {ed.estado === 'aprobada' && <IconCheck size={12} strokeWidth={2.6} aria-hidden="true" />}
            {decidida.etiqueta}
          </Tono>
          {ed.por && <span className="text-xs text-muted">por {ed.por}</span>}
          {ed.estado === 'aprobada' && ed.importe !== undefined && <span className="text-xs text-muted tnum">· {formatear(ed.importe, 'eur')}</span>}
        </div>
      ) : informeViejo ? (
        <div className="mt-4">
          <p className="text-sm text-muted">Las cifras han cambiado desde esta edición: regenera el informe antes de aprobarlo.</p>
          <Button className="mt-2" variant="secondary" disabled={ocupado} onClick={() => enviar('Regenera el informe semanal de coste')}>
            Regenerar el informe
          </Button>
        </div>
      ) : (
        <>
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
                <Button
                  key={a.id}
                  variant={a.variante === 'primary' && permitido ? 'primary' : 'secondary'}
                  size="md"
                  disabled={!permitido || ocupado}
                  onClick={() => decidir(a.accion, `${a.etiqueta} · ${etiquetaRef}`)}
                  title={a.detalle ? renderTexto(a.detalle) : undefined}
                >
                  {a.etiqueta}
                </Button>
              )
            })}
          </div>
          {sinPermiso && (
            <p className="mt-2 text-xs text-muted">
              Como {persona.rol.toLowerCase()} no puedes decidir esta: la decide {b.rol}. {yaPedida ? 'Ya se ha pedido; cambia «Ver como» para decidir.' : 'Puedes pedir su aprobación o cambiar «Ver como».'}
            </p>
          )}
          {visibles.some((a) => a.detalle) && (
            <p className="mt-2 text-xs text-muted">
              {visibles
                .filter((a) => a.detalle)
                .map((a) => (
                  <span key={a.id}>
                    {a.etiqueta}: <Tx value={a.detalle} />.
                  </span>
                ))}
            </p>
          )}
          {ocupado && <p className="mt-2 text-xs text-muted">Los agentes están trabajando: podrás decidir en cuanto terminen.</p>}
        </>
      )}
      {b.nota && <p className="mt-2 text-xs text-muted">{b.nota}</p>}
    </section>
  )
}

// ── Cola de decisiones (en vivo) ─────────────────────────────────────────────

export function ListaDecisiones({ compacta = false }) {
  const { mundo, enviar, ocupado } = useCtx()
  const ex = c.excepciones(mundo)
  if (!ex.length) return <p className="text-sm text-muted">No hay decisiones pendientes.</p>
  return (
    <ul className="ag-decisiones">
      {ex.map((e) => (
        <li key={e.id}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <AutonomyBadge nivel={e.nivel} compacto={compacta} />
              <span className="text-xs text-muted">{e.rol}</span>
              {e.aplazado && <span className="text-xs font-semibold text-muted">· en revisión</span>}
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">{e.titulo}</div>
            <div className="tnum text-xs text-muted">{formatear(e.importe, e.importe % 1 ? 'eurCents' : 'eur')}</div>
          </div>
          <button type="button" className="ag-boton-fila" disabled={ocupado} onClick={() => enviar(e.entrada)}>
            Revisar <IconChevronRight size={15} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function BloqueDecisiones() {
  const { mundo } = useCtx()
  const n = c.excepciones(mundo).length
  return (
    <div className="ag-panel">
      <Titulo extra={<span className="text-xs text-muted">Excepciones · en vivo</span>}>{n ? `Decisiones pendientes (${n})` : 'Decisiones pendientes'}</Titulo>
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
          <Tono tono="warning">Desactualizado</Tono>
        ) : (
          <Tono tono="neutral">Borrador · pendiente de revisión</Tono>
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
              <span>Decisiones abiertas</span>
              <span className="tnum">{formatear(r.decisiones, 'num')}</span>
            </li>
            <li>
              <span>De ellas, con aprobación</span>
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
          </ul>
        </section>
      </div>
      {desact && (
        <div className="ag-informe-aviso">
          <span>Las cifras han cambiado desde esta edición.</span>
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
          <Button size="md" variant="secondary" icon={IconDownload} onClick={() => avisar('Demo: la descarga del informe no está disponible.')}>
            Descargar (no disponible en la demo)
          </Button>
          <Button size="md" variant="ghost" onClick={() => onNavigate('coste')}>
            Ver en Control de costes
          </Button>
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
          <span className="text-xs text-muted">Borrador · {bor.canal === 'email' ? 'correo' : bor.canal}</span>
        </div>
        {bor.estado === 'listo' && <Tono tono="positive">Revisado{bor.listoPor ? ` por ${bor.listoPor}` : ''} · no enviado</Tono>}
        {bor.estado === 'descartado' && <Tono tono="neutral">Descartado</Tono>}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 flex-none text-muted">Para</dt>
          <dd className="font-semibold text-ink">{bor.para}</dd>
        </div>
      </dl>
      <label className="mt-3 block text-xs font-bold text-muted" htmlFor={`${uid}-asunto`}>
        Asunto
      </label>
      <input id={`${uid}-asunto`} className="fp-input mt-1 w-full px-3 text-[16px] sm:text-sm" value={asunto} onChange={(e) => setAsunto(e.target.value)} onBlur={guardar} disabled={cerrado} />
      <label className="mt-3 block text-xs font-bold text-muted" htmlFor={`${uid}-cuerpo`}>
        Mensaje
      </label>
      <textarea id={`${uid}-cuerpo`} className="fp-input mt-1 min-h-[180px] w-full px-3 py-2 text-[16px] leading-relaxed sm:text-sm" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} onBlur={guardar} disabled={cerrado} />
      {cuerpo.includes('[') && !cerrado && <p className="mt-1 text-xs text-warning">Completa los campos entre corchetes antes de enviarlo.</p>}
      <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">En la demo no se envía nada: copia el texto y envíalo tú desde tu correo.</p>
      {!cerrado && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" disabled={ocupado} onClick={() => decidir({ tipo: 'borrador/marcarListo', id: b.id, asunto, cuerpo }, `Marcar como revisado · ${bor.para}`)}>
            Marcar como revisado
          </Button>
          <Button variant="secondary" onClick={copiar}>
            Copiar texto
          </Button>
          <Button variant="ghost" disabled={ocupado} onClick={() => decidir({ tipo: 'borrador/descartar', id: b.id }, `Descartar borrador · ${bor.para}`)}>
            Descartar
          </Button>
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
      <ul className="divide-y divide-line">
        {b.items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{it.documento}</div>
              <div className="text-xs text-muted">
                {it.responsable} · {it.evidencia}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`tnum text-xs font-semibold ${it.dias <= 7 ? 'text-negative' : 'text-muted'}`}>
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
      {b.nota && <p className="mt-3 border-t border-line pt-3 text-xs text-muted">{b.nota}</p>}
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
                    {s.semana} <span className="font-normal text-muted">{s.fechas}</span>
                  </th>
                  <td className="tnum text-right">{formatear(s.cobros, 'eur')}</td>
                  <td className="tnum text-right">{formatear(s.pagos, 'eur')}</td>
                  <td className={`tnum text-right font-bold ${s.saldo < 0 ? 'text-negative' : 'text-ink'}`}>{formatear(s.saldo, 'eur')}</td>
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
      <p className="mt-3 text-xs text-muted">
        Saldo hoy <strong className="tnum text-ink">{formatear(b.saldoHoy, 'eur')}</strong>. Las semanas en negativo van en rojo y con su cifra.
        {b.semanas.some((s) => s.antes !== undefined) && ' La marca indica el saldo antes de tu decisión.'}
      </p>
    </div>
  )
}

// ── Acciones y enlaces ───────────────────────────────────────────────────────

function BloqueAcciones({ b }) {
  const { enviarEntrada, ocupado } = useCtx()
  return (
    <div className="ag-panel flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        <Tx value={b.texto} />
      </p>
      <div className="flex flex-wrap gap-2">
        {b.acciones.map((a) => (
          <Button key={a.id} variant="accent" disabled={ocupado} onClick={() => enviarEntrada(a.entrada)}>
            {a.etiqueta}
          </Button>
        ))}
      </div>
    </div>
  )
}

function BloqueEnlace({ b }) {
  const { onNavigate } = useCtx()
  return (
    <button type="button" className="ag-enlace" onClick={() => onNavigate(b.ruta, b.contexto)}>
      {b.etiqueta} <span className="text-xs font-semibold text-muted">· demo clásica</span>
      <IconChevronRight size={16} aria-hidden="true" />
    </button>
  )
}

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
  enlace: BloqueEnlace,
}

export function Bloque({ b }) {
  const C = REGISTRO[b.tipo]
  return C ? <C b={b} /> : null
}
