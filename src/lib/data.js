// ─────────────────────────────────────────────────────────────────────────
// Datos de demostración — Filmpilot («La última función»)
//
// Todo el prototipo se alimenta de este módulo. Los totales por capítulo y del
// proyecto se DERIVAN de las partidas (no se teclean por separado) para que las
// cifras cuadren en todas las pantallas. Estructura presupuestaria: modelo de
// 12 capítulos del ICAA.
// ─────────────────────────────────────────────────────────────────────────

// El proyecto «por defecto» vive ahora en el core data layer (proyectos.js).
// Se re-exporta para compatibilidad con las pantallas que aún lo importan de aquí.
// CAPITULOS / FACTURAS / CASHFLOW siguen siendo dataset estático de demostración.
export { PROYECTO } from './proyectos.js'

// En esta demo, solo este proyecto tiene cargados datos de coste, tesorería y
// facturas. El resto de proyectos muestran estados vacíos (no datos de otro proyecto).
export const PROYECTO_DEMO_ID = 'p-ultima-funcion'

// Cada partida: presupuesto · gastado a fecha · comprometido pendiente · CEF (coste estimado final).
export const CAPITULOS = [
  {
    id: '01',
    nombre: 'Guion y música',
    partidas: [
      { codigo: '01.01', nombre: 'Derechos de adaptación y guion', presupuesto: 70_000, gastado: 70_000, comprometido: 0, cef: 70_000 },
      { codigo: '01.02', nombre: 'Música original (composición)', presupuesto: 40_000, gastado: 30_000, comprometido: 8_000, cef: 40_000 },
      { codigo: '01.03', nombre: 'Derechos de sincronización musical', presupuesto: 10_000, gastado: 8_000, comprometido: 4_000, cef: 10_000 },
    ],
  },
  {
    id: '02',
    nombre: 'Personal artístico',
    partidas: [
      { codigo: '02.01', nombre: 'Protagonistas', presupuesto: 200_000, gastado: 140_000, comprometido: 70_000, cef: 210_000 },
      { codigo: '02.02', nombre: 'Secundarios', presupuesto: 90_000, gastado: 60_000, comprometido: 30_000, cef: 92_000 },
      { codigo: '02.03', nombre: 'Pequeñas partes y figuración', presupuesto: 50_000, gastado: 30_000, comprometido: 16_000, cef: 50_000 },
      { codigo: '02.04', nombre: 'Dirección de reparto', presupuesto: 20_000, gastado: 10_000, comprometido: 4_000, cef: 20_000 },
    ],
  },
  {
    id: '03',
    nombre: 'Equipo técnico',
    partidas: [
      { codigo: '03.01', nombre: 'Dirección y ayudantes', presupuesto: 110_000, gastado: 70_000, comprometido: 36_000, cef: 110_000 },
      { codigo: '03.02', nombre: 'Producción y regiduría', presupuesto: 120_000, gastado: 78_000, comprometido: 40_000, cef: 122_000 },
      { codigo: '03.03', nombre: 'Fotografía y eléctricos', presupuesto: 150_000, gastado: 92_000, comprometido: 50_000, cef: 152_000 },
      { codigo: '03.04', nombre: 'Sonido directo', presupuesto: 40_000, gastado: 24_000, comprometido: 14_000, cef: 40_000 },
      { codigo: '03.05', nombre: 'Dirección de arte (personal)', presupuesto: 70_000, gastado: 44_000, comprometido: 24_000, cef: 70_000 },
      { codigo: '03.06', nombre: 'Montaje (personal)', presupuesto: 50_000, gastado: 22_000, comprometido: 16_000, cef: 52_000 },
    ],
  },
  {
    id: '04',
    nombre: 'Escenografía',
    partidas: [
      { codigo: '04.01', nombre: 'Construcción de decorados', presupuesto: 120_000, gastado: 96_000, comprometido: 44_000, cef: 140_000 },
      { codigo: '04.02', nombre: 'Ambientación y atrezo', presupuesto: 60_000, gastado: 42_000, comprometido: 22_000, cef: 64_000 },
      { codigo: '04.03', nombre: 'Vestuario', presupuesto: 40_000, gastado: 22_000, comprometido: 12_000, cef: 40_000 },
      { codigo: '04.04', nombre: 'Maquillaje y peluquería (material)', presupuesto: 20_000, gastado: 8_000, comprometido: 6_000, cef: 20_000 },
    ],
  },
  {
    id: '05',
    nombre: 'Estudios de rodaje y varios de producción',
    partidas: [
      { codigo: '05.01', nombre: 'Alquiler de localizaciones', presupuesto: 90_000, gastado: 56_000, comprometido: 22_000, cef: 86_000 },
      { codigo: '05.02', nombre: 'Permisos y tasas de rodaje', presupuesto: 28_000, gastado: 16_000, comprometido: 8_000, cef: 26_000 },
      { codigo: '05.03', nombre: 'Oficina de producción y comunicaciones', presupuesto: 30_000, gastado: 18_000, comprometido: 8_000, cef: 30_000 },
      { codigo: '05.04', nombre: 'Material fungible de rodaje', presupuesto: 20_000, gastado: 6_000, comprometido: 4_000, cef: 20_000 },
    ],
  },
  {
    id: '06',
    nombre: 'Maquinaria de rodaje y transportes',
    partidas: [
      { codigo: '06.01', nombre: 'Cámara y ópticas (alquiler)', presupuesto: 80_000, gastado: 56_000, comprometido: 20_000, cef: 80_000 },
      { codigo: '06.02', nombre: 'Iluminación y maquinaria (alquiler)', presupuesto: 70_000, gastado: 48_000, comprometido: 18_000, cef: 70_000 },
      { codigo: '06.03', nombre: 'Transportes y vehículos', presupuesto: 42_000, gastado: 28_000, comprometido: 10_000, cef: 42_000 },
    ],
  },
  {
    id: '07',
    nombre: 'Viajes, hoteles y comidas',
    partidas: [
      { codigo: '07.01', nombre: 'Viajes y desplazamientos', presupuesto: 46_000, gastado: 30_000, comprometido: 10_000, cef: 50_000 },
      { codigo: '07.02', nombre: 'Alojamiento', presupuesto: 50_000, gastado: 32_000, comprometido: 12_000, cef: 56_000 },
      { codigo: '07.03', nombre: 'Catering y comidas de equipo', presupuesto: 60_000, gastado: 40_000, comprometido: 14_000, cef: 62_000 },
    ],
  },
  {
    id: '08',
    nombre: 'Soportes y material sensible',
    partidas: [
      { codigo: '08.01', nombre: 'Tarjetas, almacenamiento y back-up', presupuesto: 24_000, gastado: 15_000, comprometido: 4_000, cef: 22_000 },
      { codigo: '08.02', nombre: 'Copias de seguridad y archivo', presupuesto: 12_000, gastado: 6_000, comprometido: 2_000, cef: 11_000 },
    ],
  },
  {
    id: '09',
    nombre: 'Laboratorio y postproducción',
    partidas: [
      { codigo: '09.01', nombre: 'Montaje y sala', presupuesto: 60_000, gastado: 20_000, comprometido: 30_000, cef: 60_000 },
      { codigo: '09.02', nombre: 'Etalonaje y corrección de color', presupuesto: 70_000, gastado: 12_000, comprometido: 30_000, cef: 68_000 },
      { codigo: '09.03', nombre: 'Postproducción de sonido y mezclas', presupuesto: 90_000, gastado: 16_000, comprometido: 40_000, cef: 88_000 },
      { codigo: '09.04', nombre: 'VFX y títulos', presupuesto: 60_000, gastado: 8_000, comprometido: 22_000, cef: 58_000 },
      { codigo: '09.05', nombre: 'Másters y entregas', presupuesto: 32_000, gastado: 4_000, comprometido: 10_000, cef: 32_000 },
    ],
  },
  {
    id: '10',
    nombre: 'Seguros',
    partidas: [
      { codigo: '10.01', nombre: 'Seguro de producción (negativo y RC)', presupuesto: 44_000, gastado: 40_000, comprometido: 0, cef: 44_000 },
      { codigo: '10.02', nombre: 'Seguro de materiales y equipo', presupuesto: 16_000, gastado: 14_000, comprometido: 0, cef: 16_000 },
    ],
  },
  {
    id: '11',
    nombre: 'Gastos generales',
    partidas: [
      { codigo: '11.01', nombre: 'Estructura de la productora (imputación)', presupuesto: 84_000, gastado: 50_000, comprometido: 16_000, cef: 84_000 },
      { codigo: '11.02', nombre: 'Asesoría jurídica y fiscal', presupuesto: 28_000, gastado: 18_000, comprometido: 6_000, cef: 28_000 },
      { codigo: '11.03', nombre: 'Auditoría de la subvención', presupuesto: 20_000, gastado: 10_000, comprometido: 2_000, cef: 20_000 },
    ],
  },
  {
    id: '12',
    nombre: 'Gastos de explotación, comercial y financieros',
    partidas: [
      { codigo: '12.01', nombre: 'Gastos financieros (intereses de crédito)', presupuesto: 36_000, gastado: 6_000, comprometido: 10_000, cef: 32_000 },
      { codigo: '12.02', nombre: 'Publicidad y promoción', presupuesto: 28_000, gastado: 2_000, comprometido: 4_000, cef: 26_000 },
      { codigo: '12.03', nombre: 'Copia estándar y materiales de venta', presupuesto: 20_000, gastado: 4_000, comprometido: 4_000, cef: 20_000 },
    ],
  },
]

