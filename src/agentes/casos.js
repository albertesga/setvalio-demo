// Casos de uso que muestra el prototipo. Cada uno tiene una petición de ejemplo
// que el motor resuelve (lo comprueba scripts/check-agentes.mjs).
//
// capacidad: 'decidida' (alcance del MVP), 'exploratoria' (se exploró, sin
// validar) o 'posterior' (fase posterior).

export const GRUPOS_CASOS = [
  { id: 'semana', titulo: 'Cerrar la semana' },
  { id: 'entra', titulo: 'Lo que entra' },
  { id: 'anticipa', titulo: 'Cumplir y anticipar' },
]

export const CASOS = [
  {
    id: 'informe',
    grupo: 'hero',
    titulo: 'Informe semanal de coste',
    descripcion: 'Facturas, conciliación, desviaciones, previsión y borrador para producción, con las decisiones que te tocan.',
    prompt: 'Prepárame el informe semanal de coste',
    agentes: ['facturas', 'conciliacion', 'costes', 'prevision', 'excepciones', 'cumplimiento', 'informes'],
    nivel: 'aprueba',
    capacidad: 'decidida',
  },
  {
    id: 'desviacion',
    grupo: 'semana',
    titulo: 'Explicar una desviación',
    descripcion: 'Qué partidas empujan un capítulo y si ya está consolidado.',
    prompt: '¿Por qué se desvía Escenografía?',
    agentes: ['costes', 'prevision'],
    nivel: 'propone',
    capacidad: 'decidida',
  },
  {
    id: 'compra',
    grupo: 'semana',
    titulo: 'Aprobar una compra',
    descripcion: 'Impacto en el capítulo, en el cierre y en la caja antes de decidir.',
    prompt: '¿Qué órdenes de compra tengo pendientes?',
    agentes: ['costes', 'prevision', 'excepciones'],
    nivel: 'aprueba',
    capacidad: 'decidida',
  },
  {
    id: 'caja',
    grupo: 'semana',
    titulo: 'Previsión de cierre y caja',
    descripcion: 'Coste estimado final, semanas en negativo y ajustes de previsión.',
    prompt: '¿Cómo cerraremos el proyecto y llegamos con la caja?',
    agentes: ['prevision', 'costes'],
    nivel: 'propone',
    capacidad: 'decidida',
  },
  {
    id: 'factura',
    grupo: 'entra',
    titulo: 'Factura entrante',
    descripcion: 'Se lee, se casa con su pedido y se contabiliza sola si todo cuadra.',
    prompt: '¿Han llegado facturas nuevas?',
    agentes: ['facturas', 'conciliacion', 'cumplimiento'],
    nivel: 'ejecuta',
    capacidad: 'decidida',
  },
  {
    id: 'ticket',
    grupo: 'entra',
    titulo: 'Gasto dudoso',
    descripcion: 'Confianza baja: el agente propone la partida y espera tu confirmación.',
    prompt: '¿Qué gastos tengo que revisar?',
    agentes: ['facturas', 'excepciones'],
    nivel: 'propone',
    capacidad: 'decidida',
  },
  {
    id: 'documentacion',
    grupo: 'entra',
    titulo: 'Pedir documentación',
    descripcion: 'Borrador para el proveedor con lo que falta. En la demo no se envía.',
    prompt: 'Pide a Ferretería El Tornillo la factura completa',
    agentes: ['cumplimiento', 'orquestador'],
    nivel: 'propone',
    capacidad: 'exploratoria',
  },
  {
    id: 'cumplimiento',
    grupo: 'anticipa',
    titulo: 'Dossier fiscal e IGIC',
    descripcion: 'Elegibilidad de los gastos y bloqueantes del dossier. El fiscalista revisa y firma.',
    prompt: '¿Qué bloquea el dossier fiscal?',
    agentes: ['cumplimiento', 'excepciones'],
    nivel: 'aprueba',
    capacidad: 'decidida',
  },
  {
    id: 'incentivo',
    grupo: 'anticipa',
    titulo: 'Estimar el incentivo',
    descripcion: 'Deducción orientativa por territorio con el motor de incentivos.',
    prompt: '¿Cuánto supondría llegar al 50 % de gasto en Canarias?',
    agentes: ['cumplimiento'],
    nivel: 'propone',
    capacidad: 'exploratoria',
  },
  {
    id: 'alcance',
    grupo: 'anticipa',
    titulo: 'Lo que aún no hace',
    descripcion: 'Production Rescue, pagos y envíos: el asistente lo dice claro.',
    prompt: 'Activa el Production Rescue',
    agentes: ['orquestador'],
    nivel: 'ejecuta',
    capacidad: 'posterior',
  },
]

