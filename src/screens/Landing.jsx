// Portada de Filmpilot (Brand Kit v1). Todo lo que se pulsa lleva al prototipo de
// agentes: directamente, al recorrido guiado o con una pregunta de ejemplo.

import { useEffect, useRef, useState } from 'react'
import './Landing.css'
import { AgentGlyph, FilmpilotButton, FilmpilotLogo, Kicker, ProductionPhoto, StateChip } from '../brand/Filmpilot.jsx'
import { CinematicSymbol } from '../brand/CinematicSymbol.jsx'
import { FAMILIAS, ORDEN_FAMILIAS } from '../agentes/agentes.js'
import { TOTALES } from '../lib/data.js'
import { eur, pctSigned } from '../lib/format.js'
import { IconChevronDown, IconChevronRight, IconClose, IconCoste, IconIncentivos, IconMenu, IconPresupuesto, IconSearch, IconTesoreria } from '../components/icons.jsx'

// Vista estática del prototipo de agentes (no importa el motor para no cargarlo en la portada).
const AGENTS_PREVIEW = [
  { familia: 'documentacion', nombre: 'Facturas', tarea: 'Lee los cuatro documentos de la bandeja', estado: 'done' },
  { familia: 'financiacion', nombre: 'Conciliación', tarea: 'Cuadra cada factura con su pedido', estado: 'done' },
  { familia: 'presupuesto', nombre: 'Control de costes', tarea: 'Escenografía supera el umbral del 8 %', estado: 'done' },
  { familia: 'financiacion', nombre: 'Excepciones', tarea: 'Una compra de más de 10.000 € espera tu aprobación', estado: 'review' },
]

const NAV = [
  { label: 'Agentes', href: '#agentes' },
  { label: 'Cómo funciona', href: '#flujo' },
  { label: 'Fiscalidad', href: '#documental' },
  { label: 'Preguntas', href: '#faq' },
]

// Cada etapa abre los agentes con una pregunta. Las cifras son las que responden ellos
// (mismos datos de ejemplo de «La última función»).
const FLOW = [
  { number: '01', name: 'Presupuesto', detail: 'Una base por capítulos ICAA para todo el proyecto.', value: eur(TOTALES.presupuesto), nota: 'presupuesto total', pregunta: '¿Cómo vamos?', Icon: IconPresupuesto },
  { number: '02', name: 'Incentivos', detail: 'Deducción por territorio y ayudas en una misma cuenta.', value: '650.000 €', nota: 'deducción estimada', pregunta: '¿Cuánto supondría llegar al 50 % de gasto en Canarias?', Icon: IconIncentivos },
  { number: '03', name: 'Financiación', detail: 'Cobros, pagos y caja semana a semana.', value: '−54.000 €', nota: 'saldo mínimo previsto', pregunta: '¿Cómo cerraremos el proyecto y llegamos con la caja?', Icon: IconTesoreria },
  { number: '04', name: 'Rodaje', detail: 'Compras, gasto real y coste estimado final antes del cierre.', value: pctSigned(TOTALES.desviacionPct), nota: 'sobre presupuesto', pregunta: '¿Por qué se desvía Escenografía?', Icon: IconCoste },
  { number: '05', name: 'Justificación', detail: 'Cada gasto y documento conectado a la deducción.', value: '3 bloqueantes', nota: 'en el dossier fiscal', pregunta: '¿Qué bloquea el dossier fiscal?', Icon: IconSearch },
]

// Los mismos bloqueantes que enseña el agente de Cumplimiento.
const DOSSIER = [
  ['Certificado cultural ICAA', 'Productora · vence 05/06/2026'],
  ['Justificantes de pago vinculados a facturas', 'Line producer · vence 14/06/2026 · faltan 6'],
  ['Coste reconocido por capítulos ICAA', 'Fiscalista · vence 20/06/2026'],
]

