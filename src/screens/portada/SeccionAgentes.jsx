// Sección carbón de Agentes: qué hacen, las tres familias y el informe semanal en directo.
//
// Movimiento:
// - A1, el plano se abre: al asomar, la sección llega recortada como un plano medio dentro
//   de la portada (márgenes del gutter y el radio del bloque del hero) y se abre a sangre
//   mientras su borde superior sube del 100 % al 35 % de la ventana. Va con el scroll y se
//   deshace al volver. Sin movimiento va a sangre desde el principio.
// - A2, el titular sube palabra a palabra y «Tú decides.» llega tras una pausa.
// - A3, el informe semanal se prepara delante de ti (InformeEnDirecto).

import { useLayoutEffect, useRef } from 'react'
import { AgentGlyph, FilmpilotButton, Kicker } from '../../brand/Filmpilot.jsx'
import { IconChevronRight } from '../../components/icons.jsx'
import { FAMILIAS, ORDEN_FAMILIAS } from '../../agentes/agentes.js'
import { AGENTS_PREVIEW, CEF } from './datos.js'
import { InformeEnDirecto } from './InformeEnDirecto.jsx'
import { limitar, suave, usePrefiereMovimiento, useProgresoScroll } from './movimiento.js'
import { Titular } from './Titular.jsx'
import './SeccionAgentes.css'

// El plano se abre entero en el 65 % de la ventana (del 100 % al 35 %).
const RECORRIDO = 0.65
// Lo que sube el contenido mientras se abre, en px.
const SUBIDA = 24

/** Cuánto se ha abierto el plano (0 cerrado, 1 a sangre) según el borde superior de la sección. */
const apertura = (top, vh) => suave(limitar((vh - top) / (RECORRIDO * vh)))

// Sin estilos en línea: la sección a sangre y el contenido en su sitio.
function aSangre(seccion, plano) {
  if (seccion) seccion.style.clipPath = ''
  if (plano) {
    plano.style.transform = ''
    plano.style.willChange = ''
  }
}

/**
 * Solo escribe estilos, y solo lo que cambia. `estado` recuerda qué hay en línea: 'sangre'
 * (nada), 'quieto' (cerrado del todo, aún bajo la ventana: recorte sin capa) o 'abriendo'
 * (recorte y capa). El gutter y el radio los resuelve el CSS (var() en el propio clip-path):
 * no hay nada que medir y un cambio de tamaño no lo desajusta.
 */
function pintarPlano(seccion, plano, e, estado) {
  if (e >= 0.999) {
    // Abierto del todo: fuera el recorte y la capa, para no dejarlos en reposo.
    if (estado.current !== 'sangre') aSangre(seccion, plano)
    estado.current = 'sangre'
    return
  }
  if (e <= 0 && estado.current === 'quieto') return
  const k = (1 - e).toFixed(4)
  seccion.style.clipPath = `inset(0 calc(var(--flp-gutter) * ${k}) round calc(var(--flp-radius-lg) * ${k}))`
  // Transform 2D: sin will-change no sube a la GPU. La capa, solo mientras se abre; si se
  // vuelve arriba y la sección queda bajo la ventana, se suelta (el recorte se queda puesto,
  // para que asome cerrada aunque el scroll del compositor vaya un frame por delante).
  plano.style.transform = `translateY(${(SUBIDA * (1 - e)).toFixed(2)}px)`
  const siguiente = e > 0 ? 'abriendo' : 'quieto'
  if (siguiente !== estado.current) plano.style.willChange = siguiente === 'abriendo' ? 'transform' : ''
  estado.current = siguiente
}

export function SeccionAgentes({ abrirAgentes }) {
  const seccion = useRef(null)
  const plano = useRef(null)
  const estado = useRef('sangre')
  const movimiento = usePrefiereMovimiento()
  // Un solo interruptor para el pintado al montar y el del scroll: si hay que apagar A1 en
  // móvil (lo dice el diseño si hay frames largos), se apaga aquí y los dos lo respetan.
  const abre = movimiento

  useProgresoScroll(seccion, ({ rect, vh }) => pintarPlano(seccion.current, plano.current, apertura(rect.top, vh), estado), { activo: abre })

  // El planificador no pinta hasta que su IntersectionObserver responde, un frame después del
  // primer pintado: si la sección asoma al cargar (o al volver con el scroll restaurado), se
  // vería a sangre y se cerraría de golpe. Se pinta su punto antes, con una sola lectura al
  // montar (fuera de pintar). Al apagarlo, en caliente o al desmontar, vuelve a sangre.
  useLayoutEffect(() => {
    if (!abre) return
    const s = seccion.current
    const p = plano.current
    pintarPlano(s, p, apertura(s.getBoundingClientRect().top, window.innerHeight), estado)
    return () => {
      aSangre(s, p)
      estado.current = 'sangre'
    }
  }, [abre])

  return (
    <section ref={seccion} id="agentes" className="landing-section landing-agents-section agentes-seccion flp-dark" aria-labelledby="landing-agents-title">
      {/* El Container de comun.jsx, sin envoltorio: el plano necesita su ref. */}
      <div ref={plano} className="landing-container landing-agents-grid agentes-plano">
        <div className="landing-agents-copy">
          <Kicker className="text-flp-muted">Agentes</Kicker>
          <Titular as="h2" id="landing-agents-title" className="flp-title" pausaAntes={3}>
            Los agentes preparan. Tú decides.
          </Titular>
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
        <InformeEnDirecto filas={AGENTS_PREVIEW} cef={CEF} />
      </div>
    </section>
  )
}
