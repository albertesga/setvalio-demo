// Sección carbón de Agentes: qué hacen, las tres familias y un ejemplo del informe semanal.

import { AgentGlyph, FilmpilotButton, Kicker, StateChip } from '../../brand/Filmpilot.jsx'
import { IconChevronRight } from '../../components/icons.jsx'
import { FAMILIAS, ORDEN_FAMILIAS } from '../../agentes/agentes.js'
import { Container } from './comun.jsx'
import { AGENTS_PREVIEW, CEF } from './datos.js'

export function SeccionAgentes({ abrirAgentes }) {
  return (
    <section id="agentes" className="landing-section landing-agents-section flp-dark" aria-labelledby="landing-agents-title">
      <Container className="landing-agents-grid">
        <div className="landing-agents-copy">
          <Kicker className="text-flp-muted">Agentes</Kicker>
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
              {CEF.cifra} · {CEF.desviacion}
            </strong>
          </div>
        </div>
      </Container>
    </section>
  )
}
