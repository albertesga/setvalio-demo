// Fiscalidad: el dossier fiscal con sus bloqueantes.

import { Kicker, StateChip } from '../../brand/Filmpilot.jsx'
import { ArrowLink, Container } from './comun.jsx'
import { DOSSIER } from './datos.js'

export function SeccionDossier({ abrirAgentes }) {
  return (
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
            <strong>{DOSSIER.length}</strong> bloqueantes
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
  )
}
