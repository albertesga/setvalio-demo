const ACCENT = '#311b2e'
const CONTRAST = '#ffffff'

// A single brand accent keeps the workspace coherent; soft tints only orient sections.
export const ROUTE_THEMES = {
  landing: { accent: ACCENT, soft: '#f1e8ed', contrast: CONTRAST, label: 'SetValio' },
  proyectos: { accent: ACCENT, soft: '#e9edf5', contrast: CONTRAST, label: 'Proyectos' },
  panel: { accent: ACCENT, soft: '#edf2d7', contrast: CONTRAST, label: 'Resumen del proyecto' },
  incentivos: { accent: ACCENT, soft: '#f1e8ed', contrast: CONTRAST, label: 'Optimizador de incentivos' },
  escenarios: { accent: ACCENT, soft: '#f1e8ed', contrast: CONTRAST, label: 'Escenarios guardados' },
  ayudas: { accent: ACCENT, soft: '#fcf2dd', contrast: CONTRAST, label: 'Ayudas compatibles' },
  coste: { accent: ACCENT, soft: '#eee7f1', contrast: CONTRAST, label: 'Control de costes' },
  facturas: { accent: ACCENT, soft: '#e4eff1', contrast: CONTRAST, label: 'Gastos y compras' },
  compras: { accent: ACCENT, soft: '#e9e4f3', contrast: CONTRAST, label: 'Órdenes de compra' },
  elegibilidad: { accent: ACCENT, soft: '#e6f0f5', contrast: CONTRAST, label: 'Elegibilidad fiscal' },
  informes: { accent: ACCENT, soft: '#e6f0f5', contrast: CONTRAST, label: 'Informes' },
  despacho: { accent: ACCENT, soft: '#e9e4f3', contrast: CONTRAST, label: 'Consola Despacho' },
  'design-system': { accent: ACCENT, soft: '#f1e8ed', contrast: CONTRAST, label: 'Design system' },
  presupuesto: { accent: ACCENT, soft: '#edf2d7', contrast: CONTRAST, label: 'Presupuesto ICAA' },
  tesoreria: { accent: ACCENT, soft: '#fcf2dd', contrast: CONTRAST, label: 'Plan de financiación' },
  proveedores: { accent: ACCENT, soft: '#e6f0f5', contrast: CONTRAST, label: 'Proveedores' },
  documental: { accent: ACCENT, soft: '#e9e4f3', contrast: CONTRAST, label: 'Dossier fiscal' },
}

export function temaDe(route) {
  return ROUTE_THEMES[route] || ROUTE_THEMES.panel
}
