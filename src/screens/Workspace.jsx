import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FilmpilotLogo, FilmpilotSymbol } from '../brand/Filmpilot.jsx'
import { IconPanel, IconCoste, IconFacturas, IconChat, IconClose, IconPlus, IconCheck, IconArrowUp, IconChevronDown } from '../components/icons.jsx'
import { crearDemo, reducirDemo } from '../demo/model.js'
import { CASES, accionesDeTurno } from '../demo/cases.js'
import WorkspaceDashboard from './WorkspaceDashboard.jsx'
import WorkspaceCaseDetail from './WorkspaceCaseDetail.jsx'
import './Workspace.css'

// The two surfaces share one in-memory demo; changing view never resets decisions.
let estado
const oyentes = new Set()
const obtener = () => (estado ??= crearDemo())
const suscribir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn) }
function enviar(accion) {
  const siguiente = reducirDemo(obtener(), accion)
  if (siguiente === estado) return
  estado = siguiente
  oyentes.forEach((fn) => fn())
}

const SECCIONES = [
  { id: 'casos', texto: 'Casos de uso', Icon: IconChat },
  { id: 'resumen', texto: 'Resumen', Icon: IconPanel },
  { id: 'presupuesto', texto: 'Presupuesto', Icon: IconCoste },
  { id: 'documentos', texto: 'Documentos', Icon: IconFacturas },
]

function Lectura() {
  return <span className="wa-read" aria-label="Leído"><IconCheck size={14} /><IconCheck size={14} /></span>
}

