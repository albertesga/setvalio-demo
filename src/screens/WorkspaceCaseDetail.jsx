import { useEffect, useRef } from 'react'
import { AgentesCtx } from '../agentes/ui/contexto.js'
import { Bloque, bloquePrincipal } from '../agentes/ui/Bloques.jsx'
import { CONVERSACIONES_POR_ID } from '../agentes/casos.js'
import { PERSONAS } from '../agentes/mundo.js'
import { fecha, renderTexto } from '../agentes/texto.js'
import { IconArrowLeft, IconClock, IconFacturas } from '../components/icons.jsx'
import '../agentes/agentes.css'
import './WorkspaceCaseDetail.css'

// Reopening a received event should show its current state, without receiving it twice.
const PREGUNTA_RECIBIDA = {
  'EV-01': '¿Qué gastos tengo que revisar?',
  'EV-02': 'Revisa la compra OC-104 del Hotel NH',
}

export default function WorkspaceCaseDetail({
  detail,
  mundo,
  revision = mundo?.version,
  onEntry,
  onAction,
  onEditBorrador,
  onBack,
  onRefresh,
  onNavigate,
  onNotice,
}) {
  const titleRef = useRef(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [detail?.id])

  if (!detail?.turno || !mundo) return <section className="ws-case-detail ws-case-empty">
    <IconFacturas size={26} />
    <h1>Elige un recorrido</h1>
    <p>Abre un caso para consultar su análisis, documentos y decisiones en el escritorio.</p>
    <button className="ws-case-button" onClick={onBack}>Ver recorridos</button>
  </section>

  const { turno } = detail
  const blocks = turno.bloques ?? []
  const outdated = detail.version != null && detail.version !== revision
  const principal = bloquePrincipal(mundo, blocks)
  const proposal = turno.proyecto ?? null
  const project = proposal ?? mundo.proyecto
  const title = renderTexto(detail.title ?? turno.titulo ?? 'Detalle del recorrido')
  const entry = (value) => onEntry(typeof value === 'string' ? { tipo: 'texto', texto: value } : value)
  const openConversation = (id) => {
    const conversation = CONVERSACIONES_POR_ID[id]
    if (!conversation) return onNotice?.('Este recorrido no está disponible.')
    const opening = conversation.apertura
    if (opening.tipo === 'evento' && !mundo.entrantes.includes(opening.eventoId)) {
      entry(PREGUNTA_RECIBIDA[opening.eventoId] ?? conversation.titulo)
    } else entry(opening)
  }
  const context = {
    mundo,
    persona: PERSONAS.marta,
    ocupado: false,
    enviar: entry,
    enviarEntrada: entry,
    decidir: onAction,
    preguntarA: entry,
    abrirConversacion: openConversation,
    irATarjeta: () => false,
    conversacion: CONVERSACIONES_POR_ID[detail.caseId] ?? null,
    onNavigate,
    avisar: (text) => onNotice?.(text),
    eventosPausados: true,
    deshacible: null,
    despachar: (action) => {
      if (action.tipo === 'editarBorrador') onEditBorrador?.({ id: action.id, asunto: action.asunto, cuerpo: action.cuerpo })
      else if (action.tipo === 'enviar') entry(action.entrada)
      else if (action.tipo === 'persona') onNotice?.('Este recorrido se está revisando como Marta Cobo, producción ejecutiva.')
    },
  }

  return <section className="ws-case-detail" aria-labelledby="ws-case-title">
    <header className="ws-case-header">
      <button className="ws-case-back" onClick={onBack}><IconArrowLeft size={16} /> Volver a los recorridos</button>
      <div className="ws-case-heading-row">
        <h1 id="ws-case-title" ref={titleRef} tabIndex={-1}>{title}</h1>
        {!outdated && <button className="ws-case-button" onClick={onRefresh}>Actualizar</button>}
      </div>
      <p className="ws-case-project"><strong>{project.titulo}</strong>{project.productora && <span> · {project.productora}</span>}{proposal && <span> · En desarrollo</span>}</p>
      <p className="ws-case-cut">Datos al {fecha(mundo.corte.fecha)}{detail.hora && ` · Preparado a las ${detail.hora}`} · Datos de ejemplo</p>
    </header>
    {outdated ? <div className="ws-case-stale" role="status">
      <IconClock size={22} />
      <div><h2>Los datos han cambiado</h2><p>Actualiza este análisis para ver las cifras y decisiones vigentes.</p><button className="ws-case-button ws-case-button-primary" onClick={onRefresh}>Actualizar análisis</button></div>
    </div> : <AgentesCtx.Provider value={context}>
      <div className="ws-case-blocks">
        {blocks.map((block, index) => <div className="ws-case-block" key={`${detail.id}-${block.clave ?? index}`}><Bloque b={block} mensajeId={detail.id} principal={block.clave === principal} /></div>)}
      </div>
      {(turno.fuentes?.length > 0 || turno.reglas?.length > 0 || turno.noHecho?.length > 0) && <details className="ws-case-evidence">
        <summary>Fuentes y criterios del análisis</summary>
        {turno.fuentes?.length > 0 && <div><h2>Fuentes</h2><ul>{turno.fuentes.map((source, index) => <li key={index}>{renderTexto(source)}</li>)}</ul></div>}
        {turno.reglas?.length > 0 && <div><h2>Criterios</h2><ul>{turno.reglas.map((rule, index) => <li key={index}>{renderTexto(rule)}</li>)}</ul></div>}
        {turno.noHecho?.length > 0 && <div><h2>Alcance</h2><ul>{turno.noHecho.map((limit, index) => <li key={index}>{renderTexto(limit)}</li>)}</ul></div>}
      </details>}
    </AgentesCtx.Provider>}
  </section>
}
