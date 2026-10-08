// Fiscalidad: el dossier fiscal con sus bloqueantes.
//
// Movimiento (D1 y D2):
// - El dossier se deja sobre la mesa: ligado al scroll, la hoja llega 32 px más abajo y
//   girada −2° y se endereza cuando su borde superior alcanza el 40 % de la ventana; las
//   dos hojas de debajo se abren en abanico con el mismo recorrido y el texto sube menos
//   (dos planos). Si subes, el gesto se deshace.
// - Sellos: ya asentada, los tres «Bloqueante» se estampan uno a uno y, con el tercero,
//   el «3» del resumen da una vuelta de cinta. Una vez, sin «Volver a verlo».
// Sin movimiento: la hoja recta sobre la pila abierta, con los sellos puestos.

import { useCallback, useLayoutEffect, useRef } from 'react'
import { Kicker, StateChip } from '../../brand/Filmpilot.jsx'
import { ArrowLink, Container } from './comun.jsx'
import { CifraCinta } from './CifraCinta.jsx'
import { DOSSIER } from './datos.js'
import { limitar, suave, usePrefiereMovimiento, useProgresoScroll, useToma } from './movimiento.js'
import './SeccionDossier.css'

// Un sello cada 220 ms, el mismo paso que en SeccionDossier.css: la cinta del resumen gira
// con el último sello aunque cambie el número de documentos.
const PASO_SELLO = 220

export function SeccionDossier({ abrirAgentes }) {
  const seccion = useRef(null)
  const pila = useRef(null)
  const hoja = useRef(null)
  const ultimo = useRef(null)
  const movimiento = usePrefiereMovimiento()

  // Los sellos esperan a que la hoja se asiente: la raíz es la mitad superior de la
  // ventana, así que la toma salta cuando el borde de la hoja cruza la mitad, con el gesto
  // casi acabado (q ≈ 0,93: 2 px y 0,15° por recorrer) y más del 60 % de la hoja a la
  // vista. Con umbral 0,6 sobre toda la ventana se estamparía con la hoja aún torcida.
  const { fase, vuelta } = useToma(hoja, { umbral: 0, margen: '0px 0px -50% 0px', duracion: 1100 })

  // q: 0 cuando la pila asoma por abajo, 1 cuando su borde llega al 40 % de la ventana.
  // Solo escribe, y solo lo que cambia: las amplitudes, el móvil y el estado final los
  // resuelve el CSS. La marca vale 'espera' antes de empezar y 'mueve' durante el gesto
  // (solo entonces hay will-change); asentada, se quitan marca y variable y la hoja se
  // queda sin transform.
  const pintar = useCallback(({ rect, vh }) => {
    const el = seccion.current
    if (!el) return
    const q = suave(limitar((vh - rect.top) / (0.6 * vh)))
    const valor = q > 0.9995 ? null : q.toFixed(3)
    const anterior = ultimo.current
    if (valor === anterior) return
    ultimo.current = valor
    if (valor === null) {
      el.style.removeProperty('--dossier-q')
      el.removeAttribute('data-dossier-gesto')
      return
    }
    el.style.setProperty('--dossier-q', valor)
    const marca = valor === '0.000' ? 'espera' : 'mueve'
    if (anterior === null || (anterior === '0.000') !== (marca === 'espera')) el.setAttribute('data-dossier-gesto', marca)
  }, [])

  useProgresoScroll(pila, pintar)

  // Primer estado antes de pintar, para no enseñar la hoja asentada y torcerla después.
  useLayoutEffect(() => {
    const el = seccion.current
    if (!movimiento || !el || !pila.current) return
    pintar({ rect: pila.current.getBoundingClientRect(), vh: window.innerHeight })
    return () => {
      el.style.removeProperty('--dossier-q')
      el.removeAttribute('data-dossier-gesto')
      ultimo.current = null
    }
  }, [movimiento, pintar])

  return (
    <section ref={seccion} id="documental" className="landing-section landing-document-section dossier-seccion" aria-labelledby="landing-document-title">
      <Container className="landing-document-grid">
        <div className="landing-document-copy dossier-copia">
          <Kicker className="text-flp-muted">Fiscalidad</Kicker>
          <h2 id="landing-document-title" className="flp-title">
            La deducción también se defiende con papeles.
          </h2>
          <p>El agente de Cumplimiento dice qué falta, quién lo aporta y qué bloquea el cierre. Tu fiscalista revisa y firma.</p>
          <ArrowLink onClick={() => abrirAgentes({ pregunta: '¿Qué bloquea el dossier fiscal?' })}>Preguntar qué bloquea el dossier</ArrowLink>
        </div>
        <div ref={pila} className="dossier-pila">
          <span className="dossier-fondo dossier-fondo--a" aria-hidden="true" />
          <span className="dossier-fondo dossier-fondo--b" aria-hidden="true" />
          <div ref={hoja} className="landing-document-sheet dossier-hoja" data-fase={fase}>
            <div className="landing-sheet-top">
              <span className="flp-kicker">Dossier fiscal</span>
              <strong>La última función</strong>
            </div>
            <p className="landing-sheet-resumen">
              <strong>
                <CifraCinta texto={String(DOSSIER.length)} vuelta={vuelta} retardo={(DOSSIER.length - 1) * PASO_SELLO} />
              </strong>{' '}
              bloqueantes
            </p>
            <div className="landing-sheet-list">
              {DOSSIER.map(([doc, meta], i) => (
                <div key={doc} style={{ '--i': i }}>
                  <span>
                    {doc}
                    <small>{meta}</small>
                  </span>
                  <StateChip state="error" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
