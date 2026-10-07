// Mundo de demostración de los agentes: «La última función» (Candilejas Films).
//
// Una sola fuente de presupuesto: las partidas de CAPITULOS (src/lib/data.js),
// con lo que los totales de partida son exactamente TOTALES. No se usa
// costeProyectoDemo (mezcla el presupuesto del proyecto con el CEF estático).
//
// Corte fijo: lunes 1 de junio de 2026. Lo que la demo clásica fecha después
// (bandeja de gastos, órdenes de compra) se re-fecha aquí antes del corte; cada
// copia indica de dónde sale. Un solo esquema de pedidos: OC-NNN.

import { CAPITULOS, FACTURAS, FACTURA_DEMO, SALDO_HOY, CASHFLOW, PLAN_FINANCIACION, PROVEEDORES, PROYECTO_DEMO_ID } from '../lib/data.js'
import { PROYECTOS } from '../lib/proyectos.js'
import { isoDesde } from './texto.js'
import { crearPropuesta } from './propuesta.js'
import { crearRodaje } from './rodaje.js'

export const CORTE = { fecha: '2026-06-01', etiqueta: 'lunes 1 de junio de 2026' }
export const PERIODO = { id: 'R3', etiqueta: 'Rodaje 3', fechas: '25–31 may', desde: '2026-05-25', hasta: '2026-05-31' }

const PROYECTO = PROYECTOS.find((p) => p.id === PROYECTO_DEMO_ID)

export const PERSONAS = {
  marta: { id: 'marta', nombre: PROYECTO.productorEjecutivo, rol: 'Producción ejecutiva', iniciales: 'MC' },
  alvaro: { id: 'alvaro', nombre: PROYECTO.lineProducer, rol: 'Line producer', iniciales: 'ÁF' },
}

/** PO-2026-021 → OC-101. Los pedidos antiguos quedan numerados antes de OC-104. */
export function ocDesdePo(po) {
  if (!po) return null
  const n = 80 + Number(po.slice(-3))
  return `OC-${String(n).padStart(3, '0')}`
}

// Proveedores con contrato marco firmado (PROVEEDORES.contratado).
const CONTRATOS = new Set(PROVEEDORES.filter((p) => p.contratado > 0).map((p) => p.nombre))

function documentoDesdeFactura(f, extra = {}) {
  const fechaIso = isoDesde(f.fecha)
  const contabilizada = f.estado === 'validada'
  return {
    id: f.id,
    tipo: 'factura',
    proveedor: f.proveedor,
    cif: f.cif,
    concepto: f.concepto,
    fecha: fechaIso,
    recibida: fechaIso,
    vencimiento: isoDesde(f.vencimiento),
    base: f.base,
    impuesto: { ...f.impuesto },
    total: f.total,
    capitulo: f.capitulo,
    partida: f.partida,
    oc: ocDesdePo(f.pedido),
    ocLegacy: f.pedido,
    contrato: CONTRATOS.has(f.proveedor),
    origen: 'Factura-e XML',
    confianza: null,
    estado: contabilizada ? 'contabilizada' : 'en_bandeja',
    motivo: f.motivo || null,
    // Solo el seguro (domiciliado, vencido el 02/05) consta como pagado en la demo.
    pago: f.metodo === 'Domiciliación' && isoDesde(f.vencimiento) <= CORTE.fecha ? 'pagado' : 'pendiente',
    ...extra,
  }
}

function crearDocumentos() {
  const docs = {}
  for (const f of FACTURAS) {
    // F-2026-072: PDF de hotel canario, no factura electrónica.
    const extra = f.id === 'F-2026-072' ? { origen: 'PDF' } : {}
    docs[f.id] = documentoDesdeFactura(f, extra)
  }

  // FACTURA_DEMO: llega durante la sesión (evento EV-01), escaneada.
  docs[FACTURA_DEMO.id] = documentoDesdeFactura(FACTURA_DEMO, {
    origen: 'PDF escaneado',
    confianza: { proveedor: FACTURA_DEMO.confianza.proveedor, importe: FACTURA_DEMO.confianza.importe, partida: FACTURA_DEMO.confianza.capitulo },
    estado: 'por_llegar',
    recibida: null,
  })

  // Copia de g-004 de src/screens/Facturas.jsx (allí fechado el 10/06; aquí el
  // 30/05, antes del corte). Base e IVA con la misma regla que crearGasto (21 %).
  docs['G-004'] = {
    id: 'G-004',
    tipo: 'ticket',
    proveedor: 'Ferretería El Tornillo',
    cif: 'B-80817231',
    concepto: 'Tornillería, pintura mate y material de refuerzo de decorado',
    lineas: ['Tornillería y pintura mate', 'Material refuerzo decorado'],
    fecha: '2026-05-30',
    recibida: '2026-05-30',
    vencimiento: null,
    base: 127.44,
    impuesto: { tipo: 'IVA', tasa: 21, importe: 26.76 },
    total: 154.2,
    capitulo: '04',
    partida: '04.01',
    alternativa: '05.04',
    oc: null,
    ocLegacy: null,
    contrato: false,
    origen: 'OCR PDF',
    confianza: { proveedor: 0.71, importe: 0.71, partida: 0.71 },
    estado: 'en_bandeja',
    motivo: 'Ticket simplificado: no lleva los datos fiscales de la productora.',
    pago: 'pagado',
  }
  return docs
}

