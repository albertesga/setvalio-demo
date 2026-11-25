import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { capitulos, totales, tesoreria, excepciones, dossier } from '../agentes/calculos.js'
import { eur, eurCents, eurSigned, pctSigned } from '../lib/format.js'
import { IconAlert, IconCheck, IconChevronDown, IconChevronRight, IconClose, IconFacturas, IconSearch } from '../components/icons.jsx'
import './WorkspaceDashboard.css'

const fecha = (value) => value ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`)) : 'Sin fecha'
const normalizar = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const estadoDocumento = (doc) => doc.estado === 'contabilizada' ? 'Contabilizada' : doc.estado === 'descartada' ? 'Descartada' : doc.aplazado ? 'Aplazada' : 'Por revisar'
const revisarDocumento = (doc) => doc.estado === 'en_bandeja'

function SectionHeading({ title, children, action }) {
  return <div className="ws-section-heading"><div><h2>{title}</h2>{children && <p>{children}</p>}</div>{action}</div>
}

function ActionLink({ children, onClick }) {
  return <button className="ws-text-button" type="button" onClick={onClick}>{children}<IconChevronRight size={16} /></button>
}

function MoneyDifference({ amount }) {
  return <span className={amount > 0 ? 'ws-over' : amount < 0 ? 'ws-under' : 'ws-muted'}>{eurSigned(amount)}</span>
}

function PendingAction({ item, onAsk, onSection }) {
  if (item.ref?.tipo === 'orden') return item.ref.id === 'OC-104'
    ? <ActionLink onClick={() => onAsk?.('Revisar el hotel')}>Revisar</ActionLink>
    : <ActionLink onClick={() => onSection?.('presupuesto')}>Ver coste</ActionLink>
  if (item.ref?.id === 'G-004') return <ActionLink onClick={() => onAsk?.('Revisa el ticket G-004')}>Revisar</ActionLink>
  if (item.ref?.id?.startsWith('F-')) return <ActionLink onClick={() => onAsk?.(`Revisa la factura ${item.ref.id}`)}>Consultar</ActionLink>
  return <ActionLink onClick={() => onAsk?.('¿Qué desviaciones tiene el presupuesto?')}>Ver previsión</ActionLink>
}

function BudgetOverview({ total }) {
  const max = Math.max(total.presupuesto, total.cef, 1)
  return <div className="ws-budget-overview">
    <div className="ws-comparison-row"><div><span>Presupuesto aprobado</span><strong>{eur(total.presupuesto)}</strong></div><div className="ws-total-track"><span className="ws-total-budget" style={{ width: `${total.presupuesto / max * 100}%` }} /></div></div>
    <div className="ws-comparison-row"><div><span>Previsión al cierre</span><strong>{eur(total.cef)}</strong></div><div className="ws-total-track"><span className="ws-total-forecast" style={{ width: `${total.cef / max * 100}%` }} /></div></div>
    <div className="ws-budget-caption"><span><MoneyDifference amount={total.desviacion} /> sobre el presupuesto</span><span>{pctSigned(total.desviacionPct)}</span></div>
    <dl className="ws-cost-breakdown"><div><dt>Contabilizado</dt><dd>{eur(total.gastado)}</dd></div><div><dt>Comprometido</dt><dd>{eur(total.comprometido)}</dd></div><div><dt>Por ejecutar</dt><dd>{eur(total.disponible)}</dd></div></dl>
    {total.reservas > 0 && <p className="ws-note">La previsión incluye {eur(total.reservas)} de reservas de riesgo, fuera de los capítulos.</p>}
  </div>
}

function ChapterChart({ chapters, onSelect }) {
  const values = [...chapters].sort((a, b) => b.presupuesto - a.presupuesto).slice(0, 6)
  const max = Math.max(...values.flatMap((c) => [c.presupuesto, c.cef]), 1)
  return <div className="ws-chapter-chart">
    <div className="ws-chart-legend"><span><i className="ws-key-budget" />Presupuesto</span><span><i className="ws-key-forecast" />Previsión</span></div>
    {values.map((c) => <button type="button" className="ws-chapter-bar" key={c.id} onClick={() => onSelect(c.id)} aria-label={`${c.nombre}. Presupuesto ${eur(c.presupuesto)}, previsión ${eur(c.cef)}. Ver partidas.`}>
      <span className="ws-bar-label"><span>{c.nombre}</span><MoneyDifference amount={c.desviacion} /></span>
      <span className="ws-bar-pair" aria-hidden="true"><span className="ws-bar-budget" style={{ width: `${c.presupuesto / max * 100}%` }} /><span className="ws-bar-forecast" style={{ width: `${c.cef / max * 100}%` }} /></span>
    </button>)}
    <p className="ws-note">Los seis capítulos con mayor presupuesto. Selecciona uno para ver sus partidas.</p>
  </div>
}

function CashChart({ cash, onAsk }) {
  const chartId = useId()
  const [selected, setSelected] = useState('')
  const active = cash.semanas.find((s) => s.semana === selected) ?? cash.minimo ?? cash.semanas[0]
  const points = [{ semana: 'Hoy', saldo: cash.saldoHoy }, ...cash.semanas]
  const low = Math.min(0, ...points.map((p) => p.saldo))
  const high = Math.max(1, ...points.map((p) => p.saldo))
  const range = high - low || 1
  const x = (i) => 54 + i / Math.max(points.length - 1, 1) * 558
  const y = (n) => 20 + (high - n) / range * 142
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.saldo)}`).join(' ')
  return <section className="ws-cash-section">
    <div className="ws-panel-heading"><h3>Caja hasta el cierre</h3><span>Hoy <strong>{eur(cash.saldoHoy)}</strong></span></div>
    <svg className="ws-cash-chart" viewBox="0 0 640 200" role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
      <title id={`${chartId}-title`}>Evolución del saldo de caja previsto</title>
      <desc id={`${chartId}-desc`}>Saldo actual {eur(cash.saldoHoy)}. {cash.semanas.map((s) => `${s.semana}: ${eur(s.saldo)}`).join('. ')}.</desc>
      {[high, 0, ...(low < 0 ? [low] : [])].map((value, i) => <g key={`${value}-${i}`}><line x1="54" x2="612" y1={y(value)} y2={y(value)} className={value === 0 ? 'ws-chart-zero' : 'ws-chart-grid'} /><text x="45" y={y(value) + 4} textAnchor="end" className="ws-chart-axis">{Math.round(value / 1000)} mil</text></g>)}
      <path d={line} className="ws-cash-line" />
      {points.map((p, i) => <g key={p.semana}><circle cx={x(i)} cy={y(p.saldo)} r={p.semana === active?.semana ? 5 : 3.5} className={`${p.saldo < 0 ? 'ws-cash-dot-negative' : 'ws-cash-dot'} ${p.semana === active?.semana ? 'ws-cash-dot-active' : ''}`} /><text x={x(i)} y="188" textAnchor="middle" className="ws-chart-axis">{i === 0 ? 'Hoy' : cash.semanas[i - 1].fechas.split(' ')[0]}</text></g>)}
    </svg>
    {active && <div className="ws-cash-detail"><label>Semana<select value={active.semana} onChange={(event) => setSelected(event.target.value)}>{cash.semanas.map((s) => <option key={s.semana} value={s.semana}>{s.semana} · {s.fechas}</option>)}</select></label><dl><div><dt>Cobros</dt><dd>{eur(active.cobros)}</dd></div><div><dt>Pagos</dt><dd>{eur(active.pagos)}</dd></div><div><dt>Saldo previsto</dt><dd className={active.saldo < 0 ? 'ws-over' : ''}>{eur(active.saldo)}</dd></div></dl></div>}
    {cash.negativas.length > 0 && <div className="ws-cash-warning"><IconAlert size={17} /><p>La caja baja de cero en {cash.negativas.length} {cash.negativas.length === 1 ? 'semana' : 'semanas'}. El mínimo es <strong>{eur(cash.minimo.saldo)}</strong>, del {cash.minimo.fechas}.</p><ActionLink onClick={() => onAsk?.('¿Cuánto nos costará al final y llegamos de caja?')}>Revisar en WhatsApp</ActionLink></div>}
  </section>
}

