// Componentes de marca Filmpilot (Brand Kit v1) para la portada y el prototipo de
// agentes. Estilos en ./filmpilot.css (prefijo flp-).

import { SIMBOLO, SEMILLA, GLIFOS } from './glifos.js'

export const BRAND_BASE = `${import.meta.env.BASE_URL}brand/filmpilot`

// Medidas reales de cada SVG del kit: evitan saltos de maquetación.
const LOGOS = {
  horizontal: [802, 212],
  symbol: [212, 204],
  wordmark: [594, 187],
  stacked: [610, 410],
  claim: [802, 420],
}

/** Logo como imagen: el wordmark va trazado en el SVG, nunca en texto vivo. */
export function FilmpilotLogo({ variant = 'horizontal', tone = 'carbon', width = 180, decorative = false, className = '' }) {
  const [w, h] = LOGOS[variant] ?? LOGOS.horizontal
  return (
    <img
      className={`flp-logo ${className}`}
      src={`${BRAND_BASE}/logos/svg/filmpilot-${variant}-${tone}.svg`}
      width={w}
      height={h}
      alt={decorative ? '' : 'Filmpilot'}
      aria-hidden={decorative || undefined}
      style={{ width, maxWidth: '100%', height: 'auto' }}
      draggable="false"
    />
  )
}

/** Símbolo en línea: toma el color del texto (carbón, tiza o señal). */
export function FilmpilotSymbol({ size = 24, title, className = '' }) {
  return (
    <svg
      viewBox={SIMBOLO.viewBox}
      width={size}
      height={Math.round((size * 204) / 212)}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g transform={SIMBOLO.desplazamiento} fill="currentColor">
        {SIMBOLO.trazos.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

/** Glifo de familia de agentes. Va siempre junto a un nombre: la silueta sola no identifica. */
export function AgentGlyph({ family, size = 32, className = '' }) {
  const t = GLIFOS[family]
  if (!t) return null
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        {t.map((tr) => (
          <path key={tr} d={SEMILLA} transform={tr} />
        ))}
      </g>
    </svg>
  )
}

export const STATE_LABELS = { idle: 'En espera', working: 'Trabajando', review: 'Por revisar', done: 'Completado', stopped: 'Detenido', error: 'Bloqueante' }

/** Estado con texto, nunca solo color. */
export function StateChip({ state = 'idle', children, className = '' }) {
  return (
    <span className={`flp-state flp-state--${state} ${className}`}>
      {children ?? STATE_LABELS[state] ?? state}
    </span>
  )
}

/**
 * Botón en píldora. primary = señal (una acción dominante por sección);
 * secondary = contorno; ghost = texto; carbon = relleno oscuro.
 * Con `href` se pinta como enlace.
 */
export function FilmpilotButton({ variant = 'secondary', size = 'md', icon: Icon, iconAfter: IconAfter, href, className = '', children, type, ...rest }) {
  const cls = `flp-button flp-button--${variant} flp-button--${size} ${className}`
  const contenido = (
    <>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
      {IconAfter && <IconAfter size={16} aria-hidden="true" />}
    </>
  )
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {contenido}
      </a>
    )
  }
  return (
    <button type={type ?? 'button'} className={cls} {...rest}>
      {contenido}
    </button>
  )
}

export function Kicker({ as: Tag = 'p', className = '', children }) {
  return <Tag className={`flp-kicker ${className}`}>{children}</Tag>
}

/** Foto B/N del kit. Es una imagen generada de concepto: el alt lo dice. */
export function ProductionPhoto({ sizes = '(max-width: 800px) 100vw, 60vw', priority = false, className = '' }) {
  return (
    <picture>
      <source type="image/webp" srcSet={[480, 768, 1280, 1672].map((w) => `${BRAND_BASE}/images/production-team-${w}.webp ${w}w`).join(', ')} sizes={sizes} />
      <img
        className={`flp-photo ${className}`}
        src={`${BRAND_BASE}/images/production-team-1672.jpg`}
        srcSet={`${BRAND_BASE}/images/production-team-768.jpg 768w, ${BRAND_BASE}/images/production-team-1672.jpg 1672w`}
        sizes={sizes}
        alt="Dos profesionales revisan un monitor en un rodaje. Imagen conceptual."
        width={1672}
        height={941}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </picture>
  )
}

/** Composición orbital decorativa: signal (bloque amarillo), dark (bloque carbón) o lines (solo órbitas). */
export function OrbitGraphic({ tone = 'signal', className = '' }) {
  const [w, h] = tone === 'lines' ? [1200, 700] : [720, 720]
  return <img className={className} src={`${BRAND_BASE}/graphics/orbit-${tone}.svg`} width={w} height={h} alt="" aria-hidden="true" draggable="false" />
}