export const CASOS_POR_ID = Object.fromEntries(CASOS.map((c) => [c.id, c]))

// Intención → caso de uso que cuenta como visto.
export const CASO_DE_INTENCION = {
  informe_semanal: 'informe',
  explicar_desviacion: 'desviacion',
  aprobar_oc: 'compra',
  prevision: 'caja',
  factura_nueva: 'factura',
  revisar_gasto: 'ticket',
  pedir_documentacion: 'documentacion',
  cumplimiento: 'cumplimiento',
  incentivo: 'incentivo',
  fuera_alcance: 'alcance',
}

// Recorrido guiado: cada paso envía una entrada y explica qué mirar.
export const RECORRIDO = [
  { id: 'r1', titulo: 'Informe semanal', entrada: { tipo: 'texto', texto: 'Prepárame el informe semanal de coste' }, nota: 'El Orquestador reparte el trabajo. Mira cómo cada agente hace su parte y qué te deja para decidir.' },
  { id: 'r2', titulo: 'Una compra que pide aprobación', entrada: { tipo: 'evento', eventoId: 'EV-02' }, nota: 'Llega una orden de compra que deja Viajes por encima del umbral. Excepciones no la aprueba: te la trae. Decide tú para continuar.', espera: { tipo: 'orden', id: 'OC-104' } },
  { id: 'r3', titulo: 'Factura entrante', entrada: { tipo: 'evento', eventoId: 'EV-01' }, nota: 'Confianza alta y casa con su pedido: se contabiliza sola y queda registrada.' },
  { id: 'r4', titulo: 'Gasto dudoso', entrada: { tipo: 'texto', texto: '¿Qué gastos tengo que revisar?' }, nota: 'Con un 71 % de confianza el agente no decide: propone y espera.' },
  { id: 'r5', titulo: 'Desviación', entrada: { tipo: 'texto', texto: '¿Por qué se desvía Escenografía?' }, nota: 'Pregunta con tus palabras. La respuesta lleva cifras y de dónde salen.' },
  { id: 'r6', titulo: 'Cierre y caja', entrada: { tipo: 'texto', texto: '¿Cómo cerraremos el proyecto y llegamos con la caja?' }, nota: 'Previsión no mueve dinero: calcula, avisa y propone.' },
  { id: 'r7', titulo: 'Dossier fiscal', entrada: { tipo: 'texto', texto: '¿Qué bloquea el dossier fiscal?' }, nota: 'Cumplimiento prepara; el fiscalista revisa y firma.' },
  { id: 'r8', titulo: 'Pedir documentación (exploratorio)', entrada: { tipo: 'texto', texto: 'Pide a Ferretería El Tornillo la factura completa' }, nota: 'Un borrador listo para revisar. En la demo no sale ningún correo.' },
  { id: 'r9', titulo: 'Incentivo (exploratorio)', entrada: { tipo: 'texto', texto: '¿Cuánto supondría llegar al 50 % de gasto en Canarias?' }, nota: 'Exploratorio: una estimación orientativa, fuera del alcance decidido.' },
  { id: 'r10', titulo: 'Fuera de alcance', entrada: { tipo: 'texto', texto: 'Activa el Production Rescue' }, nota: 'Cuando algo no está en el producto, lo dice.' },
]
