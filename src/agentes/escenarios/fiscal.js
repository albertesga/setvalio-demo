// Guiones fiscales: cumplimiento (elegibilidad, IGIC, dossier) e incentivo (exploratorio).

import { reducir } from '../acciones.js'
import { cuenta } from '../texto.js'
import { ROLES } from '../politicas.js'
import { t, v, c, paso, sug, texto, aviso, bloqueDocumento, bloqueDossier } from './comun.js'

const pendientesFiscales = (m) => Object.values(m.documentos).filter((d) => d.estado === 'en_bandeja' && d.estado !== 'por_llegar')

function tarjetaFiscal(m, d) {
  return {
    tipo: 'aprobacion',
    id: `ap-rev-${d.id}`,
    ref: { tipo: 'revision', id: d.id },
    agente: 'cumplimiento',
    nivel: 'aprueba',
    rol: ROLES.fiscalista,
    titulo: t('Validación territorial de {id}', { id: v(d.id, 'id') }),
    resumen: t('Factura con IGIC ({tasa}): cuenta como gasto en Canarias. Que compute para el incentivo canario lo decide el fiscalista, no un agente.', { tasa: v(d.impuesto.tasa / 100, 'pct0') }),
    acciones: [{ id: 'enviar', etiqueta: 'Preparar para el fiscalista', variante: 'primary', accion: { tipo: 'documento/revision', docId: d.id, rol: ROLES.fiscalista }, rol: null }],
    nota: 'En la demo no sale nada: el paquete queda preparado.',
  }
}

