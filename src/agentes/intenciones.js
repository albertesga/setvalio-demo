// Detección de intenciones en texto libre (sin modelo de lenguaje).
//
// 1. Normaliza (minúsculas, sin acentos ni signos).
// 2. Extrae entidades: capítulo, partida, orden de compra, documento,
//    proveedor, territorio, porcentaje y acciones externas (enviar, pagar).
// 3. Aplica guardas (pagos, envíos, Production Rescue).
// 4. Puntúa cada intención con su léxico y decide; si empatan, pregunta.

export function normalizar(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!,;:()«»"“”'´`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set('de la el los las del que me un una unos unas por para en y a al lo se mi tu su con es esta este esto ya hay le les nos como'.split(' '))

export function tokenizar(norm) {
  return norm
    .replace(/[.\-%/]/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w))
}

const SINONIMOS_CAPITULO = {
  '01': ['guion', 'musica'],
  '02': ['personal artistico', 'actores', 'reparto', 'protagonistas', 'interpretes'],
  '03': ['equipo tecnico', 'tecnicos', 'electricos'],
  '04': ['escenografia', 'decorado', 'decorados', 'atrezo', 'atrezzo', 'vestuario', 'ambientacion'],
  '05': ['localizaciones', 'localizacion', 'permisos', 'estudios de rodaje', 'fungible'],
  '06': ['maquinaria', 'camaras', 'camara', 'transportes', 'iluminacion'],
  '07': ['viajes', 'hoteles', 'alojamiento', 'comidas', 'catering', 'dietas', 'desplazamientos'],
  '08': ['soportes', 'almacenamiento', 'material sensible'],
  '09': ['postproduccion', 'posproduccion', 'montaje', 'etalonaje', 'vfx', 'laboratorio'],
  '10': ['seguros', 'seguro'],
  '11': ['gastos generales', 'gestoria', 'asesoria'],
  '12': ['explotacion', 'gastos financieros', 'publicidad'],
}

// Alias de proveedor → nombre exacto (documentos y órdenes del mundo).
const ALIAS_PROVEEDOR = [
  [['gruas', 'grua', 'technocrane', 'camaras del sur'], 'Grúas y Cámaras del Sur S.L.'],
  [['ferreteria', 'tornillo'], 'Ferretería El Tornillo'],
  [['hotel cristina', 'cristina', 'las palmas'], 'Hotel Cristina — Las Palmas'],
  [['gestoria', 'perez'], 'Gestoría Pérez & Asociados'],
  [['claqueta'], 'Catering El Claqueta'],
  [['hotel nh', ' nh'], 'Hotel NH'],
  [['camera rental', 'opticas'], 'Camera Rental Madrid'],
  [['prado'], 'Eléctricos Prado'],
  [['almazan'], 'Decorados Almazán S.L.'],
  [['panavision'], 'Panavision Madrid'],
  [['lumen'], 'Iluminación Lumen S.L.'],
  [['mapfre'], 'Mapfre Seguros'],
  [['atrezzo norte'], 'Atrezzo Norte'],
  [['estela'], 'Catering Estela S.L.'],
  [['dron'], 'Dron Services Madrid'],
]

const TERRITORIOS = [
  [['canarias', 'canario', 'canaria', 'las palmas', 'tenerife'], 'canarias'],
  [['bizkaia', 'vizcaya'], 'bizkaia'],
  [['pais vasco', 'euskadi', 'gipuzkoa', 'alava'], 'alava_gipuzkoa'],
  [['navarra'], 'navarra'],
  [['territorio comun', 'peninsula', 'regimen comun'], 'comun'],
]

const pad = (n, w) => String(n).padStart(w, '0')

