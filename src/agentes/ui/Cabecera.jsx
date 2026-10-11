// Cabecera del prototipo y opciones de la demo. A la vista: el proyecto, el contador
// «Por revisar», las historias (sin carril) y el recorrido. Detrás de «Opciones», lo
// que cambia la demo: quién mira, el ritmo, las novedades automáticas y el reinicio.

import { useState } from 'react'
import { FilmpilotLogo, FilmpilotSymbol, FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconChevronDown, IconMore, IconPlay } from '../../components/icons.jsx'
import { PERSONAS } from '../mundo.js'
import { RITMOS } from '../useAgentes.js'
import { LEYENDA_CAPACIDAD, RECORRIDO } from '../casos.js'
import { conversacionIniciada } from '../sesion.js'
import { REGLA_COMUN } from '../escenarios/conversacion.js'

// Lo que dura el recorrido: unos 30 s por paso, redondeado al minuto.
export const TEXTO_RECORRIDO = `${RECORRIDO.length} pasos, unos ${Math.max(1, Math.round(RECORRIDO.length / 2))} minutos`

/** Contador global de lo que espera una decisión: la única cifra amarilla de la cabecera. */
function ContadorRevisar({ n, onRevisar }) {
  if (!n) return null
  return (
    <button type="button" className="ag-contador" onClick={onRevisar} aria-label={`Por revisar: ${n} ${n === 1 ? 'decisión' : 'decisiones'}. Pregunta qué tienes que revisar.`}>
      <span className="ag-contador-chip">
        <span>
          <span className="hidden sm:inline">Por revisar · </span>
          <span className="sm:hidden">Revisar · </span>
          <span className="tnum">{n}</span>
        </span>
      </span>
    </button>
  )
}

export function Cabecera({ s, persona, porRevisar, onPortada, onHistorias, onDemo, onRecorrido, onRevisar }) {
  const p = s.mundo.proyecto
  const enRecorrido = !!s.tour
  return (
    <header className={`ag-header ${enRecorrido ? 'is-recorrido' : ''}`}>
      <div className="ag-header-fila">
        <button type="button" className="ag-header-marca" onClick={onPortada} aria-label="Filmpilot, volver a la portada">
          <span className="hidden lg:block">
            <FilmpilotLogo width={128} decorative />
          </span>
          <span className="lg:hidden">
            <FilmpilotSymbol size={28} />
          </span>
        </button>
        <span className="ag-header-sep hidden lg:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h1 className="ag-header-titulo">
            <span className="hidden text-flp-muted lg:inline">Agentes · </span>
            {p.titulo}
          </h1>
          <p className="flp-mono truncate text-flp-muted">
            <span className="hidden md:inline">
              Rodaje · día <span className="tnum">{p.diaActual}</span> de <span className="tnum">{p.diasRodaje}</span>
            </span>
            <span className="md:hidden">
              Día <span className="tnum">{p.diaActual}</span> de <span className="tnum">{p.diasRodaje}</span>
            </span>
          </p>
        </div>
        <ContadorRevisar n={porRevisar} onRevisar={onRevisar} />
        {/* Historias (sin carril, menos de 1024 px) y recorrido. En móvil bajan a una segunda
            fila (pantalla.css); durante el recorrido manda su barra. */}
        {!enRecorrido && (
          <div className="ag-header-acciones">
            <button type="button" className="ag-header-historias" aria-haspopup="dialog" aria-controls="ag-hoja-agentes" onClick={onHistorias}>
              Historias
            </button>
            <FilmpilotButton variant="secondary" icon={IconPlay} className="ag-header-recorrido" onClick={onRecorrido} title={TEXTO_RECORRIDO}>
              <span>
                Recorrido · <span className="tnum">{RECORRIDO.length}</span> pasos
              </span>
            </FilmpilotButton>
          </div>
        )}
        <button type="button" className="ag-demo-boton" aria-haspopup="dialog" aria-controls="ag-hoja-demo" onClick={onDemo} aria-label={`Opciones de la demo. Ahora la ves como ${persona.nombre}, ${persona.rol}`}>
          <span className="hidden md:inline">Opciones</span>
          <IconChevronDown size={16} className="hidden md:block" aria-hidden="true" />
          <IconMore size={20} className="md:hidden" aria-hidden="true" />
        </button>
      </div>
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

// La regla común va a media frase: «La regla es la del producto: no paga…».
const REGLA_MINUSCULA = REGLA_COMUN.charAt(0).toLowerCase() + REGLA_COMUN.slice(1)

export const AVISO_BORRADO = 'Se cierran la conversación y las decisiones que has tomado.'

/** Confirmación del recorrido cuando ya hay conversación (el parte solo no cuenta). */
export function ConfirmarRecorrido({ onConfirmar, onCancelar }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-flp-muted">
        El recorrido vuelve a abrir la demo desde el parte de la mañana: {TEXTO_RECORRIDO}. {AVISO_BORRADO}
      </p>
      <div className="flex flex-wrap gap-2">
        <FilmpilotButton variant="carbon" onClick={onConfirmar}>
          Sí, empezar de cero
        </FilmpilotButton>
        <FilmpilotButton variant="secondary" onClick={onCancelar}>
          Cancelar
        </FilmpilotButton>
      </div>
    </div>
  )
}

/** Contenido de la hoja «Opciones de la demo». */
export function OpcionesDemo({ s, despachar, ritmo, setRitmo, onCerrar, avisar }) {
  const hayConversacion = conversacionIniciada(s)
  return (
    <div className="space-y-6">
      <section aria-labelledby="ag-demo-que">
        <h3 id="ag-demo-que" className="flp-kicker mb-1.5 text-flp-muted">
          Qué es esta demo
        </h3>
        <p className="text-sm leading-relaxed text-flp-muted">
          «La última función» (Candilejas Films) con datos de ejemplo. Los agentes siguen guiones preparados: no hay un modelo de lenguaje detrás. La regla es la del producto: {REGLA_MINUSCULA}. Lo que
          aún no hace, como el Production Rescue, te lo dice si se lo pides.
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

      <label className="ag-interruptor">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-flp-ink">Novedades automáticas</span>
          <span className="block text-xs text-flp-muted">Una factura y una compra llegan solas cuando dejas la pantalla quieta. Nunca durante el recorrido.</span>
        </span>
        <span className="ag-interruptor-estado" aria-hidden="true">
          {s.eventosPausados ? 'Pausadas' : 'Activadas'}
        </span>
        <input type="checkbox" role="switch" checked={!s.eventosPausados} onChange={(e) => despachar({ tipo: 'pausarEventos', valor: !e.target.checked })} />
      </label>

      <div className="border-t border-flp-line pt-4">
        <ConConfirmacion
          hayConversacion={hayConversacion}
          etiqueta="Reiniciar la demo"
          confirmar="¿Reiniciar la demo?"
          aviso={AVISO_BORRADO}
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
