// Cierre: la invitación a probar los agentes, con la claqueta de la toma (K1). Pulsar
// «Probar los agentes» es dar la acción: al pasar por encima, el palo se cierra.

import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconChevronRight } from '../../components/icons.jsx'
import { Container } from './comun.jsx'
import { Claqueta } from './Claqueta.jsx'
import './Cierre.css'

export function Cierre({ abrirAgentes }) {
  return (
    <section id="cierre" className="landing-final" aria-labelledby="landing-final-title">
      <Container className="landing-final-inner claqueta-rejilla">
        {/* Columna de texto: así la claqueta no estira las filas del titular ni de los botones. */}
        <div className="claqueta-texto">
          <h2 id="landing-final-title" className="flp-title">
            Pruébalo con «La última función».
          </h2>
          <p className="flp-body text-flp-muted">Pide el informe de la semana y decide tú lo que espera aprobación. Unos minutos, sin registrarte.</p>
          <div className="landing-final-actions">
            {/* claqueta-accion: el botón que cierra el palo (Cierre.css). */}
            <FilmpilotButton variant="primary" size="lg" className="claqueta-accion" onClick={() => abrirAgentes()} iconAfter={IconChevronRight}>
              Probar los agentes
            </FilmpilotButton>
            <FilmpilotButton variant="secondary" size="lg" onClick={() => abrirAgentes({ tour: true })}>
              Empezar el recorrido guiado
            </FilmpilotButton>
          </div>
        </div>
        <Claqueta />
      </Container>
    </section>
  )
}
