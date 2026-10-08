// Pie de la portada.

import { FilmpilotLogo } from '../../brand/Filmpilot.jsx'
import { Container } from './comun.jsx'

export function Pie({ abrirAgentes }) {
  return (
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
          <span>Estimación orientativa: no sustituye el criterio de tu fiscalista.</span>
          <a href="#landing-title">
            Volver arriba <span aria-hidden="true">↑</span>
          </a>
        </div>
      </Container>
    </footer>
  )
}
