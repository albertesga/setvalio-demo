// Cabecera de la portada: logo, navegación, CTA y menú móvil. Su borde inferior es la
// pista de montaje y, en escritorio, se marca el enlace de la sección en la que estás.

import { useEffect, useRef, useState } from 'react'
import { FilmpilotButton, FilmpilotLogo } from '../../brand/Filmpilot.jsx'
import { IconChevronDown, IconChevronRight, IconClose, IconMenu } from '../../components/icons.jsx'
import { Container, movimientoReducido } from './comun.jsx'
import { NAV, SECCIONES } from './datos.js'
import { useSeccionActiva } from './movimiento.js'
import { PistaMontaje } from './PistaMontaje.jsx'
import './Cabecera.css'

export function Cabecera({ abrirAgentes, clearSectionHash }) {
  const [menuOpen, setMenuOpen] = useState(false)
  // Se observan todas las secciones, no solo las de la nav: en el inicio, la foto o el
  // cierre no queda marcado ningún enlace (tampoco el de antes). Solo cambia de estado al
  // pasar de una sección a otra. El cabezal de la pista cambia de clip en el centro de la
  // misma franja (FRANJA_LECTURA en movimiento.js).
  const activa = useSeccionActiva(SECCIONES)
  const menuButtonRef = useRef(null)
  const headerRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    // Tocar fuera de la cabecera también cierra el menú.
    const closeOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [menuOpen])
  const abrir = (contexto) => {
    setMenuOpen(false)
    abrirAgentes(contexto)
  }

  return (
    <header ref={headerRef} className="landing-header cabecera-con-pista">
      <Container className="landing-header-inner">
        <button
          type="button"
          className="landing-logo"
          onClick={() => {
            clearSectionHash()
            window.scrollTo({ top: 0, behavior: movimientoReducido() ? 'auto' : 'smooth' })
          }}
          aria-label="Filmpilot, volver al inicio"
        >
          <FilmpilotLogo width={150} decorative />
        </button>
        <nav className="landing-nav" aria-label="Navegación principal">
          {NAV.map(({ label, href }) => (
            <a key={href} href={href} className={`cabecera-enlace${href === `#${activa}` ? ' is-activa' : ''}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="landing-header-actions">
          <FilmpilotButton variant="carbon" size="sm" className="landing-header-cta" onClick={() => abrir()} iconAfter={IconChevronRight}>
            Probar los agentes
          </FilmpilotButton>
          <button ref={menuButtonRef} className="landing-menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="landing-mobile-nav">
            {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </Container>
      <PistaMontaje secciones={SECCIONES} />
      <nav
        id="landing-mobile-nav"
        className={`landing-mobile-nav${menuOpen ? ' is-open' : ''}`}
        aria-label="Navegación móvil"
        aria-hidden={!menuOpen}
        inert={menuOpen ? undefined : ''}
        onBlur={(e) => {
          // Si el foco sale del menú (y no vuelve a su botón), se cierra: no tapa lo enfocado.
          if (menuOpen && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== menuButtonRef.current) setMenuOpen(false)
        }}
      >
        {NAV.map(({ label, href }) => (
          <a key={href} href={href} onClick={() => setMenuOpen(false)}>
            {label}
            <IconChevronDown size={16} aria-hidden="true" />
          </a>
        ))}
        <div className="landing-mobile-actions">
          <FilmpilotButton variant="primary" onClick={() => abrir()} iconAfter={IconChevronRight}>
            Probar los agentes
          </FilmpilotButton>
          <FilmpilotButton variant="secondary" onClick={() => abrir({ tour: true })}>
            Empezar el recorrido guiado
          </FilmpilotButton>
        </div>
      </nav>
    </header>
  )
}