// ── Agregados ──────────────────────────────────────────────────────────────

function sum(arr, key) {
  return arr.reduce((acc, x) => acc + x[key], 0)
}

/** Totaliza un capítulo a partir de sus partidas. */
export function totalizarCapitulo(cap) {
  const presupuesto = sum(cap.partidas, 'presupuesto')
  const gastado = sum(cap.partidas, 'gastado')
  const comprometido = sum(cap.partidas, 'comprometido')
  const cef = sum(cap.partidas, 'cef')
  const desviacion = cef - presupuesto
  return {
    ...cap,
    presupuesto,
    gastado,
    comprometido,
    cef,
    desviacion,
    desviacionPct: presupuesto ? desviacion / presupuesto : 0,
    ejecucionPct: cef ? gastado / cef : 0,
    pesoPct: presupuesto, // se normaliza luego
  }
}

export const CAPITULOS_TOTAL = CAPITULOS.map(totalizarCapitulo)

export const TOTALES = (() => {
  const presupuesto = sum(CAPITULOS_TOTAL, 'presupuesto')
  const gastado = sum(CAPITULOS_TOTAL, 'gastado')
  const comprometido = sum(CAPITULOS_TOTAL, 'comprometido')
  const cef = sum(CAPITULOS_TOTAL, 'cef')
  const desviacion = cef - presupuesto
  return {
    presupuesto,
    gastado,
    comprometido,
    cef,
    desviacion,
    desviacionPct: presupuesto ? desviacion / presupuesto : 0,
    ejecucionPresupuestoPct: presupuesto ? gastado / presupuesto : 0,
    disponible: cef - gastado - comprometido,
  }
})()

