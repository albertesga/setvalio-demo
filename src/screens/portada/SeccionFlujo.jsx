// «Cómo funciona»: las cinco etapas (cada una abre los agentes con una pregunta) y la
// tarjeta del agente de Riesgos de producción. Las cifras del riesgo, el texto del caso
// y su pregunta llegan de Landing.jsx, donde check:agentes los comprueba.
//
// Movimiento (sin bucles; con prefers-reduced-motion, todo quieto en su estado final):
// - Cabezal de montaje: baja por la columna de números con el scroll y, al cruzar cada
//   etapa, la enciende y hace girar su cifra una vez.
// - Encuadre: al pasar el cursor o llegar con el teclado, unas esquinas de visor se
//   cierran sobre la etapa y se ve la pregunta que se enviará a los agentes.
// - Tarjeta de Riesgos: la toma del cambio de jornada (CambioDeJornada.jsx).

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { AgentGlyph, Kicker, StateChip } from '../../brand/Filmpilot.jsx'
import { IconChevronRight, IconCoste, IconIncentivos, IconPresupuesto, IconSearch, IconTesoreria } from '../../components/icons.jsx'
import { TOTALES } from '../../lib/data.js'
import { eur } from '../../lib/format.js'
import { CambioDeJornada, GUION_CSS, probabilidadDeLluvia, useTomaCambio } from './CambioDeJornada.jsx'
import { CifraCinta } from './CifraCinta.jsx'
import { ArrowLink, Container } from './comun.jsx'
import { FLOW, PLAN_RIESGO } from './datos.js'
import { limitar, pedirFrame, useProgresoScroll, usePrefiereMovimiento } from './movimiento.js'
import './SeccionFlujo.css'

const ICONOS = { '01': IconPresupuesto, '02': IconIncentivos, '03': IconTesoreria, '04': IconCoste, '05': IconSearch }

// El cabezal va anclado a esta altura de la ventana.
const ANCLA = 0.6
// Solo gira la cifra de una etapa que el cabezal cruza cerca de él: si se llega de golpe
// (un ancla, el scroll restaurado), las etapas ya pasadas se encienden sin girar.
const CERCA = 0.35

export function TarjetaRiesgo({ riesgo, abrirAgentes }) {
  const { cifras, caso, pregunta } = riesgo
  const planRef = useRef(null)
  const toma = useTomaCambio(planRef)
  return (
    <div className="landing-riesgo cambio-tarjeta" data-fase={toma.fase} style={GUION_CSS}>
      <div className="landing-riesgo-copy">
        <p className="landing-riesgo-agente">
          <AgentGlyph family="presupuesto" size={28} className="cambio-glifo" />
          <span>
            <strong>Riesgos de producción</strong> · agente de la familia Presupuesto
          </span>
        </p>
        <h3 className="flp-subtitle">Se adelanta a la desviación.</h3>
        <p>Cruza el plan de rodaje con la previsión del tiempo, las convocatorias y los permisos. Si algo puede desviar el coste, calcula cuánto dinero hay en juego y propone cómo evitarlo. El cambio lo apruebas tú.</p>
        <p className="landing-riesgo-caso">
          <StateChip state="review" className="cambio-sello" />
          <span>{caso}</span>
        </p>
        <ArrowLink onClick={() => abrirAgentes({ pregunta })}>Ver cómo lo analiza</ArrowLink>
      </div>
      <CambioDeJornada planRef={planRef} toma={toma} plan={PLAN_RIESGO} cifras={cifras} lluvia={probabilidadDeLluvia(caso)} />
    </div>
  )
}

