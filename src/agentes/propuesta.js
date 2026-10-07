// Primera propuesta de presupuesto (caso por validar) sobre «Itsasoa», el
// proyecto en desarrollo de la demo (src/lib/proyectos.js).
//
// La persona aporta los costes que ya ha hablado con proveedores; lo que falta
// por detallar se estima por capítulo con el reparto ICAA del proyecto. El
// agente Proveedores busca alternativas en un directorio DE EJEMPLO, descarta
// las que no cumplen los requisitos y, con permiso, llama para confirmar el
// precio final. La persona elige.
//
// Todos los proveedores, tarifas y conversaciones son ficticios.

import { PROYECTOS, normalizarProyecto } from '../lib/proyectos.js'

const P = normalizarProyecto(PROYECTOS.find((p) => p.id === 'p-itsasoa'))

export const PROYECTO_PROPUESTA = {
  id: P.id,
  titulo: P.titulo,
  productora: P.productora,
  objetivo: P.presupuesto,
  ubicacion: P.ubicacion,
  diasRodaje: P.diasRodaje,
  capitulos: P.presupuestoCapitulos.map((c) => ({ ...c })),
}

export const REQUISITOS = {
  'grua-brazo': 'Brazo telescópico de al menos 7 m',
  'grua-cabeza': 'Cabeza remota estabilizada',
  'grua-equipo': 'Operador y técnico en el precio',
  'grua-transporte': 'Transporte hasta Bilbao en el precio',
  'grua-fechas': 'Las 3 jornadas seguidas',
  'cam-cuerpo': 'Cuerpo de cine de gran formato',
  'cam-anamorficas': 'Serie de ópticas anamórficas completa',
  'cam-seguro': 'Seguro del equipo incluido',
  'aloj-habitaciones': '20 habitaciones durante 30 noches',
  'aloj-cancelacion': 'Cancelación flexible',
  'aloj-distancia': 'A menos de 15 minutos del centro de Bilbao',
  'cat-servicios': '60 servicios por jornada, 30 jornadas',
  'cat-dietas': 'Menú vegetariano y sin gluten',
  'cat-localizacion': 'Servicio en localización',
}

// Costes que la persona ya tiene hablados (ejemplo).
export const LINEAS_INICIALES = [
  { id: 'L1', partida: '06.02', concepto: 'Grúa telescópica', detalle: '3 jornadas de rodaje', proveedor: 'Altzaga Grúas de Cine', importe: 9_600, origen: 'Presupuesto verbal', requisitos: ['grua-brazo', 'grua-cabeza', 'grua-equipo', 'grua-transporte', 'grua-fechas'] },
  { id: 'L2', partida: '06.01', concepto: 'Cámara y ópticas', detalle: '6 semanas', proveedor: 'Kamara Etxea Rental', importe: 42_000, origen: 'Presupuesto por correo', requisitos: ['cam-cuerpo', 'cam-anamorficas', 'cam-seguro'] },
  { id: 'L3', partida: '06.03', concepto: 'Transporte de equipo', detalle: '2 camiones y 1 furgoneta, 6 semanas', proveedor: 'Garraioak Film', importe: 18_500, origen: 'Tarifa de la producción anterior', requisitos: [] },
  { id: 'L4', partida: '06.02', concepto: 'Iluminación', detalle: 'Paquete de luces y generador, 6 semanas', proveedor: 'Argia Rental', importe: 24_000, origen: 'Presupuesto por correo', requisitos: [] },
  { id: 'L5', partida: '07.02', concepto: 'Alojamiento del equipo', detalle: '20 habitaciones, 30 noches', proveedor: 'Apartamentos Ría', importe: 31_000, origen: 'Presupuesto verbal', requisitos: ['aloj-habitaciones', 'aloj-cancelacion', 'aloj-distancia'] },
  { id: 'L6', partida: '07.03', concepto: 'Catering', detalle: '30 jornadas, 60 servicios', proveedor: 'Catering Txoko Film', importe: 23_400, origen: 'Presupuesto por correo', requisitos: ['cat-servicios', 'cat-dietas', 'cat-localizacion'] },
  { id: 'L7', partida: '04.01', concepto: 'Construcción de decorados', detalle: 'Interior del caserío y muelle', proveedor: 'Taller Zubieta', importe: 64_000, origen: 'Presupuesto firmado', requisitos: [] },
]

const INTRO = 'Buenos días. Soy el asistente automático de compras de Gau Films, la productora de «Itsasoa». Le llamo para confirmar un presupuesto. La llamada se graba para que conste lo que acordemos. ¿Le parece bien?'
const CIERRE = 'Gracias. Todavía no reservamos: producción decide esta semana y les avisamos.'

