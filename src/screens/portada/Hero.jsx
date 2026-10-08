// Hero de la portada: claim, apoyo, CTA y la composición orbital en 3D.

import { FilmpilotButton, Kicker } from '../../brand/Filmpilot.jsx'
import { CinematicSymbol } from '../../brand/CinematicSymbol.jsx'
import { IconChevronDown, IconChevronRight } from '../../components/icons.jsx'
import { Container } from './comun.jsx'

export function Hero({ abrirAgentes }) {
  return (
    <section id="inicio" className="landing-hero" aria-labelledby="landing-title">
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
        </div>
        <div className="landing-hero-art">
          <CinematicSymbol />
        </div>
      </Container>
    </section>
  )
}
