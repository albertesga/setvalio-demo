// Guiones fiscales: cumplimiento (elegibilidad, IGIC, dossier) e incentivo (en exploración).

import { reducir } from '../acciones.js'
import { cuenta } from '../texto.js'
import { ROLES } from '../politicas.js'
import { PERSONAS } from '../mundo.js'
import { t, v, c, paso, sug, texto, aviso, bloqueDocumento, bloqueDossier, minuscula } from './comun.js'
import { faltaDocumentacion } from './documentos.js'

// Lo que le falta a un gasto para ser justificable, dicho como lo diría una persona.
function loQueFalta(el) {
  const faltan = el.criterios
    .filter((x) => x.ok !== true)
    .map((x) => (x.id === 'pago' && x.ok === null ? 'falta el pago' : x.id === 'territorio' ? 'el fiscalista tiene que validar el gasto en Canarias' : minuscula(x.detalle)))
  return faltan.length > 1 ? `${faltan.slice(0, -1).join(', ')} y ${faltan.at(-1)}` : faltan[0] ?? ''
}

const pendientesFiscales = (m) => Object.values(m.documentos).filter((d) => d.estado === 'en_bandeja' && d.estado !== 'por_llegar')

function tarjetaFiscal(m, d) {
  return {
    tipo: 'aprobacion',
    id: `ap-rev-${d.id}`,
    ref: { tipo: 'revision', id: d.id },
    agente: 'cumplimiento',
    nivel: 'aprueba',
    rol: ROLES.fiscalista,
    titulo: t('¿Cuenta como gasto en Canarias la factura de {prov}?', { prov: v(d.proveedor) }),
    resumen: t('{id} lleva IGIC ({tasa}): es un gasto hecho en Canarias. Que cuente para el incentivo canario lo decide el fiscalista, no un agente.', { id: v(d.id, 'id'), tasa: v(d.impuesto.tasa / 100, 'pct0') }),
    acciones: [{ id: 'enviar', etiqueta: 'Preparar para el fiscalista', burbuja: `Paso ${d.id} al fiscalista`, variante: 'primary', accion: { tipo: 'documento/revision', docId: d.id, rol: ROLES.fiscalista }, rol: null }],
    nota: 'En la demo no sale nada: el paquete queda preparado.',
  }
}

// ── Pasos del dossier: borradores que lo mantienen al día (en exploración; nunca se envían) ──

const EXPLORACION_DOSSIER = aviso('exploratorio', 'En exploración', t('En exploración: pedir documentos para el dossier aún no está en Filmpilot. Redactamos el correo; lo envías tú.'))

/** Borrador de un paso del dossier: la solicitud del certificado al ICAA o los justificantes a administración. */
function borradorDossier(m, id) {
  const dos = c.dossier(m).find((d) => d.id === id)
  if (id === 'DOS-01') {
    return {
      id: 'BOR-DOS-01',
      canal: 'email',
      ref: 'DOS-01',
      para: 'ICAA · certificados de obras',
      firma: `${PERSONAS.marta.nombre} · ${PERSONAS.marta.rol} · ${m.proyecto.titulo}`,
      motivo: t('Certificado cultural pendiente'),
      asunto: t('Certificado cultural de «{p}»', { p: v(m.proyecto.titulo) }),
      cuerpo: [
        t('Buenos días:'),
        t('Les escribimos de {prod}, productora de «{p}». Para aplicar la deducción por inversión necesitamos el certificado cultural de la obra.', { prod: v(m.proyecto.productora), p: v(m.proyecto.titulo) }),
        t('¿Pueden decirnos en qué punto está y si falta algún documento? Lo necesitaríamos antes del {f}.', { f: v(dos.deadline, 'dia') }),
        t('Muchas gracias.'),
      ],
    }
  }
  const docs = c.justificantesPendientes(m)
  return {
    id: 'BOR-DOS-02',
    canal: 'email',
    ref: 'DOS-02',
    para: `Administración · ${m.proyecto.productora}`,
    firma: `${PERSONAS.alvaro.nombre} · ${PERSONAS.alvaro.rol} · ${m.proyecto.titulo}`,
    motivo: t('Justificantes de pago para el dossier fiscal'),
    asunto: t('Justificantes de pago para el dossier ({n})', { n: cuenta(docs.length, 'factura', 'facturas') }),
    cuerpo: [
      t('Hola:'),
      t('Para el dossier de la deducción necesitamos el justificante de pago de estas facturas:'),
      ...docs.map((d) => t('{id} · {prov} · {total}', { id: v(d.id, 'id'), prov: v(d.proveedor), total: v(d.total, 'eurCents') })),
      t('Si alguna aún no está pagada, decidnos cuándo se paga. Gracias.'),
    ],
  }
}

