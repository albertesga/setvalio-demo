// «Volver a verlo»: repite una toma de producto. Solo existe con movimiento, nunca
// mueve el foco y va siempre fuera de cualquier role="img".

import { FilmpilotButton } from '../../brand/Filmpilot.jsx'
import { IconClaqueta } from '../../components/icons.jsx'
import { usePrefiereMovimiento } from './movimiento.js'
import './BotonRepetir.css'

export function BotonRepetir({ onClick, corriendo = false, className = '', children = 'Volver a verlo' }) {
  const movimiento = usePrefiereMovimiento()
  if (!movimiento) return null
  return (
    <FilmpilotButton
      variant="ghost"
      size="sm"
      icon={IconClaqueta}
      className={`portada-repetir ${className}`}
      aria-disabled={corriendo || undefined}
      onClick={() => {
        if (!corriendo) onClick()
      }}
    >
      {children}
    </FilmpilotButton>
  )
}