function WhatsApp({ s, onDesktop, onClose, draft, setDraft, onSend, onEntry, busy }) {
  const scrollRef = useRef(null)
  const [adjuntar, setAdjuntar] = useState(false)
  const [nuevos, setNuevos] = useState(false)
  const anclado = useRef(true)
  useEffect(() => {
    const el = scrollRef.current
    if (anclado.current && el) el.scrollTop = el.scrollHeight
    else setNuevos(true)
  }, [s.mensajes.length, busy])
  const alFinal = () => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    anclado.current = true
    setNuevos(false)
  }
  const mandar = (texto) => { anclado.current = true; onSend(texto) }
  return <section className="wa-window" aria-label="Conversación de WhatsApp con FilmPilot">
    <header className="wa-header">
      <span className="wa-avatar"><FilmpilotSymbol size={25} /></span>
      <div className="wa-contact"><h2>FilmPilot</h2><span>{busy ? 'escribiendo…' : 'Asistente de producción'}</span></div>
      <button className="wa-desktop-link" onClick={() => onDesktop({ section: 'resumen' })} title="Consultar el escritorio"><IconPanel size={20} /><span className="sr-only">Consultar el escritorio</span></button>
      <button className="wa-close" onClick={onClose} aria-label="Cerrar WhatsApp"><IconClose size={20} /></button>
    </header>
    <div className="wa-scroll" ref={scrollRef} onScroll={() => {
      const el = scrollRef.current
      anclado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 65
      if (anclado.current) setNuevos(false)
    }}>
      <div className="wa-date">2 de junio de 2026</div>
      <p className="wa-notice">Vista simulada de WhatsApp. Los mensajes y archivos de esta demo no se envían.</p>
      <div className="wa-messages" role="log" aria-live="polite" aria-relevant="additions text">
        {s.mensajes.map((m) => {
          const propia = m.rol === 'usuario'
          const acciones = m.turno ? accionesDeTurno(m.turno, s.mundo) : []
          const obsoleto = m.detailId && s.detalles[m.detailId]?.version !== s.revision
          const boton = (a) => <button key={a.id} disabled={a.disabled || busy || (obsoleto && a.entrada.tipo === 'accion')} title={obsoleto && a.entrada.tipo === 'accion' ? 'Actualiza el análisis en el escritorio antes de decidir.' : a.motivo || a.grupo || undefined} onClick={() => { anclado.current = true; onEntry(a.entrada, m.caseId, m.detailId, a.etiqueta) }}>{a.etiqueta}{a.grupo && (a.ref?.tipo === 'borrador' || acciones.filter(x => x.etiqueta === a.etiqueta).length > 1) && <small className="wa-action-context">{a.grupo}</small>}</button>
          const resuelta = m.decision === 'ticket' ? s.mundo.documentos['G-004'].estado !== 'en_bandeja' : m.decision === 'hotel' ? s.mundo.ordenes['OC-104'].estado !== 'Pendiente' : false
          return <article key={m.id} className={`wa-bubble ${propia ? 'wa-out' : 'wa-in'}`} aria-label={propia ? 'Tú' : 'FilmPilot'}>
            {m.adjunto && <button className="wa-attachment" onClick={() => onDesktop({ section: 'documentos', docId: m.adjunto })}>
              <span className="wa-file-icon"><IconFacturas size={25} /></span><span><strong>Ticket ferretería</strong><small>G-004 · Documento de ejemplo</small></span>
            </button>}
            <p>{m.texto}</p>
            {m.destino && <button className="wa-detail" onClick={() => onDesktop(m.destino)}>Ver en escritorio</button>}
            {acciones.length > 0 && <div className="wa-actions">{acciones.slice(0, 3).map(boton)}{acciones.length > 3 && <details className="wa-more"><summary>Más opciones ({acciones.length - 3})</summary>{acciones.slice(3).map(boton)}</details>}</div>}
            {obsoleto && acciones.some(a => a.entrada.tipo === 'accion') && <small className="wa-stale">Datos actualizados después de este mensaje. Revisa el análisis antes de decidir.</small>}
            {m.acciones?.length > 0 && <div className="wa-actions">{m.acciones.map(a => <button key={a.id} disabled={resuelta || busy} onClick={() => { anclado.current = true; enviar({ tipo: 'decidir', id: a.id }) }}>{a.etiqueta}</button>)}{resuelta && <span className="wa-resolved"><IconCheck size={14} /> Decisión registrada</span>}</div>}
            <footer><time>{m.hora}</time>{propia && <Lectura />}</footer>
          </article>
        })}
        {busy && <div className="wa-typing" role="status" aria-label="FilmPilot está escribiendo"><span /><span /><span /></div>}
      </div>
    </div>
    {nuevos && <button className="wa-new" onClick={alFinal}>Mensajes nuevos <IconChevronDown size={16} /></button>}
    <div className="wa-bottom">
      {adjuntar && <div className="wa-attach-menu"><strong>Probar un adjunto</strong><p>Usaremos el ticket de ferretería de la demo.</p><button onClick={() => { anclado.current = true; enviar({ tipo: 'ticket' }); setAdjuntar(false) }}><IconFacturas size={19} /> Enviar ticket de ejemplo</button></div>}
      <form className="wa-composer" onSubmit={(e) => { e.preventDefault(); mandar(draft) }}>
        <button type="button" className="wa-add" aria-label="Adjuntar documento de ejemplo" aria-expanded={adjuntar} disabled={busy} onClick={() => setAdjuntar(!adjuntar)}><IconPlus size={23} /></button>
        <label className="sr-only" htmlFor="wa-message">Escribe a FilmPilot</label>
        <input id="wa-message" value={draft} maxLength={1200} onChange={e => setDraft(e.target.value)} placeholder="Escribe un mensaje" autoComplete="off" />
        <button type="submit" className="wa-send" aria-label="Enviar mensaje" disabled={!draft.trim() || busy}><IconArrowUp size={22} /></button>
      </form>
      <div className="wa-suggestions" aria-label="Mensajes de ejemplo">
        {(s.sugerencias.length ? s.sugerencias : ['Dossier diario', 'Informe semanal', 'Crear presupuesto']).slice(0, 3).map(item => { const text = typeof item === 'string' ? item : item.texto; return <button key={text} disabled={busy} onClick={() => mandar(text)}>{typeof item === 'string' ? item : item.etiqueta ?? text}</button> })}
      </div>
    </div>
  </section>
}

