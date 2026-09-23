const BRAND_ROOT = `${import.meta.env.BASE_URL}brand/setvalio/logos/svg`

export function SetvalioMark({ size = 32, className = '', title, light = false }) {
  return (
    <img
      className={className}
      src={`${BRAND_ROOT}/setvalio-symbol-${light ? 'papel' : 'ciruela'}.svg`}
      width={size}
      height={size}
      alt={title || ''}
      aria-hidden={title ? undefined : true}
      draggable="false"
    />
  )
}

export function BrandLockup({ light = false, compact = false, decorative = false, className = '' }) {
  return (
    <span className={`sv-brand ${compact ? 'sv-brand--compact' : ''} ${className}`}>
      <img
        src={`${BRAND_ROOT}/setvalio-horizontal-${light ? 'papel' : 'ciruela'}.svg`}
        width="745"
        height="176"
        alt={decorative ? '' : 'SetValio'}
        aria-hidden={decorative || undefined}
        draggable="false"
      />
    </span>
  )
}