function Summary({ mundo, onSection, onChapter, onAsk }) {
  const total = totales(mundo)
  const chapters = capitulos(mundo)
  const cash = tesoreria(mundo)
  const pending = excepciones(mundo)
  const dossierPending = dossier(mundo).filter((d) => d.estado === 'Bloqueante')
  return <>
    <SectionHeading title="Resumen de producción" action={<button type="button" className="ws-button ws-button-primary" onClick={() => onAsk?.('Prepárame el informe semanal de coste')}>Pedir informe en WhatsApp</button>}>El coste, la caja y lo que necesita tu atención.</SectionHeading>
    <div className="ws-summary-grid"><section className="ws-panel"><div className="ws-panel-heading"><h3>El presupuesto, al día</h3><ActionLink onClick={() => onSection?.('presupuesto')}>Ver detalle</ActionLink></div><BudgetOverview total={total} /></section><section className="ws-panel"><div className="ws-panel-heading"><h3>Dónde se concentra el coste</h3></div><ChapterChart chapters={chapters} onSelect={onChapter} /></section></div>
    <CashChart cash={cash} onAsk={onAsk} />
    <section className="ws-attention"><div className="ws-panel-heading"><h3>Para seguir avanzando</h3><span>{pending.length} revisiones · {dossierPending.length} documentos clave</span></div>
      <ul className="ws-action-list">{pending.slice(0, 3).map((item) => <li key={item.id}><div><span className="ws-action-title">{item.titulo}</span><span className="ws-muted">{item.rol} · {item.nivel === 'aprueba' ? 'Necesita aprobación' : 'Pendiente de revisión'}</span></div><strong>{eur(item.importe)}</strong><PendingAction item={item} onAsk={onAsk} onSection={onSection} /></li>)}
        {dossierPending[0] && <li><div><span className="ws-action-title">{dossierPending[0].documento}</span><span className="ws-muted">{dossierPending[0].responsable} · vence el {fecha(dossierPending[0].deadline)}</span></div><span className="ws-status ws-status-review">Por completar</span><ActionLink onClick={() => onSection?.('documentos')}>Ver dossier</ActionLink></li>}
        {pending.length === 0 && dossierPending.length === 0 && <li className="ws-empty"><IconCheck />No hay revisiones pendientes.</li>}
      </ul>
    </section>
  </>
}

