// Portada de Filmpilot (Brand Kit v1). Los enlaces a pantallas clásicas abren la
// demo anterior, que conserva la marca SetValio: se dice donde se enlaza.

import { useEffect, useRef, useState } from 'react'
import './Landing.css'
import { AgentGlyph, FilmpilotButton, FilmpilotLogo, FilmpilotSymbol, Kicker, OrbitGraphic, ProductionPhoto, StateChip } from '../brand/Filmpilot.jsx'
import { FAMILIAS, ORDEN_FAMILIAS } from '../agentes/agentes.js'
import { TOTALES } from '../lib/data.js'
import { eur, eurSigned, pct, pctSigned } from '../lib/format.js'
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClose,
  IconCoste,
  IconFacturas,
  IconIncentivos,
  IconMenu,
  IconPresupuesto,
  IconSearch,
  IconTesoreria,
} from '../components/icons.jsx'

// Vista estática del prototipo de agentes (no importa el motor para no cargarlo en la portada).
const AGENTS_PREVIEW = [
  { familia: 'documentacion', nombre: 'Facturas', tarea: 'Lee los cuatro documentos de la bandeja', estado: 'done' },
  { familia: 'financiacion', nombre: 'Conciliación', tarea: 'Cuadra cada factura con su pedido', estado: 'done' },
  { familia: 'presupuesto', nombre: 'Control de costes', tarea: 'Escenografía queda fuera del umbral', estado: 'done' },
  { familia: 'financiacion', nombre: 'Excepciones', tarea: 'Una compra de más de 10.000 € espera tu aprobación', estado: 'review' },
]

const NAV = [
  { label: 'Agentes', href: '#agentes' },
  { label: 'Cómo funciona', href: '#flujo' },
  { label: 'Producto', href: '#producto' },
  { label: 'Fiscalidad', href: '#documental' },
  { label: 'Despachos', href: '#despachos' },
  { label: 'Para quién', href: '#perfiles' },
]

const FLOW = [
  { number: '01', name: 'Presupuesto', detail: 'Una base por capítulos ICAA para todo el proyecto.', value: eur(TOTALES.presupuesto), route: 'presupuesto', Icon: IconPresupuesto },
  { number: '02', name: 'Retorno', detail: 'Territorios, deducción y ayudas en una misma cuenta.', value: '650.000 €', route: 'incentivos', Icon: IconIncentivos },
  { number: '03', name: 'Financiación', detail: 'Cobros, pagos y necesidad de caja mes a mes.', value: '−508.000 €', route: 'tesoreria', Icon: IconTesoreria },
  { number: '04', name: 'Rodaje', detail: 'Compras, gasto real y proyección antes del cierre.', value: pctSigned(TOTALES.desviacionPct), route: 'coste', Icon: IconCoste },
  { number: '05', name: 'Justificación', detail: 'Cada gasto y documento conectado a la deducción.', value: '42 documentos', route: 'documental', Icon: IconSearch },
]

const MODULES = [
  { name: 'Órdenes de compra', detail: 'Aprueba antes de comprometer gasto.', route: 'compras', Icon: IconPresupuesto },
  { name: 'Bandeja de gastos', detail: 'Valida facturas y tickets.', route: 'facturas', Icon: IconFacturas },
  { name: 'Elegibilidad fiscal', detail: 'Separa gasto deducible del excluido.', route: 'elegibilidad', Icon: IconCheck },
  { name: 'Informes', detail: 'Prepara el cierre para producción y fiscalidad.', route: 'informes', Icon: IconFacturas },
]

const FAQ = [
  ['¿Qué problema resuelve Filmpilot?', 'Conecta presupuesto, incentivos, ayudas, financiación, gasto y documentación fiscal. Cuando cambia una cifra, puedes ver cómo afecta al resto del proyecto.'],
  ['¿Los agentes deciden por mí?', 'No. Hacen solos lo rutinario y reversible, como contabilizar una factura que casa con su pedido. Lo dudoso lo proponen y lo que compromete dinero o tiene riesgo fiscal espera la aprobación de la persona responsable.'],
  ['¿Sustituye a mi fiscalista?', 'No. Tu fiscalista revisa, valida y firma. Filmpilot prepara cálculos, evidencias y trazabilidad para que esa revisión sea más clara.'],
  ['¿Puedo trabajar con cine, series y documental?', 'El prototipo contempla distintas tipologías, territorios, presupuestos por capítulos ICAA y requisitos de coproducción.'],
  ['¿Cómo se procesan las facturas?', 'La factura electrónica se lee como dato estructurado. Los PDF y tickets se procesan con OCR y los casos de baja confianza quedan señalados para revisión.'],
]