/** Próximos pasos para tener el dossier al día. La pantalla tacha cada uno cuando está hecho (`hecho`). */
function pasosDossier(m) {
  const dos = c.dossier(m)
  const d1 = dos.find((d) => d.id === 'DOS-01')
  const igic = Object.values(m.documentos).find((d) => d.estado === 'en_bandeja' && d.impuesto?.tipo === 'IGIC')
  const sinDoc = Object.values(m.documentos).filter((d) => d.estado !== 'por_llegar' && d.impuesto?.tipo !== 'IGIC' && faltaDocumentacion(d))
  const items = [
    { id: 'DOS-01', texto: t('Certificado cultural ICAA: vence el {f}. Preparo la solicitud al ICAA.', { f: v(d1.deadline, 'dia') }), etiqueta: 'Preparar la solicitud', entrada: 'Prepara la solicitud del certificado cultural al ICAA', hecho: { borrador: 'BOR-DOS-01' } },
    // Sin recuento: cambia con cada factura que se contabiliza o se deshace, y lo da en vivo la lista de arriba.
    { id: 'DOS-02', texto: t('Justificantes de pago de las facturas ya contabilizadas: se los pido a administración.'), etiqueta: 'Pedir los justificantes', entrada: 'Pide a administración los justificantes de pago', hecho: { borrador: 'BOR-DOS-02' } },
  ]
  if (igic) items.push({ id: `rev-${igic.id}`, texto: t('{id} de {prov} lleva IGIC: que cuente como gasto en Canarias lo valida el fiscalista. Tienes la tarjeta debajo.', { id: v(igic.id, 'id'), prov: v(igic.proveedor) }), hecho: { revision: igic.id } })
  for (const d of sinDoc) items.push({ id: `doc-${d.id}`, texto: t('{id} de {prov}: {falta}.', { id: v(d.id, 'id'), prov: v(d.proveedor), falta: v(d.tipo === 'ticket' ? 'es un ticket; hace falta la factura completa' : 'falta documentación') }), etiqueta: d.tipo === 'ticket' ? 'Pedir la factura' : 'Pedir la documentación', entrada: d.tipo === 'ticket' ? `Pide a ${d.proveedor} la factura completa` : `Pide a ${d.proveedor} la documentación que falta`, hecho: { borrador: `BOR-${d.id}` } })
  items.push({ id: 'DOS-03', texto: t('Coste reconocido por capítulos: lo cierra el informe semanal, que lo prepara Informes.'), etiqueta: 'Ver el informe', entrada: 'Prepárame el informe semanal de coste' })
  return { tipo: 'pasos', titulo: 'Para tenerlo al día', nivel: 'propone', items }
}

