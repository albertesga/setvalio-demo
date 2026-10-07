// Guiones de la primera propuesta de presupuesto (caso por validar):
// crear la propuesta, añadir costes y optimizar proveedores con llamadas.

import { normalizar } from '../intenciones.js'
import { cuenta } from '../texto.js'
import { totalesPropuesta, optimizacion, mejoresConfirmadas, PROTOCOLO_LLAMADA, REQUISITOS } from '../propuesta.js'
import { t, v, paso, sug, texto, aviso } from './comun.js'

const AVISO_POR_VALIDAR = aviso(
  'porvalidar',
  'Sin validar',
  t('Empezar un presupuesto desde cero aún está sin validar con productoras; lo previsto es importar uno ya hecho. Proveedores, tarifas y llamadas son de ejemplo.'),
)

export function textoDiferencia(tot) {
  if (Math.abs(tot.diferencia) < 0.5) return t('justo en el objetivo de {obj}', { obj: v(tot.objetivo, 'eur') })
  return tot.diferencia > 0 ? t('{dif} por encima del objetivo de {obj}', { dif: v(tot.diferencia, 'eur'), obj: v(tot.objetivo, 'eur') }) : t('{dif} por debajo del objetivo de {obj}', { dif: v(-tot.diferencia, 'eur'), obj: v(tot.objetivo, 'eur') })
}

export function kpisPropuesta(m, antes) {
  const a = antes ? totalesPropuesta(antes) : null
  const d = totalesPropuesta(m)
  const item = (id, etiqueta, formato, sub) => ({ id, etiqueta, formato, valor: d[id], antes: a && Math.abs(a[id] - d[id]) > 0.004 ? a[id] : undefined, sub })
  return {
    tipo: 'kpis',
    items: [
      item('detallado', 'Detallado con proveedor', 'eur', t('{n} costes', { n: v(d.conProveedor, 'num') })),
      item('estimado', 'Estimado por capítulo', 'eur', t('Por detallar, según el reparto ICAA')),
      item('total', 'Total de la propuesta', 'eur'),
      { ...item('diferencia', 'Frente al objetivo', 'eurSigned', t('Objetivo {o}', { o: v(d.objetivo, 'eur') })), tono: d.diferencia > 0 ? 'warning' : 'neutral' },
    ],
  }
}

// ── Crear la propuesta ───────────────────────────────────────────────────────

