// Preguntas frecuentes: acordeón, con la primera abierta.

import { useState } from 'react'
import { IconChevronDown } from '../../components/icons.jsx'
import { Container } from './comun.jsx'
import { FAQ } from './datos.js'

export function SeccionFaq() {
  const [openFaq, setOpenFaq] = useState(0)
  return (
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
  )
}