// Las cinco etapas con el cabezal de montaje. Es un componente aparte para que los
// giros de las cifras (cinco setState en toda la vida de la página) no repinten la tarjeta.
function Etapas({ abrirAgentes }) {
  const movimiento = usePrefiereMovimiento()
  const listaRef = useRef(null)
  const railRef = useRef(null)
  const filas = useRef([])
  const numeros = useRef([])
  // Medidas cacheadas (relativas al borde de relleno de la lista, como top del raíl):
  // pintar() no lee la maquetación. `borde` es el filete superior, que sí entra en rect.top.
  const medidas = useRef({ inicio: 0, largo: 1, centros: [], borde: 0 })
  const alcanzadas = useRef(FLOW.map(() => false))
  const giradas = useRef(FLOW.map(() => false))
  const [vueltas, setVueltas] = useState(() => FLOW.map(() => 0))

  const girar = useCallback((i) => setVueltas((v) => v.map((n, k) => (k === i ? n + 1 : n))), [])

  // Escribe la posición del cabezal y enciende o apaga cada etapa. Sin lecturas de layout.
  const pintar = ({ rect, vh }, inicial = false) => {
    const rail = railRef.current
    if (!rail) return
    const { inicio, largo, centros, borde } = medidas.current
    // Recorrido del cabezal sobre el raíl, sin limitar: negativo antes de la primera etapa.
    const cabeza = ANCLA * vh - rect.top - borde - inicio
    const p = limitar(cabeza / largo)
    rail.style.setProperty('--p', p.toFixed(4))
    rail.style.setProperty('--y', `${(p * largo).toFixed(1)}px`)
    centros.forEach((c, i) => {
      const pasada = cabeza >= c - inicio - 0.5
      if (pasada === alcanzadas.current[i]) return
      alcanzadas.current[i] = pasada
      filas.current[i]?.toggleAttribute('data-alcanzada', pasada)
      if (pasada && !inicial && !giradas.current[i] && cabeza - (c - inicio) < CERCA * vh) {
        giradas.current[i] = true
        girar(i)
      }
    })
  }

  // El raíl va del centro del 01 al del 05. Se mide al montar y con cada cambio de tamaño
  // (también sin movimiento: el raíl se ve entero).
  useLayoutEffect(() => {
    const lista = listaRef.current
    const rail = railRef.current
    if (!lista || !rail) return
    const medir = () => {
      const centros = filas.current.map((fila, i) => {
        const n = numeros.current[i]
        return fila && n ? fila.offsetTop + n.offsetTop + n.offsetHeight / 2 : 0
      })
      const inicio = centros[0]
      const largo = Math.max(1, centros[centros.length - 1] - inicio)
      medidas.current = { inicio, largo, centros, borde: lista.clientTop }
      rail.style.top = `${inicio}px`
      rail.style.bottom = 'auto'
      rail.style.height = `${largo}px`
    }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      medir()
      pedirFrame()
    })
    ro.observe(lista)
    return () => ro.disconnect()
  }, [])

  // Primer pintado antes de que se vea: el cabezal ya está donde toca, sin salto.
  useLayoutEffect(() => {
    const lista = listaRef.current
    if (!movimiento || !lista) return
    // pintar solo lee refs: basta con repetirlo cuando cambia la preferencia de movimiento.
    pintar({ rect: lista.getBoundingClientRect(), vh: window.innerHeight }, true)
  }, [movimiento])

  useProgresoScroll(listaRef, pintar)

  return (
    <div ref={listaRef} className="landing-flow-list flujo-lista" data-cabezal={movimiento || undefined}>
      <span ref={railRef} className="flujo-rail" aria-hidden="true">
        <span className="flujo-recorrido" />
        <span className="flujo-cabezal" />
      </span>
      {FLOW.map(({ number, name, detail, value, nota, pregunta }, i) => {
        const Icon = ICONOS[number]
        return (
          <button
            key={number}
            ref={(n) => {
              filas.current[i] = n
            }}
            type="button"
            className="landing-flow-row"
            onClick={() => abrirAgentes({ pregunta })}
          >
            <span className="flujo-encuadre" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span
              ref={(n) => {
                numeros.current[i] = n
              }}
              className="landing-flow-number"
            >
              <span className="flujo-numero">{number}</span>
            </span>
            <span className="landing-flow-icon">
              <Icon size={22} />
            </span>
            <span className="landing-flow-name">{name}</span>
            <span className="landing-flow-detail flujo-detalle">
              <span className="flujo-detalle-texto">{detail}</span>
              <span className="flujo-pregunta" aria-hidden="true">
                {pregunta}
              </span>
            </span>
            <span className="landing-flow-cifra">
              <strong>
                <CifraCinta texto={value} vuelta={vueltas[i]} />
              </strong>
              <small>{nota}</small>
            </span>
            <IconChevronRight className="landing-flow-arrow" size={19} aria-hidden="true" />
            <span className="sr-only">. Preguntar a los agentes: {pregunta}</span>
          </button>
        )
      })}
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
        <Etapas abrirAgentes={abrirAgentes} />
        <TarjetaRiesgo riesgo={riesgo} abrirAgentes={abrirAgentes} />
        <p className="landing-example-note">Ejemplo: «La última función», largometraje de ficción con un presupuesto de {eur(TOTALES.presupuesto)}.</p>
      </Container>
    </section>
  )
}
