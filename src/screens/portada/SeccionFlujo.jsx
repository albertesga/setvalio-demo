// «Cómo funciona»: las cinco etapas (cada una abre los agentes con una pregunta) y la
// tarjeta del agente de Riesgos de producción. Las cifras del riesgo, el texto del caso
// y su pregunta llegan de Landing.jsx, donde check:agentes los comprueba.

import { AgentGlyph, Kicker, StateChip } from '../../brand/Filmpilot.jsx'
import { IconChevronRight, IconCoste, IconIncentivos, IconPresupuesto, IconSearch, IconTesoreria } from '../../components/icons.jsx'
import { TOTALES } from '../../lib/data.js'
import { eur } from '../../lib/format.js'
import { ArrowLink, Container } from './comun.jsx'
import { FLOW } from './datos.js'

const ICONOS = { '01': IconPresupuesto, '02': IconIncentivos, '03': IconTesoreria, '04': IconCoste, '05': IconSearch }

export function TarjetaRiesgo({ riesgo, abrirAgentes }) {
  const { cifras, caso, pregunta } = riesgo
  return (
    <div className="landing-riesgo">
      <div className="landing-riesgo-copy">
        <p className="landing-riesgo-agente">
          <AgentGlyph family="presupuesto" size={28} />
          <span>
            <strong>Riesgos de producción</strong> · agente de la familia Presupuesto
          </span>
        </p>
        <h3 className="flp-subtitle">Se adelanta a la desviación.</h3>
        <p>Cruza el plan de rodaje con la previsión del tiempo, las convocatorias y los permisos. Si algo puede desviar el coste, calcula cuánto dinero hay en juego y propone cómo evitarlo. El cambio lo apruebas tú.</p>
        <p className="landing-riesgo-caso">
          <StateChip state="review" />
          <span>{caso}</span>
        </p>
        <ArrowLink onClick={() => abrirAgentes({ pregunta })}>Ver cómo lo analiza</ArrowLink>
      </div>
      <dl className="landing-riesgo-cifras">
        <div>
          <dt>Análisis de riesgo</dt>
          <dd>
            <strong>{eur(cifras.enJuego)}</strong>
            <span>en juego: lluvia, una ausencia en Canarias y horas extra de noche</span>
          </dd>
        </div>
        <div>
          <dt>Dinero ahorrado</dt>
          <dd>
            <strong>{eur(cifras.ahorrado)}</strong>
            <span>la reserva por lluvia que no hace falta al cambiar el orden</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function SeccionFlujo({ abrirAgentes, riesgo }) {
  return (
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
          {FLOW.map(({ number, name, detail, value, nota, pregunta }) => {
            const Icon = ICONOS[number]
            return (
              <button key={number} type="button" className="landing-flow-row" onClick={() => abrirAgentes({ pregunta })}>
                <span className="landing-flow-number">{number}</span>
                <span className="landing-flow-icon">
                  <Icon size={22} />
                </span>
                <span className="landing-flow-name">{name}</span>
                <span className="landing-flow-detail">{detail}</span>
                <span className="landing-flow-cifra">
                  <strong>{value}</strong>
                  <small>{nota}</small>
                </span>
                <IconChevronRight className="landing-flow-arrow" size={19} aria-hidden="true" />
              </button>
            )
          })}
        </div>
        <TarjetaRiesgo riesgo={riesgo} abrirAgentes={abrirAgentes} />
        <p className="landing-example-note">Ejemplo: «La última función», largometraje de ficción con un presupuesto de {eur(TOTALES.presupuesto)}.</p>
      </Container>
    </section>
  )
}
