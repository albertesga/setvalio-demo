// Lo que hacen los agentes después de una decisión de una persona.

import { t, v, c, paso, sug, texto, aviso, kpisProyecto, kpisPartida, bloqueCaja } from './comun.js'

function cambioCaja(antes, despues) {
  const a = c.tesoreria(antes)
  const d = c.tesoreria(despues)
  return a.semanas.some((s, i) => Math.abs(s.saldo - d.semanas[i].saldo) > 0.004)
}

export const accion = {
  id: 'accion',
  titulo: 'Decisión',
  ejemplos: [],

  planificar(m, det) {
    const a = det.accion
    const regInf = m.informes[m.periodo.id] ? [paso('informes', t('Comprueba si el informe sigue al día'), { paralelo: true, salida: (_, d) => (c.informeDesactualizado(d, d.periodo.id) ? t('Hay que regenerarlo: han cambiado las cifras') : t('Sigue al día')) })] : []
    switch (a.tipo) {
      case 'orden/aprobar': {
        const o = m.ordenes[a.ocId]
        return [
          paso('excepciones', t('Registra la aprobación de {id}', { id: v(a.ocId, 'id') }), { tipo: 'plan', acciones: [a], salida: t('{imp} comprometidos en {p}', { imp: v(a.importe ?? o.importe, 'eur'), p: v(o.partida, 'id') }) }),
          paso('prevision', t('Recalcula el cierre y la caja'), { salida: (antes, d) => t('Coste estimado final {cef}', { cef: v(c.totales(d).cef, 'eur') }) }),
          ...regInf,
        ]
      }
      case 'orden/rechazar':
        return [paso('excepciones', t('Registra el rechazo de {id}', { id: v(a.ocId, 'id') }), { tipo: 'plan', acciones: [a], salida: t('No se compromete el gasto') })]
      case 'orden/escalar':
        return [paso('excepciones', t('Lleva {id} a {rol}', { id: v(a.ocId, 'id'), rol: v(a.a) }), { tipo: 'plan', acciones: [a], salida: t('En espera de su decisión') })]
      case 'documento/contabilizar': {
        const d = m.documentos[a.docId]
        return [
          paso('facturas', t('Registra la partida {p}', { p: v(a.partida ?? d.partida, 'id') }), { tipo: 'plan', acciones: [a], salida: t('{id} contabilizado', { id: v(a.docId, 'id') }) }),
          paso('prevision', t('Recalcula la partida'), { salida: (antes, dd) => {
            const p = a.partida ?? d.partida
            const dif = dd.partidas[p].cef - antes.partidas[p].cef
            return Math.abs(dif) > 0.004 ? t('Coste estimado final {d}', { d: v(dif, 'eurSigned') }) : t('Sin cambio en la previsión')
          } }),
          ...regInf,
        ]
      }
      case 'documento/aplazar':
        return [paso('excepciones', t('Deja {id} en la bandeja', { id: v(a.docId, 'id') }), { tipo: 'plan', acciones: [a], salida: t('Volverá a salir en el próximo informe') })]
      case 'documento/revision':
        return [paso('cumplimiento', t('Prepara el paquete para el fiscalista'), { tipo: 'redaccion', acciones: [a], salida: t('Factura, criterios y motivo de la revisión') })]
      case 'partida/ajustarCef':
        return [paso('prevision', t('Ajusta la previsión de {p}', { p: v(a.codigo, 'id') }), { tipo: 'plan', acciones: [a], salida: t('Nuevo coste estimado final {cef}', { cef: v(a.cef, 'eur') }) }), ...regInf]
      case 'informe/aprobar':
        return [paso('informes', t('Marca el informe como aprobado'), { tipo: 'plan', acciones: [a], salida: t('Listo para compartir') })]
      case 'borrador/marcarListo':
      case 'borrador/descartar':
        return [paso('orquestador', a.tipo === 'borrador/marcarListo' ? t('Marca el borrador como revisado') : t('Descarta el borrador'), { tipo: 'plan', acciones: [a], salida: t('Sin envío') })]
      default:
        return [paso('orquestador', t('Registra la decisión'), { tipo: 'plan', acciones: [a] })]
    }
  },

  componer({ antes, despues, det }) {
    const a = det.accion
    const por = a.por ?? 'la persona responsable'
    const bloques = []
    const sugerencias = []
    if (despues === antes) {
      return { bloques: [texto(t('Esa decisión ya estaba tomada. No cambia nada.'))], sugerencias: [sug('¿Cómo vamos?')], fuentes: [], reglas: [], noHecho: [t('No ha repetido la acción.')] }
    }
    switch (a.tipo) {
      case 'orden/aprobar': {
        const o = despues.ordenes[a.ocId]
        const capA = c.capitulo(antes, o.capitulo)
        const capD = c.capitulo(despues, o.capitulo)
        bloques.push(
          texto(
            t('{id} aprobada por {por}. {cap} pasa de {a} a {b} y el coste estimado final del proyecto queda en {cef}.', {
              id: v(o.id, 'id'),
              por: v(por),
              cap: v(`${capD.id} ${capD.nombre}`),
              a: v(capA.desviacionPct, 'pctSigned'),
              b: v(capD.desviacionPct, 'pctSigned'),
              cef: v(c.totales(despues).cef, 'eur'),
            }),
          ),
        )
        bloques.push(kpisProyecto(despues, antes, { claves: ['comprometido', 'cef', 'desviacion'] }))
        if (cambioCaja(antes, despues)) bloques.push(bloqueCaja(despues, antes))
        if (capD.fueraRango) sugerencias.push(sug(`Explica la desviación del capítulo ${capD.id}`))
        break
      }
      case 'orden/rechazar': {
        const o = despues.ordenes[a.ocId]
        bloques.push(texto(t('{id} rechazada por {por}. No se comprometen {imp} y el coste estimado final no cambia.', { id: v(o.id, 'id'), por: v(por), imp: v(o.importe, 'eur') })))
        break
      }
      case 'orden/escalar':
        bloques.push(texto(t('{id} queda a la espera de {rol}. En la demo no se notifica a nadie; puedes cambiar a esa persona en «Ver como» y decidir.', { id: v(a.ocId, 'id'), rol: v(a.a) })))
        break
      case 'documento/contabilizar': {
        const d = despues.documentos[a.docId]
        bloques.push(texto(t('{id} contabilizado en {p} por decisión de {por}.', { id: v(d.id, 'id'), p: v(`${d.partida} ${despues.partidas[d.partida].nombre}`), por: v(por) })))
        bloques.push(kpisPartida(antes, despues, d.partida))
        if (d.tipo === 'ticket') sugerencias.push(sug(`Pide a ${d.proveedor} la factura completa`))
        break
      }
      case 'documento/aplazar':
        bloques.push(texto(t('Queda en la bandeja sin contabilizar. Saldrá otra vez en el próximo informe.')))
        break
      case 'documento/revision':
        bloques.push(texto(t('Paquete preparado para el fiscalista: la factura, los criterios de elegibilidad y el motivo de la revisión.')))
        bloques.push(aviso('info', 'No se ha enviado nada', t('En la demo se marca como enviado. En producción lo enviarías tú desde aquí, con confirmación.')))
        break
      case 'partida/ajustarCef':
        bloques.push(texto(t('Previsión de {p} ajustada por {por}.', { p: v(a.codigo, 'id'), por: v(por) })))
        bloques.push(kpisProyecto(despues, antes, { claves: ['cef', 'desviacion', 'disponible'] }))
        break
      case 'informe/aprobar':
        bloques.push(texto(t('Informe aprobado por {por}. Queda listo para descargar y compartir; en la demo no se envía.', { por: v(por) })))
        break
      case 'borrador/marcarListo':
        bloques.push(texto(t('Borrador revisado. No se ha enviado: en producción el envío también lo confirmas tú.')))
        break
      case 'borrador/descartar':
        bloques.push(texto(t('Borrador descartado.')))
        break
      default:
        bloques.push(texto(t('Decisión registrada.')))
    }
    if (despues.informes[despues.periodo.id] && c.informeDesactualizado(despues, despues.periodo.id)) {
      bloques.push(aviso('aviso', 'Informe desactualizado', t('Las cifras han cambiado desde que se redactó el informe de esta semana.')))
      sugerencias.unshift(sug('Regenera el informe semanal de coste'))
    }
    sugerencias.push(sug('¿Cómo cerraremos el proyecto y llegamos con la caja?'))
    if (c.excepciones(despues).length) sugerencias.push(sug('¿Cómo vamos?'))
    return {
      bloques,
      sugerencias: sugerencias.slice(0, 3),
      fuentes: ['Registro de decisiones'],
      reglas: [],
      noHecho: [t('No ha avisado a proveedores ni ha movido dinero.')],
    }
  },
}
