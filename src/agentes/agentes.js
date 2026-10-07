// Catálogo de agentes y niveles de autonomía del prototipo conversacional.

export const AGENTES = {
  orquestador: {
    id: 'orquestador',
    nombre: 'Orquestador',
    codigo: 'OR',
    rol: 'Entiende la petición, reparte el trabajo y reúne la respuesta.',
    hace: 'Decide qué agentes intervienen y en qué orden. No toca cifras ni aprueba nada.',
    niveles: ['ejecuta'],
  },
  facturas: {
    id: 'facturas',
    nombre: 'Facturas',
    codigo: 'FA',
    rol: 'Lee facturas y tickets, extrae los campos y propone la partida.',
    hace: 'Clasifica sola la factura electrónica y lo que lee con confianza suficiente. Lo dudoso lo propone.',
    niveles: ['ejecuta', 'propone'],
  },
  conciliacion: {
    id: 'conciliacion',
    nombre: 'Conciliación',
    codigo: 'CN',
    rol: 'Cuadra cada factura con su orden de compra y su partida.',
    hace: 'Contabiliza sola la factura que casa con un pedido aprobado. Lo que no casa pasa a Excepciones.',
    niveles: ['ejecuta'],
  },
  excepciones: {
    id: 'excepciones',
    nombre: 'Excepciones',
    codigo: 'EX',
    rol: 'Separa lo que no cuadra y lo lleva a quien decide.',
    hace: 'Ordena las decisiones pendientes y asigna responsable. Nunca aprueba en nombre de nadie.',
    niveles: ['propone', 'aprueba'],
  },
  prevision: {
    id: 'prevision',
    nombre: 'Previsión',
    codigo: 'PR',
    rol: 'Recalcula el coste estimado final y la caja.',
    hace: 'Actualiza la previsión con cada movimiento y propone ajustes. No mueve dinero.',
    niveles: ['ejecuta', 'propone'],
  },
  costes: {
    id: 'costes',
    nombre: 'Control de costes',
    codigo: 'CC',
    rol: 'Compara presupuesto, gastado, comprometido y previsión por capítulo.',
    hace: 'Calcula desviaciones y el impacto de cada compra. Pide aprobación si un capítulo supera el umbral.',
    niveles: ['ejecuta', 'aprueba'],
  },
  informes: {
    id: 'informes',
    nombre: 'Informes',
    codigo: 'IN',
    rol: 'Redacta el informe semanal para producción.',
    hace: 'Prepara el borrador con cifras y causas. Compartirlo fuera requiere aprobación.',
    niveles: ['ejecuta', 'aprueba'],
  },
  cumplimiento: {
    id: 'cumplimiento',
    nombre: 'Cumplimiento',
    codigo: 'CU',
    rol: 'Revisa elegibilidad fiscal, impuestos y el dossier.',
    hace: 'Prepara la documentación y avisa de lo que bloquea. El fiscalista revisa y firma.',
    niveles: ['propone', 'aprueba'],
  },
  presupuesto: {
    id: 'presupuesto',
    nombre: 'Presupuesto',
    codigo: 'PS',
    rol: 'Monta la propuesta de presupuesto por capítulos ICAA.',
    hace: 'Coloca los costes que aportas en su partida y estima por capítulo lo que falta por detallar. No cierra el presupuesto: lo propone.',
    niveles: ['ejecuta', 'propone'],
  },
  proveedores: {
    id: 'proveedores',
    nombre: 'Proveedores',
    codigo: 'PV',
    rol: 'Busca proveedores más baratos y confirma precios por teléfono.',
    hace: 'Compara el directorio con tus requisitos y, con tu permiso, llama para confirmar el precio final. No reserva ni negocia: eliges tú.',
    niveles: ['ejecuta', 'propone', 'aprueba'],
  },
  riesgos: {
    id: 'riesgos',
    nombre: 'Riesgos de producción',
    codigo: 'RG',
    rol: 'Vigila el plan de rodaje y avisa de lo que puede alterarlo.',
    hace: 'Cruza el plan con el tiempo, convocatorias, permisos y órdenes del día; avisa con antelación, propone una respuesta y calcula el impacto. Cambiar el plan lo decide line producer; reservar dinero o asumir el riesgo, producción ejecutiva.',
    niveles: ['ejecuta', 'propone', 'aprueba'],
    exploratorio: true,
  },
}

export const ORDEN_AGENTES = ['orquestador', 'presupuesto', 'proveedores', 'facturas', 'conciliacion', 'excepciones', 'prevision', 'costes', 'informes', 'cumplimiento', 'riesgos']

export const AUTONOMIA = {
  ejecuta: {
    id: 'ejecuta',
    etiqueta: 'Ejecuta',
    nivel: 1,
    descripcion: 'Lo hace solo porque es rutinario y reversible. Queda registrado.',
  },
  propone: {
    id: 'propone',
    etiqueta: 'Propone',
    nivel: 2,
    descripcion: 'Lo prepara y espera tu confirmación.',
  },
  aprueba: {
    id: 'aprueba',
    etiqueta: 'Pide aprobación',
    nivel: 3,
    descripcion: 'Hay dinero comprometido o riesgo fiscal: no avanza sin la aprobación del responsable.',
  },
}

// Duraciones de cada tipo de paso a ritmo normal (ms). Solo afectan a la animación.
export const DURACIONES = {
  plan: 650,
  lectura: 900,
  ocr: 1300,
  conciliacion: 1000,
  calculo: 850,
  revision: 900,
  redaccion: 1200,
  llamada: 2400,
  bloque: 140,
}
