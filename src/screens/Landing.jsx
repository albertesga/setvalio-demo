import { useEffect, useRef, useState } from 'react'
import './Landing.css'
import { LandingBrand, LandingMark } from '../components/LandingBrand.jsx'
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

const BRAND_IMAGES = `${import.meta.env.BASE_URL}brand/setvalio/images`

// Vista estática del prototipo de agentes (no importa el motor para no cargarlo en la portada).
const AGENTS_PREVIEW = [
  ['FA', 'Facturas', 'Lee los documentos de la bandeja', 'Hecho'],
  ['CN', 'Conciliación', 'Cuadra cada factura con su pedido', 'Hecho'],
  ['CC', 'Control de costes', 'Escenografía queda fuera del umbral', 'Hecho'],
  ['EX', 'Excepciones', 'Una compra de más de 10.000 € espera aprobación', 'Tu decisión'],
]

const NAV = [
  { label: 'Cómo funciona', href: '#flujo' },
  { label: 'Producto', href: '#producto' },
  { label: 'Agentes', href: '#agentes' },
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
  ['¿Qué problema resuelve SetValio?', 'Conecta presupuesto, incentivos, ayudas, financiación, gasto y documentación fiscal. Cuando cambia una cifra, puedes ver cómo afecta al resto del proyecto.'],
  ['¿Sustituye a mi fiscalista?', 'No. Tu fiscalista revisa, valida y firma. SetValio prepara cálculos, evidencias y trazabilidad para que esa revisión sea más clara.'],
  ['¿Puedo trabajar con cine, series y documental?', 'El prototipo contempla distintas tipologías, territorios, presupuestos por capítulos ICAA y requisitos de coproducción.'],
  ['¿Los agentes deciden por mí?', 'No. Hacen solos lo rutinario y reversible, como contabilizar una factura que casa con su pedido. Lo dudoso lo proponen y lo que compromete dinero o tiene riesgo fiscal espera la aprobación de la persona responsable. Tu fiscalista revisa y firma.'],
  ['¿Cómo se procesan las facturas?', 'La factura electrónica se lee como dato estructurado. Los PDF y tickets se procesan con OCR y los casos de baja confianza quedan señalados para revisión.'],
]

function Container({ children, className = '' }) {
  return <div className={`landing-container ${className}`}>{children}</div>
}

