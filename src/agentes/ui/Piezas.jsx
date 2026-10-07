// Piezas pequeñas de la interfaz de agentes: identidad, autonomía, estado y texto.

import { useEffect, useRef } from 'react'
import { SetvalioMark } from '../../components/Brand.jsx'
import { IconCheck, IconClock, IconAlert, IconClose } from '../../components/icons.jsx'
import { AGENTES, AUTONOMIA } from '../agentes.js'
import { segmentos } from '../texto.js'

/** Texto de un agente: resalta las cifras. */
export function Tx({ value, className = '' }) {
  if (value == null) return null
  const segs = segmentos(value)
  return (
    <span className={className}>
      {segs.map((s, i) =>
        s.esNumero ? (
          <strong key={i} className="tnum font-bold text-ink">
            {s.texto}
          </strong>
        ) : s.esValor ? (
          <span key={i} className="font-semibold text-ink">
            {s.texto}
          </span>
        ) : (
          <span key={i}>{s.texto}</span>
        ),
      )}
    </span>
  )
}

/** Baldosa del agente: código de dos letras en ciruela. El Orquestador lleva el símbolo. */
export function AgentTile({ id, size = 32, trabajando = false, esperando = false, className = '' }) {
  const a = AGENTES[id]
  if (!a) return null
  const dim = { width: size, height: size }
  if (id === 'orquestador') {
    return (
      <span className={`ag-tile ag-tile--orq ${trabajando ? 'is-working' : ''} ${className}`} style={dim} aria-hidden="true">
        <SetvalioMark size={Math.round(size * 0.62)} light />
      </span>
    )
  }
  return (
    <span className={`ag-tile ${trabajando ? 'is-working' : ''} ${className}`} style={dim} aria-hidden="true">
      <span className="ag-tile-code">{a.codigo}</span>
      {esperando && <span className="ag-tile-wait"><IconClock size={10} strokeWidth={2.6} /></span>}
    </span>
  )
}

const NIVEL_SEGMENTOS = { ejecuta: 1, propone: 2, aprueba: 3 }

/** Cómo actúa el agente (no es un estado): Ejecuta · Propone · Pide aprobación. */
export function AutonomyBadge({ nivel, compacto = false }) {
  const a = AUTONOMIA[nivel]
  if (!a) return null
  const n = NIVEL_SEGMENTOS[nivel]
  return (
    <span className="ag-autonomia" title={a.descripcion}>
      <span className="ag-autonomia-meter" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= n ? 'is-on' : ''} />
        ))}
      </span>
      {!compacto && <span>{a.etiqueta}</span>}
      {compacto && <span className="sr-only">{a.etiqueta}</span>}
    </span>
  )
}

const ESTADOS = {
  en_cola: { etiqueta: 'En cola', tono: 'neutral' },
  en_curso: { etiqueta: 'En curso', tono: 'info' },
  hecho: { etiqueta: 'Hecho', tono: 'positive', Icon: IconCheck },
  detenido: { etiqueta: 'Detenido', tono: 'neutral', Icon: IconClose },
  pendiente: { etiqueta: 'Pendiente de decisión', tono: 'warning', Icon: IconClock },
  bloqueante: { etiqueta: 'Bloqueante', tono: 'negative', Icon: IconAlert },
}

/** Estado con icono y texto: nunca solo color. */
export function StatusChip({ estado, etiqueta, className = '' }) {
  const e = ESTADOS[estado] ?? { etiqueta: etiqueta ?? estado, tono: 'neutral' }
  const Icon = e.Icon
  return (
    <span className={`ag-chip ag-chip--${e.tono} ${className}`}>
      {estado === 'en_curso' ? <span className="ag-spinner" aria-hidden="true" /> : Icon ? <Icon size={12} strokeWidth={2.6} aria-hidden="true" /> : <span className="ag-chip-dot" aria-hidden="true" />}
      {etiqueta ?? e.etiqueta}
    </span>
  )
}

export function Tono({ tono = 'neutral', children, className = '' }) {
  return <span className={`ag-chip ag-chip--${tono} ${className}`}>{children}</span>
}

/** Panel lateral o inferior con trampa de foco y Escape. */
export function Hoja({ abierta, onCerrar, titulo, lado = 'abajo', children, id }) {
  const ref = useRef(null)
  const cerrarRef = useRef(null)
  // El efecto depende solo de «abierta»: si dependiera de onCerrar, cada render movería el foco.
  const onCerrarRef = useRef(onCerrar)
  onCerrarRef.current = onCerrar
  useEffect(() => {
    if (!abierta) return
    const previo = document.activeElement
    cerrarRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onCerrarRef.current()
      if (e.key !== 'Tab') return
      const f = ref.current?.querySelectorAll('button:not([disabled]), select, textarea, input, a[href], [tabindex]:not([tabindex="-1"])')
      if (!f?.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previo?.focus?.()
    }
  }, [abierta])

  return (
    <div className={`ag-hoja ag-hoja--${lado} ${abierta ? 'is-open' : ''}`} aria-hidden={!abierta} inert={abierta ? undefined : ''}>
      <div className="ag-hoja-fondo" onClick={onCerrar} />
      <div ref={ref} id={id} className="ag-hoja-panel" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="ag-hoja-cabecera">
          {lado === 'abajo' && <span className="ag-hoja-asa" aria-hidden="true" />}
          <h2 className="text-base font-extrabold text-ink">{titulo}</h2>
          <button ref={cerrarRef} type="button" onClick={onCerrar} className="ag-icon-button" aria-label="Cerrar">
            <IconClose size={18} />
          </button>
        </div>
        <div className="ag-hoja-cuerpo">{children}</div>
      </div>
    </div>
  )
}