export function extraerEntidades(texto, mundo) {
  const norm = normalizar(texto)
  const e = {}

  // Orden de compra: OC-104, oc 104, PO-2026-021 (pedido antiguo).
  const mOc = norm.match(/\b(oc|po)[\s-]*(2026[\s-]*)?0*(\d{1,3})\b/)
  if (mOc) {
    const n = Number(mOc[3])
    const id = mOc[2] || mOc[1] === 'po' ? `OC-${pad(80 + n, 3)}` : `OC-${pad(n, 3)}`
    e.oc = id
    e.ocConocida = !!mundo?.ordenes?.[id]
  }

  // Documento: F-2026-072, factura 072, G-004.
  const mF = norm.match(/\bf[\s-]*2026[\s-]*0*(\d{1,3})\b/)
  if (mF) e.documento = `F-2026-${pad(mF[1], 3)}`
  const mG = norm.match(/\bg-0*(\d{1,3})\b/)
  if (mG) e.documento = `G-${pad(mG[1], 3)}`

  // Partida 04.01 y capítulo.
  const mP = norm.match(/\b(\d{2})\.(\d{2})\b/)
  if (mP && (!mundo || mundo.partidas[`${mP[1]}.${mP[2]}`])) {
    e.partida = `${mP[1]}.${mP[2]}`
    e.capitulo = mP[1]
  }
  if (!e.capitulo) {
    const mC =
      norm.match(/\bcap(?:itulo)?\.?\s*0?(\d{1,2})\b/) ||
      norm.match(/(?:^|\s)(0[1-9])(?:\s|$)/) ||
      norm.match(/\b(?:el|del)\s+(1[0-2])(?:\s|$)/)
    if (mC && Number(mC[1]) >= 1 && Number(mC[1]) <= 12) e.capitulo = pad(Number(mC[1]), 2)
  }

  // Proveedor.
  const conEspacios = ` ${norm} `
  for (const [alias, nombre] of ALIAS_PROVEEDOR) {
    if (alias.some((a) => conEspacios.includes(a.startsWith(' ') ? a + ' ' : a))) {
      e.proveedor = nombre
      break
    }
  }
  if (e.proveedor && mundo) {
    if (!e.documento) {
      const docs = Object.values(mundo.documentos).filter((d) => d.proveedor === e.proveedor && d.estado !== 'contabilizada')
      if (docs.length === 1) e.documento = docs[0].id
    }
    if (!e.oc) {
      const ords = Object.values(mundo.ordenes).filter((o) => o.proveedor === e.proveedor && (o.estado === 'Pendiente' || o.estado === 'Por llegar'))
      if (ords.length === 1) {
        e.oc = ords[0].id
        e.ocConocida = true
      }
    }
  }

  // Capítulo por sinónimo (después de proveedor, para no confundir «Grúas y Cámaras»).
  if (!e.capitulo) {
    const sinProveedor = e.proveedor ? conEspacios.replace(/hotel|camaras|gestoria|catering/g, ' ') : conEspacios
    for (const [cap, lista] of Object.entries(SINONIMOS_CAPITULO)) {
      if (lista.some((s) => sinProveedor.includes(` ${s} `) || sinProveedor.includes(` ${s}`))) {
        e.capitulo = cap
        break
      }
    }
  }

  for (const [alias, id] of TERRITORIOS) {
    if (alias.some((a) => conEspacios.includes(` ${a}`))) {
      e.territorio = id
      break
    }
  }

  const mPct = norm.match(/(\d{1,3}(?:[.,]\d+)?)\s*(%|por ?ciento)/)
  if (mPct) e.porcentaje = Number(mPct[1].replace(',', '.')) / 100

  if (/\b(envia|enviar|enviale|envialo|enviala|manda|mandar|mandale|mandalo)\b/.test(norm)) e.accionExterna = 'enviar'
  if (/\b(paga|pagar|pagale|pagala|pagues|abona|abonar|transfiere|transferir|haz la transferencia)\b/.test(norm)) e.accionExterna = 'pagar'

  return e
}

