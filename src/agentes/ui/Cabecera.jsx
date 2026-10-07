// Cabecera del prototipo y opciones de la demo. Todo lo que no es conversación
// (quién mira, ritmo, recorrido, enlaces, reinicio) vive detrás de un solo botón.

import { FilmpilotLogo, FilmpilotSymbol, FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconBell, IconChevronDown, IconArrowLeft, IconPlay } from '../../components/icons.jsx'
import { PERSONAS } from '../mundo.js'
import { RITMOS } from '../useAgentes.js'
import { AgentesPorFamilia } from './Paneles.jsx'

export function Cabecera({ s, persona, pendientes, onPortada, onActividad, onDemo }) {
  const avisos = s.novedades || pendientes
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
        <p className="truncate text-sm font-medium text-flp-ink">
          Agentes <span className="text-flp-muted">· {s.mundo.proyecto.titulo}</span>
        </p>
        <p className="flp-mono truncate text-flp-muted">
          Rodaje, día {s.mundo.proyecto.diaActual} de {s.mundo.proyecto.diasRodaje}
        </p>
      </div>
      <button
        type="button"
        className="ag-icon-button ag-campana relative"
        aria-label={`Por revisar, actividad y riesgos${s.novedades ? `, ${s.novedades} novedades` : pendientes ? `, ${pendientes} por revisar` : ''}`}
        onClick={onActividad}
      >
        <IconBell size={20} />
        {avisos > 0 && <span className="ag-badge tnum">{avisos}</span>}
      </button>
      <button type="button" className="ag-demo-boton" aria-haspopup="dialog" aria-controls="ag-hoja-demo" onClick={onDemo} aria-label={`Opciones de la demo. Ves la demo como ${persona.nombre}, ${persona.rol}`}>
        <span className="ag-demo-etiqueta">Demo</span>
        <span className="hidden min-w-0 truncate md:inline">
          {persona.nombre} <span className="text-flp-muted">· {persona.rol}</span>
        </span>
        <IconChevronDown size={16} aria-hidden="true" />
      </button>
    </header>
  )
}

/** Contenido de la hoja «Opciones de la demo». */
export function OpcionesDemo({ s, despachar, ritmo, setRitmo, ocupado, estados, onNavigate, onCerrar, onAbrirAgente }) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="ag-demo-que">
        <h3 id="ag-demo-que" className="flp-kicker mb-1.5 text-flp-muted">
          Qué es esta pantalla
        </h3>
        <p className="text-sm leading-relaxed text-flp-muted">
          Una demostración. Los agentes siguen guiones preparados sobre datos de ejemplo de «La última función» (Candilejas Films). No hay un modelo de lenguaje detrás, no se conecta a bancos y no se envía ningún correo. Lo marcado como «Exploratorio» o «Fase posterior» no forma parte del alcance decidido.
        </p>
      </section>

      <fieldset>
        <legend className="flp-kicker mb-1.5 text-flp-muted">Ver como</legend>
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
        <legend className="flp-kicker mb-1.5 text-flp-muted">Ritmo de los agentes</legend>
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
        <FilmpilotButton
          variant="secondary"
          icon={IconPlay}
          className="w-full"
          disabled={ocupado}
          onClick={() => {
            onCerrar()
            despachar({ tipo: 'tour/iniciar' })
          }}
        >
          Empezar el recorrido guiado
        </FilmpilotButton>
      )}

      <section className="xl:hidden" aria-labelledby="ag-demo-agentes">
        <h3 id="ag-demo-agentes" className="flp-kicker mb-1.5 text-flp-muted">
          Agentes
        </h3>
        <AgentesPorFamilia
          estados={estados}
          onAbrir={(id) => {
            onCerrar()
            onAbrirAgente(id)
          }}
        />
      </section>

      <div className="flex flex-col gap-1 border-t border-flp-line pt-4">
        <button type="button" className="ag-menu-item" onClick={() => onNavigate('panel')}>
          Abrir la demo clásica <span className="text-xs font-normal text-flp-muted">(marca anterior)</span>
        </button>
        <button type="button" className="ag-menu-item" onClick={() => onNavigate('landing')}>
          <IconArrowLeft size={16} aria-hidden="true" /> Volver a la portada
        </button>
        <button
          type="button"
          className="ag-menu-item ag-menu-item--peligro"
          onClick={() => {
            onCerrar()
            despachar({ tipo: 'reiniciar' })
          }}
        >
          Reiniciar la demo
        </button>
      </div>
    </div>
  )
}