// Directorio de ejemplo: alternativas con tarifa de referencia y lo que dice su ficha.
// `guion`: [quién, texto, requisitos que confirma la respuesta (true/false)].
export const ALTERNATIVAS = [
  {
    id: 'A1',
    linea: 'L1',
    proveedor: 'Telegrúa Cantábrico',
    referencia: 7_950,
    tarifa: '2.650 € por jornada',
    ficha: { 'grua-brazo': true, 'grua-cabeza': true },
    llamada: {
      duracion: '2 min 10 s',
      precioFinal: 8_400,
      extras: [{ concepto: 'Transporte hasta Bilbao', importe: 450 }],
      guion: [
        ['sistema', 'Llamando al teléfono de la ficha del proveedor desde el número de Gau Films.'],
        ['agente', INTRO],
        ['proveedor', 'Sí, sin problema. Dígame.'],
        ['agente', 'Necesitamos una grúa telescópica tres jornadas seguidas de rodaje en Bilbao. ¿El brazo llega al menos a siete metros y lleva cabeza remota estabilizada?'],
        ['proveedor', 'Tenemos una de nueve metros con cabeza remota estabilizada.', { 'grua-brazo': true, 'grua-cabeza': true }],
        ['agente', 'En el directorio figura una tarifa de 2.650 € por jornada. ¿Incluye operador y técnico?'],
        ['proveedor', 'Sí, los dos van incluidos en la jornada.', { 'grua-equipo': true }],
        ['agente', '¿Y el transporte hasta Bilbao? ¿Tienen libres las tres jornadas seguidas?'],
        ['proveedor', 'El transporte son 450 € aparte. Las tres jornadas las tenemos libres.', { 'grua-transporte': true, 'grua-fechas': true }],
        ['agente', 'Entonces serían 8.400 € sin IVA por las tres jornadas, con el transporte. ¿Me lo confirma?'],
        ['proveedor', 'Confirmado. Les mando el presupuesto por escrito.'],
        ['agente', CIERRE],
        ['sistema', 'Llamada terminada. Precio y requisitos guardados en la ficha del proveedor.'],
      ],
    },
  },
  {
    id: 'A2',
    linea: 'L1',
    proveedor: 'Grúas Deusto Cine',
    referencia: 6_900,
    tarifa: '2.300 € por jornada',
    ficha: { 'grua-brazo': false },
    motivo: 'Su grúa más grande llega a 6 m y pides al menos 7 m.',
  },
  {
    id: 'A3',
    linea: 'L1',
    proveedor: 'Norte Crane Film',
    referencia: 7_500,
    tarifa: '2.500 € por jornada',
    ficha: { 'grua-brazo': true, 'grua-cabeza': true },
    llamada: {
      duracion: '1 min 45 s',
      precioFinal: 8_640,
      extras: [{ concepto: 'Técnico de grúa, 3 jornadas', importe: 1_140 }],
      motivo: 'Solo tiene libres 2 de las 3 jornadas.',
      guion: [
        ['sistema', 'Llamando al teléfono de la ficha del proveedor desde el número de Gau Films.'],
        ['agente', INTRO],
        ['proveedor', 'Adelante.'],
        ['agente', '¿El brazo llega a siete metros con cabeza remota estabilizada?'],
        ['proveedor', 'Ocho metros, con cabeza remota, sí.', { 'grua-brazo': true, 'grua-cabeza': true }],
        ['agente', 'Figura una tarifa de 2.500 € por jornada. ¿Incluye operador y técnico? ¿Y el transporte hasta Bilbao?'],
        ['proveedor', 'Incluye el operador y el transporte. El técnico se cobra aparte: 380 € por jornada.', { 'grua-equipo': true, 'grua-transporte': true }],
        ['agente', '¿Tienen libres tres jornadas seguidas?'],
        ['proveedor', 'Solo dos: la tercera la tenemos comprometida con otro rodaje.', { 'grua-fechas': false }],
        ['agente', 'Entendido. Con el técnico serían 8.640 € por tres jornadas, pero sin la tercera no nos sirve. Gracias por su tiempo.'],
        ['sistema', 'Llamada terminada. No cumple: le falta una jornada.'],
      ],
    },
  },
  {
    id: 'A4',
    linea: 'L2',
    proveedor: 'Ópticas Iturri Alquiler',
    referencia: 38_400,
    tarifa: 'Paquete de 6 semanas',
    ficha: { 'cam-cuerpo': true, 'cam-anamorficas': false },
    motivo: 'No tiene una serie anamórfica completa.',
  },
  {
    id: 'A5',
    linea: 'L5',
    proveedor: 'Alojamientos Erribera',
    referencia: 27_900,
    tarifa: '46,50 € por habitación y noche',
    ficha: { 'aloj-habitaciones': true },
    llamada: {
      duracion: '2 min 25 s',
      precioFinal: 28_600,
      extras: [{ concepto: 'Limpieza final', importe: 700 }],
      guion: [
        ['sistema', 'Llamando al teléfono de la ficha del proveedor desde el número de Gau Films.'],
        ['agente', INTRO],
        ['proveedor', 'Claro, dígame.'],
        ['agente', 'Buscamos 20 habitaciones durante 30 noches para el equipo. En el directorio figura una tarifa de grupo de 46,50 € por habitación y noche. ¿La mantienen?'],
        ['proveedor', 'Sí, para 20 habitaciones esa es la tarifa de grupo.', { 'aloj-habitaciones': true }],
        ['agente', '¿La cancelación es flexible? ¿Y a qué distancia están del centro de Bilbao?'],
        ['proveedor', 'Cancelación gratuita hasta siete días antes. Estamos a diez minutos andando del centro.', { 'aloj-cancelacion': true, 'aloj-distancia': true }],
        ['agente', '¿Hay algún cargo más?'],
        ['proveedor', 'La limpieza final: 700 € para todo el grupo.'],
        ['agente', 'Entonces el total serían 28.600 € sin IVA. ¿Es correcto?'],
        ['proveedor', 'Correcto.'],
        ['agente', CIERRE],
        ['sistema', 'Llamada terminada. Precio y requisitos guardados en la ficha del proveedor.'],
      ],
    },
  },
  {
    id: 'A6',
    linea: 'L6',
    proveedor: 'Sukalde Rodajes',
    referencia: 21_600,
    tarifa: '12 € por servicio',
    ficha: { 'cat-servicios': true },
    llamada: {
      duracion: '1 min 55 s',
      precioFinal: 22_500,
      extras: [{ concepto: 'Desplazamiento fuera de Bilbao', importe: 900 }],
      guion: [
        ['sistema', 'Llamando al teléfono de la ficha del proveedor desde el número de Gau Films.'],
        ['agente', INTRO],
        ['proveedor', 'Sí, adelante.'],
        ['agente', 'Necesitamos 60 servicios por jornada durante 30 jornadas. Figura una tarifa de 12 € por servicio. ¿Es así?'],
        ['proveedor', 'Sí, 12 € el servicio, con postre y bebida.', { 'cat-servicios': true }],
        ['agente', '¿Pueden dar menú vegetariano y sin gluten, y servir en localización?'],
        ['proveedor', 'Las dos cosas. Fuera de Bilbao cobramos el desplazamiento: 900 € para todo el rodaje.', { 'cat-dietas': true, 'cat-localizacion': true }],
        ['agente', 'Serían 22.500 € sin IVA. ¿Me lo confirma?'],
        ['proveedor', 'Confirmado.'],
        ['agente', CIERRE],
        ['sistema', 'Llamada terminada. Precio y requisitos guardados en la ficha del proveedor.'],
      ],
    },
  },
]