// Léxico: frases (+3), raíces con peso y refuerzo por entidad.
export const LEXICO = {
  informe_semanal: {
    frases: ['informe semanal', 'informe de coste', 'informe de costes', 'cost report', 'cierre semanal', 'informe de la semana', 'reporte semanal', 'prepara el informe', 'aprueba el informe', 'informe para produccion'],
    raices: { informe: 2, report: 2, semanal: 3 },
  },
  factura_nueva: {
    frases: ['nueva factura', 'factura nueva', 'ha llegado', 'han llegado', 'procesa la factura', 'procesa la', 'facturas nuevas', 'buzon', 'concilia la factura'],
    raices: { factura: 1, lleg: 2, recib: 2, proces: 2, concili: 2, entrant: 2, contabiliz: 2 },
    entidades: { documento: 2 },
  },
  revisar_gasto: {
    frases: ['baja confianza', 'gastos pendientes', 'bandeja de gastos', 'tengo que revisar', 'tengo pendiente', 'gastos dudosos', 'que gastos'],
    raices: { bandeja: 2, ticket: 3, ocr: 3, confianza: 3, clasific: 2, revis: 1, gasto: 1, dudos: 2 },
  },
  explicar_desviacion: {
    frases: ['por que', 'fuera de rango', 'sobre presupuesto', 'por encima del presupuesto', 'por encima de presupuesto', 'se desvia', 'se desvian', 'fuera de umbral', 'que capitulos'],
    raices: { desvi: 3, explic: 2, sobrecost: 3, causa: 2, encima: 1, capitulo: 1 },
    entidades: { capitulo: 2, partida: 2 },
  },
  aprobar_oc: {
    frases: ['orden de compra', 'ordenes de compra', 'solicitud de compra', 'solicitudes de compra', 'pedidos pendientes', 'compras pendientes'],
    raices: { aprob: 2, orden: 2, autoriz: 2, rechaz: 2, pedido: 1, compra: 1, impacto: 1 },
    entidades: { oc: 4 },
  },
  prevision: {
    frases: ['coste final', 'como cerramos', 'como cerraremos', 'como vamos a cerrar', 'a cierre', 'semanas en negativo', 'coste estimado final', 'llegamos con la caja', 'flujo de caja', 'cash flow'],
    raices: { forecast: 3, cef: 3, previs: 2, cierre: 2, proyecc: 2, tesorer: 3, caja: 3, saldo: 2, liquidez: 3, cerra: 1, negativ: 1 },
  },
  cumplimiento: {
    frases: ['dossier fiscal', 'certificado cultural', 'que bloquea', 'bloqueantes', 'criterios de elegibilidad', 'revisa el igic'],
    raices: { igic: 4, dossier: 3, elegib: 3, cumplim: 3, justificant: 2, certific: 2, auditor: 2, bloque: 2, fiscal: 1 },
  },
  pedir_documentacion: {
    frases: ['pide a', 'pidele a', 'pidele', 'pedir a', 'solicita a', 'escribe a', 'escribele', 'redacta un correo', 'redacta un email', 'email al proveedor', 'correo al proveedor', 'pide la factura', 'pide los justificantes', 'documentacion que falta', 'factura completa', 'al proveedor'],
    raices: { reclam: 3, correo: 2, email: 2, mail: 2, redact: 2, documentacion: 2, escrib: 2 },
    entidades: { proveedor: 2 },
  },
  incentivo: {
    frases: ['tax credit', 'deduccion fiscal', 'incentivo fiscal', 'incentivos fiscales', '36 lis', 'retorno fiscal', 'cuanto supondria', 'cuanto podemos recuperar'],
    raices: { incentiv: 3, deduc: 3, desgrav: 3, retorno: 2, intensidad: 2, credito: 1, recuper: 1 },
    entidades: { porcentaje: 1, territorio: 1 },
  },
  ayuda: {
    frases: ['que puedes hacer', 'que sabes hacer', 'como funciona', 'que agentes', 'como decides', 'quien eres', 'que haces', 'casos de uso'],
    raices: { ayuda: 3, agente: 2, autonom: 2 },
  },
  resumen: {
    frases: ['como vamos', 'como va', 'estado del proyecto', 'como esta la produccion', 'situacion del rodaje'],
    raices: { resum: 3, situacion: 2 },
  },
}

// Qué entidades permiten heredar la intención anterior («¿y el 07?»).
const HEREDA = {
  explicar_desviacion: ['capitulo', 'partida'],
  aprobar_oc: ['oc'],
  factura_nueva: ['documento'],
  pedir_documentacion: ['proveedor', 'documento'],
  incentivo: ['porcentaje', 'territorio'],
  cumplimiento: ['documento'],
}

