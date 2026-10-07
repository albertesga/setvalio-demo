// Cabecera del prototipo y opciones de la demo. Todo lo que no es conversación
// (quién mira, ritmo, recorrido, enlaces, reinicio) vive detrás de un solo botón.

import { useState } from 'react'
import { FilmpilotLogo, FilmpilotSymbol, FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconBell, IconChevronDown, IconArrowLeft, IconPlay } from '../../components/icons.jsx'
import { PERSONAS } from '../mundo.js'
import { RITMOS } from '../useAgentes.js'
import { LEYENDA_CAPACIDAD, RECORRIDO } from '../casos.js'

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

export function Cabecera({ s, persona, pendientes, onPortada, onActividad, onDemo }) {
  const etiquetaCampana = [plural(pendientes, 'por revisar', 'por revisar'), s.novedades ? plural(s.novedades, 'novedad sin leer', 'novedades sin leer') : null].filter(Boolean).join(', ')
  return (
    <header className="ag-header">
      <button type="button" className="ag-header-marca" onClick={onPortada} aria-label="Filmpilot, volver a la portada">
        <span className="hidden sm:block">
          <FilmpilotLogo width={128} decorative />
        </span>
        <span className="sm:hidden">
          <FilmpilotSymbol size={28} />
        </span>
      </button>
      <span className="ag-header-sep hidden md:block" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-medium text-flp-ink">
          Agentes <span className="text-flp-muted">· {s.mundo.proyecto.titulo}</span>
        </h1>
        <p className="flp-mono truncate text-flp-muted">
          {s.mundo.proyecto.diaActual} de {s.mundo.proyecto.diasRodaje} jornadas rodadas
        </p>
      </div>
      {/* La insignia cuenta siempre lo «Por revisar»; las novedades sin leer, un punto aparte. */}
      <button type="button" className="ag-icon-button ag-campana relative" aria-label={`Panel: por revisar, actividad, riesgos y agentes. ${etiquetaCampana}`} onClick={onActividad}>
        <IconBell size={20} />
        {pendientes > 0 && <span className="ag-badge tnum">{pendientes}</span>}
        {s.novedades > 0 && <span className="ag-campana-punto" aria-hidden="true" />}
      </button>
      <button type="button" className="ag-demo-boton" aria-haspopup="dialog" aria-controls="ag-hoja-demo" onClick={onDemo} aria-label={`Opciones de la demo. Ahora la ves como ${persona.nombre}, ${persona.rol}`}>
        <span className="ag-demo-etiqueta">Demo</span>
        <span className="hidden min-w-0 text-left leading-tight md:block">
          <span className="block text-sm">Opciones de la demo</span>
          <span className="block truncate text-xs text-flp-muted">
            Ves como {persona.nombre} · {persona.rol}
          </span>
        </span>
        <IconChevronDown size={16} aria-hidden="true" />
      </button>
    </header>
  )
}

/** Botón que, con conversación en marcha, pide confirmación antes de empezar de cero. */
function ConConfirmacion({ hayConversacion, etiqueta, confirmar, aviso, onConfirmar, children }) {
  const [preguntando, setPreguntando] = useState(false)
  if (!preguntando) return children(() => (hayConversacion ? setPreguntando(true) : onConfirmar()))
  return (
    <div className="ag-confirmar" role="group" aria-label={etiqueta}>
      <p className="text-sm font-medium text-flp-ink">{confirmar}</p>
      <p className="mt-0.5 text-xs text-flp-muted">{aviso}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <FilmpilotButton size="sm" variant="carbon" onClick={onConfirmar} autoFocus>
          Sí, empezar de cero
        </FilmpilotButton>
        <FilmpilotButton size="sm" variant="secondary" onClick={() => setPreguntando(false)}>
          Cancelar
        </FilmpilotButton>
      </div>
    </div>
  )
}

