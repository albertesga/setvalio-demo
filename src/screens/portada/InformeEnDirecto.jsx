// El informe semanal, en directo (A3). Al llegar al panel, los agentes se reparten el
// informe delante de ti: Facturas empieza, le sigue Conciliación y Control de costes y
// Excepciones trabajan a la vez. Lo rutinario acaba en «Completado»; la compra de más
// de 10.000 € queda «Por revisar», el único amarillo del panel y el último en llegar.
//
// Sin movimiento, al imprimir o antes de armar la toma se ve el panel terminado, quieto.
// Los tiempos de cada agente (trabaja, acaba) vienen de datos.js.

import { useRef, useState } from 'react'
import { AgentGlyph, StateChip } from '../../brand/Filmpilot.jsx'
import { FAMILIAS } from '../../agentes/agentes.js'
import { BotonRepetir } from './BotonRepetir.jsx'
import { CifraCinta } from './CifraCinta.jsx'
import { useToma } from './movimiento.js'
import './InformeEnDirecto.css'

// El último estado entra como un sello (200 ms); la toma acaba con un respiro después.
const COLA = 300

export function InformeEnDirecto({ filas, cef }) {
  const panel = useRef(null)
  // El pie gira cuando completa su parte el último agente que acaba solo (Control de costes).
  // Con un 0 delante, unos datos sin «Completado» no dan -Infinity (un retardo no válido).
  const giroPie = Math.max(0, ...filas.filter((f) => f.estado === 'done').map((f) => f.acaba))
  const duracion = Math.max(0, ...filas.map((f) => f.acaba)) + COLA
  const { fase, vuelta, repetir, corriendo } = useToma(panel, { umbral: 0.45, duracion })
  // La primera vez, «Volver a verlo» aparece al terminar; si la pides tú, se queda a la vista.
  const [pedida, setPedida] = useState(false)

  return (
    <div className="informe" data-fase={fase} data-pedida={pedida || undefined}>
      {/* El aria-label ya describe el estado final: los pasos intermedios no se anuncian. */}
      <div
        ref={panel}
        className="landing-agents-preview"
        role="img"
        aria-label="Ejemplo: al pedir el informe semanal, Facturas, Conciliación y Control de costes completan su parte y Excepciones deja una compra de más de 10.000 euros por revisar"
      >
        <div className="landing-agents-ask informe-pide">Prepárame el informe semanal de coste.</div>
        <ol>
          {filas.map((a) => (
            <li key={a.nombre} className={a.estado === 'review' ? 'is-review' : undefined} style={{ '--trabaja': a.trabaja, '--acaba': a.acaba }}>
              <AgentGlyph family={a.familia} size={34} className="informe-glifo" />
              <span>
                <strong>
                  {a.nombre} <span className="landing-agents-familia">· {FAMILIAS[a.familia].nombre}</span>
                </strong>
                <small>{a.tarea}</small>
              </span>
              {/* Los tres estados apilados en la misma celda: mide lo que el mayor y la fila no salta. */}
              <span className="informe-estado">
                <span className="informe-previos" aria-hidden="true">
                  <StateChip state="idle" />
                  <StateChip state="working" />
                </span>
                <StateChip state={a.estado} className="informe-final" />
              </span>
            </li>
          ))}
        </ol>
        <div className="landing-agents-foot flp-mono">
          <span>Coste estimado final</span>
          <strong>
            <CifraCinta texto={`${cef.cifra} · ${cef.desviacion}`} vuelta={vuelta} retardo={giroPie} />
          </strong>
        </div>
      </div>
      {/* Fuera del role="img": dentro no se podría pulsar. */}
      <BotonRepetir
        className="informe-repetir"
        corriendo={corriendo}
        onClick={() => {
          setPedida(true)
          repetir()
        }}
      />
    </div>
  )
}
