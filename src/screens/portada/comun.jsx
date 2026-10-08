// Piezas pequeñas que comparten las secciones de la portada.

import { IconChevronRight } from '../../components/icons.jsx'

export const movimientoReducido = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function Container({ children, className = '' }) {
  return <div className={`landing-container ${className}`}>{children}</div>
}

export function ArrowLink({ children, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} className={`landing-arrow-link ${className}`}>
      {children}
      <IconChevronRight size={17} aria-hidden="true" />
    </button>
  )
}
