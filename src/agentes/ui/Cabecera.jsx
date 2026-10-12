// Cabecera del prototipo. A la vista: el proyecto, el contador «Por revisar» y el equipo.
// La demo se ve siempre como Marta y a ritmo normal: no hay opciones que cambiar.

import { FilmpilotLogo, FilmpilotSymbol } from '../../brand/Filmpilot.jsx'
import { IconEquipo } from '../../components/icons.jsx'

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

export function Cabecera({ s, porRevisar, onPortada, onEquipo, onRevisar }) {
  const p = s.mundo.proyecto
  return (
    <header className="ag-header">
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
          <p className="ag-header-sub flp-mono truncate text-flp-muted">
            <span className="hidden md:inline">
              Rodaje · día <span className="tnum">{p.diaActual}</span> de <span className="tnum">{p.diasRodaje}</span>
            </span>
            <span className="md:hidden">
              Día <span className="tnum">{p.diaActual}</span> de <span className="tnum">{p.diasRodaje}</span>
            </span>
          </p>
        </div>
        <ContadorRevisar n={porRevisar} onRevisar={onRevisar} />
        {/* El equipo: quién es quién y cómo actúa. */}
        <button type="button" className="ag-header-equipo" aria-haspopup="dialog" aria-controls="ag-hoja-equipo" onClick={onEquipo} aria-label="Equipo de agentes">
          <IconEquipo size={20} className="sm:hidden" aria-hidden="true" />
          <span className="hidden sm:inline">Equipo</span>
        </button>
      </div>
    </header>
  )
}