// Peso de cada capítulo sobre el presupuesto total.
CAPITULOS_TOTAL.forEach((c) => {
  c.pesoPct = TOTALES.presupuesto ? c.presupuesto / TOTALES.presupuesto : 0
})

// ── Facturas ────────────────────────────────────────────────────────────────
// estado: 'validada' | 'pendiente' | 'revisar'
// impuesto: { tipo: 'IVA'|'IGIC'|'Exento', tasa: number, importe: number }

export const FACTURAS = [
  {
    id: 'F-2026-041',
    proveedor: 'Decorados Almazán S.L.',
    cif: 'B-84021553',
    concepto: 'Construcción decorado «teatro Apolo»',
    fecha: '12/05/2026',
    vencimiento: '11/06/2026',
    base: 23_400,
    impuesto: { tipo: 'IVA', tasa: 21, importe: 4_914 },
    total: 28_314,
    capitulo: '04',
    partida: '04.01',
    estado: 'validada',
    metodo: 'Transferencia',
    pedido: 'PO-2026-018',
  },
  {
    id: 'F-2026-052',
    proveedor: 'Panavision Madrid',
    cif: 'A-28997120',
    concepto: 'Alquiler cámara y ópticas — semana 1',
    fecha: '22/05/2026',
    vencimiento: '21/06/2026',
    base: 9_600,
    impuesto: { tipo: 'IVA', tasa: 21, importe: 2_016 },
    total: 11_616,
    capitulo: '06',
    partida: '06.01',
    estado: 'validada',
    metodo: 'Transferencia',
    pedido: 'PO-2026-007',
  },
  {
    id: 'F-2026-053',
    proveedor: 'Iluminación Lumen S.L.',
    cif: 'B-86540199',
    concepto: 'Alquiler material eléctrico — semana 1',
    fecha: '22/05/2026',
    vencimiento: '21/06/2026',
    base: 7_500,
    impuesto: { tipo: 'IVA', tasa: 21, importe: 1_575 },
    total: 9_075,
    capitulo: '06',
    partida: '06.02',
    estado: 'validada',
    metodo: 'Transferencia',
    pedido: 'PO-2026-009',
  },
  {
    id: 'F-2026-058',
    proveedor: 'Mapfre Seguros',
    cif: 'A-28141935',
    concepto: 'Prima seguro de producción (negativo y RC)',
    fecha: '02/05/2026',
    vencimiento: '02/05/2026',
    base: 33_057.85,
    impuesto: { tipo: 'Exento', tasa: 0, importe: 0 },
    total: 33_057.85,
    capitulo: '10',
    partida: '10.01',
    estado: 'validada',
    metodo: 'Domiciliación',
    pedido: 'PO-2026-002',
  },
  {
    id: 'F-2026-061',
    proveedor: 'Transportes Madrid Film S.L.',
    cif: 'B-83110472',
    concepto: 'Camiones cámara y grip — semana 1',
    fecha: '23/05/2026',
    vencimiento: '22/06/2026',
    base: 3_400,
    impuesto: { tipo: 'IVA', tasa: 21, importe: 714 },
    total: 4_114,
    capitulo: '06',
    partida: '06.03',
    estado: 'validada',
    metodo: 'Transferencia',
    pedido: 'PO-2026-011',
  },
  {
    id: 'F-2026-067',
    proveedor: 'Catering El Claqueta',
    cif: 'B-87553014',
    concepto: 'Comidas de equipo — pruebas de cámara y vestuario (180 servicios)',
    fecha: '24/05/2026',
    vencimiento: '23/06/2026',
    base: 5_720,
    impuesto: { tipo: 'IVA', tasa: 10, importe: 572 },
    total: 6_292,
    capitulo: '07',
    partida: '07.03',
    estado: 'pendiente',
    metodo: 'Transferencia',
    pedido: 'PO-2026-014',
  },
  {
    id: 'F-2026-069',
    proveedor: 'Gestoría Pérez & Asociados',
    cif: 'B-80452217',
    concepto: 'Asesoría laboral — nóminas de mayo',
    fecha: '28/05/2026',
    vencimiento: '12/06/2026',
    base: 1_800,
    impuesto: { tipo: 'IVA', tasa: 21, importe: 378 },
    total: 2_178,
    capitulo: '11',
    partida: '11.02',
    estado: 'pendiente',
    metodo: 'Transferencia',
    pedido: null,
  },
  {
    id: 'F-2026-072',
    proveedor: 'Hotel Cristina — Las Palmas',
    cif: 'B-35099841',
    concepto: 'Alojamiento scouting Canarias (4 noches · 3 hab.)',
    fecha: '29/05/2026',
    vencimiento: '28/06/2026',
    base: 2_800,
    impuesto: { tipo: 'IGIC', tasa: 7, importe: 196 },
    total: 2_996,
    capitulo: '07',
    partida: '07.02',
    estado: 'revisar',
    motivo: 'Impuesto IGIC (Canarias) — requiere validación territorial del gasto',
    metodo: 'Transferencia',
    pedido: null,
  },
]