export const cumplimiento = {
  id: 'cumplimiento',
  titulo: (det) => (det.entidades?.dossierPaso === 'DOS-01' ? 'Solicitud del certificado cultural' : det.entidades?.dossierPaso === 'DOS-02' ? 'Justificantes de pago' : 'Dossier fiscal'),
  ejemplos: ['¿Qué bloquea el dossier fiscal?', 'Revisa el IGIC de la factura F-2026-072', 'elegibilidad de los gastos', '¿cuándo vence el certificado cultural?', '¿Cómo va la adecuación fiscal?', 'Prepara la solicitud del certificado cultural al ICAA', 'Pide a administración los justificantes de pago'],

  planificar(m, det) {
    const pasoDossier = det.entidades?.dossierPaso
    if (pasoDossier) {
      const borrador = borradorDossier(m, pasoDossier)
      return [
        paso('cumplimiento', pasoDossier === 'DOS-01' ? t('Revisa qué pide el ICAA para el certificado') : t('Busca las facturas contabilizadas sin justificante de pago'), { tipo: 'revision', salida: pasoDossier === 'DOS-01' ? t('Vence el {f}', { f: v(c.dossier(m).find((d) => d.id === 'DOS-01').deadline, 'dia') }) : t('{n}', { n: cuenta(c.justificantesPendientes(m).length, 'factura', 'facturas') }) }),
        paso('cumplimiento', t('Redacta el borrador'), { tipo: 'redaccion', autonomia: 'propone', acciones: [{ tipo: 'borrador/crear', borrador }], salida: t('Listo para revisar; no se envía') }),
      ]
    }
    if (det.eventoId === 'EV-03') {
      const recibir = { tipo: 'evento/recibir', eventoId: 'EV-03' }
      const dos = c.dossier(m)[0]
      return [paso('cumplimiento', t('Revisa los plazos del dossier'), { tipo: 'revision', acciones: [recibir], salida: t('{doc} vence en {dias}', { doc: v(dos.documento), dias: v(dos.dias, 'dias') }) })]
    }
    const docId = det.entidades?.documento
    if (docId && m.documentos[docId]) {
      const el = c.elegibilidad(m, docId)
      return [
        paso('cumplimiento', t('Revisa los criterios de elegibilidad de {id}', { id: v(docId, 'id') }), { tipo: 'revision', salida: t('{n} cumplidos de {total}', { n: v(el.criterios.filter((x) => x.ok === true).length, 'num'), total: v(el.criterios.length, 'num') }) }),
        paso('excepciones', t('Asigna quién valida lo que falta'), { autonomia: 'aprueba', salida: el.territorio === 'canarias' ? t('Gasto en Canarias: lo valida el {rol}', { rol: v(minuscula(ROLES.fiscalista)) }) : t('Sin validación fiscal pendiente') }),
      ]
    }
    const docs = pendientesFiscales(m)
    return [
      paso('cumplimiento', t('Revisa la elegibilidad de la bandeja'), { tipo: 'revision', salida: t('{n} por revisar', { n: cuenta(docs.filter((d) => c.elegibilidad(m, d.id).estado !== 'elegible').length, 'documento', 'documentos') }) }),
      paso('cumplimiento', t('Repasa los plazos del dossier'), { paralelo: true, salida: t('{n} bloqueantes', { n: v(c.dossier(m).length, 'num') }) }),
      paso('excepciones', t('Asigna responsables'), { autonomia: 'aprueba', salida: t('Lo fiscal, al fiscalista') }),
    ]
  },

  componer({ antes, despues: m, det }) {
    const reglas = [t('Criterios: factura completa, pago trazable, pedido o contrato y capítulo ICAA coherente')]
    const noHecho = [t('No ha validado ningún tratamiento fiscal: eso lo firma el fiscalista.'), t('No ha enviado nada fuera.')]
    const nota = aviso('info', 'El fiscalista revisa y firma', t('Filmpilot prepara la documentación y avisa de lo que bloquea; la validación fiscal es del fiscalista.'))

    const pasoDossier = det.entidades?.dossierPaso
    if (pasoDossier) {
      const id = `BOR-${pasoDossier}`
      return {
        bloques: [
          EXPLORACION_DOSSIER,
          texto(
            pasoDossier === 'DOS-01'
              ? t('Te dejo la solicitud del certificado cultural al ICAA. Revísala antes de enviarla tú: en la checklist del dossier queda como preparada.')
              : t('Te dejo la petición a administración con las {n} sin justificante de pago. Revísala antes de enviarla tú.', { n: cuenta(c.justificantesPendientes(m).length, 'factura', 'facturas') }),
          ),
          { tipo: 'borrador', id },
          bloqueDossier(m),
        ],
        sugerencias: [sug('¿Qué bloquea el dossier fiscal?'), sug(pasoDossier === 'DOS-01' ? 'Pide a administración los justificantes de pago' : 'Prepara la solicitud del certificado cultural al ICAA')],
        fuentes: ['Dossier fiscal', 'Bandeja de documentos'],
        reglas: [],
        noHecho: [t('No ha enviado el correo: lo envías tú.'), t('No ha cambiado el dossier: queda bloqueante hasta que llegue lo pedido.')],
      }
    }

    if (det.eventoId === 'EV-03') {
      const dos = c.dossier(m)[0]
      return {
        bloques: [aviso('aviso', 'Vencimiento próximo', t('{doc} vence el {f}: quedan {dias}. Sin él no se puede aplicar la deducción.', { doc: v(dos.documento), f: v(dos.deadline, 'dia'), dias: v(dos.dias, 'dias') })), bloqueDossier(m), nota],
        sugerencias: [sug('¿Qué bloquea el dossier fiscal?'), sug('Revisa el IGIC de la factura F-2026-072')],
        fuentes: ['Dossier fiscal'],
        reglas,
        noHecho,
      }
    }

    const docId = det.entidades?.documento
    if (docId && m.documentos[docId]) {
      const d = m.documentos[docId]
      const el = c.elegibilidad(m, docId)
      const bloques = [
        texto(
          el.estado === 'elegible'
            ? t('{id} cumple los criterios de elegibilidad.', { id: v(docId, 'id') })
            : t('{id} de {prov} todavía no es justificable: {faltan}.', { id: v(docId, 'id'), prov: v(d.proveedor), faltan: v(loQueFalta(el)) }),
        ),
        bloqueDocumento(m, docId, { conciliacion: false, elegibilidad: true }),
      ]
      // La tarjeta ya dice que lo decide el fiscalista: la nota solo va sin ella.
      bloques.push(el.territorio === 'canarias' ? tarjetaFiscal(m, d) : nota)
      return {
        bloques,
        sugerencias: [sug(`Pide a ${d.proveedor} la documentación que falta`), sug('¿Qué bloquea el dossier fiscal?'), sug('¿Cuánto supondría llegar al 50 % de gasto en Canarias?')],
        fuentes: ['Bandeja de documentos', 'Criterios de elegibilidad'],
        reglas,
        noHecho,
      }
    }

    const docs = pendientesFiscales(m)
    const filas = docs.map((d) => {
      const el = c.elegibilidad(m, d.id)
      const get = (id) => el.criterios.find((x) => x.id === id)?.ok
      // Lo que aún depende de otro paso se dice por su nombre: falta el pago o lo valida el fiscalista.
      const pendiente = get('pago') === null ? 'Falta el pago' : 'Lo valida el fiscalista'
      return { id: d.id, documento: `${d.id} · ${d.proveedor}`, factura: get('factura'), pago: get('pago'), pedido: get('pedido'), capitulo: get('capitulo'), estado: el.estado === 'elegible' ? 'Elegible' : el.estado === 'condicionado' ? pendiente : 'Revisar' }
    })
    const dos = c.dossier(m)
    const prox = dos.reduce((a, x) => (x.dias < a.dias ? x : a), dos[0])
    const igic = docs.find((d) => d.impuesto?.tipo === 'IGIC' && !m.revisiones[d.id])
    const bloques = [
      texto(t('El dossier de la deducción tiene {n}. El más urgente: {doc}, que vence en {dias}. Esto es lo que te propongo para tenerlo al día.', { n: cuenta(dos.length, 'bloqueante', 'bloqueantes'), doc: v(prox.documento), dias: v(prox.dias, 'dias') })),
      bloqueDossier(m),
      pasosDossier(m),
    ]
    if (filas.length) {
      bloques.push({
        tipo: 'tabla',
        titulo: 'Elegibilidad de la bandeja',
        plegado: true,
        resumen: `${filas.length} ${filas.length === 1 ? 'documento' : 'documentos'} en la bandeja`,
        columnas: [
          { id: 'documento', etiqueta: 'Documento' },
          { id: 'factura', etiqueta: 'Factura', formato: 'check', alinear: 'center' },
          { id: 'pago', etiqueta: 'Pago', formato: 'check', alinear: 'center' },
          { id: 'pedido', etiqueta: 'Pedido o contrato', formato: 'check', alinear: 'center' },
          { id: 'capitulo', etiqueta: 'Capítulo', formato: 'check', alinear: 'center' },
          { id: 'estado', etiqueta: 'Estado' },
        ],
        filas,
      })
    }
    bloques.push(igic ? tarjetaFiscal(m, igic) : nota)
    const sugerencias = []
    if (igic) sugerencias.push(sug(`Pide a ${igic.proveedor} la documentación que falta`))
    sugerencias.push(sug('¿Cuánto supondría llegar al 50 % de gasto en Canarias?'), sug('Prepárame el informe semanal de coste'))
    return { bloques, sugerencias, fuentes: ['Dossier fiscal', 'Bandeja de documentos', 'Criterios de elegibilidad'], reglas, noHecho }
  },
}