export default function Workspace({ onNavigate }) {
  const s = useSyncExternalStore(suscribir, obtener, obtener)
  const [section, setSection] = useState('casos')
  const [view, setView] = useState('ambos')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [reset, setReset] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [notice, setNotice] = useState('')
  const detail = s.detalles[selectedDetail ?? s.detalleActual]
  const proposal = section === 'caso' ? detail?.turno?.proyecto : null
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!selectedDocument) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [section, selectedDocument])
  useEffect(() => {
    const previous = document.title
    document.title = 'FilmPilot · Escritorio y WhatsApp'
    return () => { document.title = previous }
  }, [])
  const preguntar = (texto) => {
    if (!texto?.trim() || busy) return
    setDraft('')
    setBusy(true)
    // A short, bounded pause signals a reply without implying a live connection.
    timer.current = setTimeout(() => { enviar({ tipo: 'preguntar', texto: texto.trim() }); setBusy(false) }, 550)
  }
  const onAsk = (text) => {
    setView('ambos')
    preguntar(text)
  }
  const onDesktop = ({ section: target = 'resumen', docId, detailId } = {}) => {
    setSection(target)
    setSelectedDocument(docId ?? null)
    setSelectedDetail(detailId ?? null)
    setView(window.matchMedia('(min-width: 1250px)').matches ? 'ambos' : 'escritorio')
  }
  const abrirCaso = (id) => {
    if (!id || busy) return
    enviar({ tipo: 'caso', id })
    setSelectedDetail(null)
    setSection('caso')
    setView('ambos')
    setNotice('')
  }
  const onEntry = (entrada, caseId = detail?.caseId, sourceDetail = detail?.id, etiqueta) => {
    if (busy) return
    enviar({ tipo: 'motor', entrada, caseId, sourceDetail, etiqueta })
    setSelectedDetail(null)
    setSection('caso')
    setNotice('')
  }
  return <div className={`workspace flp-theme workspace--${view}`}>
    <div className="workspace-demo-bar">
      <div className="workspace-case-picker"><label htmlFor="workspace-case">Probar un caso</label><select id="workspace-case" value={s.casoActivo ?? ''} disabled={busy} onChange={e => abrirCaso(e.target.value)}><option value="" disabled>Elige un recorrido</option>{CASES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
      <div className="workspace-mode" aria-label="Superficies de la demo">
        <button aria-pressed={view === 'escritorio'} onClick={() => setView('escritorio')}><IconPanel size={16} /> Escritorio</button>
        <button aria-pressed={view === 'ambos'} onClick={() => setView('ambos')}><IconChat size={16} /> <span className="mode-wide">Escritorio + </span>WhatsApp</button>
      </div>
      <a href="?vista=agentes" onClick={e => { e.preventDefault(); onNavigate('agentes') }}>Demo anterior</a>
    </div>
    <div className="workspace-body">
      <aside className="workspace-sidebar">
        <button className="workspace-logo" onClick={() => onNavigate('landing')} aria-label="Ir a la portada de FilmPilot"><FilmpilotLogo width={139} /></button>
        <div className="workspace-production"><span className="workspace-project-mark"><FilmpilotSymbol size={23} /></span><div><strong>La última función</strong><span>Candilejas Films</span></div></div>
        <nav aria-label="Navegación del escritorio">{SECCIONES.map(({ id, texto, Icon }) => <button key={id} aria-current={section === id || (id === 'casos' && section === 'caso') ? 'page' : undefined} onClick={() => onDesktop({ section: id })}><Icon size={19} />{texto}</button>)}</nav>
        <div className="workspace-sidebar-bottom">
          <div className="workspace-channel"><IconChat size={19} /><p>La conversación,<br /><strong>en WhatsApp.</strong></p><button onClick={() => setView('ambos')}>Abrir conversación</button></div>
          <button className="workspace-reset" onClick={() => setReset(!reset)}>Reiniciar demo</button>
          {reset && <div className="workspace-reset-confirm"><p>Se borrarán las decisiones y mensajes de esta sesión.</p><button onClick={() => { clearTimeout(timer.current); setBusy(false); enviar({ tipo: 'reiniciar' }); setReset(false); setSelectedDetail(null); setSelectedDocument(null); setSection('casos') }}>Reiniciar</button><button onClick={() => setReset(false)}>Cancelar</button></div>}
          <div className="workspace-person"><span>MC</span><div><strong>Marta Cobo</strong><small>Producción ejecutiva</small></div></div>
        </div>
      </aside>
      <div className="workspace-desktop">
        <header className="workspace-project-header"><div><span>{proposal?.titulo ?? 'La última función'}</span><span className="workspace-stage">{proposal ? 'En desarrollo' : 'En rodaje'}</span></div><span>{proposal ? proposal.productora : `Jornada ${s.mundo.proyecto.diaActual} de ${s.mundo.proyecto.diasRodaje}`}</span></header>
        <main id="workspace-main">
          {notice && <p className="workspace-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Cerrar aviso"><IconClose size={16} /></button></p>}
          {section === 'casos' ? <section className="workspace-cases"><span className="workspace-eyebrow">Demo interactiva · Datos de ejemplo</span><h1>Del mensaje a la decisión.</h1><p>Los casos de tu día a día, en una conversación con FilmPilot. Consulta cada análisis y sus documentos en el escritorio.</p><div className="workspace-case-list">{CASES.map((c, i) => <button key={c.id} onClick={() => abrirCaso(c.id)} disabled={busy}><span className="workspace-case-number">0{i + 1}</span><span><strong>{c.title}</strong><span>{c.description}</span></span><span className="workspace-case-arrow" aria-hidden="true">↗</span></button>)}</div></section> : section === 'caso' ? <WorkspaceCaseDetail detail={detail} mundo={s.mundo} revision={s.revision} onEntry={onEntry} onAction={(accion, etiqueta) => onEntry({ tipo: 'accion', accion }, detail?.caseId, detail?.id, etiqueta)} onEditBorrador={value => enviar({ tipo: 'editarBorrador', ...value, detailId: detail?.id })} onBack={() => setSection('casos')} onRefresh={() => { enviar({ tipo: 'refrescarDetalle', id: detail?.id }); setSelectedDetail(null) }} onNavigate={onNavigate} onNotice={setNotice} /> : <WorkspaceDashboard mundo={s.mundo} section={section} onSection={setSection} onAsk={onAsk} selectedDocument={selectedDocument} onDocument={setSelectedDocument} />}
          {s.actividad?.length > 0 && <section className="workspace-activity"><div><h2>Actividad de la sesión</h2>{s.undo && <button onClick={() => enviar({ tipo: 'deshacer' })}>Deshacer último cambio</button>}</div><ul>{s.actividad.slice(0, 4).map(a => <li key={a.id}><IconCheck size={16} /><span>{a.texto}</span><time>{a.hora}</time></li>)}</ul></section>}
        </main>
        <footer className="workspace-footnote">Corte de la demo: 2 jun 2026 · Importes de coste sin impuestos · Los cambios duran esta sesión</footer>
      </div>
      {view === 'ambos' && <aside className="workspace-whatsapp"><div className="workspace-channel-label"><IconChat size={17} /><strong>WhatsApp</strong><span>Tu canal del día a día</span></div><WhatsApp s={s} onDesktop={onDesktop} onClose={() => setView('escritorio')} draft={draft} setDraft={setDraft} onSend={preguntar} onEntry={onEntry} busy={busy} /></aside>}
    </div>
  </div>
}