export const presupuestoNuevo = {
  id: 'presupuesto_nuevo',
  titulo: 'Primera propuesta de presupuesto',
  ejemplos: ['Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa', 'quiero montar el presupuesto de Itsasoa', 'propuesta de presupuesto', 'prepara el presupuesto'],

  planificar(m) {
    const p = m.propuesta
    const tot = totalesPropuesta(m)
    const capitulosEstimados = Object.values(p.porDetallar).filter((x) => x > 0).length
    return [
      paso('presupuesto', t('Abre la propuesta de {proy} con los capítulos ICAA', { proy: v(p.proyecto.titulo) }), { tipo: 'lectura', salida: t('Objetivo del proyecto: {obj}', { obj: v(tot.objetivo, 'eur') }) }),
      paso('presupuesto', t('Coloca en su partida los costes que ya tienes hablados'), { salida: t('{n} con proveedor: {det}', { n: cuenta(tot.conProveedor, 'coste', 'costes'), det: v(tot.detallado, 'eur') }) }),
      paso('prevision', t('Estima por capítulo lo que falta por detallar'), { autonomia: 'propone', salida: t('{est} en {n}', { est: v(tot.estimado, 'eur'), n: cuenta(capitulosEstimados, 'capítulo', 'capítulos') }) }),
      paso('costes', t('Compara la propuesta con el objetivo'), { salida: t('Total {tot}: {dif}', { tot: v(tot.total, 'eur'), dif: textoDiferencia(tot) }) }),
    ]
  },

  componer({ despues: m }) {
    const p = m.propuesta
    const tot = totalesPropuesta(m)
    const conAlternativas = new Set(optimizacion(m).map((a) => a.linea)).size
    return {
      bloques: [
        AVISO_POR_VALIDAR,
        texto(
          t('Propuesta de {proy} ({prod}, en desarrollo). Con los {n} que ya tienes hablados y el resto estimado por capítulo, el total es {tot}, {dif}.', {
            proy: v(p.proyecto.titulo),
            prod: v(p.proyecto.productora),
            n: cuenta(tot.conProveedor, 'coste', 'costes'),
            tot: v(tot.total, 'eur'),
            dif: textoDiferencia(tot),
          }),
        ),
        kpisPropuesta(m),
        { tipo: 'propuesta' },
        texto(
          conAlternativas
            ? t('En el directorio hay alternativas más baratas para {n}. Si quieres, Proveedores las compara con tus requisitos y llama para confirmar el precio final.', { n: cuenta(conAlternativas, 'de tus costes', 'de tus costes') })
            : t('Añade los costes que tengas hablados; lo que no detalles se queda estimado por capítulo.'),
        ),
      ],
      sugerencias: [sug('Optimiza los proveedores de la propuesta'), sug('Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €')],
      fuentes: ['Costes aportados por ti', 'Reparto ICAA del proyecto', 'Objetivo de presupuesto del proyecto'],
      reglas: [t('Lo que no está detallado se estima con el reparto por capítulos del proyecto'), t('Un capítulo con más detalle que su estimación no deja nada por detallar')],
      noHecho: [t('No ha cerrado el presupuesto ni ha pedido nada a nadie.')],
    }
  },
}

// ── Añadir un coste ──────────────────────────────────────────────────────────

const PARTIDA_POR_PALABRA = [
  [/\b(grua|grúa|dron|iluminacion|iluminación|luces|maquinaria|travelling|steadicam)/, '06.02'],
  [/\b(camara|cámara|optica|óptica)/, '06.01'],
  [/\b(transporte|furgoneta|camion|camión|vehiculo|vehículo)/, '06.03'],
  [/\b(hotel|alojamiento|apartamento|habitacion|habitación)/, '07.02'],
  [/\b(catering|comida|comidas|menu|menú)/, '07.03'],
  [/\b(viaje|vuelo|tren|desplazamiento)/, '07.01'],
  [/\b(decorado|construccion|construcción)/, '04.01'],
  [/\b(atrezo|atrezzo|ambientacion|ambientación)/, '04.02'],
  [/\b(vestuario)/, '04.03'],
  [/\b(maquillaje|peluqueria|peluquería)/, '04.04'],
  [/\b(localizacion|localización|localizaciones)/, '05.01'],
  [/\b(permiso|tasa)/, '05.02'],
  [/\b(seguro)/, '10.01'],
  [/\b(montaje)/, '09.01'],
  [/\b(etalonaje|color)/, '09.02'],
  [/\b(sonido|mezcla)/, '09.03'],
  [/\b(vfx|efectos)/, '09.04'],
  [/\b(musica|música)/, '01.02'],
  [/\b(actor|actriz|reparto|protagonista)/, '02.01'],
]

export function interpretarCoste(texto) {
  const original = String(texto ?? '')
  const norm = normalizar(original)
  const partida = PARTIDA_POR_PALABRA.find(([re]) => re.test(norm))?.[1] ?? null
  // Concepto: lo que va entre «añade» y «con …» / «por …».
  const m = original.match(/(?:añade|añadir|agrega|mete|incluye)\s+(?:un coste de\s+|un coste\s+)?(.+?)(?:\s+con\s+|\s+por\s+\d|\s+a\s+\d|$)/i)
  let concepto = m ? m[1].trim() : ''
  concepto = concepto.replace(/[.,;]$/, '')
  if (concepto) concepto = concepto[0].toUpperCase() + concepto.slice(1)
  return { partida, concepto }
}