// Factura que se "extrae" en la demostración (no precargada en la bandeja).
export const FACTURA_DEMO = {
  id: 'F-2026-078',
  proveedor: 'Grúas y Cámaras del Sur S.L.',
  cif: 'B-41338806',
  concepto: 'Alquiler grúa Technocrane — 3 días',
  fecha: '30/05/2026',
  vencimiento: '29/06/2026',
  base: 6_000,
  impuesto: { tipo: 'IVA', tasa: 21, importe: 1_260 },
  total: 7_260,
  capitulo: '06',
  partida: '06.02',
  estado: 'pendiente',
  metodo: 'Transferencia',
  pedido: 'PO-2026-021',
  // Confianza estimada del clasificador (mención discreta a la asistencia automática).
  confianza: { proveedor: 0.99, importe: 0.99, capitulo: 0.94 },
}

// ── Tesorería ────────────────────────────────────────────────────────────────
export const SALDO_HOY = 312_000

// Previsión semanal a partir de hoy (semana en curso = Rodaje 2: el rodaje empezó el 25/05).
export const CASHFLOW = [
  { semana: 'Rodaje 2', fechas: '01–07 jun', cobros: 0, pagos: 168_000, concepto: 'Nóminas equipo + proveedores semana', enCurso: true },
  { semana: 'Rodaje 3', fechas: '08–14 jun', cobros: 0, pagos: 198_000, concepto: 'Nóminas + Canarias (viajes y alojamiento)' },
  { semana: 'Rodaje 4', fechas: '15–21 jun', cobros: 300_000, pagos: 186_000, concepto: 'Licencia Movistar+ (2.º pago) · cierre de rodaje' },
  { semana: 'Post. 1', fechas: '22–28 jun', cobros: 0, pagos: 96_000, concepto: 'Arranque de montaje y postproducción' },
  { semana: 'Post. 2', fechas: '29 jun–05 jul', cobros: 250_000, pagos: 120_000, concepto: 'Anticipo del crédito fiscal (monetización)' },
  { semana: 'Post. 3', fechas: '06–12 jul', cobros: 0, pagos: 78_000, concepto: 'Sonido, etalonaje y VFX' },
  { semana: 'Entrega', fechas: '13–19 jul', cobros: 200_000, pagos: 60_000, concepto: 'Mínimo garantizado del distribuidor' },
  { semana: 'Liquidación', fechas: '20–26 jul', cobros: 150_000, pagos: 40_000, concepto: 'Saldo de ayuda ICAA + devolución de IVA' },
]

