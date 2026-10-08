// Preguntas frecuentes: acordeón, con la primera abierta.
//
// Movimiento (Q1): el titular sube desde su máscara al entrar y, al abrir una pregunta, la
// respuesta se descubre de arriba abajo. Solo tras el primer clic: la que viene abierta al
// cargar no se anima. No se anima la altura: lo de abajo se recoloca de una vez, como
// siempre, y el foco se queda en la pregunta pulsada.

import { useState } from 'react'
import { IconChevronDown } from '../../components/icons.jsx'
import { Container } from './comun.jsx'
import { FAQ } from './datos.js'
import { usePrefiereMovimiento } from './movimiento.js'
import { Titular } from './Titular.jsx'
import './SeccionFaq.css'

export function SeccionFaq() {
  const [openFaq, setOpenFaq] = useState(0)
  const [haInteractuado, setHaInteractuado] = useState(false)
  const movimiento = usePrefiereMovimiento()
  return (
    <section id="faq" className="landing-section landing-faq-section" aria-labelledby="landing-faq-title">
      <Container className="landing-faq-grid">
        <Titular as="h2" id="landing-faq-title" className="flp-title">
          Preguntas frecuentes.
        </Titular>
        <div className={movimiento && haInteractuado ? 'faq-descubre' : undefined}>
          {FAQ.map(([question, answer], index) => (
            <div className="landing-faq-item" key={question}>
              <h3>
                <button
                  type="button"
                  aria-expanded={openFaq === index}
                  aria-controls={`landing-faq-${index}`}
                  onClick={() => {
                    setHaInteractuado(true)
                    setOpenFaq((current) => (current === index ? -1 : index))
                  }}
                >
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