export const ALTERNATIVAS_POR_ID = Object.fromEntries(ALTERNATIVAS.map((a) => [a.id, a]))

/** Cómo llama el agente (se enseña antes de pedir permiso). */
export const PROTOCOLO_LLAMADA = [
  'Prepara un guion por proveedor con tus requisitos y la tarifa de referencia del directorio.',
  'Llama desde el número de la productora y se presenta como asistente automático de Gau Films.',
  'Pide permiso para grabar; si el proveedor no quiere, cuelga y te lo deja para que llames tú.',
  'Confirma los requisitos uno a uno y pide el precio final sin IVA, con transporte y extras.',
  'No reserva, no firma y no negocia: si le piden una decisión, dice que la toma producción.',
  'Guarda la grabación y la transcripción en la ficha del proveedor y te trae la comparación.',
]

const r2 = (n) => Math.round(n * 100) / 100

export function crearPropuesta() {
  const lineas = LINEAS_INICIALES.map((l) => ({ ...l, requisitos: [...l.requisitos] }))
  // Por detallar: lo que el reparto ICAA del proyecto asigna a cada capítulo y aún no cubren los costes aportados.
  const porDetallar = {}
  for (const cap of PROYECTO_PROPUESTA.capitulos) {
    const detallado = lineas.filter((l) => l.partida.startsWith(cap.id)).reduce((a, l) => a + l.importe, 0)
    porDetallar[cap.id] = Math.max(0, cap.importe - detallado)
  }
  return {
    proyecto: { ...PROYECTO_PROPUESTA, capitulos: PROYECTO_PROPUESTA.capitulos.map((c) => ({ ...c })) },
    version: 1,
    lineas,
    porDetallar,
    llamadas: {},
    autorizacion: null, // { estado: 'autorizada' | 'rechazada', ids, por }
    elecciones: {}, // { L1: { altId | null, por } }
  }
}