export const anadirCoste = {
  id: 'anadir_coste',
  titulo: 'Añadir un coste a la propuesta',
  ejemplos: ['Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €', 'añade el vestuario con Sastrería Goiko por 12.000 euros'],

  planificar(m, det) {
    const { partida, concepto } = interpretarCoste(det.texto)
    const importe = det.entidades?.importe
    if (!importe || !partida || !concepto) {
      return [paso('presupuesto', t('Intenta leer el coste que quieres añadir'), { salida: t('Falta algún dato: importe, concepto o partida') })]
    }
    const proveedor = det.entidades.proveedor ?? det.entidades.proveedorLibre ?? 'Sin proveedor'
    const accion = { tipo: 'propuesta/anadirLinea', linea: { concepto, partida, proveedor, importe }, sustituyeEstimado: true }
    return [
      paso('presupuesto', t('Coloca «{c}» en {p}', { c: v(concepto), p: v(`${partida} ${m.partidas[partida].nombre}`) }), { acciones: [accion], salida: t('{imp} con {prov}', { imp: v(importe, 'eur'), prov: v(proveedor) }) }),
      paso('costes', t('Recalcula la propuesta'), { salida: (_, d) => t('Total {tot}', { tot: v(totalesPropuesta(d).total, 'eur') }) }),
    ]
  },

  componer({ antes, despues: m, det }) {
    const { partida, concepto } = interpretarCoste(det.texto)
    const importe = det.entidades?.importe
    if (!importe || !partida || !concepto) {
      return {
        bloques: [
          texto(t('No he podido leer el coste completo. Escríbelo con concepto, proveedor e importe, por ejemplo «Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €», o usa el formulario de la propuesta.')),
          { tipo: 'propuesta', abrirFormulario: true },
        ],
        sugerencias: [sug('Optimiza los proveedores de la propuesta')],
        fuentes: [],
        reglas: [],
        noHecho: [t('No ha añadido nada.')],
      }
    }
    const tot = totalesPropuesta(m)
    const cap = partida.slice(0, 2)
    const restaba = antes.propuesta.porDetallar[cap] ?? 0
    return {
      bloques: [
        texto(
          restaba > 0
            ? t('Añadido en {p}. Como ese capítulo tenía {rest} estimados por detallar, el coste sale de ahí: el total queda en {tot}, {dif}.', { p: v(`${partida} ${m.partidas[partida].nombre}`), rest: v(restaba, 'eur'), tot: v(tot.total, 'eur'), dif: textoDiferencia(tot) })
            : t('Añadido en {p}. Ese capítulo ya no tenía nada estimado por detallar, así que el total sube a {tot}, {dif}.', { p: v(`${partida} ${m.partidas[partida].nombre}`), tot: v(tot.total, 'eur'), dif: textoDiferencia(tot) }),
        ),
        kpisPropuesta(m, antes),
        { tipo: 'propuesta' },
      ],
      sugerencias: [sug('Optimiza los proveedores de la propuesta')],
      fuentes: ['Costes aportados por ti'],
      reglas: [t('Un coste nuevo sustituye primero lo estimado por detallar en su capítulo')],
      noHecho: [t('No ha pedido presupuesto al proveedor.')],
    }
  },
}

// ── Optimizar proveedores ────────────────────────────────────────────────────