// ── Incentivo (en exploración) ──────────────────────────────────────────────

export const incentivo = {
  id: 'incentivo',
  titulo: 'Estimar el incentivo',
  ejemplos: ['¿Cuánto supondría llegar al 50 % de gasto en Canarias?', '¿Cuánto podemos recuperar de deducción fiscal?', 'incentivo fiscal en Canarias', 'tax credit'],

  planificar(m) {
    return [
      paso('cumplimiento', t('Toma el coste y el reparto del gasto por territorio'), { tipo: 'lectura', salida: t('Coste {coste}; gasto en Canarias {pct}', { coste: v(m.proyecto.presupuesto, 'eur'), pct: v(m.proyecto.pctGastoTerritorio.canarias / 100, 'pct0') }) }),
      paso('cumplimiento', t('Aplica las reglas del motor de incentivos'), { autonomia: 'propone', salida: t('Estimación orientativa por territorio') }),
    ]
  },

  componer({ despues: m, det }) {
    const pctActual = m.proyecto.pctGastoTerritorio.canarias / 100
    const pctPedido = det.entidades?.porcentaje && det.entidades.porcentaje > 0 && det.entidades.porcentaje <= 1 ? det.entidades.porcentaje : 0.5
    const comun = c.incentivo(m, { territorio: 'comun' })
    const canActual = c.incentivo(m, { territorio: 'canarias', pctGasto: pctActual })
    const canPedido = c.incentivo(m, { territorio: 'canarias', pctGasto: pctPedido })
    const canAyuda = c.incentivo(m, { territorio: 'canarias', pctGasto: pctPedido, ayudaIcaa: true })
    const otro = det.entidades?.territorio && !['canarias', 'comun'].includes(det.entidades.territorio) ? c.incentivo(m, { territorio: det.entidades.territorio, pctGasto: det.entidades.porcentaje }) : null
    const plan = m.financiacion.find((f) => f.tipo === 'Deducción')
    const ayuda = canAyuda.ayuda

    const filas = [
      { id: 'comun', escenario: 'Resto de España', deduccion: comun.deduccionNeta, efectivo: comun.efectivo, nota: '' },
      { id: 'can-actual', escenario: `Canarias con el gasto actual (${Math.round(pctActual * 100)} %)`, deduccion: canActual.deduccionNeta, efectivo: canActual.efectivo, nota: canActual.cumpleRequisito ? '' : `No cumple el requisito: ${canActual.requisitoLabel}` },
      { id: 'can-pedido', escenario: `Canarias con el ${Math.round(pctPedido * 100)} % del gasto`, deduccion: canPedido.deduccionNeta, efectivo: canPedido.efectivo, nota: canPedido.cumpleRequisito ? 'Cumple el requisito de gasto' : `No cumple el requisito: ${canPedido.requisitoLabel}` },
    ]
    if (otro && otro.pctGasto > 0) filas.unshift({ id: 'otro', escenario: `${otro.territorio} con el ${Math.round(otro.pctGasto * 100)} % del gasto`, deduccion: otro.deduccionNeta, efectivo: otro.efectivo, nota: otro.cumpleRequisito ? 'Cumple el requisito de gasto' : `No cumple el requisito: ${otro.requisitoLabel}` })
    if (ayuda) filas.push({ id: 'can-ayuda', escenario: `Lo anterior con la ${ayuda.fuente}`, deduccion: canAyuda.deduccionNeta, efectivo: canAyuda.efectivo, nota: canAyuda.topaIntensidad ? 'Recortada por el límite de ayudas públicas' : 'La ayuda reduce la base' })

    const bloques = [
      aviso('exploratorio', 'En exploración', t('En exploración: es una estimación orientativa; la cifra buena te la da tu fiscalista.')),
      ...(otro
        ? [
            texto(
              otro.pctGasto === 0
                ? t('Este proyecto no prevé gasto en {terr}, así que su régimen no aplica. Si quieres estimarlo, dime qué parte del gasto iría allí (su requisito: {req}). Debajo, la comparación con Canarias, donde sí rueda una parte.', { terr: v(otro.territorio), req: v(otro.requisitoLabel) })
                : t('En {terr} con el {pct} del gasto, la deducción estimada sería {d}.', { terr: v(otro.territorio), pct: v(otro.pctGasto, 'pct0'), d: v(otro.deduccionNeta, 'eur') }),
            ),
          ]
        : []),
      texto(
        canActual.cumpleRequisito
          ? t('Con el gasto actual en Canarias ({pct}) la deducción estimada es {d}.', { pct: v(pctActual, 'pct0'), d: v(canActual.deduccionNeta, 'eur') })
          : t('Con el {pct} del gasto en Canarias no se cumple el requisito ({req}), así que se aplica la deducción general: {d}. Con el {pp} serían {dp}.', {
              pct: v(pctActual, 'pct0'),
              req: v(canActual.requisitoLabel),
              d: v(canActual.deduccionNeta, 'eur'),
              pp: v(pctPedido, 'pct0'),
              dp: v(canPedido.deduccionNeta, 'eur'),
            }),
      ),
      {
        tipo: 'tabla',
        titulo: 'Deducción estimada por escenario',
        columnas: [
          { id: 'escenario', etiqueta: 'Escenario' },
          { id: 'deduccion', etiqueta: 'Deducción', formato: 'eur', alinear: 'right' },
          { id: 'efectivo', etiqueta: 'Sobre el coste', formato: 'pct', alinear: 'right' },
          { id: 'nota', etiqueta: 'Nota' },
        ],
        filas,
      },
    ]
    if (ayuda && canAyuda.topaIntensidad) {
      bloques.push(texto(t('Con la ayuda de {ayuda}, deducción y ayudas no pueden pasar del {cap} del coste, {tope}: es el límite de ayudas públicas, así que la deducción se recorta a {d}.', { ayuda: v(ayuda.importe, 'eur'), cap: v(canAyuda.capPct, 'pct0'), tope: v(canAyuda.capIntensidad, 'eur'), d: v(canAyuda.deduccionNeta, 'eur') })))
    }
    if (plan) bloques.push(texto(t('El plan de financiación cuenta con {imp} de incentivo ({estado}). Conviene revisar esa cifra con el fiscalista.', { imp: v(plan.importe, 'eur'), estado: v(plan.estado.toLowerCase()) })))
    return {
      bloques,
      sugerencias: [sug('¿Qué bloquea el dossier fiscal?'), sug('Prepárame el informe semanal de coste')],
      fuentes: ['Motor de incentivos (reglas V2)', 'Reparto de gasto por territorio', 'Plan de financiación'],
      reglas: [t('Doble tramo sobre el primer millón y el resto; requisito de gasto mínimo por territorio'), t('Las subvenciones reducen la base; límite de ayudas públicas sobre el coste')],
      noHecho: [t('No ha cambiado el reparto de gasto ni el plan de financiación.'), t('No es una validación fiscal.')],
    }
  },
}

export { reducir }