function Container({ children, className = '' }) {
  return <div className={`landing-container ${className}`}>{children}</div>
}

function ArrowLink({ children, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} className={`landing-arrow-link ${className}`}>
      {children}
      <IconChevronRight size={17} aria-hidden="true" />
    </button>
  )
}

function ProductPreview({ onNavigate }) {
  const previewRef = useRef(null)
  const [chartVisible, setChartVisible] = useState(false)

  useEffect(() => {
    const node = previewRef.current
    if (!node) return
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setChartVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setChartVisible(true)
        observer.disconnect()
      },
      { threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={previewRef} className={`landing-product-preview${chartVisible ? ' is-visible' : ''}`} aria-label="Vista de ejemplo de La última función">
      <div className="landing-preview-rail" aria-hidden="true">
        <FilmpilotSymbol size={26} />
        <span className="landing-preview-rail-lines">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="landing-preview-main">
        <div className="landing-preview-topline flp-mono">
          <span>Proyecto / La última función</span>
          <span>Rodaje · día 15 de 30</span>
        </div>
        <div className="landing-preview-heading">
          <div>
            <span className="flp-kicker">Resumen financiero</span>
            <h3>La última función</h3>
            <p>La decisión de hoy: contener la proyección a cierre.</p>
          </div>
          <StateChip state="working">En rodaje</StateChip>
        </div>
        <div className="landing-preview-kpis">
          {[
            ['Presupuesto', eur(TOTALES.presupuesto), 'Base del proyecto'],
            ['Comprometido', eur(TOTALES.comprometido), 'Órdenes y contratos'],
            ['Gastado a hoy', eur(TOTALES.gastado), `${pct(TOTALES.ejecucionPresupuestoPct)} del presupuesto`],
            ['Proyección a cierre', eur(TOTALES.cef), `${eurSigned(TOTALES.desviacion)} sobre plan`],
          ].map(([label, value, note], index) => (
            <div className="landing-preview-kpi" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small className={index === 3 ? 'landing-preview-negative' : ''}>{note}</small>
            </div>
          ))}
        </div>
        <div className="landing-preview-lower">
          <div className="landing-preview-chart">
            <div className="landing-preview-panel-heading">
              <span>Gasto acumulado / 30 días</span>
              <span className="landing-preview-legend">
                Previsto <i /> Real <i />
              </span>
            </div>
            <svg viewBox="0 0 640 160" role="img" aria-label="El gasto real supera ligeramente el previsto desde el día 10">
              <path d="M0 132 H640 M0 88 H640 M0 44 H640" stroke="var(--flp-border)" strokeWidth="1" />
              <path d="M0 146 L640 24" stroke="var(--flp-silver)" strokeWidth="2" fill="none" strokeDasharray="5 5" />
              <path className="landing-preview-actual" pathLength="1" d="M0 145 L40 137 L80 131 L120 120 L160 114 L200 102 L240 96 L280 88 L320 79 L360 67 L400 57" stroke="var(--flp-carbon)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle className="landing-preview-endpoint" cx="400" cy="57" r="6" fill="var(--flp-signal)" stroke="var(--flp-carbon)" strokeWidth="2" />
              <text x="0" y="157">Día 1</text>
              <text x="383" y="157">Día 15</text>
              <text x="600" y="157">Día 30</text>
            </svg>
          </div>
          <div className="landing-preview-alerts">
            <div className="landing-preview-panel-heading">Por revisar</div>
            <button type="button" onClick={() => onNavigate('coste')}>
              <b>07</b>
              <span>
                Viajes y comidas
                <br />
                <small>+12 % sobre presupuesto</small>
              </span>
              <IconChevronRight size={15} />
            </button>
            <button type="button" onClick={() => onNavigate('documental')}>
              <b>!</b>
              <span>
                Certificado cultural
                <br />
                <small>Bloquea el dossier fiscal</small>
              </span>
              <IconChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const menuButtonRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])
  const clearSectionHash = () => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
  const go = (route, context) => {
    setMenuOpen(false)
    clearSectionHash()
    onNavigate(route, context)
  }

  return (
    <div className="landing-page flp-theme">
      <a className="landing-skip-link" href="#landing-main">
        Saltar al contenido
      </a>
      <header className="landing-header">
        <Container className="landing-header-inner">
          <button
            type="button"
            className="landing-logo"
            onClick={() => {
              clearSectionHash()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-label="Filmpilot, volver al inicio"
          >
            <FilmpilotLogo width={150} decorative />
          </button>
          <nav className="landing-nav" aria-label="Navegación principal">
            {NAV.map(({ label, href }) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="landing-header-actions">
            <button className="landing-demo-link" type="button" onClick={() => go('panel')}>
              Demo clásica
            </button>
            <FilmpilotButton variant="carbon" size="sm" className="landing-header-cta" onClick={() => go('agentes')} iconAfter={IconChevronRight}>
              Probar los agentes
            </FilmpilotButton>
            <button ref={menuButtonRef} className="landing-menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="landing-mobile-nav">
              {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
            </button>
          </div>
        </Container>
        <nav id="landing-mobile-nav" className={`landing-mobile-nav${menuOpen ? ' is-open' : ''}`} aria-label="Navegación móvil" aria-hidden={!menuOpen} inert={menuOpen ? undefined : ''}>
          {NAV.map(({ label, href }) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
              <IconChevronRight size={16} />
            </a>
          ))}
          <button type="button" onClick={() => go('agentes')}>
            Probar los agentes <IconChevronRight size={16} />
          </button>
          <button type="button" onClick={() => go('panel')}>
            <span>
              Abrir la demo clásica <small>marca anterior</small>
            </span>
            <IconChevronRight size={16} />
          </button>
        </nav>
      </header>

      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <Container className="landing-hero-grid">
            <div className="landing-hero-head">
              <Kicker className="text-flp-muted">Inteligencia en producción</Kicker>
              <h1 id="landing-title" className="flp-display">
                Libertad para crear.
                <br />
                Claridad para producir.
              </h1>
            </div>
            <div className="landing-hero-copy">
              <p className="landing-hero-support">Un equipo de agentes. Una producción bajo control.</p>
              <p className="landing-hero-description">Presupuesto, coste, financiación e incentivos de cine y televisión. Los agentes preparan, cuadran y vigilan; tú decides en cada etapa.</p>
              <div className="landing-hero-actions">
                <FilmpilotButton variant="primary" size="lg" onClick={() => go('agentes')} iconAfter={IconChevronRight}>
                  Conocer a los agentes
                </FilmpilotButton>
                <FilmpilotButton variant="secondary" size="lg" href="#flujo" iconAfter={IconChevronDown}>
                  Ver cómo funciona
                </FilmpilotButton>
              </div>
            </div>
            <div className="landing-hero-art">
              <OrbitGraphic tone="signal" className="landing-hero-orbit" />
            </div>
          </Container>
          <Container>
            <p className="landing-hero-caption flp-mono">
              <span>Proyecto demo</span> La última función · Largometraje · día 15/30
            </p>
          </Container>
        </section>

        <section id="agentes" className="landing-section landing-agents-section flp-dark" aria-labelledby="landing-agents-title">
          <Container className="landing-agents-grid">
            <div className="landing-agents-copy">
              <Kicker className="text-flp-muted">Agentes · prototipo conversacional</Kicker>
              <h2 id="landing-agents-title" className="flp-title">
                Los agentes preparan. Tú decides.
              </h2>
              <p className="flp-body text-flp-muted">Pide el informe semanal, la explicación de una desviación o el parte de riesgos del rodaje. Cada agente hace su parte y enseña cómo lo ha hecho. Lo que compromete dinero o tiene riesgo fiscal espera tu aprobación.</p>
              <ul className="landing-families">
                {ORDEN_FAMILIAS.map((f) => (
                  <li key={f}>
                    <AgentGlyph family={f} size={36} />
                    <span>
                      <strong>{FAMILIAS[f].nombre}</strong>
                      <small>{FAMILIAS[f].descriptor}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="landing-agents-actions">
                <FilmpilotButton variant="primary" size="lg" onClick={() => go('agentes')} iconAfter={IconChevronRight}>
                  Probar los agentes
                </FilmpilotButton>
                <FilmpilotButton variant="ghost" size="lg" onClick={() => go('agentes', { tour: true })}>
                  Ver el recorrido guiado
                </FilmpilotButton>
              </div>
              <small className="landing-agents-note">Demo con agentes simulados y datos de ejemplo: no hay un modelo de lenguaje detrás y no se envía nada.</small>
            </div>
            <div className="landing-agents-preview" role="img" aria-label="Ejemplo: al pedir el informe semanal, Facturas, Conciliación y Control de costes completan su parte y Excepciones deja una compra de más de 10.000 euros por revisar">
              <div className="landing-agents-ask">Prepárame el informe semanal de coste.</div>
              <ol>
                {AGENTS_PREVIEW.map((a) => (
                  <li key={a.nombre} className={a.estado === 'review' ? 'is-review' : ''}>
                    <AgentGlyph family={a.familia} size={34} />
                    <span>
                      <strong>{a.nombre}</strong>
                      <small>{a.tarea}</small>
                    </span>
                    <StateChip state={a.estado} />
                  </li>
                ))}
              </ol>
              <div className="landing-agents-foot flp-mono">
                <span>Coste estimado final</span>
                <strong>
                  {eur(TOTALES.cef)} · {pctSigned(TOTALES.desviacionPct)}
                </strong>
              </div>
            </div>
          </Container>
        </section>

        <section id="flujo" className="landing-section landing-flow-section" aria-labelledby="landing-flow-title">
          <Container>
            <div className="landing-section-intro">
              <div>
                <Kicker className="text-flp-muted">Cómo funciona</Kicker>
                <h2 id="landing-flow-title" className="flp-title">
                  Del presupuesto al último justificante.
                </h2>
              </div>
              <div>
                <p>Una partida cambia la deducción, la caja y el coste final. Filmpilot lo conecta.</p>
                <ArrowLink onClick={() => go('presupuesto')}>Ver presupuesto</ArrowLink>
              </div>
            </div>
            <div className="landing-flow-list">
              {FLOW.map(({ number, name, detail, value, route, Icon }) => (
                <button key={number} type="button" className="landing-flow-row" onClick={() => go(route)}>
                  <span className="landing-flow-number">{number}</span>
                  <span className="landing-flow-icon">
                    <Icon size={22} />
                  </span>
                  <span className="landing-flow-name">{name}</span>
                  <span className="landing-flow-detail">{detail}</span>
                  <strong>{value}</strong>
                  <IconChevronRight className="landing-flow-arrow" size={19} />
                </button>
              ))}
            </div>
            <p className="landing-example-note">
              Ejemplo ilustrativo: «La última función», largometraje de ficción con presupuesto de {eur(TOTALES.presupuesto)}. Los enlaces abren la demo clásica, que aún conserva la marca anterior.
            </p>
          </Container>
        </section>

        <section className="landing-photo-band flp-dark" aria-labelledby="landing-photo-title">
          <div className="landing-photo-media">
            <ProductionPhoto sizes="100vw" />
          </div>
          <Container className="landing-photo-copy">
            <h2 id="landing-photo-title" className="flp-title">
              Menos seguimiento.
              <br />
              Más producción.
            </h2>
            <p className="flp-body">Los agentes persiguen facturas, cuadran pedidos y vigilan el plan de rodaje. Tu equipo dedica el tiempo a producir.</p>
            <small className="flp-mono">Imagen conceptual</small>
          </Container>
        </section>

        <section id="producto" className="landing-section landing-product-section" aria-labelledby="landing-product-title">
          <Container>
            <div className="landing-section-intro">
              <div>
                <Kicker className="text-flp-muted">Producto</Kicker>
                <h2 id="landing-product-title" className="flp-title">
                  Una vista para saber dónde actuar hoy.
                </h2>
              </div>
              <div>
                <p>El cierre previsto supera el presupuesto en {eur(TOTALES.desviacion)}. Aún puedes actuar sobre compras y capítulos.</p>
                <ArrowLink onClick={() => go('coste')}>Revisar la desviación</ArrowLink>
              </div>
            </div>
            <ProductPreview onNavigate={go} />
            <div className="landing-product-foot">
              <span className="flp-mono">Demo interactiva · La última función</span>
              <ArrowLink onClick={() => go('panel')}>Entrar al proyecto completo (demo clásica)</ArrowLink>
            </div>
          </Container>
        </section>

        <section id="modulos" className="landing-section landing-modules-section" aria-labelledby="landing-modules-title">
          <Container>
            <div className="landing-section-intro">
              <h2 id="landing-modules-title" className="flp-title">
                Para decidir durante el rodaje.
              </h2>
              <p>Del pedido a la factura, con cada gasto vinculado al proyecto.</p>
            </div>
            <div className="landing-module-list">
              {MODULES.map(({ name, detail, route, Icon }) => (
                <button className="landing-module-row" key={name} type="button" onClick={() => go(route)}>
                  <Icon size={20} />
                  <span>
                    <strong>{name}</strong>
                    <small>{detail}</small>
                  </span>
                  <IconChevronRight size={17} />
                </button>
              ))}
            </div>
          </Container>
        </section>

        <section id="documental" className="landing-section landing-document-section" aria-labelledby="landing-document-title">
          <Container className="landing-document-grid">
            <div className="landing-document-copy">
              <Kicker className="text-flp-muted">Fiscalidad</Kicker>
              <h2 id="landing-document-title" className="flp-title">
                La deducción también se defiende con papeles.
              </h2>
              <p>Qué falta, quién lo aporta y qué bloquea el cierre. Tu fiscalista revisa y firma.</p>
              <ArrowLink onClick={() => go('documental')}>Revisar el dossier fiscal</ArrowLink>
            </div>
            <div className="landing-document-sheet">
              <div className="landing-sheet-top">
                <span className="flp-kicker">Expediente fiscal</span>
                <strong>La última función</strong>
              </div>
              <div className="landing-sheet-summary">
                <div>
                  <strong>42</strong>
                  <span>requeridos</span>
                </div>
                <div>
                  <strong>31</strong>
                  <span>completos</span>
                </div>
                <div>
                  <strong>3</strong>
                  <span>bloqueantes</span>
                </div>
              </div>
              <div className="landing-sheet-list">
                {[
                  ['Certificado cultural ICAA', 'Productora · vence 05/06/2026', 'error'],
                  ['Justificantes de pago', 'Jefe de producción · vence 14/06/2026', 'error'],
                  ['Contrato de coproducción', 'Legal · vence 21/06/2026', 'review'],
                ].map(([doc, meta, estado]) => (
                  <div key={doc}>
                    <span>
                      {doc}
                      <small>{meta}</small>
                    </span>
                    <StateChip state={estado} />
                  </div>
                ))}
              </div>
              <ArrowLink className="landing-sheet-link" onClick={() => go('documental')}>
                Abrir el expediente
              </ArrowLink>
            </div>
          </Container>
        </section>

        <section id="despachos" className="landing-section landing-fiscal-section flp-dark" aria-labelledby="landing-fiscal-title">
          <Container className="landing-fiscal-grid">
            <div>
              <Kicker className="text-flp-muted">Despachos</Kicker>
              <h2 id="landing-fiscal-title" className="flp-title">
                Para quien tiene que firmar con criterio.
              </h2>
              <p className="flp-body text-flp-muted">Cálculos y evidencias ordenados por proyecto. El fiscalista revisa y firma.</p>
              <FilmpilotButton variant="secondary" size="lg" onClick={() => go('despacho')} iconAfter={IconChevronRight}>
                Ver la consola de despacho
              </FilmpilotButton>
            </div>
            <div className="landing-fiscal-list">
              <div className="landing-fiscal-list-heading flp-kicker">
                <span>Productora</span>
                <span>Documentación</span>
              </div>
              {[
                ['Candilejas Films', 'done', 'Completa'],
                ['Costa Norte AIE', 'review', 'Pendiente'],
                ['Nébula Studio', 'done', 'Completa'],
              ].map(([name, estado, etiqueta]) => (
                <div key={name}>
                  <strong>{name}</strong>
                  <StateChip state={estado}>{etiqueta}</StateChip>
                </div>
              ))}
              <small className="flp-mono">Vista auditor · 28 clientes activos en la demo</small>
            </div>
          </Container>
        </section>

        <section id="perfiles" className="landing-section landing-access-section" aria-labelledby="landing-access-title">
          <Container>
            <div className="landing-section-intro">
              <h2 id="landing-access-title" className="flp-title">
                Entra por tu trabajo.
              </h2>
              <p>Explora el proyecto demo desde tu función.</p>
            </div>
            <div className="landing-access-grid">
              {[
                ['Productora', 'Gestiona presupuesto, compras, gasto y caja.', 'panel'],
                ['Fiscalista', 'Revisa expedientes y documentación por cliente.', 'despacho'],
                ['Incentivos', 'Compara territorios, deducción y ayudas.', 'incentivos'],
              ].map(([name, detail, route]) => (
                <button key={name} type="button" onClick={() => go(route)}>
                  <span className="flp-kicker">{name}</span>
                  <p>{detail}</p>
                  <strong>
                    Explorar <IconChevronRight size={17} />
                  </strong>
                </button>
              ))}
            </div>
          </Container>
        </section>

        <section id="faq" className="landing-section landing-faq-section" aria-labelledby="landing-faq-title">
          <Container className="landing-faq-grid">
            <h2 id="landing-faq-title" className="flp-title">
              Preguntas frecuentes.
            </h2>
            <div>
              {FAQ.map(([question, answer], index) => (
                <div className="landing-faq-item" key={question}>
                  <h3>
                    <button type="button" aria-expanded={openFaq === index} aria-controls={`landing-faq-${index}`} onClick={() => setOpenFaq((current) => (current === index ? -1 : index))}>
                      {question}
                      <IconChevronDown size={20} className={openFaq === index ? 'is-open' : ''} />
                    </button>
                  </h3>
                  <p id={`landing-faq-${index}`} hidden={openFaq !== index}>
                    {answer}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className="landing-final" aria-labelledby="landing-final-title">
          <Container className="landing-final-inner">
            <Kicker className="text-flp-muted">Prototipo · datos de ejemplo</Kicker>
            <h2 id="landing-final-title" className="flp-title">
              Los agentes preparan.
              <br />
              Tú decides el siguiente paso.
            </h2>
            <div className="landing-final-actions">
              <FilmpilotButton variant="primary" size="lg" onClick={() => go('agentes')} iconAfter={IconChevronRight}>
                Probar los agentes
              </FilmpilotButton>
              <FilmpilotButton variant="secondary" size="lg" onClick={() => go('panel')}>
                Abrir la demo clásica
              </FilmpilotButton>
            </div>
          </Container>
        </section>
      </main>

      <footer className="landing-footer">
        <Container>
          <div className="landing-footer-main">
            <div>
              <FilmpilotLogo width={150} />
              <p>Inteligencia en producción para cine, series y televisión.</p>
            </div>
            <nav aria-label="Enlaces de producto (demo clásica)">
              {[
                ['Agentes', 'agentes'],
                ['Presupuesto', 'presupuesto'],
                ['Incentivos', 'incentivos'],
                ['Ayudas', 'ayudas'],
                ['Financiación', 'tesoreria'],
                ['Costes', 'coste'],
                ['Dossier fiscal', 'documental'],
              ].map(([label, route]) => (
                <button key={route} type="button" onClick={() => go(route)}>
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="landing-footer-bottom">
            <span>Estimación orientativa. No sustituye el criterio de tu asesor fiscal. La foto es una imagen conceptual.</span>
            <a href="#landing-title">Volver arriba ↑</a>
          </div>
        </Container>
      </footer>
    </div>
  )
}