export const optimizarProveedores = {
  id: 'optimizar_proveedores',
  titulo: 'Optimizar proveedores',
  ejemplos: ['Optimiza los proveedores de la propuesta', 'busca proveedores más baratos', '¿hay mejores precios para la grúa?', 'Compara los proveedores que han confirmado precio'],

  planificar(m) {
    const p = m.propuesta
    const opt = optimizacion(m)
    if (p.autorizacion === 'autorizada' || p.autorizacion === 'rechazada') {
      return [paso('proveedores', t('Reúne lo que confirmaron los proveedores'), { tipo: 'lectura', salida: t('{n} llamadas hechas', { n: v(Object.keys(p.llamadas).length, 'num') }) })]
    }
    const descartadas = opt.filter((a) => a.descartada).length
    const aLlamar = opt.filter((a) => a.llamar)
    const lineas = new Set(opt.map((a) => a.linea)).size
    return [
      paso('proveedores', t('Busca en el directorio alternativas a tus proveedores'), {
        tipo: 'lectura',
        salida: t('{n} más baratas para {l}', { n: cuenta(opt.length, 'alternativa', 'alternativas'), l: cuenta(lineas, 'coste', 'costes') }),
      }),
      paso('proveedores', t('Compara cada ficha con tus requisitos'), {
        tipo: 'revision',
        salida: t('{d} por requisitos; {c} por confirmar por teléfono', { d: cuenta(descartadas, 'descartada', 'descartadas'), c: v(aLlamar.length, 'num') }),
      }),
      paso('proveedores', t('Prepara el guion de cada llamada'), { tipo: 'redaccion', autonomia: 'propone', salida: t('Requisitos, tarifa de referencia y lo que no puede hacer') }),
      paso('excepciones', t('Te pide permiso para llamar'), { tipo: 'revision', autonomia: 'aprueba', acciones: [{ tipo: 'propuesta/prepararLlamadas' }], salida: t('Las llamadas salen en nombre de {prod}', { prod: v(p.proyecto.productora) }) }),
    ]
  },

  componer({ despues: m }) {
    const p = m.propuesta
    if (p.autorizacion === 'autorizada') {
      return { ...componerComparacion(m), bloques: [texto(t('Las llamadas ya están hechas. Esto es lo que confirmó cada proveedor:')), ...componerComparacion(m).bloques] }
    }
    const opt = optimizacion(m)
    const aLlamar = opt.filter((a) => a.llamar)
    if (p.autorizacion === 'rechazada') {
      return {
        bloques: [
          texto(t('Dijiste que no llamara. Te dejo los proveedores y requisitos para que les pidas presupuesto tú:')),
          tablaAlternativas(opt, { sinLlamadas: true }),
          ...(aLlamar.length ? [tarjetaLlamadas(m, aLlamar, { retomar: true })] : []),
        ],
        sugerencias: [sug('Enséñame la propuesta de Itsasoa')],
        fuentes: ['Directorio de proveedores (ejemplo)'],
        reglas: [],
        noHecho: [t('No ha llamado a nadie.')],
      }
    }
    const ahorroMax = aLlamar.reduce((acc, a) => {
      acc[a.linea] = Math.max(acc[a.linea] ?? 0, a.ahorroReferencia)
      return acc
    }, {})
    const total = Object.values(ahorroMax).reduce((a, x) => a + x, 0)
    return {
      bloques: [
        AVISO_POR_VALIDAR,
        texto(
          t('He encontrado {n} más baratas en el directorio. {d} no cumplen tus requisitos y las descarto sin llamar. Las otras {c} hay que confirmarlas por teléfono, porque la tarifa del directorio puede no incluir transporte ni extras. Con las tarifas de referencia, el ahorro podría llegar a {ahorro}, pero solo vale el precio que confirmen.', {
            n: cuenta(opt.length, 'alternativa', 'alternativas'),
            d: v(opt.filter((a) => a.descartada).length, 'num'),
            c: v(aLlamar.length, 'num'),
            ahorro: v(total, 'eur'),
          }),
        ),
        tablaAlternativas(opt),
        { tipo: 'lista', titulo: 'Cómo será la llamada', plegado: true, nivel: 'aprueba', numerada: true, items: PROTOCOLO_LLAMADA.map((x) => ({ texto: t('{x}', { x: v(x) }) })) },
        tarjetaLlamadas(m, aLlamar),
      ],
      sugerencias: [sug('¿Qué hace el agente de Proveedores?')],
      fuentes: ['Directorio de proveedores (ejemplo)', 'Requisitos que diste para cada coste'],
      reglas: [t('Una alternativa que no cumple un requisito en su ficha se descarta sin llamar'), t('Llamar a un proveedor es comunicación externa: necesita tu permiso')],
      noHecho: [t('No ha llamado a nadie todavía.'), t('No ha cambiado ningún proveedor de la propuesta.')],
    }
  },
}

