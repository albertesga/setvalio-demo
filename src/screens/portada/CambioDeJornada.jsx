// Riesgos de producción: la jornada 8 se cambia por la 9.
//
// Un plan de tres huecos fijos (jornadas 7, 8 y 9), cada uno con su tira de rodaje.
// Cuando el plan está a la vista se rueda una toma de unos 3,2 s: llueve sobre la 8,
// entra el dinero en juego, la tira del exterior se cruza en arco con la del Teatro
// Apolo, entra el ahorro y el caso recibe su sello «Por revisar». Es una propuesta: el
// conmutador alterna los dos órdenes, y pulsarlo durante la toma la termina en el orden
// elegido.
//
// El DOM siempre coincide con lo que se ve: cada hueco es un <li> con la tira que le
// toca, así que un lector de pantalla lee el orden mostrado. El arco es FLIP con la WAAPI
// nativa. Sin movimiento: arranca en la propuesta, con las cifras finales, y el
// conmutador cambia el orden al instante.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { eur } from '../../lib/format.js'
import { BotonRepetir } from './BotonRepetir.jsx'
import { CifraCinta } from './CifraCinta.jsx'
import { RODAJE } from './datos.js'
import { usePrefiereMovimiento, useToma } from './movimiento.js'
import './CambioDeJornada.css'

// Guion de la toma, en ms desde que arranca. Las entradas por CSS leen estos mismos
// valores (GUION_CSS, en la tarjeta): una sola fuente para JS y CSS.
const GUION = { lluvia: 300, riesgo: 900, cambio: 1700, ahorro: 2400, sello: 2800, duracion: 3200 }
export const GUION_CSS = {
  '--cambio-lluvia': `${GUION.lluvia}ms`,
  '--cambio-riesgo': `${GUION.riesgo}ms`,
  '--cambio-ahorro': `${GUION.ahorro}ms`,
  '--cambio-sello': `${GUION.sello}ms`,
}

// El arco: el exterior se levanta y pasa por encima; el interior, por debajo.
const ARCO = { duracion: 600, alto: 10, levanta: 3, curva: 'cubic-bezier(.65,0,.35,1)' }
// Al asentarse aparecen el contorno discontinuo y la etiqueta «Propuesta».
const ASIENTA = { retardo: 520, duracion: 180 }

const ORDENES = [
  ['actual', 'Plan actual'],
  ['propuesta', 'Propuesta del agente'],
]

/** «80 % de lluvia…» → '80'. Sale del texto del caso, que check:agentes comprueba en Landing.jsx. */
export function probabilidadDeLluvia(caso) {
  return String(caso ?? '').match(/(\d+)\s*%\s*de lluvia/)?.[1] ?? null
}

/**
 * La toma de la tarjeta (useToma sobre el plan, no sobre la tarjeta: en móvil la tarjeta
 * es alta y correría fuera de pantalla) más un corte: si se pulsa el conmutador mientras
 * corre, esa pasada se da por hecha.
 */
export function useTomaCambio(planRef) {
  const toma = useToma(planRef, { umbral: 0.6, duracion: GUION.duracion })
  const [corte, setCorte] = useState(null)
  const enCurso = toma.fase === 'lista' || toma.fase === 'rodando'
  // Número de la pasada en curso: en 'lista' la vuelta aún no ha subido.
  const pasada = toma.fase === 'lista' ? toma.vuelta + 1 : toma.vuelta
  const cortada = enCurso && corte === pasada
  const cortar = useCallback(() => {
    if (enCurso) setCorte(pasada)
  }, [enCurso, pasada])
  // Repetir olvida el corte: si se cortó en 'lista' (antes de arrancar), la toma interna
  // sigue en 'lista' y su siguiente pasada tendría el mismo número, así que «Volver a
  // verlo» no haría nada.
  const repetirToma = toma.repetir
  const repetir = useCallback(() => {
    setCorte(null)
    repetirToma()
  }, [repetirToma])
  return {
    fase: cortada ? 'hecha' : toma.fase,
    corriendo: enCurso && !cortada,
    repetir,
    cortar,
    // Al cortar, las cifras se remontan (key) para quedarse quietas en su valor, y la
    // vuelta de una pasada cortada ya no las hace girar.
    cinta: { key: corte ?? 'cinta', vuelta: Math.max(toma.vuelta, corte ?? 0) },
  }
}

