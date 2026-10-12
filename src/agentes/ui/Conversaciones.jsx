// Conversaciones, como en un chat: la lista (título corto, etiqueta, hora, última línea y,
// si hay, cuántos mensajes quedan por leer), la cabecera de la conversación abierta y el
// estado vacío de una conversación nueva.

import { useId } from 'react'
import { IconArrowLeft, IconPlus } from '../../components/icons.jsx'
import { AGENTES } from '../agentes.js'
import { ETIQUETA_CAPACIDAD } from '../casos.js'
import { renderTexto } from '../texto.js'
import { AgentAvatar } from './Piezas.jsx'

/** Lo que dice la última línea de una conversación en la lista. */
export function vistaPrevia(m) {
  if (!m) return 'Sin mensajes todavía'
  if (m.rol === 'usuario' || m.rol === 'decision') return `Tú: ${m.texto}`
  if (m.rol === 'nota' || m.rol === 'novedad') return m.texto ?? m.titulo ?? ''
  if (m.rol === 'agentes') {
    if (m.estado === 'en_curso') return 'Los agentes están trabajando…'
    const t = m.turno
    const primero = t.bloques.find((b) => b.tipo === 'texto')
    return renderTexto(t.resumen ?? primero?.texto ?? t.titulo)
  }
  return ''
}

function Etiqueta({ texto, exploratoria }) {
  return (
    <span className={`ag-conv-etiqueta ${exploratoria ? 'is-exploratoria' : ''}`}>
      {texto}
      {exploratoria && <span className="sr-only"> ({ETIQUETA_CAPACIDAD.exploratoria.toLowerCase()})</span>}
    </span>
  )
}

/** Lista de conversaciones, de la más reciente a la más antigua, con «Nueva conversación». */
export function ListaConversaciones({ items, actual, onAbrir, onNueva }) {
  const id = useId().replace(/:/g, '')
  return (
    <nav className="ag-convs" aria-labelledby={`${id}-t`}>
      <div className="ag-convs-cab">
        <h2 id={`${id}-t`} className="ag-convs-titulo">
          Conversaciones
        </h2>
        <button type="button" className="ag-convs-nueva" onClick={onNueva}>
          <IconPlus size={16} />
          <span>Nueva</span>
          <span className="sr-only"> conversación con el Orquestador</span>
        </button>
      </div>
      <ul className="ag-convs-lista">
        {items.map((c) => {
          const activa = c.id === actual
          return (
            <li key={c.id}>
              <button type="button" className={`ag-conv ${activa ? 'is-activa' : ''} ${c.noLeida ? 'is-noleida' : ''}`} aria-current={activa ? 'true' : undefined} onClick={() => onAbrir(c.id)}>
                <AgentAvatar id={c.agente} size={40} />
                <span className="ag-conv-cuerpo">
                  <span className="ag-conv-fila">
                    <span className="ag-conv-nombre">{c.titulo ?? 'Nueva conversación'}</span>
                    {c.hora && <span className="ag-conv-hora tnum">{c.hora}</span>}
                  </span>
                  <span className="ag-conv-fila">
                    <Etiqueta texto={c.etiqueta} exploratoria={c.capacidad === 'exploratoria'} />
                    <span className="ag-conv-previa">{vistaPrevia(c.ultimo)}</span>
                    {/* Solo lo que está por leer: al abrir la conversación, desaparece. */}
                    {c.sinLeer > 0 && (
                      <span className="ag-conv-sinleer tnum" aria-label={`${c.sinLeer} ${c.sinLeer === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`}>
                        {c.sinLeer}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Cabecera de la conversación abierta: con quién hablas y de qué. En móvil, vuelve a la lista. */
export function CabeceraChat({ conversacion, capacidad, onVolver }) {
  if (!conversacion) return null
  const nombre = AGENTES[conversacion.agente]?.nombre ?? 'Orquestador'
  // «Facturas · Facturas» sobra: el nombre del agente, solo si no es ya la etiqueta.
  const conNombre = nombre.toLowerCase() !== String(conversacion.etiqueta ?? '').toLowerCase()
  return (
    <div className="ag-chat-cab">
      <button type="button" className="ag-chat-volver" onClick={onVolver} aria-label="Volver a las conversaciones">
        <IconArrowLeft size={20} />
      </button>
      <AgentAvatar id={conversacion.agente} size={36} />
      <div className="min-w-0 flex-1">
        <p className="ag-chat-titulo">{conversacion.titulo ?? 'Nueva conversación'}</p>
        <p className="ag-chat-sub">
          <Etiqueta texto={conversacion.etiqueta} exploratoria={capacidad === 'exploratoria'} />
          {conNombre && <span className="truncate">{nombre}</span>}
          {capacidad === 'exploratoria' && <span className="ag-etiqueta-capacidad">{ETIQUETA_CAPACIDAD.exploratoria}</span>}
        </p>
      </div>
    </div>
  )
}

const PRIMERAS = ['¿Cómo vamos?', '¿Qué tengo que revisar?', '¿Qué puedes hacer?']

/** Una conversación nueva, vacía: qué puedes pedir. */
export function EstadoVacio({ onPedir, ocupado }) {
  return (
    <div className="ag-vacio">
      <p className="ag-vacio-texto">Pregunta lo que necesites: el Orquestador lo reparte entre los agentes y te contesta aquí.</p>
      <div className="ag-sugerencias">
        {PRIMERAS.map((p) => (
          <button key={p} type="button" className="ag-sugerencia" disabled={ocupado} onClick={() => onPedir(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
