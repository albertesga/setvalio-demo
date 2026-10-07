// Piezas pequeñas de la interfaz de agentes: identidad, autonomía, estado y texto.
// Marca Filmpilot: cada agente lleva el glifo de su familia y su nombre al lado;
// el Orquestador, el símbolo. El estado usa el vocabulario de la marca.

import { useEffect, useId, useRef, useState } from 'react'
import { AgentGlyph, FilmpilotSymbol } from '../../brand/Filmpilot.jsx'
import { IconCheck, IconClock, IconAlert, IconClose, IconChevronDown } from '../../components/icons.jsx'
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
          <strong key={i} className="tnum whitespace-nowrap font-semibold text-flp-ink">
            {s.texto}
          </strong>
        ) : s.esValor ? (
          <span key={i} className="font-medium text-flp-ink">
            {s.texto}
          </span>
        ) : (
          <span key={i}>{s.texto}</span>
        ),
      )}
    </span>
  )
}

/** «Facturas, Conciliación y 3 más»: nombres en lugar de una pila de avatares. */
export function nombresCortos(nombres, max = 2) {
  if (nombres.length <= max + 1) return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres.join('')
  return `${nombres.slice(0, max).join(', ')} y ${nombres.length - max} más`
}

/**
 * Avatar del agente: glifo de su familia en carbón. Fondo señal cuando tiene
 * algo «Por revisar»; el Orquestador, símbolo tiza sobre carbón.
 */
export function AgentAvatar({ id, size = 32, trabajando = false, revisar = false, className = '' }) {
  const a = AGENTES[id]
  if (!a) return null
  const dim = { width: size, height: size }
  if (id === 'orquestador') {
    return (
      <span className={`ag-avatar ag-avatar--orq ${trabajando ? 'is-working' : ''} ${className}`} style={dim} aria-hidden="true">
        <FilmpilotSymbol size={Math.round(size * 0.62)} />
      </span>
    )
  }
  return (
    <span className={`ag-avatar ${trabajando ? 'is-working' : ''} ${revisar ? 'is-review' : ''} ${className}`} style={dim} aria-hidden="true">
      <AgentGlyph family={a.familia} size={Math.round(size * 0.8)} />
    </span>
  )
}

/** Avatar y nombre juntos: el glifo es de la familia, el nombre identifica al agente. */
export function AgentLabel({ id, size = 24, trabajando = false, className = '' }) {
  const a = AGENTES[id]
  if (!a) return null
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <AgentAvatar id={id} size={size} trabajando={trabajando} />
      <span className="truncate text-sm font-medium text-flp-ink">{a.nombre}</span>
    </span>
  )
}

const NIVEL_SEGMENTOS = { ejecuta: 1, propone: 2, aprueba: 3 }
const ETIQUETA_CORTA = { ejecuta: 'Ejecuta', propone: 'Propone', aprueba: 'Aprobación' }

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
      <span>{compacto ? ETIQUETA_CORTA[nivel] : a.etiqueta}</span>
    </span>
  )
}

// Vocabulario de la marca: En espera · Trabajando · Por revisar · Completado.
const ESTADOS = {
  en_cola: { etiqueta: 'En espera', marca: 'idle' },
  en_curso: { etiqueta: 'Trabajando', marca: 'working' },
  hecho: { etiqueta: 'Completado', marca: 'done', Icon: IconCheck },
  detenido: { etiqueta: 'Detenido', marca: 'stopped', Icon: IconClose },
  pendiente: { etiqueta: 'Por revisar', marca: 'review', Icon: IconClock },
  bloqueante: { etiqueta: 'Bloqueante', marca: 'error', Icon: IconAlert },
}

/** Estado con icono y texto: nunca solo color. */
export function StatusChip({ estado, etiqueta, className = '' }) {
  const e = ESTADOS[estado] ?? { etiqueta: etiqueta ?? estado, marca: 'idle' }
  const Icon = e.Icon
  return (
    <span className={`ag-chip flp-state flp-state--${e.marca} ${className}`}>
      {estado === 'en_curso' ? <span className="ag-spinner" aria-hidden="true" /> : Icon ? <Icon size={12} strokeWidth={2.4} aria-hidden="true" /> : <span className="flp-state-dot" aria-hidden="true" />}
      {etiqueta ?? e.etiqueta}
    </span>
  )
}

// Tonos de las etiquetas. Solo «revisar» lleva la señal amarilla (lo que espera
// una decisión); «atencion» y «warning» avisan sin amarillo: borde y texto carbón.
const TONOS = { neutral: '', info: '', positive: 'flp-state--done', negative: 'flp-state--error', revisar: 'flp-state--review', atencion: 'ag-chip--atencion', warning: 'ag-chip--atencion' }

export function Tono({ tono = 'neutral', children, className = '' }) {
  return <span className={`ag-chip flp-state ${TONOS[tono] ?? ''} ${className}`}>{children}</span>
}

/** Bloque plegable accesible: un botón con aria-expanded y su contenido. */
export function Desplegable({ titulo, resumen, nivel = 2, abiertoInicial = false, className = '', children }) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  const id = `pl-${useId().replace(/:/g, '')}`
  const H = `h${nivel}`
  return (
    <section className={`ag-desplegable ${className}`}>
      <H className="m-0">
        <button type="button" className="ag-desplegable-boton" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto((v) => !v)}>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-semibold text-flp-ink">{titulo}</span>
            {resumen && <span className="block text-xs text-flp-muted">{resumen}</span>}
          </span>
          <IconChevronDown size={18} className={`flex-none transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </H>
      <div id={id} className={`ag-plegable ${abierto ? 'is-open' : ''}`} inert={abierto ? undefined : ''} aria-hidden={!abierto || undefined}>
        <div className="ag-plegable-dentro">{children}</div>
      </div>
    </section>
  )
}

/** Panel lateral o inferior con trampa de foco y Escape. */
export function Hoja({ abierta, onCerrar, titulo, subtitulo, lado = 'abajo', children, id }) {
  const ref = useRef(null)
  const cerrarRef = useRef(null)
  const inicioY = useRef(null)
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
      const f = ref.current?.querySelectorAll('button:not([disabled]), select, textarea, input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
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
        <div
          className="ag-hoja-cabecera"
          onTouchStart={(e) => (inicioY.current = e.touches[0]?.clientY ?? null)}
          onTouchEnd={(e) => {
            // El asa invita a deslizar: bajarla más de 60 px cierra la hoja.
            const fin = e.changedTouches[0]?.clientY
            if (inicioY.current != null && fin - inicioY.current > 60) onCerrarRef.current()
            inicioY.current = null
          }}
        >
          {lado === 'abajo' && <span className="ag-hoja-asa" aria-hidden="true" />}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-flp-ink">{titulo}</h2>
            {subtitulo && <p className="text-xs text-flp-muted">{subtitulo}</p>}
          </div>
          <button ref={cerrarRef} type="button" onClick={onCerrar} className="ag-icon-button flex-none" aria-label="Cerrar">
            <IconClose size={18} />
          </button>
        </div>
        <div className="ag-hoja-cuerpo">{children}</div>
      </div>
    </div>
  )
}