/** Permiso para llamar. Tras decir que no, una tarjeta para cambiar de idea (solo autorizar). */
function tarjetaLlamadas(m, aLlamar, { retomar = false } = {}) {
  const p = m.propuesta
  const acciones = [{ id: 'aprobar', etiqueta: 'Autorizar las llamadas', variante: 'primary', accion: { tipo: 'propuesta/autorizarLlamadas' }, rol: 'Line producer' }]
  if (!retomar) acciones.push({ id: 'rechazar', etiqueta: 'No llamar: lo pido yo', variante: 'secondary', accion: { tipo: 'propuesta/noLlamar' }, rol: 'Line producer' })
  return {
    tipo: 'aprobacion',
    id: retomar ? 'ap-llamadas-retomar' : 'ap-llamadas',
    ref: retomar ? { tipo: 'llamadas', id: 'R1', retomar: true } : { tipo: 'llamadas', id: 'R1' },
    agente: 'proveedores',
    nivel: 'aprueba',
    rol: 'Line producer',
    titulo: retomar
      ? t('¿Cambias de idea? Llamar a {n} en nombre de {prod}', { n: cuenta(aLlamar.length, 'proveedor', 'proveedores'), prod: v(p.proyecto.productora) })
      : t('Llamar a {n} en nombre de {prod}', { n: cuenta(aLlamar.length, 'proveedor', 'proveedores'), prod: v(p.proyecto.productora) }),
    resumen: t('Solo pedirá el precio final y confirmará tus requisitos. No reserva, no firma y no negocia. En la demo las llamadas son simuladas: no se llama a nadie.'),
    impactoTitulo: 'A quién llama',
    impacto: aLlamar.map((a) => ({ etiqueta: `${a.proveedor} · ${a.lineaConcepto.toLowerCase()} (ahora ${a.actual.proveedor})`, antes: a.actual.importe, despues: a.referencia, formato: 'eur' })),
    impactoColumnas: ['Ahora', 'Referencia'],
    acciones,
  }
}

function tablaAlternativas(opt, { sinLlamadas = false } = {}) {
  return {
    tipo: 'tabla',
    titulo: 'Alternativas del directorio',
    columnas: [
      { id: 'coste', etiqueta: 'Coste y proveedor actual' },
      { id: 'actual', etiqueta: 'Ahora', formato: 'eur', alinear: 'right' },
      { id: 'alternativa', etiqueta: 'Alternativa y siguiente paso', texto: true },
      { id: 'referencia', etiqueta: 'Referencia', formato: 'eur', alinear: 'right' },
    ],
    filas: opt.map((a) => ({
      id: a.id,
      coste: `${a.lineaConcepto} · ${a.actual.proveedor}`,
      actual: a.actual.importe,
      alternativa: `${a.proveedor} (${a.tarifa}). ${a.descartada ? `Descartada: ${a.motivoDescarte}` : sinLlamadas ? 'Pedir precio y confirmar requisitos.' : 'Llamar para confirmar precio y requisitos.'}`,
      referencia: a.referencia,
      alerta: false,
    })),
  }
}