const FAQ = [
  ['¿Qué puedo probar aquí?', 'Una demo de los agentes con datos de ejemplo de «La última función». Pides un informe, una explicación o el parte de riesgos del rodaje y ves cómo trabaja cada agente y qué te deja decidir. Todo es simulado: no hay un modelo de lenguaje detrás y no se envía nada.'],
  ['¿Los agentes deciden por mí?', 'No. Hacen solos lo rutinario y reversible, como contabilizar una factura que casa con su pedido. Lo dudoso lo proponen y lo que compromete dinero o tiene riesgo fiscal espera la aprobación de la persona responsable.'],
  ['¿Sustituye a mi fiscalista?', 'No. Tu fiscalista revisa, valida y firma. Filmpilot prepara cálculos, evidencias y trazabilidad para que esa revisión sea más clara.'],
  ['¿Puedo trabajar con cine, series y documental?', 'El prototipo contempla distintas tipologías, territorios, presupuestos por capítulos ICAA y requisitos de coproducción.'],
  ['¿Cómo se procesan las facturas?', 'La factura electrónica se lee como dato estructurado. Los PDF y tickets se procesan con OCR y los casos de baja confianza quedan señalados para revisión.'],
]

const movimientoReducido = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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

// Capas de la banda de foto, de lejos a cerca: la foto (más lenta que la página y con
// un leve acercamiento), el texto (algo más rápido, cada línea a su ritmo) y dos bandas
// de cine que se cierran cuando la sección llega al centro. Solo se mueve con el scroll.
const CAPAS_TEXTO = [1, 0.86, 0.72, 0.5, 0.36]

function BandaFoto() {
  const raiz = useRef(null)
  const foto = useRef(null)
  const capas = useRef([])
  const bandas = useRef([])

  useEffect(() => {
    const el = raiz.current
    if (!el || movimientoReducido()) return
    let raf = null
    let visible = false
    const pintar = () => {
      raf = null
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 cuando la sección asoma por abajo, 1 cuando sale por arriba.
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
      const c = p - 0.5
      foto.current.style.transform = `translate3d(0, ${(c * 14).toFixed(2)}%, 0) scale(${(1.1 - p * 0.07).toFixed(4)})`
      const aparece = Math.min(1, Math.max(0, (p - 0.14) / 0.24))
      capas.current.forEach((n, i) => {
        if (!n) return
        n.style.transform = `translate3d(0, ${(-c * CAPAS_TEXTO[i] * 84).toFixed(1)}px, 0)`
        n.style.opacity = (0.25 + 0.75 * aparece).toFixed(3)
      })
      const cierre = Math.min(1, Math.max(0, (Math.abs(c) - 0.1) / 0.32))
      bandas.current.forEach((n) => n && (n.style.transform = `scaleY(${cierre.toFixed(3)})`))
    }
    const pedir = () => {
      if (raf === null && visible) raf = requestAnimationFrame(pintar)
    }
    const io = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting
      pedir()
    })
    io.observe(el)
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
    }
  }, [])

  const capa = (i) => (n) => (capas.current[i] = n)
  return (
    <section ref={raiz} className="landing-photo-band flp-dark" aria-labelledby="landing-photo-title">
      <div ref={foto} className="landing-photo-media">
        <ProductionPhoto sizes="100vw" />
      </div>
      <span ref={(n) => (bandas.current[0] = n)} className="landing-photo-banda is-arriba" aria-hidden="true" />
      <span ref={(n) => (bandas.current[1] = n)} className="landing-photo-banda is-abajo" aria-hidden="true" />
      <Container className="landing-photo-copy">
        <h2 id="landing-photo-title" className="flp-title">
          <span ref={capa(0)} className="landing-photo-capa">
            Menos
          </span>
          <span ref={capa(1)} className="landing-photo-capa">
            seguimiento.
          </span>
          <span ref={capa(2)} className="landing-photo-capa">
            Más producción.
          </span>
        </h2>
        <p ref={capa(3)} className="landing-photo-capa flp-body">
          Los agentes persiguen facturas, cuadran pedidos y vigilan el plan de rodaje. Tu equipo dedica el tiempo a producir.
        </p>
        <small ref={capa(4)} className="landing-photo-capa flp-mono">
          Imagen conceptual
        </small>
      </Container>
    </section>
  )
}