function Budget({ mundo, selectedChapter, onChapter, onAsk }) {
  const chapters = capitulos(mundo)
  const total = totales(mundo)
  return <>
    <SectionHeading title="Presupuesto y coste" action={<button className="ws-button" type="button" onClick={() => onAsk?.('¿Qué capítulos tienen desviaciones y por qué?')}>Consultar desviaciones</button>}>Del presupuesto aprobado a la previsión de cierre. Importes sin IVA ni IGIC.</SectionHeading>
    <dl className="ws-budget-totals"><div><dt>Presupuesto</dt><dd>{eur(total.presupuesto)}</dd></div><div><dt>Contabilizado</dt><dd>{eur(total.gastado)}</dd></div><div><dt>Comprometido</dt><dd>{eur(total.comprometido)}</dd></div><div><dt>Previsión al cierre</dt><dd>{eur(total.cef)}</dd></div><div><dt>Desviación</dt><dd><MoneyDifference amount={total.desviacion} /></dd></div></dl>
    <div className="ws-table-scroll"><table className="ws-budget-table"><caption className="ws-sr-only">Costes por capítulo. Abre un capítulo para consultar sus partidas.</caption><thead><tr><th scope="col">Capítulo</th><th scope="col">Presupuesto</th><th scope="col">Contabilizado</th><th scope="col">Comprometido</th><th scope="col">Previsión</th><th scope="col">Desviación</th></tr></thead><tbody>{chapters.map((c) => {
      const open = selectedChapter === c.id
      return <Fragment key={c.id}><tr className={open ? 'ws-chapter-selected' : ''}><th scope="row"><button type="button" className="ws-chapter-toggle" onClick={() => onChapter(open ? null : c.id)} aria-expanded={open} aria-controls={`ws-partidas-${c.id}`}>{open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}<span className="ws-chapter-code">{c.id}</span><span>{c.nombre}</span></button></th><td>{eur(c.presupuesto)}</td><td>{eur(c.gastado)}</td><td>{eur(c.comprometido)}</td><td>{eur(c.cef)}</td><td><MoneyDifference amount={c.desviacion} /></td></tr>
        <tr hidden={!open} id={`ws-partidas-${c.id}`} className="ws-partidas-row"><td colSpan="6"><table className="ws-partidas-table"><caption>Partidas de {c.nombre}</caption><thead><tr><th scope="col">Partida</th><th scope="col">Presupuesto</th><th scope="col">Contabilizado</th><th scope="col">Comprometido</th><th scope="col">Previsión</th><th scope="col">Desviación</th></tr></thead><tbody>{mundo.capitulos.find((cap) => cap.id === c.id).partidas.map((code) => {
          const p = mundo.partidas[code]
          return <tr key={code}><th scope="row"><span className="ws-chapter-code">{code}</span>{p.nombre}</th><td>{eur(p.presupuesto)}</td><td>{eur(p.gastado)}</td><td>{eur(p.comprometido)}</td><td>{eur(p.cef)}</td><td><MoneyDifference amount={p.cef - p.presupuesto} /></td></tr>
        })}</tbody></table><button className="ws-text-button" type="button" onClick={() => onAsk?.(`Explícame las desviaciones del capítulo ${c.id}, ${c.nombre}`)}>Preguntar por este capítulo<IconChevronRight size={16} /></button></td></tr>
      </Fragment>
    })}</tbody><tfoot><tr><th scope="row">Total {total.reservas > 0 && 'con reservas'}</th><td>{eur(total.presupuesto)}</td><td>{eur(total.gastado)}</td><td>{eur(total.comprometido)}</td><td>{eur(total.cef)}</td><td><MoneyDifference amount={total.desviacion} /></td></tr></tfoot></table></div>
    {total.reservas > 0 && <p className="ws-note">El total incorpora {eur(total.reservas)} de reservas de riesgo adicionales a los capítulos.</p>}
    <p className="ws-note">Contabilizado: gastos registrados. Comprometido: compras aprobadas aún sin facturar. Previsión: coste estimado al terminar la producción.</p>
  </>
}

