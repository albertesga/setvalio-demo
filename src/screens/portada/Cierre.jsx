// Cierre: la invitación a probar los agentes.

import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconChevronRight } from '../../components/icons.jsx'
import { Container } from './comun.jsx'

export function Cierre({ abrirAgentes }) {
  return (
    <section id="cierre" className="landing-final" aria-labelledby="landing-final-title">
      <Container className="landing-final-inner">
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
  )
}