export default function Landing({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const menuButtonRef = useRef(null)
  const headerRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    // Tocar fuera de la cabecera también cierra el menú.
    const closeOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [menuOpen])
  const clearSectionHash = () => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
  // Abre los agentes; con { tour } empieza el recorrido y con { pregunta } la hace al entrar.
  const abrirAgentes = (contexto) => {
    setMenuOpen(false)
    clearSectionHash()
    onNavigate('agentes', contexto)
  }

  return (
    <div className="landing-page flp-theme">
      <a className="landing-skip-link" href="#landing-main">
        Saltar al contenido
      </a>
      <header ref={headerRef} className="landing-header">
        <Container className="landing-header-inner">
          <button
            type="button"
            className="landing-logo"
            onClick={() => {
              clearSectionHash()
              window.scrollTo({ top: 0, behavior: movimientoReducido() ? 'auto' : 'smooth' })
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
            <FilmpilotButton variant="carbon" size="sm" className="landing-header-cta" onClick={() => abrirAgentes()} iconAfter={IconChevronRight}>
              Probar los agentes
            </FilmpilotButton>
            <button ref={menuButtonRef} className="landing-menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="landing-mobile-nav">
              {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
            </button>
          </div>
        </Container>
        <nav
          id="landing-mobile-nav"
          className={`landing-mobile-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="Navegación móvil"
          aria-hidden={!menuOpen}
          inert={menuOpen ? undefined : ''}
          onBlur={(e) => {
            // Si el foco sale del menú (y no vuelve a su botón), se cierra: no tapa lo enfocado.
            if (menuOpen && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== menuButtonRef.current) setMenuOpen(false)
          }}
        >
          {NAV.map(({ label, href }) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
              <IconChevronDown size={16} aria-hidden="true" />
            </a>
          ))}
          <div className="landing-mobile-actions">
            <FilmpilotButton variant="primary" onClick={() => abrirAgentes()} iconAfter={IconChevronRight}>
              Probar los agentes
            </FilmpilotButton>
            <FilmpilotButton variant="secondary" onClick={() => abrirAgentes({ tour: true })}>
              Empezar el recorrido guiado
            </FilmpilotButton>
          </div>
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
              <p className="landing-hero-description">Para productoras de cine y series: los agentes preparan el presupuesto, vigilan el coste y la caja y ordenan los incentivos fiscales. Tú apruebas cada paso.</p>
              <div className="landing-hero-actions">
                <FilmpilotButton variant="primary" size="lg" onClick={() => abrirAgentes()} iconAfter={IconChevronRight}>
                  Probar los agentes
                </FilmpilotButton>
                <FilmpilotButton variant="secondary" size="lg" href="#agentes" iconAfter={IconChevronDown}>
                  Ver cómo trabajan
                </FilmpilotButton>
              </div>
              <p className="landing-hero-caption">
                <span className="flp-mono">Prototipo</span> Datos de ejemplo: todas las cifras son de «La última función», un largometraje con 15 de sus 30 jornadas rodadas.
              </p>
            </div>
            <div className="landing-hero-art">
              <CinematicSymbol />
            </div>
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
              <h3 className="landing-families-titulo flp-kicker text-flp-muted">Tres familias de agentes</h3>
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
                <FilmpilotButton variant="primary" size="lg" onClick={() => abrirAgentes()} iconAfter={IconChevronRight}>
                  Probar los agentes
                </FilmpilotButton>
                <FilmpilotButton variant="ghost" size="lg" onClick={() => abrirAgentes({ tour: true })}>
                  Empezar el recorrido guiado
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
                      <strong>
                        {a.nombre} <span className="landing-agents-familia">· {FAMILIAS[a.familia].nombre}</span>
                      </strong>
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

        <BandaFoto />

        <section id="flujo" className="landing-section landing-flow-section" aria-labelledby="landing-flow-title">
          <Container>
            <div className="landing-section-intro">
              <div>
                <Kicker className="text-flp-muted">Cómo funciona</Kicker>
                <h2 id="landing-flow-title" className="flp-title">
                  Del presupuesto al último justificante.
                </h2>
              </div>
              <p>Una partida cambia la deducción, la caja y el coste final. Filmpilot lo conecta en cinco etapas: pulsa una y se la preguntas a los agentes.</p>
            </div>
            <div className="landing-flow-list">
              {FLOW.map(({ number, name, detail, value, nota, pregunta, Icon }) => (
                <button key={number} type="button" className="landing-flow-row" onClick={() => abrirAgentes({ pregunta })}>
                  <span className="landing-flow-number">{number}</span>
                  <span className="landing-flow-icon">
                    <Icon size={22} />
                  </span>
                  <span className="landing-flow-name">{name}</span>
                  <span className="landing-flow-detail">
                    {detail}
                    <span className="landing-flow-pregunta">Pregúntales: «{pregunta}»</span>
                  </span>
                  <span className="landing-flow-cifra">
                    <strong>{value}</strong>
                    <small>{nota}</small>
                  </span>
                  <IconChevronRight className="landing-flow-arrow" size={19} aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="landing-example-note">Ejemplo: «La última función», largometraje de ficción con un presupuesto de {eur(TOTALES.presupuesto)}.</p>
          </Container>
        </section>

        <section id="documental" className="landing-section landing-document-section" aria-labelledby="landing-document-title">
          <Container className="landing-document-grid">
            <div className="landing-document-copy">
              <Kicker className="text-flp-muted">Fiscalidad</Kicker>
              <h2 id="landing-document-title" className="flp-title">
                La deducción también se defiende con papeles.
              </h2>
              <p>El agente de Cumplimiento dice qué falta, quién lo aporta y qué bloquea el cierre. Tu fiscalista revisa y firma.</p>
              <ArrowLink onClick={() => abrirAgentes({ pregunta: '¿Qué bloquea el dossier fiscal?' })}>Preguntar qué bloquea el dossier</ArrowLink>
            </div>
            <div className="landing-document-sheet">
              <div className="landing-sheet-top">
                <span className="flp-kicker">Dossier fiscal</span>
                <strong>La última función</strong>
              </div>
              <p className="landing-sheet-resumen">
                <strong>3</strong> bloqueantes
              </p>
              <div className="landing-sheet-list">
                {DOSSIER.map(([doc, meta]) => (
                  <div key={doc}>
                    <span>
                      {doc}
                      <small>{meta}</small>
                    </span>
                    <StateChip state="error" />
                  </div>
                ))}
              </div>
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
                      <IconChevronDown size={20} className={openFaq === index ? 'is-open' : ''} aria-hidden="true" />
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
              Pruébalo con «La última función».
            </h2>
            <p className="flp-body text-flp-muted">Pide el informe de la semana y decide tú lo que espera aprobación. Unos minutos, sin registrarte.</p>
            <div className="landing-final-actions">
              <FilmpilotButton variant="primary" size="lg" onClick={() => abrirAgentes()} iconAfter={IconChevronRight}>
                Probar los agentes
              </FilmpilotButton>
              <FilmpilotButton variant="secondary" size="lg" onClick={() => abrirAgentes({ tour: true })}>
                Empezar el recorrido guiado
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
            <nav aria-labelledby="landing-pie-filmpilot">
              <h2 id="landing-pie-filmpilot" className="flp-kicker text-flp-muted">
                Filmpilot
              </h2>
              <button type="button" onClick={() => abrirAgentes()}>
                Probar los agentes
              </button>
              <button type="button" onClick={() => abrirAgentes({ tour: true })}>
                Recorrido guiado
              </button>
            </nav>
          </div>
          <div className="landing-footer-bottom">
            <span>Estimación orientativa: no sustituye el criterio de tu fiscalista. La foto es una imagen conceptual.</span>
            <a href="#landing-title">
              Volver arriba <span aria-hidden="true">↑</span>
            </a>
          </div>
        </Container>
      </footer>
    </div>
  )
}