// Saldo proyectado acumulado.
export const CASHFLOW_PROYECTADO = (() => {
  let saldo = SALDO_HOY
  return CASHFLOW.map((s) => {
    const flujo = s.cobros - s.pagos
    saldo += flujo
    return { ...s, flujo, saldo }
  })
})()

// ── Plan de financiación (cuadra con el presupuesto) ─────────────────────────
export const PLAN_FINANCIACION = [
  { fuente: 'Coproducción TVE', importe: 360_000, tipo: 'Cadena', estado: 'Firmado' },
  { fuente: 'Licencia Movistar+', importe: 300_000, tipo: 'Plataforma', estado: 'Firmado' },
  { fuente: 'Ayuda general ICAA', importe: 400_000, tipo: 'Subvención', estado: 'Concedida' },
  { fuente: 'Ayuda autonómica (Madrid / Canarias)', importe: 120_000, tipo: 'Subvención', estado: 'Solicitada' },
  { fuente: 'Incentivo fiscal (deducción)', importe: 620_000, tipo: 'Deducción', estado: 'Estimado' },
  { fuente: 'Anticipo del distribuidor (MG)', importe: 200_000, tipo: 'Distribución', estado: 'Negociación' },
  { fuente: 'Recursos propios de la productora', importe: 400_000, tipo: 'Propio', estado: 'Aportado' },
]

export const FINANCIACION_TOTAL = PLAN_FINANCIACION.reduce((a, f) => a + f.importe, 0)

// ── Proveedores ───────────────────────────────────────────────────────────────
export const PROVEEDORES = [
  { nombre: 'Decorados Almazán S.L.', cif: 'B-84021553', capitulo: '04', contratado: 84_000, facturado: 28_314, estado: 'Al corriente' },
  { nombre: 'Panavision Madrid', cif: 'A-28997120', capitulo: '06', contratado: 48_000, facturado: 11_616, estado: 'Al corriente' },
  { nombre: 'Iluminación Lumen S.L.', cif: 'B-86540199', capitulo: '06', contratado: 36_000, facturado: 9_075, estado: 'Al corriente' },
  { nombre: 'Transportes Madrid Film S.L.', cif: 'B-83110472', capitulo: '06', contratado: 18_000, facturado: 4_114, estado: 'Al corriente' },
  { nombre: 'Catering El Claqueta', cif: 'B-87553014', capitulo: '07', contratado: 24_000, facturado: 6_292, estado: '1 factura por validar' },
  { nombre: 'Mapfre Seguros', cif: 'A-28141935', capitulo: '10', contratado: 60_000, facturado: 33_058, estado: 'Al corriente' },
  { nombre: 'Hotel Cristina — Las Palmas', cif: 'B-35099841', capitulo: '07', contratado: 12_000, facturado: 2_996, estado: 'Canarias · IGIC' },
  { nombre: 'Gestoría Pérez & Asociados', cif: 'B-80452217', capitulo: '11', contratado: 28_000, facturado: 18_000, estado: 'Al corriente' },
]

// ── Base del incentivo fiscal ───────────────────────────────────────────────
// Coste de producción elegible: excluye gastos financieros y de explotación
// (cap. 12) y la parte de estructura no imputable.
export const BASE_DEDUCCION = 2_280_000
export const PCT_CANARIAS_DEFECTO = 35

export function getCapitulo(id) {
  return CAPITULOS_TOTAL.find((c) => c.id === id) || null
}

export function nombreCapitulo(id) {
  const c = CAPITULOS.find((x) => x.id === id)
  return c ? `${c.id} · ${c.nombre}` : id
}