function ArrowLink({ children, onClick, light = false, className = '' }) {
  return (
    <button type="button" onClick={onClick} className={`landing-arrow-link ${light ? 'landing-arrow-link--light' : ''} ${className}`}>
      {children}<IconChevronRight size={17} aria-hidden="true" />
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
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setChartVisible(true)
      observer.disconnect()
    }, { threshold: 0.15 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={previewRef} className={`landing-product-preview${chartVisible ? ' is-visible' : ''}`} aria-label="Vista de ejemplo de La última función">
      <div className="landing-preview-rail" aria-hidden="true">
        <span className="landing-preview-monogram"><LandingMark size={29} /></span>
        <span className="landing-preview-rail-lines"><i /><i /><i /><i /></span>
      </div>
      <div className="landing-preview-main">
        <div className="landing-preview-topline">
          <span>Proyecto / La última función</span>
          <span>Rodaje · día 15 de 30</span>
        </div>
        <div className="landing-preview-heading">
          <div>
            <span className="landing-preview-kicker">Resumen financiero</span>
            <h3>La última función</h3>
            <p>La decisión de hoy: contener la proyección a cierre.</p>
          </div>
          <span className="landing-preview-status"><span />En rodaje</span>
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
              <span className="landing-preview-legend">Previsto <i /> Real <i /></span>
            </div>
            <svg viewBox="0 0 640 160" role="img" aria-label="El gasto real supera ligeramente el previsto desde el día 10">
              <path d="M0 132 H640 M0 88 H640 M0 44 H640" stroke="var(--lv-sand)" strokeWidth="1" />
              <path d="M0 146 L640 24" stroke="#9F8C98" strokeWidth="2" fill="none" strokeDasharray="5 5" />
              <path className="landing-preview-actual" pathLength="1" d="M0 145 L40 137 L80 131 L120 120 L160 114 L200 102 L240 96 L280 88 L320 79 L360 67 L400 57" stroke="var(--lv-plum)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle className="landing-preview-endpoint" cx="400" cy="57" r="6" fill="var(--lv-lime)" stroke="var(--lv-plum)" strokeWidth="2" />
              <text x="0" y="157">Día 1</text><text x="383" y="157">Día 15</text><text x="600" y="157">Día 30</text>
            </svg>
          </div>
          <div className="landing-preview-alerts">
            <div className="landing-preview-panel-heading">Requiere decisión</div>
            <button type="button" onClick={() => onNavigate('coste')}><b>07</b><span>Viajes y comidas<br /><small>+12 % sobre presupuesto</small></span><IconChevronRight size={15} /></button>
            <button type="button" onClick={() => onNavigate('documental')}><b>!</b><span>Certificado cultural<br /><small>Bloquea el dossier fiscal</small></span><IconChevronRight size={15} /></button>
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
  const heroRef = useRef(null)
  const cameraRef = useRef(null)
  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    const original = themeMeta?.getAttribute('content')
    themeMeta?.setAttribute('content', '#311B2E')
    return () => {
      if (original != null) themeMeta?.setAttribute('content', original)
    }
  }, [])
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
  useEffect(() => {
    const hero = heroRef.current
    const camera = cameraRef.current
    if (!hero || !camera) return

    const image = camera.querySelector('img')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = null
    let start = 0
    let distance = 1

    const renderCamera = () => {
      frame = null
      if (reducedMotion.matches) return
      const progress = Math.max(0, Math.min(1, (window.scrollY - start) / distance))
      const x = -progress * 4
      const y = -0.6 + progress * 1.2
      const scale = 1.13 + progress * 0.11
      camera.style.transform = `translate3d(${x.toFixed(2)}%, ${y.toFixed(2)}%, 0) scale(${scale.toFixed(3)})`
    }
    const queueCamera = () => {
      if (frame === null && !reducedMotion.matches) frame = window.requestAnimationFrame(renderCamera)
    }
    const measureHero = () => {
      const rect = hero.getBoundingClientRect()
      const headerHeight = document.querySelector('.landing-header')?.offsetHeight ?? 0
      start = rect.top + window.scrollY - headerHeight
      distance = Math.max(1, rect.height)
      queueCamera()
    }
    const onMotionChange = () => {
      if (reducedMotion.matches) {
        if (frame !== null) window.cancelAnimationFrame(frame)
        frame = null
        camera.style.removeProperty('transform')
      } else {
        measureHero()
      }
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureHero) : null
    resizeObserver?.observe(hero)
    const visibilityObserver = typeof IntersectionObserver !== 'undefined' && image
      ? new IntersectionObserver(([entry]) => {
        image.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
      }, { rootMargin: '80px' })
      : null
    visibilityObserver?.observe(hero)
    window.addEventListener('scroll', queueCamera, { passive: true })
    window.addEventListener('resize', measureHero)
    reducedMotion.addEventListener('change', onMotionChange)
    measureHero()

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      visibilityObserver?.disconnect()
      window.removeEventListener('scroll', queueCamera)
      window.removeEventListener('resize', measureHero)
      reducedMotion.removeEventListener('change', onMotionChange)
      camera.style.removeProperty('transform')
      image?.style.removeProperty('animation-play-state')
    }
  }, [])
  const clearSectionHash = () => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
  const go = (route, context) => {
    setMenuOpen(false)
    clearSectionHash()
    onNavigate(route, context)
  }

  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">Saltar al contenido</a>
      <header className="landing-header">
        <Container className="landing-header-inner">
          <button type="button" className="landing-logo" onClick={() => { clearSectionHash(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="SetValio, volver al inicio"><LandingBrand compact decorative /></button>
          <nav className="landing-nav" aria-label="Navegación principal">
            {NAV.map(({ label, href }) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <div className="landing-header-actions">
            <button className="landing-demo-link" type="button" onClick={() => go('panel')}>Abrir demo</button>
            <button className="landing-header-cta" type="button" onClick={() => go('incentivos')}>Optimizar incentivos <IconChevronRight size={16} /></button>
            <button ref={menuButtonRef} className="landing-menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="landing-mobile-nav">
              {menuOpen ? <IconClose size={23} /> : <IconMenu size={23} />}
            </button>
          </div>
        </Container>
        <nav id="landing-mobile-nav" className={`landing-mobile-nav${menuOpen ? ' is-open' : ''}`} aria-label="Navegación móvil" aria-hidden={!menuOpen} inert={menuOpen ? undefined : ''}>
          {NAV.map(({ label, href }) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<IconChevronRight size={16} /></a>)}
          <button type="button" onClick={() => go('agentes')}>Probar el asistente <IconChevronRight size={16} /></button>
          <button type="button" onClick={() => go('panel')}>Abrir demo <IconChevronRight size={16} /></button>
        </nav>
      </header>

      <main id="landing-main">
        <section ref={heroRef} className="landing-hero" aria-labelledby="landing-title">
          <div ref={cameraRef} className="landing-hero-camera">
            <picture className="landing-hero-picture">
              <source
                type="image/webp"
                srcSet={`${BRAND_IMAGES}/rodaje-mediterraneo-768.webp 768w, ${BRAND_IMAGES}/rodaje-mediterraneo-1280.webp 1280w, ${BRAND_IMAGES}/rodaje-mediterraneo-1672.webp 1672w`}
                sizes="100vw"
              />
              <img className="landing-hero-image" src={`${BRAND_IMAGES}/rodaje-mediterraneo.jpg`} alt="Equipo de cámara y sonido durante un rodaje junto al mar" width="1672" height="941" loading="eager" fetchpriority="high" decoding="async" />
            </picture>
          </div>
          <div className="landing-hero-shade" aria-hidden="true" />
          <Container className="landing-hero-inner">
            <div className="landing-hero-topline"><span>Control financiero para producciones audiovisuales</span><span>Para cine y televisión</span></div>
            <div className="landing-hero-copy">
              <h1 id="landing-title">Libertad para crear.<br /><em>Claridad para producir.</em></h1>
              <p className="landing-hero-description">Presupuestos, costes, financiación e incentivos. Una visión clara para decidir en cada etapa de tu producción.</p>
              <div className="landing-hero-actions">
                <button type="button" className="landing-button landing-button--lime" onClick={() => go('panel')}>Explorar la demo <IconChevronRight size={18} /></button>
                <a href="#flujo" className="landing-hero-text-link">Ver cómo funciona <IconChevronDown size={17} /></a>
              </div>
            </div>
            <div className="landing-hero-caption"><span>PROYECTO DEMO</span> La última función <span className="landing-caption-divider" /> Largometraje · día 15/30</div>
          </Container>
        </section>

        <div className="landing-proof-strip">
          <Container className="landing-proof-inner">
            <p>Un presupuesto.<br /><strong>Todas las decisiones.</strong></p>
            <span>Calcula el retorno</span><span>Anticipa la caja</span><span>Controla el rodaje</span><span>Prepara la justificación</span>
          </Container>
        </div>

        <section id="flujo" className="landing-section landing-flow-section">
          <Container>
            <div className="landing-section-intro landing-section-intro--split">
              <h2>Del presupuesto al <em>último justificante.</em></h2>
              <div><p>Una partida cambia la deducción, la caja y el coste final.</p><ArrowLink onClick={() => go('presupuesto')}>Ver presupuesto</ArrowLink></div>
            </div>
            <div className="landing-flow-list">
              {FLOW.map(({ number, name, detail, value, route, Icon }) => (
                <button key={number} type="button" className="landing-flow-row" onClick={() => go(route)}>
                  <span className="landing-flow-number">{number}</span>
                  <span className="landing-flow-icon"><Icon size={23} /></span>
                  <span className="landing-flow-name">{name}</span>
                  <span className="landing-flow-detail">{detail}</span>
                  <strong>{value}</strong><IconChevronRight className="landing-flow-arrow" size={19} />
                </button>
              ))}
            </div>
            <p className="landing-example-note">Ejemplo ilustrativo: “La última función”, largometraje de ficción con presupuesto de {eur(TOTALES.presupuesto)}.</p>
          </Container>
        </section>

        <section id="producto" className="landing-section landing-product-section">
          <Container>
            <div className="landing-section-intro landing-section-intro--split">
              <h2>Una vista para saber <em>dónde actuar hoy.</em></h2>
              <div><p>El cierre previsto supera el presupuesto en {eur(TOTALES.desviacion)}. Aún puedes actuar sobre compras y capítulos.</p><ArrowLink onClick={() => go('coste')}>Revisar desviación</ArrowLink></div>
            </div>
            <ProductPreview onNavigate={go} />
            <div className="landing-product-foot"><span>Demo interactiva · La última función</span><button type="button" onClick={() => go('panel')}>Entrar al proyecto completo <IconChevronRight size={17} /></button></div>
          </Container>
        </section>

        <section id="agentes" className="landing-section landing-agents-section" aria-labelledby="landing-agents-title">
          <Container className="landing-agents-grid">
            <div className="landing-agents-copy">
              <span className="landing-agents-kicker">Nuevo · Prototipo conversacional</span>
              <h2 id="landing-agents-title">Agentes que preparan. <em>Tú decides.</em></h2>
              <p>Pide el informe semanal, la explicación de una desviación o el estado del dossier fiscal. Cada agente calcula, cuadra o revisa su parte y enseña cómo lo ha hecho. Lo que compromete dinero o tiene riesgo fiscal espera tu aprobación.</p>
              <ul className="landing-agents-levels">
                <li><b>Ejecuta</b><span>Contabiliza la factura que casa con su pedido.</span></li>
                <li><b>Propone</b><span>Sugiere la partida de un ticket dudoso.</span></li>
                <li><b>Pide aprobación</b><span>Una compra que deja un capítulo por encima del umbral.</span></li>
              </ul>
              <div className="landing-agents-actions">
                <button type="button" className="landing-button landing-button--lime" onClick={() => go('agentes')}>Probar el asistente <IconChevronRight size={18} /></button>
                <ArrowLink light onClick={() => go('agentes', { tour: true })}>Ver recorrido guiado</ArrowLink>
              </div>
              <small>Demo con agentes simulados y datos de ejemplo: no hay un modelo de lenguaje detrás y no se envía nada.</small>
            </div>
            <div className="landing-agents-preview" role="img" aria-label="Ejemplo: al pedir el informe semanal, Facturas, Conciliación y Control de costes hacen su parte y Excepciones deja una compra de más de 10.000 euros pendiente de tu decisión">
              <div className="landing-agents-ask">Prepárame el informe semanal de coste.</div>
              <ol>
                {AGENTS_PREVIEW.map(([code, name, task, status]) => (
                  <li key={code}>
                    <span className="landing-agents-tile">{code}</span>
                    <span><strong>{name}</strong><small>{task}</small></span>
                    <b className={status === 'Hecho' ? 'is-done' : 'is-waiting'}>{status === 'Hecho' ? <IconCheck size={12} /> : null}{status}</b>
                  </li>
                ))}
              </ol>
              <div className="landing-agents-foot"><span>Coste estimado final</span><strong>{eur(TOTALES.cef)} · {pctSigned(TOTALES.desviacionPct)}</strong></div>
            </div>
          </Container>
        </section>

        <section id="modulos" className="landing-section landing-modules-section">
          <Container>
            <div className="landing-section-intro landing-section-intro--split">
              <h2>Para decidir durante el rodaje.</h2>
              <p>Del pedido a la factura, con cada gasto vinculado al proyecto.</p>
            </div>
            <div className="landing-module-list">
              {MODULES.map(({ name, detail, route, Icon }) => <button className="landing-module-row" key={name} type="button" onClick={() => go(route)}><Icon size={20} /><span><strong>{name}</strong><small>{detail}</small></span><IconChevronRight size={17} /></button>)}
            </div>
          </Container>
        </section>

        <section id="documental" className="landing-section landing-document-section">
          <Container className="landing-document-grid">
            <div className="landing-document-copy">
              <h2>La deducción también se defiende <em>con papeles.</em></h2>
              <p>Qué falta, quién lo aporta y qué bloquea el cierre. Tu fiscalista revisa y firma.</p>
              <ArrowLink onClick={() => go('documental')}>Revisar el dossier fiscal</ArrowLink>
            </div>
            <div className="landing-document-sheet">
              <div className="landing-sheet-top"><span>Expediente fiscal</span><strong>La última función</strong></div>
              <div className="landing-sheet-summary"><div><strong>42</strong><span>requeridos</span></div><div><strong>31</strong><span>completos</span></div><div><strong>3</strong><span>bloqueantes</span></div></div>
              <div className="landing-sheet-list">
                <div><span className="landing-sheet-dot landing-sheet-dot--red" /><span>Certificado cultural ICAA<small>Productora · vence 05/06/2026</small></span><b>Bloqueante</b></div>
                <div><span className="landing-sheet-dot landing-sheet-dot--red" /><span>Justificantes de pago<small>Jefe de producción · vence 14/06/2026</small></span><b>Bloqueante</b></div>
                <div><span className="landing-sheet-dot landing-sheet-dot--amber" /><span>Contrato de coproducción<small>Legal · vence 21/06/2026</small></span><b>Revisar</b></div>
              </div>
              <button type="button" onClick={() => go('documental')}>Abrir expediente <IconChevronRight size={17} /></button>
            </div>
          </Container>
        </section>

        <section id="despachos" className="landing-section landing-fiscal-section">
          <Container className="landing-fiscal-grid">
            <div><h2>Para quien tiene que firmar <em>con criterio.</em></h2><p>Cálculos y evidencias ordenados por proyecto. El fiscalista revisa y firma.</p><button className="landing-button landing-button--lime" type="button" onClick={() => go('despacho')}>Ver Consola Despacho <IconChevronRight size={18} /></button></div>
            <div className="landing-fiscal-list"><div className="landing-fiscal-list-heading"><span>Productora</span><span>Documentación</span></div>{[['Candilejas Films', 'Completa'], ['Costa Norte AIE', 'Pendiente'], ['Nébula Studio', 'Completa']].map(([name, status]) => <div key={name}><strong>{name}</strong><span className={status === 'Completa' ? 'is-complete' : 'is-pending'}>{status}</span></div>)}<small>Vista auditor · 28 clientes activos en la demo</small></div>
          </Container>
        </section>

        <section id="perfiles" className="landing-section landing-access-section">
          <Container>
            <div className="landing-section-intro landing-section-intro--split"><h2>Entra por tu trabajo.</h2><p>Explora el proyecto demo desde tu función.</p></div>
            <div className="landing-access-grid">
              {[['Productora', 'Gestiona presupuesto, compras, gasto y caja.', 'panel'], ['Fiscalista', 'Revisa expedientes y documentación por cliente.', 'despacho'], ['Incentivos', 'Compara territorios, deducción y ayudas.', 'incentivos']].map(([name, detail, route]) => <button key={name} type="button" onClick={() => go(route)}><span>{name}</span><p>{detail}</p><strong>Explorar <IconChevronRight size={17} /></strong></button>)}
            </div>
          </Container>
        </section>

        <section id="faq" className="landing-section landing-faq-section">
          <Container className="landing-faq-grid"><h2>Preguntas frecuentes.</h2><div>{FAQ.map(([question, answer], index) => <div className="landing-faq-item" key={question}><h3><button type="button" aria-expanded={openFaq === index} aria-controls={`landing-faq-${index}`} onClick={() => setOpenFaq((current) => current === index ? -1 : index)}>{question}<IconChevronDown size={20} className={openFaq === index ? 'is-open' : ''} /></button></h3><p id={`landing-faq-${index}`} hidden={openFaq !== index}>{answer}</p></div>)}</div></Container>
        </section>
      </main>

      <footer className="landing-footer"><Container><div className="landing-footer-main"><div><span className="landing-logo"><LandingBrand /></span><p>Control financiero para cine, series y televisión.</p></div><nav aria-label="Enlaces de producto">{[['Presupuesto', 'presupuesto'], ['Incentivos', 'incentivos'], ['Ayudas', 'ayudas'], ['Financiación', 'tesoreria'], ['Costes', 'coste'], ['Dossier fiscal', 'documental']].map(([label, route]) => <button key={route} type="button" onClick={() => go(route)}>{label}</button>)}</nav></div><div className="landing-footer-bottom"><span>Estimación orientativa. No sustituye el criterio de tu asesor fiscal.</span><a href="#landing-title">Volver arriba ↑</a></div></Container></footer>
    </div>
  )
}