function DocumentDetail({ doc, mundo, onClose, onAsk }) {
  const part = mundo.partidas[doc.partida]
  const detailRef = useRef(null)
  useEffect(() => {
    detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    detailRef.current?.focus({ preventScroll: true })
  }, [doc.id])
  return <aside ref={detailRef} tabIndex={-1} className="ws-document-detail" aria-label={`Detalle de ${doc.id}`}>
    <div className="ws-document-detail-top"><IconFacturas size={26} /><button type="button" className="ws-icon-button" onClick={onClose} aria-label="Cerrar detalle del documento"><IconClose size={18} /></button></div>
    <p className="ws-document-id">{doc.id} · {doc.tipo === 'ticket' ? 'Ticket' : 'Factura'}</p><h3>{doc.proveedor}</h3><p className="ws-document-concept">{doc.concepto}</p><span className={`ws-status ${revisarDocumento(doc) ? 'ws-status-review' : 'ws-status-done'}`}>{estadoDocumento(doc)}</span>
    <dl className="ws-document-amounts"><div><dt>Base imponible</dt><dd>{eurCents(doc.base)}</dd></div><div><dt>{doc.impuesto?.tipo ?? 'Impuesto'} {doc.impuesto?.tasa != null ? `${doc.impuesto.tasa} %` : ''}</dt><dd>{eurCents(doc.impuesto?.importe ?? 0)}</dd></div><div className="ws-document-total"><dt>Total</dt><dd>{eurCents(doc.total)}</dd></div></dl>
    <dl className="ws-document-metadata"><div><dt>Proyecto</dt><dd>{mundo.proyecto.titulo}</dd></div><div><dt>Partida</dt><dd>{doc.partida ? `${doc.partida} · ${part?.nombre ?? ''}` : 'Sin clasificar'}</dd></div><div><dt>Emisión</dt><dd>{fecha(doc.fecha)}</dd></div><div><dt>Vencimiento</dt><dd>{doc.vencimiento ? fecha(doc.vencimiento) : 'No indicado'}</dd></div><div><dt>Recibido por</dt><dd>{doc.llegada?.via ?? doc.origen ?? 'No indicado'}</dd></div>{doc.llegada?.por && <div><dt>Enviado por</dt><dd>{doc.llegada.por}</dd></div>}<div><dt>Pedido</dt><dd>{doc.oc ?? 'Sin pedido asociado'}</dd></div><div><dt>Pago</dt><dd>{doc.pago === 'pagado' ? 'Pagado' : 'Pendiente'}</dd></div></dl>
    {doc.motivo && <p className="ws-document-note"><IconAlert size={17} />{doc.motivo}</p>}
    <button className="ws-button ws-button-primary" type="button" onClick={() => onAsk?.(doc.tipo === 'ticket' ? `Revisa el ticket ${doc.id}` : `Revisa la factura ${doc.id}`)}>Consultar en WhatsApp</button>
  </aside>
}

