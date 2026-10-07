// Iconografía de línea, sobria. SVG inline para no añadir dependencias.
// Todos heredan el color vía `currentColor` y aceptan className/size.

function Svg({ size = 18, className = '', children, strokeWidth = 2, fill = 'none' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconPanel = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
)

export const IconPresupuesto = (p) => (
  <Svg {...p}>
    <path d="M3 7l9-4 9 4-9 4-9-4z" />
    <path d="M3 12l9 4 9-4" />
    <path d="M3 17l9 4 9-4" />
  </Svg>
)

export const IconCoste = (p) => (
  <Svg {...p}>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <rect x="7" y="11" width="3" height="5" />
    <rect x="12" y="8" width="3" height="8" />
    <rect x="17" y="13" width="3" height="3" />
  </Svg>
)

export const IconFacturas = (p) => (
  <Svg {...p}>
    <path d="M6 2h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="M14 2v5h5" />
    <path d="M8.5 12h7M8.5 15.5h7M8.5 8.5h3" />
  </Svg>
)

export const IconTesoreria = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="13" rx="2" />
    <path d="M2.5 10h19" />
    <circle cx="17" cy="14.5" r="1.4" />
  </Svg>
)

export const IconIncentivos = (p) => (
  <Svg {...p}>
    <path d="M4 21h16" />
    <path d="M5 21V10M19 21V10M9 21V10M15 21V10" />
    <path d="M3.5 10l8.5-6 8.5 6z" />
  </Svg>
)

export const IconProveedores = (p) => (
  <Svg {...p}>
    <path d="M3 14V6a1 1 0 0 1 1-1h9v9" />
    <path d="M13 8h4l4 4v2h-8" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M9 17h6" />
  </Svg>
)

export const IconAyudas = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="9" r="5" />
    <circle cx="12" cy="9" r="1.8" />
    <path d="M8.5 13.2L7 21l5-2.6 5 2.6-1.5-7.8" />
  </Svg>
)

export const IconBookmark = (p) => (
  <Svg {...p}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
)

export const IconUpload = (p) => (
  <Svg {...p}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
  </Svg>
)

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.6 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
)

export const IconCheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </Svg>
)

export const IconArrowUp = (p) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)

export const IconArrowDown = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
)

export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.6 4.8L18.5 9l-4.9 1.2L12 15l-1.6-4.8L5.5 9l4.9-1.2L12 3z" />
    <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
)

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
)

export const IconLocation = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
)

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 14h10l1-14" />
    <path d="M9 7V4h6v3" />
  </Svg>
)

export const IconFilm = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 14h4M17 9h4M17 14h4" />
  </Svg>
)

export const IconPause = (p) => (
  <Svg {...p}>
    <path d="M9 5v14M15 5v14" />
  </Svg>
)

export const IconPlay = (p) => (
  <Svg {...p}>
    <path d="M7 5l12 7-12 7V5z" />
  </Svg>
)

export const IconStop = (p) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </Svg>
)

export const IconMore = (p) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </Svg>
)

export const IconArrowLeft = (p) => (
  <Svg {...p}>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </Svg>
)

// Claqueta — logotipo de marca.
export const IconClaqueta = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="2.5" y="9" width="19" height="11.5" rx="1.8" fill="currentColor" opacity="0.12" />
    <rect x="2.5" y="9" width="19" height="11.5" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M3 9l2.6-3.2 3.3 1 -2.6 3.2zM8.8 6.9l3.3 1 -2.6 3.2 -3.3-1zM14.6 8l3.3 1 -2.6 3.2 -3.3-1z"
      fill="currentColor"
    />
  </svg>
)