function puntuar(norm, tokens, entidades, mundo) {
  const out = {}
  for (const [id, lx] of Object.entries(LEXICO)) {
    let s = 0
    for (const f of lx.frases || []) if (` ${norm} `.includes(` ${f} `) || norm.includes(f)) s += 3
    for (const [raiz, peso] of Object.entries(lx.raices || {})) if (tokens.some((tk) => tk.startsWith(raiz))) s += peso
    for (const [ent, peso] of Object.entries(lx.entidades || {})) if (entidades[ent] !== undefined) s += peso
    out[id] = s
  }
  // Ajustes por el tipo de documento nombrado.
  const doc = entidades.documento && mundo?.documentos?.[entidades.documento]
  if (doc) {
    const baja = doc.confianza && Object.values(doc.confianza).some((c) => c < 0.8)
    if (baja) out.revisar_gasto += 3
    if (doc.impuesto?.tipo === 'IGIC') out.cumplimiento += 1
  }
  if (entidades.proveedor === 'Ferretería El Tornillo') out.revisar_gasto += 2
  return out
}

/**
 * Devuelve { intencion, puntuacion, entidades, alternativas, opciones?, motivo? }.
 * `contexto.ultimaIntencion` permite preguntas de seguimiento.
 */
export function detectarIntencion(texto, mundo, contexto = {}) {
  const norm = normalizar(texto)
  const entidades = extraerEntidades(texto, mundo)
  const tokens = tokenizar(norm)

  if (!norm) return { intencion: 'no_entendido', puntuacion: 0, entidades, alternativas: [] }

  // Guardas.
  if (/(production rescue|\brescue\b|rescat|salvar la produccion|plan de rescate)/.test(norm)) {
    return { intencion: 'fuera_alcance', motivo: 'fase_posterior', puntuacion: 9, entidades, alternativas: [] }
  }
  if (entidades.accionExterna === 'pagar') {
    return { intencion: 'fuera_alcance', motivo: 'pagos', puntuacion: 9, entidades, alternativas: [] }
  }

  const puntos = puntuar(norm, tokens, entidades, mundo)

  if (entidades.accionExterna === 'enviar' && !/(redact|prepar|borrador)/.test(norm)) {
    if (puntos.informe_semanal >= 2) return { intencion: 'informe_semanal', puntuacion: puntos.informe_semanal, entidades: { ...entidades, quiereEnviar: true }, alternativas: [] }
    if (/(correo|email|mail|proveedor|hotel|gestoria|ferreteria|documentacion|justificante|factura)/.test(norm)) {
      return { intencion: 'pedir_documentacion', puntuacion: 9, entidades: { ...entidades, quiereEnviar: true }, alternativas: [] }
    }
  }

  const orden = Object.entries(puntos).sort((a, b) => b[1] - a[1])
  const [primero, segundo] = orden
  const alternativas = orden.filter(([, s]) => s > 0).slice(0, 3).map(([id]) => id)

  if (primero[1] >= 3 && primero[1] === segundo[1]) {
    return { intencion: 'desambiguar', puntuacion: primero[1], entidades, alternativas, opciones: [primero[0], segundo[0]] }
  }
  if (primero[1] >= 3) return { intencion: primero[0], puntuacion: primero[1], entidades, alternativas }

  // Seguimiento: hereda la intención anterior si trae una entidad que encaja.
  const previa = contexto.ultimaIntencion
  if (previa && HEREDA[previa]?.some((k) => entidades[k] !== undefined)) {
    return { intencion: previa, puntuacion: primero[1], entidades: { ...entidades }, alternativas, heredada: true }
  }
  if (entidades.oc) return { intencion: 'aprobar_oc', puntuacion: 4, entidades, alternativas }
  if (entidades.documento) return { intencion: 'factura_nueva', puntuacion: 3, entidades, alternativas }
  if (primero[1] >= 2 && primero[1] > segundo[1]) return { intencion: primero[0], puntuacion: primero[1], entidades, alternativas }

  return { intencion: 'no_entendido', puntuacion: primero[1], entidades, alternativas }
}