export const cumplimiento = {
  id: 'cumplimiento',
  titulo: 'Dossier fiscal e IGIC',
  ejemplos: ['¿Qué bloquea el dossier fiscal?', 'Revisa el IGIC de la factura F-2026-072', 'elegibilidad de los gastos', '¿cuándo vence el certificado cultural?'],

  planificar(m, det) {
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
        paso('excepciones', t('Asigna quién valida lo que falta'), { autonomia: 'aprueba', salida: el.territorio === 'canarias' ? t('Validación territorial: {rol}', { rol: v(ROLES.fiscalista) }) : t('Sin validación fiscal pendiente') }),
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
    const nota = aviso('info', 'El fiscalista revisa y firma', t('SetValio prepara la documentación y avisa de lo que bloquea. La validación fiscal es del asesor.'))

    if (det.eventoId === 'EV-03') {
      const dos = c.dossier(m)[0]
      return {
        bloques: [aviso('aviso', 'Vencimiento próximo', t('{doc} vence el {f}: quedan {dias}. Sin él no se puede aplicar la deducción.', { doc: v(dos.documento), f: v(dos.deadline, 'fecha'), dias: v(dos.dias, 'dias') })), bloqueDossier(m), nota],
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
            : t('{id} de {prov} todavía no es justificable: {faltan}.', { id: v(docId, 'id'), prov: v(d.proveedor), faltan: v(el.criterios.filter((x) => x.ok !== true).map((x) => x.detalle.toLowerCase()).join('; ')) }),
        ),
        bloqueDocumento(m, docId, { conciliacion: false, elegibilidad: true }),
      ]
      if (el.territorio === 'canarias') bloques.push(tarjetaFiscal(m, d))
      bloques.push(nota)
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
      return { id: d.id, documento: `${d.id} · ${d.proveedor}`, factura: get('factura'), pago: get('pago'), pedido: get('pedido'), capitulo: get('capitulo'), estado: el.estado === 'elegible' ? 'Elegible' : el.estado === 'condicionado' ? 'Condicionado' : 'Revisar' }
    })
    const dos = c.dossier(m)
    const prox = dos.reduce((a, x) => (x.dias < a.dias ? x : a), dos[0])
    const igic = docs.find((d) => d.impuesto?.tipo === 'IGIC' && !m.revisiones[d.id])
    const bloques = [
      texto(t('Hay {n} en el dossier. El más urgente: {doc}, que vence en {dias}.', { n: cuenta(dos.length, 'bloqueante', 'bloqueantes'), doc: v(prox.documento), dias: v(prox.dias, 'dias') })),
      bloqueDossier(m),
    ]
    if (filas.length) {
      bloques.push({
        tipo: 'tabla',
        titulo: 'Elegibilidad de la bandeja',
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
    if (igic) bloques.push(tarjetaFiscal(m, igic))
    bloques.push(nota)
    const sugerencias = []
    if (igic) sugerencias.push(sug(`Pide a ${igic.proveedor} la documentación que falta`))
    sugerencias.push(sug('¿Cuánto supondría llegar al 50 % de gasto en Canarias?'), sug('Prepárame el informe semanal de coste'))
    return { bloques, sugerencias, fuentes: ['Dossier fiscal', 'Bandeja de documentos', 'Criterios de elegibilidad'], reglas, noHecho }
  },
}

// ── Incentivo (exploratorio) ─────────────────────────────────────────────────

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
      { id: 'comun', escenario: 'Territorio común', deduccion: comun.deduccionNeta, efectivo: comun.efectivo, nota: '' },
      { id: 'can-actual', escenario: `Canarias con el gasto actual (${Math.round(pctActual * 100)} %)`, deduccion: canActual.deduccionNeta, efectivo: canActual.efectivo, nota: canActual.cumpleRequisito ? '' : `No cumple el requisito: ${canActual.requisitoLabel}` },
      { id: 'can-pedido', escenario: `Canarias con el ${Math.round(pctPedido * 100)} % del gasto`, deduccion: canPedido.deduccionNeta, efectivo: canPedido.efectivo, nota: canPedido.cumpleRequisito ? 'Cumple el requisito de gasto' : `No cumple el requisito: ${canPedido.requisitoLabel}` },
    ]
    if (otro && otro.pctGasto > 0) filas.unshift({ id: 'otro', escenario: `${otro.territorio} con el ${Math.round(otro.pctGasto * 100)} % del gasto`, deduccion: otro.deduccionNeta, efectivo: otro.efectivo, nota: otro.cumpleRequisito ? 'Cumple el requisito de gasto' : `No cumple el requisito: ${otro.requisitoLabel}` })
    if (ayuda) filas.push({ id: 'can-ayuda', escenario: `Lo anterior con la ${ayuda.fuente}`, deduccion: canAyuda.deduccionNeta, efectivo: canAyuda.efectivo, nota: canAyuda.topaIntensidad ? 'Recortada por el tope de intensidad' : 'La ayuda reduce la base' })

    const bloques = [
      aviso('exploratorio', 'Exploratorio', t('El simulador de incentivos se exploró como posible puerta de entrada; no forma parte del alcance decidido. Es una estimación orientativa y no sustituye el criterio del fiscalista.')),
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
          : t('Con el {pct} del gasto en Canarias no se cumple el requisito ({req}), así que aplican los tipos comunes: {d}. Con el {pp} serían {dp}.', {
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
      bloques.push(texto(t('Con la ayuda ({ayuda}), deducción y ayudas no pueden pasar del {cap} del coste ({tope}): la deducción se recorta a {d}.', { ayuda: v(ayuda.importe, 'eur'), cap: v(canAyuda.capPct, 'pct0'), tope: v(canAyuda.capIntensidad, 'eur'), d: v(canAyuda.deduccionNeta, 'eur') })))
    }
    if (plan) bloques.push(texto(t('El plan de financiación cuenta con {imp} de incentivo ({estado}). Conviene revisar esa cifra con el fiscalista.', { imp: v(plan.importe, 'eur'), estado: v(plan.estado.toLowerCase()) })))
    bloques.push({ tipo: 'enlace', etiqueta: 'Abrir el optimizador de incentivos', ruta: 'incentivos' })
    return {
      bloques,
      sugerencias: [sug('¿Qué bloquea el dossier fiscal?'), sug('Prepárame el informe semanal de coste')],
      fuentes: ['Motor de incentivos (reglas V2)', 'Reparto de gasto por territorio', 'Plan de financiación'],
      reglas: [t('Doble tramo sobre el primer millón y el resto; requisito de gasto mínimo por territorio'), t('Las subvenciones reducen la base; tope de intensidad de ayudas sobre el coste')],
      noHecho: [t('No ha cambiado el reparto de gasto ni el plan de financiación.'), t('No es una validación fiscal.')],
    }
  },
}

export { reducir }