function crearOrdenes(documentos) {
  const ordenes = {}
  // Pedidos de las facturas (PO-2026-0NN → OC-0NN+80). Importe = base de su factura.
  for (const d of Object.values(documentos)) {
    if (!d.oc) continue
    const facturada = d.estado === 'contabilizada'
    ordenes[d.oc] = {
      id: d.oc,
      aliasLegacy: d.ocLegacy,
      proveedor: d.proveedor,
      concepto: d.concepto,
      partida: d.partida,
      capitulo: d.capitulo,
      importe: d.base,
      facturado: facturada ? d.base : 0,
      fecha: d.fecha,
      solicitante: 'Producción',
      estado: facturada ? 'Facturada' : 'Aprobada',
      semanaPago: null,
    }
  }

  // Copia de ORDENES_BASE (src/screens/Compras.jsx), re-fechadas antes del corte.
  // OC-107 y OC-109 ya están dentro del comprometido de su partida.
  const compras = [
    { id: 'OC-104', proveedor: 'Hotel NH', concepto: 'Ampliación alojamiento exteriores', partida: '07.02', importe: 18_400, solicitante: 'Producción', fecha: '2026-06-01', estado: 'Por llegar', semanaPago: 'Rodaje 5' },
    { id: 'OC-105', proveedor: 'Camera Rental Madrid', concepto: 'Ópticas adicionales semana 4', partida: '06.01', importe: 12_600, solicitante: 'Dirección de fotografía', fecha: '2026-05-29', estado: 'Pendiente', semanaPago: 'Rodaje 4' },
    { id: 'OC-106', proveedor: 'Eléctricos Prado', concepto: 'Horas extra acumuladas noche', partida: '03.03', importe: 9_800, solicitante: 'Jefe de producción', fecha: '2026-05-28', estado: 'Pendiente', semanaPago: 'Rodaje 4' },
    { id: 'OC-107', proveedor: 'Atrezzo Norte', concepto: 'Reposición decoración escena teatro', partida: '04.02', importe: 4_750, solicitante: 'Arte', fecha: '2026-05-27', estado: 'Aprobada', semanaPago: null },
    { id: 'OC-108', proveedor: 'Dron Services Madrid', concepto: 'Plano aéreo no previsto', partida: '06.02', importe: 14_200, solicitante: 'Dirección', fecha: '2026-05-26', estado: 'Rechazada', semanaPago: null },
    { id: 'OC-109', proveedor: 'Catering Estela S.L.', concepto: 'Refuerzo catering jornada 16', partida: '07.03', importe: 3_900, solicitante: 'Producción', fecha: '2026-05-26', estado: 'Aprobada', semanaPago: null },
  ]
  for (const o of compras) {
    ordenes[o.id] = { aliasLegacy: null, facturado: 0, capitulo: o.partida.slice(0, 2), ...o }
  }
  return ordenes
}

// Copia de los tres bloqueantes de DOCUMENTOS_CLAVE (src/screens/Documental.jsx).
function crearDossier() {
  return [
    { id: 'DOS-01', documento: 'Certificado cultural ICAA', responsable: 'Productora', estado: 'Bloqueante', deadline: '2026-06-05', evidencia: 'No recibido', razon: 'Acredita el carácter cultural de la obra; sin él no se puede aplicar la deducción.' },
    { id: 'DOS-02', documento: 'Justificantes de pago vinculados a facturas', responsable: 'Line producer', estado: 'Bloqueante', deadline: '2026-06-14', evidencia: 'Pagos sin justificante', pendientes: 6, razon: 'Cada gasto debe estar soportado por factura y pago trazable.' },
    { id: 'DOS-03', documento: 'Coste reconocido por capítulos ICAA', responsable: 'Fiscalista', estado: 'Bloqueante', deadline: '2026-06-20', evidencia: 'Pendiente de cierre de coste', razon: 'La base de deducción tiene que cuadrar con el coste real por capítulos.' },
  ]
}

export function crearMundo() {
  const partidas = {}
  const capitulos = CAPITULOS.map((c) => {
    for (const p of c.partidas) partidas[p.codigo] = { ...p, capitulo: c.id }
    return { id: c.id, nombre: c.nombre, partidas: c.partidas.map((p) => p.codigo) }
  })
  const documentos = crearDocumentos()
  return {
    version: 0,
    corte: CORTE,
    periodo: PERIODO,
    proyecto: {
      id: PROYECTO.id,
      titulo: PROYECTO.titulo,
      productora: PROYECTO.productora,
      presupuesto: PROYECTO.presupuesto,
      diaActual: PROYECTO.diaActual,
      diasRodaje: PROYECTO.diasRodaje,
      pctGastoTerritorio: { ...PROYECTO.pctGastoTerritorio },
      coproduccionUE: !!PROYECTO.coproduccionUE,
      obraDificil: !!PROYECTO.obraDificil,
    },
    capitulos,
    partidas,
    documentos,
    ordenes: crearOrdenes(documentos),
    dossier: crearDossier(),
    tesoreria: { saldoHoy: SALDO_HOY, semanas: CASHFLOW.map((s) => ({ ...s })), ajustes: [] },
    financiacion: PLAN_FINANCIACION.map((f) => ({ ...f })),
    informes: {},
    borradores: {},
    revisiones: {},
    ajustesCef: {},
    // Novedades que llegan solas, en este orden (sesion.js).
    entrantes: ['EV-RIESGOS', 'EV-01', 'EV-CITACION', 'EV-02', 'EV-LLUVIA', 'EV-03'],
    // Plan de rodaje y señales que vigila el agente de riesgos (exploratorio).
    rodaje: crearRodaje(),
    decisionesRiesgo: {},
    reservas: {},
    // Primera propuesta de presupuesto de Itsasoa (caso por validar).
    propuesta: crearPropuesta(),
    avisos: [],
    historial: [],
  }
}