function Documents({ mundo, onAsk, onDocument, selectedDocument }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('todos')
  const [selection, setSelection] = useState(null)
  const documents = Object.values(mundo.documentos).filter((d) => d.estado !== 'por_llegar').sort((a, b) => (b.recibida ?? b.fecha ?? '').localeCompare(a.recibida ?? a.fecha ?? '') || a.id.localeCompare(b.id))
  const matching = documents.filter((d) => (filter === 'todos' || (filter === 'revisar' ? revisarDocumento(d) : d.estado === 'contabilizada')) && normalizar(`${d.id} ${d.proveedor} ${d.concepto} ${d.partida} ${d.origen} ${d.llegada?.canal ?? ''}`).includes(normalizar(query)))
  const selectedId = selectedDocument === undefined ? selection : selectedDocument
  const selected = selectedId ? mundo.documentos[selectedId] : null
  const dossierItems = dossier(mundo)
  const choose = (id) => { setSelection(id); onDocument?.(id) }
  return <>
    <SectionHeading title="Documentos" action={<button type="button" className="ws-button" onClick={() => onAsk?.('¿Qué documentos tengo que revisar?')}>Consultar documentos en WhatsApp</button>}>Facturas, tickets y documentación de {mundo.proyecto.titulo}.</SectionHeading>
    <div className="ws-document-toolbar"><label className="ws-search"><IconSearch size={18} /><span className="ws-sr-only">Buscar documentos</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proveedor, concepto o referencia" /></label><div className="ws-document-filters" aria-label="Filtrar documentos">{[['todos', 'Todos', documents.length], ['revisar', 'Por revisar', documents.filter(revisarDocumento).length], ['contabilizadas', 'Contabilizados', documents.filter((d) => d.estado === 'contabilizada').length]].map(([value, label, count]) => <button type="button" key={value} className={filter === value ? 'ws-filter-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}</div></div>
    <div className={`ws-documents-layout ${selected ? 'ws-with-document' : ''}`}><div className="ws-document-results"><p className="ws-results-count" aria-live="polite">{matching.length} {matching.length === 1 ? 'documento' : 'documentos'}</p>
      {matching.length ? <ul className="ws-document-list">{matching.map((doc) => <li key={doc.id}><button type="button" className={`ws-document-row ${selectedId === doc.id ? 'ws-document-selected' : ''}`} onClick={() => choose(doc.id)} aria-pressed={selectedId === doc.id}><span className="ws-file-symbol"><IconFacturas size={22} /></span><span className="ws-document-title"><strong>{doc.proveedor}</strong><span>{doc.concepto}</span><small>{doc.id} · {fecha(doc.fecha)} · {doc.llegada?.canal === 'whatsapp' ? 'WhatsApp' : doc.origen}</small></span><span className="ws-document-row-end"><strong>{eurCents(doc.total)}</strong><span className={`ws-status ${revisarDocumento(doc) ? 'ws-status-review' : 'ws-status-done'}`}>{estadoDocumento(doc)}</span></span><IconChevronRight size={16} /></button></li>)}</ul> : <div className="ws-empty-documents"><IconSearch size={26} /><h3>No hay documentos con esos filtros</h3><p>Prueba con otro proveedor, referencia o estado.</p><button type="button" className="ws-button" onClick={() => { setQuery(''); setFilter('todos') }}>Limpiar filtros</button></div>}
    </div>{selected && <DocumentDetail doc={selected} mundo={mundo} onClose={() => choose(null)} onAsk={onAsk} />}</div>
    <section className="ws-dossier"><div className="ws-panel-heading"><h3>Documentación para el cierre</h3><ActionLink onClick={() => onAsk?.('¿Cómo va la adecuación fiscal?')}>Consultar dossier</ActionLink></div><p>Documentos clave y evidencias pendientes. Cada uno conserva su responsable y fecha.</p><ul>{dossierItems.map((doc) => <li key={doc.id}><span className="ws-dossier-icon"><IconFacturas size={20} /></span><div><h4>{doc.documento}</h4><p>{doc.evidencia}</p><span>{doc.responsable} · {fecha(doc.deadline)}</span></div><span className={`ws-status ${doc.estado === 'Bloqueante' ? 'ws-status-review' : ''}`}>{doc.preparado ? 'Borrador preparado' : doc.estado}</span></li>)}</ul></section>
  </>
}

/** Desktop reads the same world as the conversation. Actions go through onAsk. */
export default function WorkspaceDashboard({ mundo, section = 'resumen', onSection, onAsk, onDocument, selectedDocument }) {
  const [selectedChapter, setSelectedChapter] = useState(null)
  const selectChapter = (id) => { setSelectedChapter(id); if (section !== 'presupuesto') onSection?.('presupuesto') }
  if (!mundo) return <div className="ws-dashboard ws-loading" role="status">Cargando la producción…</div>
  return <div className="ws-dashboard">{section === 'presupuesto' ? <Budget mundo={mundo} selectedChapter={selectedChapter} onChapter={selectChapter} onAsk={onAsk} /> : section === 'documentos' ? <Documents mundo={mundo} onAsk={onAsk} onDocument={onDocument} selectedDocument={selectedDocument} /> : <Summary mundo={mundo} onSection={onSection} onChapter={selectChapter} onAsk={onAsk} />}</div>
}