export function totalesPropuesta(m) {
  const p = m.propuesta
  const detallado = r2(p.lineas.reduce((a, l) => a + l.importe, 0))
  const estimado = r2(Object.values(p.porDetallar).reduce((a, x) => a + x, 0))
  const total = r2(detallado + estimado)
  return { detallado, estimado, total, objetivo: p.proyecto.objetivo, diferencia: r2(total - p.proyecto.objetivo), conProveedor: p.lineas.length }
}

export function capitulosPropuesta(m) {
  const p = m.propuesta
  return p.proyecto.capitulos.map((cap) => {
    const lineas = p.lineas.filter((l) => l.partida.startsWith(cap.id))
    const detallado = r2(lineas.reduce((a, l) => a + l.importe, 0))
    return { id: cap.id, nombre: cap.nombre, referencia: cap.importe, lineas, detallado, porDetallar: p.porDetallar[cap.id] ?? 0, total: r2(detallado + (p.porDetallar[cap.id] ?? 0)) }
  })
}

/** Alternativas del directorio más baratas que el proveedor actual, con su veredicto. */
export function optimizacion(m) {
  const p = m.propuesta
  return ALTERNATIVAS.map((a) => {
    const linea = p.lineas.find((l) => l.id === a.linea)
    if (!linea) return null
    const fichaFalla = Object.entries(a.ficha).find(([, ok]) => ok === false)
    const llamada = p.llamadas[a.id] ?? null
    return {
      ...a,
      lineaConcepto: linea.concepto,
      partida: linea.partida,
      actual: { proveedor: linea.proveedor, importe: linea.importe },
      ahorroReferencia: r2(linea.importe - a.referencia),
      descartada: !!fichaFalla,
      motivoDescarte: fichaFalla ? a.motivo : null,
      llamar: !fichaFalla && !!a.llamada,
      resultado: llamada,
    }
  }).filter((x) => x && x.ahorroReferencia > 0)
}

/** Resultado de la llamada: requisitos confirmados y si cumple. */
export function resultadoLlamada(altId) {
  const a = ALTERNATIVAS_POR_ID[altId]
  const confirmados = {}
  for (const [, , conf] of a.llamada.guion) if (conf) Object.assign(confirmados, conf)
  const cumple = Object.values(confirmados).every(Boolean)
  return { precioFinal: a.llamada.precioFinal, extras: a.llamada.extras, duracion: a.llamada.duracion, confirmados, cumple, motivo: cumple ? null : a.llamada.motivo }
}

/** Para cada línea, la mejor alternativa confirmada por teléfono que cumple. */
export function mejoresConfirmadas(m) {
  const p = m.propuesta
  const out = []
  for (const linea of p.lineas) {
    const candidatas = ALTERNATIVAS.filter((a) => a.linea === linea.id && p.llamadas[a.id])
    if (!candidatas.length) continue
    const cumplen = candidatas.filter((a) => p.llamadas[a.id].cumple).sort((x, y) => p.llamadas[x.id].precioFinal - p.llamadas[y.id].precioFinal)
    const mejor = cumplen[0] ?? null
    out.push({
      linea,
      mejor: mejor ? { ...mejor, precioFinal: p.llamadas[mejor.id].precioFinal } : null,
      descartadas: candidatas.filter((a) => !p.llamadas[a.id].cumple).map((a) => ({ proveedor: a.proveedor, motivo: p.llamadas[a.id].motivo })),
      ahorro: mejor ? r2(linea.importe - p.llamadas[mejor.id].precioFinal) : 0,
    })
  }
  return out
}

/** Decisiones abiertas de la propuesta (para el panel de decisiones). */
export function decisionesPropuesta(m) {
  const p = m.propuesta
  const out = []
  const porLlamar = optimizacion(m).filter((a) => a.llamar)
  if (p.autorizacion === 'pendiente' && porLlamar.length) {
    out.push({ id: 'ex-llamadas', tipo: 'propuesta', ref: { tipo: 'llamadas', id: 'R1' }, nivel: 'aprueba', rol: 'Line producer', importe: 0, titulo: `${p.proyecto.titulo} · permiso para llamar a ${porLlamar.length} proveedores`, entrada: 'Optimiza los proveedores de la propuesta' })
  }
  for (const x of mejoresConfirmadas(m)) {
    if (x.mejor && !p.elecciones[x.linea.id]) {
      out.push({ id: `ex-elegir-${x.linea.id}`, tipo: 'propuesta', ref: { tipo: 'eleccion', id: x.linea.id }, nivel: 'aprueba', rol: 'Line producer', importe: x.ahorro, titulo: `${p.proyecto.titulo} · elegir proveedor de ${x.linea.concepto.toLowerCase()}`, entrada: 'Compara los proveedores que han confirmado precio' })
    }
  }
  return out
}