// Anima una tira desde donde se veía (dx, dy) hasta su hueco nuevo. Devuelve las animaciones.
function animarCambio(tira, cuerpo, dx, dy) {
  const sube = tira.hasAttribute('data-sube')
  const pico = `translateY(${sube ? -ARCO.alto : ARCO.alto}px)`
  const animaciones = [
    tira.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ARCO.duracion, easing: ARCO.curva }),
    cuerpo.animate(
      [
        { transform: 'none', easing: 'ease-out' },
        ...(sube ? [{ transform: `translateY(-${ARCO.levanta}px)`, offset: 0.12, easing: 'ease-in-out' }] : []),
        { transform: pico, offset: 0.5, easing: 'ease-in' },
        { transform: 'none' },
      ],
      { duration: ARCO.duracion },
    ),
  ]
  // La sombra solo mientras está levantada.
  const sombra = sube ? cuerpo.querySelector('.cambio-sombra') : null
  if (sombra) animaciones.push(sombra.animate([{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ARCO.duracion }))
  if (tira.hasAttribute('data-movida')) {
    for (const capa of cuerpo.querySelectorAll('.cambio-discontinuo, .cambio-etiqueta')) {
      animaciones.push(capa.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ASIENTA.duracion, delay: ASIENTA.retardo, easing: 'ease-out', fill: 'backwards' }))
    }
  }
  return animaciones
}

function Tira({ tira, movida, sube }) {
  return (
    <div className="cambio-tira" data-tira={tira.n} data-movida={movida || undefined} data-sube={sube || undefined}>
      <div className="cambio-tira-cuerpo">
        <span className="cambio-sombra" aria-hidden="true" />
        <span className="cambio-tipo">{tira.tipo}</span>
        <span className="cambio-sitio">{tira.localizacion}</span>
        {tira.nota ? <span className="cambio-nota">{tira.nota}</span> : null}
        <span className="cambio-etiqueta" aria-hidden={!movida || undefined}>
          Propuesta
        </span>
        <span className="cambio-discontinuo" aria-hidden="true" />
      </div>
    </div>
  )
}

