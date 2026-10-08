// Hero de la portada: claim, apoyo, CTA y la composición orbital en 3D.
//
// Al cargar, el claim cambia de foco una sola vez, a la vez que la cámara del bloque
// orbital enfoca: primero «Libertad para crear.», después «Claridad para producir.» y al
// final las dos nítidas. Cada línea lleva el texto real y, mientras dura, una copia
// desenfocada encima (estática: solo cambia de opacidad). El kicker, el apoyo y los
// botones no se mueven: se leen y se pulsan desde el primer fotograma.

import { Fragment, useEffect, useState } from 'react'
import { FilmpilotButton, Kicker } from '../../brand/Filmpilot.jsx'
import { CinematicSymbol } from '../../brand/CinematicSymbol.jsx'
import { IconChevronDown, IconChevronRight } from '../../components/icons.jsx'
import { Container } from './comun.jsx'
import { usePrefiereMovimiento } from './movimiento.js'
import './Hero.css'

// Las dos líneas del claim y cuándo entra en foco cada una. El cambio dura 500 ms (Hero.css).
const CLAIM = [
  { texto: 'Libertad para crear.', retardo: 200 },
  { texto: 'Claridad para producir.', retardo: 650 },
]
const FOCO = 500 // ms, como las animaciones de Hero.css
const FIN_DEL_FOCO = CLAIM[CLAIM.length - 1].retardo + FOCO + 100 // la última línea ya está nítida

export function Hero({ abrirAgentes }) {
  const movimiento = usePrefiereMovimiento()
  // Solo si la página carga arriba del todo: con un ancla o al volver con scroll, el claim
  // ya está quieto. Con un ancla (#faq…) scrollY aún vale 0 en el primer render, porque el
  // navegador baja hasta ella después; por eso se mira también el hash, como en
  // CinematicSymbol. Se decide en el primer render para no enseñar antes el claim nítido.
  const [enfocando, setEnfocando] = useState(() => movimiento && typeof window !== 'undefined' && window.scrollY === 0 && window.location.hash.length < 2)
  const foco = enfocando && movimiento

  // Al acabar se quitan la capa desenfocada y el atributo; si la persona pide menos
  // movimiento a mitad, en el acto.
  useEffect(() => {
    if (!enfocando) return
    const t = setTimeout(() => setEnfocando(false), movimiento ? FIN_DEL_FOCO : 0)
    return () => clearTimeout(t)
  }, [enfocando, movimiento])

  return (
    <section id="inicio" className="landing-hero" aria-labelledby="landing-title" data-entrada={foco ? '' : undefined}>
      <Container className="landing-hero-grid">
        <div className="landing-hero-head">
          <Kicker className="text-flp-muted">Inteligencia en producción</Kicker>
          {/* Un espacio real entre líneas: el nombre accesible es la frase entera. */}
          <h1 id="landing-title" className="flp-display">
            {CLAIM.map(({ texto, retardo }, i) => (
              <Fragment key={texto}>
                {i > 0 ? ' ' : null}
                <span className="foco-linea" style={{ '--retardo': `${retardo}ms` }}>
                  <span className="foco-nitido">{texto}</span>
                  {foco ? (
                    <span className="foco-blando" aria-hidden="true">
                      {texto}
                    </span>
                  ) : null}
                </span>
              </Fragment>
            ))}
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