/** Tras las llamadas: transcripciones, comparación y una elección por coste. */
export function componerComparacion(m) {
  const p = m.propuesta
  const llamadas = Object.keys(p.llamadas)
  const mejores = mejoresConfirmadas(m)
  const ahorroTotal = mejores.reduce((a, x) => a + x.ahorro, 0)
  const fallidas = llamadas.filter((id) => !p.llamadas[id].cumple).length
  const bloques = [
    texto(
      t('{n}: {ok} confirman precio y requisitos y {ko} no cumple. Si eliges las mejores, la propuesta baja {ahorro}.', {
        n: cuenta(llamadas.length, 'llamada hecha', 'llamadas hechas'),
        ok: v(llamadas.length - fallidas, 'num'),
        ko: v(fallidas, 'num'),
        ahorro: v(ahorroTotal, 'eur'),
      }),
    ),
    // La primera llamada se reproduce; las demás se abren cuando la persona quiere.
    ...llamadas.map((id, i) => ({ tipo: 'llamada', altId: id, plegada: i > 0 })),
    {
      tipo: 'tabla',
      titulo: 'Precios confirmados por teléfono',
      columnas: [
        { id: 'coste', etiqueta: 'Coste' },
        { id: 'actual', etiqueta: 'Ahora', formato: 'eur', alinear: 'right' },
        { id: 'mejor', etiqueta: 'Mejor confirmada' },
        { id: 'precio', etiqueta: 'Precio final', formato: 'eur', alinear: 'right' },
        { id: 'ahorro', etiqueta: 'Ahorro', formato: 'eur', alinear: 'right' },
      ],
      filas: mejores.map((x) => ({
        id: x.linea.id,
        coste: `${x.linea.concepto} · ${x.linea.anterior?.proveedor ?? x.linea.proveedor}`,
        actual: x.linea.anterior?.importe ?? x.linea.importe,
        mejor: x.mejor ? x.mejor.proveedor : 'Ninguna cumple',
        precio: x.mejor ? x.mejor.precioFinal : null,
        ahorro: x.ahorro,
      })),
    },
    ...mejores.filter((x) => x.mejor).map((x) => tarjetaEleccion(m, x)),
  ]
  return {
    bloques,
    sugerencias: [sug('Enséñame la propuesta de Itsasoa')],
    fuentes: ['Llamadas grabadas y transcritas', 'Directorio de proveedores (ejemplo)'],
    reglas: [t('Solo se proponen las alternativas que confirman todos tus requisitos')],
    noHecho: [t('No ha reservado ni ha cambiado ningún proveedor: eso lo eliges tú.')],
  }
}

export function tarjetaEleccion(m, x) {
  const req = x.linea.requisitos.length
  return {
    tipo: 'aprobacion',
    id: `ap-elegir-${x.linea.id}`,
    ref: { tipo: 'eleccion', id: x.linea.id },
    agente: 'proveedores',
    nivel: 'aprueba',
    rol: 'Line producer',
    titulo: t('Proveedor para {c} ({p})', { c: v(x.linea.concepto.toLowerCase()), p: v(x.linea.partida, 'id') }),
    resumen: t('{prov} confirma {precio} por teléfono y cumple {req}: {ahorro} menos que {actual}.{desc}', {
      prov: v(x.mejor.proveedor),
      precio: v(x.mejor.precioFinal, 'eur'),
      req: cuenta(req, 'requisito', 'requisitos'),
      ahorro: v(x.ahorro, 'eur'),
      actual: v(x.linea.proveedor),
      desc: v(x.descartadas.length ? ` ${x.descartadas.map((d) => `${d.proveedor} no cumple: ${d.motivo.toLowerCase()}`).join(' ')}` : ''),
    }),
    acciones: [
      { id: 'aprobar', etiqueta: `Elegir ${x.mejor.proveedor}`, variante: 'primary', accion: { tipo: 'propuesta/elegir', lineaId: x.linea.id, altId: x.mejor.id }, rol: 'Line producer' },
      { id: 'rechazar', etiqueta: `Mantener ${x.linea.proveedor}`, variante: 'secondary', accion: { tipo: 'propuesta/elegir', lineaId: x.linea.id, altId: null }, rol: 'Line producer' },
    ],
  }
}

export { REQUISITOS }