/** Contenido de la hoja «Opciones de la demo». */
export function OpcionesDemo({ s, despachar, ritmo, setRitmo, ocupado, onNavigate, onCerrar, avisar }) {
  const hayConversacion = s.mensajes.length > 0
  const avisoBorrado = 'Se cierran la conversación y las decisiones que has tomado.'
  return (
    <div className="space-y-6">
      <section aria-labelledby="ag-demo-que">
        <h3 id="ag-demo-que" className="flp-kicker mb-1.5 text-flp-muted">
          Qué es esta pantalla
        </h3>
        <p className="text-sm leading-relaxed text-flp-muted">
          Una demostración. Los agentes siguen guiones preparados sobre datos de ejemplo de «La última función» (Candilejas Films). No hay un modelo de lenguaje detrás, no se conecta a bancos y no se envía ningún correo.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-flp-muted">{LEYENDA_CAPACIDAD}</p>
      </section>

      <fieldset>
        <legend className="flp-kicker mb-1.5 text-flp-muted">Ver la demo como</legend>
        <div className="ag-opciones">
          {Object.values(PERSONAS).map((p) => (
            <label key={p.id} className="ag-opcion-radio">
              <input type="radio" name="ag-persona" value={p.id} checked={s.persona === p.id} onChange={() => despachar({ tipo: 'persona', persona: p.id })} />
              <span>
                <span className="block text-sm font-medium text-flp-ink">{p.nombre}</span>
                <span className="block text-xs text-flp-muted">{p.rol}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-flp-muted">Cada rol puede decidir cosas distintas: cambia para ver quién aprueba qué.</p>
      </fieldset>

      <fieldset>
        <legend className="flp-kicker mb-1.5 text-flp-muted">Velocidad de los agentes</legend>
        <div className="ag-segmentado">
          {Object.entries(RITMOS).map(([k, r]) => (
            <label key={k}>
              <input type="radio" name="ag-ritmo" value={k} checked={ritmo === k} onChange={() => setRitmo(k)} />
              <span>{r.etiqueta}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!s.tour && (
        <ConConfirmacion
          hayConversacion={hayConversacion}
          etiqueta="Empezar el recorrido guiado"
          confirmar="¿Empezar el recorrido desde cero?"
          aviso={avisoBorrado}
          onConfirmar={() => {
            onCerrar()
            despachar({ tipo: 'tour/iniciar' })
          }}
        >
          {(pulsar) => (
            <div>
              <FilmpilotButton variant="secondary" icon={IconPlay} className="w-full" disabled={ocupado} onClick={pulsar}>
                Empezar el recorrido guiado
              </FilmpilotButton>
              <p className="mt-1.5 text-xs text-flp-muted">{ocupado ? 'Disponible cuando terminen los agentes.' : `${RECORRIDO.length} pasos, unos cinco minutos. Empieza con la demo recién abierta.`}</p>
            </div>
          )}
        </ConConfirmacion>
      )}

      <div className="flex flex-col gap-1 border-t border-flp-line pt-4">
        <button type="button" className="ag-menu-item" onClick={() => onNavigate('panel')}>
          <span>
            Abrir la demo clásica <span className="text-xs font-normal text-flp-muted">(pantallas de gestión, marca anterior)</span>
          </span>
        </button>
        <button type="button" className="ag-menu-item" onClick={() => onNavigate('landing')}>
          <IconArrowLeft size={16} aria-hidden="true" /> Volver a la portada
        </button>
        <ConConfirmacion
          hayConversacion={hayConversacion}
          etiqueta="Reiniciar la demo"
          confirmar="¿Reiniciar la demo?"
          aviso={avisoBorrado}
          onConfirmar={() => {
            onCerrar()
            despachar({ tipo: 'reiniciar' })
            avisar?.('Demo reiniciada: empieza de cero.')
          }}
        >
          {(pulsar) => (
            <button type="button" className="ag-menu-item ag-menu-item--peligro" onClick={pulsar}>
              Reiniciar la demo
            </button>
          )}
        </ConConfirmacion>
      </div>
    </div>
  )
}