export function CambioDeJornada({ planRef, toma, plan, cifras, lluvia }) {
  const movimiento = usePrefiereMovimiento()
  const [orden, setOrden] = useState('propuesta')
  // Dónde se veía cada tira justo antes de cambiar el orden (FLIP), o null si no se anima.
  const previas = useRef(null)
  const ordenPintado = useRef(orden)
  const fasePrevia = useRef(toma.fase)
  const animaciones = useRef([])

  const { jornadas, lluvia: diaLluvia, intercambio } = plan
  const porNumero = new Map(jornadas.map((j) => [j.n, j]))
  // La tira que va en cada hueco: en la propuesta, la 8 y la 9 se intercambian.
  const tiraDe = (n) => {
    if (orden === 'propuesta' && n === diaLluvia) return porNumero.get(intercambio)
    if (orden === 'propuesta' && n === intercambio) return porNumero.get(diaLluvia)
    return porNumero.get(n)
  }

  // Con movimiento, anota dónde se ve cada tira (aunque vaya a medio arco), relativo al
  // plan para que el scroll no cuente, y después cambia el orden.
  const cambiarOrden = useCallback(
    (nuevo) => {
      if (nuevo === ordenPintado.current) return
      const raiz = planRef.current
      previas.current = null
      if (movimiento && raiz) {
        const base = raiz.getBoundingClientRect()
        previas.current = new Map()
        for (const tira of raiz.querySelectorAll('[data-tira]')) {
          const r = tira.firstElementChild.getBoundingClientRect()
          previas.current.set(tira.dataset.tira, { x: r.left - base.left, y: r.top - base.top })
        }
      }
      setOrden(nuevo)
    },
    [movimiento, planRef],
  )

  // La toma arranca en el plan actual: se coloca antes de pintar y sin arco. Si se corta
  // porque la persona pide movimiento reducido, queda en la propuesta (el estado final).
  useLayoutEffect(() => {
    const previa = fasePrevia.current
    fasePrevia.current = toma.fase
    if (toma.fase === 'lista') {
      previas.current = null
      setOrden('actual')
    } else if (toma.fase === 'final' && (previa === 'lista' || previa === 'rodando')) {
      previas.current = null
      setOrden('propuesta')
    }
  }, [toma.fase])

  // El agente propone el cambio a mitad de toma.
  useEffect(() => {
    if (toma.fase !== 'rodando') return
    const t = setTimeout(() => cambiarOrden('propuesta'), GUION.cambio)
    return () => clearTimeout(t)
  }, [toma.fase, cambiarOrden])

  // FLIP: el DOM ya tiene el orden nuevo; cada tira sale de donde se veía y llega en arco.
  useLayoutEffect(() => {
    if (ordenPintado.current === orden) return
    ordenPintado.current = orden
    for (const a of animaciones.current) a.cancel()
    animaciones.current = []
    const antes = previas.current
    previas.current = null
    const raiz = planRef.current
    if (!antes || !raiz) return
    const base = raiz.getBoundingClientRect()
    for (const tira of raiz.querySelectorAll('[data-tira]')) {
      const cuerpo = tira.firstElementChild
      const de = antes.get(tira.dataset.tira)
      if (!de || !cuerpo || typeof tira.animate !== 'function') continue
      const r = cuerpo.getBoundingClientRect()
      const dx = de.x - (r.left - base.left)
      const dy = de.y - (r.top - base.top)
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      animaciones.current.push(...animarCambio(tira, cuerpo, dx, dy))
    }
  }, [orden, planRef])

  // Al desmontar no queda ninguna animación viva.
  useEffect(() => {
    const vivas = animaciones
    return () => {
      for (const a of vivas.current) a.cancel()
      vivas.current = []
    }
  }, [])

  const elegir = (nuevo) => {
    toma.cortar()
    cambiarOrden(nuevo)
  }

  const textoLluvia = lluvia ? `Lluvia ${lluvia} %` : 'Lluvia'
  const primera = jornadas[0].n
  const ultima = jornadas[jornadas.length - 1].n

  return (
    <div className="cambio">
      <ol ref={planRef} className="cambio-plan" role="list" aria-label={`Plan de jornadas ${primera} a ${ultima}`}>
        {jornadas.map(({ n }) => {
          const tira = tiraDe(n)
          const hoy = n === RODAJE.dia
          return (
            <li key={n} className="cambio-hueco" data-hoy={hoy || undefined}>
              <span className="cambio-rotulo">
                Jornada {n}
                {hoy ? ' · hoy' : ''}
              </span>
              <span className="cambio-lluvia">
                {n === diaLluvia ? (
                  <>
                    <span className="cambio-lluvia-barra" aria-hidden="true" />
                    <span className="cambio-lluvia-texto">{textoLluvia}</span>
                  </>
                ) : null}
              </span>
              <Tira key={tira.n} tira={tira} movida={tira.n !== n} sube={tira.n === diaLluvia} />
            </li>
          )
        })}
      </ol>
      <div className="cambio-conmutador" role="group" aria-label="Orden de las jornadas">
        {ORDENES.map(([valor, texto]) => (
          <FilmpilotButton key={valor} variant={orden === valor ? 'carbon' : 'secondary'} size="sm" aria-pressed={orden === valor} onClick={() => elegir(valor)}>
            {texto}
          </FilmpilotButton>
        ))}
      </div>
      <dl className="landing-riesgo-cifras">
        <div className="cambio-cifra">
          <dt>Análisis de riesgo</dt>
          <dd>
            <strong>
              <CifraCinta key={toma.cinta.key} texto={eur(cifras.enJuego)} vuelta={toma.cinta.vuelta} retardo={GUION.riesgo} />
            </strong>
            <span>en juego: lluvia, una ausencia en Canarias y horas extra de noche</span>
          </dd>
        </div>
        <div className="cambio-cifra">
          <dt>Dinero ahorrado</dt>
          <dd>
            <strong>
              <CifraCinta key={toma.cinta.key} texto={eur(cifras.ahorrado)} vuelta={toma.cinta.vuelta} retardo={GUION.ahorro} />
            </strong>
            <span>la reserva por lluvia que no hace falta al cambiar el orden</span>
          </dd>
        </div>
      </dl>
      <BotonRepetir onClick={toma.repetir} corriendo={toma.corriendo} className="cambio-repetir" />
    </div>
  )
}
