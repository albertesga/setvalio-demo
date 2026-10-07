// Lo que hacen los agentes después de una decisión de una persona.

import { t, v, c, paso, sug, texto, aviso, kpisProyecto, kpisPartida, bloqueCaja } from './comun.js'
import { cuenta } from '../texto.js'
import { optimizacion, totalesPropuesta, ALTERNATIVAS_POR_ID } from '../propuesta.js'
import { componerComparacion, kpisPropuesta, textoDiferencia } from './presupuesto.js'

function cambioCaja(antes, despues) {
  const a = c.tesoreria(antes)
  const d = c.tesoreria(despues)
  return a.semanas.some((s, i) => Math.abs(s.saldo - d.semanas[i].saldo) > 0.004)
}

export const accion = {
  id: 'accion',
  titulo: (det) =>
    ({
      'orden/aprobar': 'Compra aprobada',
      'orden/rechazar': 'Compra rechazada',
      'orden/escalar': 'Aprobación pedida',
      'documento/contabilizar': 'Gasto contabilizado',
      'documento/aplazar': 'Gasto en revisión',
      'documento/revision': 'Paquete para el fiscalista',
      'partida/ajustarCef': 'Previsión ajustada',
      'informe/aprobar': 'Informe aprobado',
      'borrador/marcarListo': 'Borrador revisado',
      'borrador/descartar': 'Borrador descartado',
      'propuesta/autorizarLlamadas': 'Llamadas a proveedores',
      'propuesta/noLlamar': 'Sin llamadas',
      'propuesta/elegir': 'Elección de proveedor',
      'propuesta/anadirLinea': 'Coste añadido a la propuesta',
    })[det.accion?.tipo] ?? 'Tras tu decisión',
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
          paso('prevision', t('Recalcula la partida'), { salida: (_, dd) => {
            const p = a.partida ?? d.partida
            // Contra el mundo del inicio del turno: el paso anterior ya contabilizó.
            const dif = dd.partidas[p].cef - m.partidas[p].cef
            return Math.abs(dif) > 0.004 ? t('Coste estimado final {d}', { d: v(dif, 'eurSigned') }) : t('Sin cambio en la previsión')
          } }),
          ...regInf,
        ]
      }
      case 'documento/aplazar':
        return [paso('excepciones', t('Deja {id} en la bandeja', { id: v(a.docId, 'id') }), { tipo: 'plan', acciones: [a], salida: t('Volverá a salir en el próximo informe') })]
      case 'documento/revision':
        return [paso('cumplimiento', t('Prepara el paquete para el fiscalista'), { tipo: 'redaccion', acciones: [a], salida: t('Factura, criterios y motivo; sin enviar') })]
      case 'partida/ajustarCef':
        return [paso('prevision', t('Ajusta la previsión de {p}', { p: v(a.codigo, 'id') }), { tipo: 'plan', acciones: [a], salida: t('Nuevo coste estimado final {cef}', { cef: v(a.cef, 'eur') }) }), ...regInf]
      case 'informe/aprobar':
        return [paso('informes', t('Marca el informe como aprobado'), { tipo: 'plan', acciones: [a], salida: t('Aprobación registrada') })]
      case 'propuesta/autorizarLlamadas': {
        const aLlamar = optimizacion(m).filter((x) => x.llamar)
        return [
          paso('excepciones', t('Registra tu permiso para llamar'), { tipo: 'plan', acciones: [a], salida: t('{n} autorizadas', { n: cuenta(aLlamar.length, 'llamada', 'llamadas') }) }),
          // Llama de dos en dos: cada llamada es independiente.
          ...aLlamar.map((x, i) =>
            paso('proveedores', t('Llama a {prov} por {c}', { prov: v(x.proveedor), c: v(x.lineaConcepto.toLowerCase()) }), {
              tipo: 'llamada',
              paralelo: i % 2 === 1,
              acciones: [{ tipo: 'propuesta/registrarLlamada', altId: x.id }],
              salida: (_, d) => {
                const r = d.propuesta.llamadas[x.id]
                return r.cumple ? t('Confirma {precio} y cumple los requisitos', { precio: v(r.precioFinal, 'eur') }) : t('No cumple: {motivo}', { motivo: v(r.motivo.toLowerCase().replace(/\.$/, '')) })
              },
            }),
          ),
          paso('proveedores', t('Compara los precios confirmados'), { autonomia: 'propone', salida: (_, d) => t('Una elección por cada coste con alternativa') }),
        ]
      }
      case 'propuesta/noLlamar':
        return [paso('excepciones', t('Registra que no se llama'), { tipo: 'plan', acciones: [a], salida: t('Nadie recibe llamadas') })]
      case 'propuesta/elegir': {
        const linea = m.propuesta.lineas.find((l) => l.id === a.lineaId)
        return [
          paso('presupuesto', a.altId ? t('Cambia {c} a {prov}', { c: v(linea.concepto.toLowerCase()), prov: v(ALTERNATIVAS_POR_ID[a.altId].proveedor) }) : t('Mantiene {prov} en {c}', { prov: v(linea.proveedor), c: v(linea.concepto.toLowerCase()) }), { tipo: 'plan', acciones: [a] }),
          paso('costes', t('Recalcula la propuesta'), { salida: (_, d) => t('Total {tot}', { tot: v(totalesPropuesta(d).total, 'eur') }) }),
        ]
      }
      case 'propuesta/anadirLinea':
        return [
          paso('presupuesto', t('Coloca «{c}» en {p}', { c: v(a.linea.concepto), p: v(a.linea.partida, 'id') }), { tipo: 'plan', acciones: [a], salida: t('{imp}', { imp: v(a.linea.importe, 'eur') }) }),
          paso('costes', t('Recalcula la propuesta'), { salida: (_, d) => t('Total {tot}', { tot: v(totalesPropuesta(d).total, 'eur') }) }),
        ]
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
        const parcial = o.importeAprobado !== undefined && o.importeAprobado < o.importe - 0.004
        const cambiaCap = Math.abs(capD.desviacionPct - capA.desviacionPct) > 0.00005
        bloques.push(
          texto(
            parcial
              ? t('{id} aprobada por {por} solo por {imp}, lo que la previsión ya tenía para {p}. Los {resto} restantes quedan sin aprobar: si hacen falta, tendrán que pedirse aparte. El coste estimado final no cambia: {cef}.', {
                  id: v(o.id, 'id'),
                  por: v(por),
                  imp: v(o.importeAprobado, 'eur'),
                  p: v(o.partida, 'id'),
                  resto: v(o.importe - o.importeAprobado, 'eur'),
                  cef: v(c.totales(despues).cef, 'eur'),
                })
              : cambiaCap
                ? t('{id} aprobada por {por}. {cap} pasa de {a} a {b} y el coste estimado final del proyecto queda en {cef}.', {
                    id: v(o.id, 'id'),
                    por: v(por),
                    cap: v(`${capD.id} ${capD.nombre}`),
                    a: v(capA.desviacionPct, 'pctSigned'),
                    b: v(capD.desviacionPct, 'pctSigned'),
                    cef: v(c.totales(despues).cef, 'eur'),
                  })
                : t('{id} aprobada por {por}. Cabía en lo previsto: {cap} se queda en {b} y el coste estimado final en {cef}.', {
                    id: v(o.id, 'id'),
                    por: v(por),
                    cap: v(`${capD.id} ${capD.nombre}`),
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
        bloques.push(texto(t('{id} queda pendiente de {rol}. En la demo no se notifica a nadie: cambia a esa persona en «Ver como» y decide en la misma tarjeta.', { id: v(a.ocId, 'id'), rol: v(a.a) })))
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
        bloques.push(aviso('info', 'No se ha enviado nada', t('Queda preparado, sin enviar. Hacérselo llegar al fiscalista lo decides tú.')))
        break
      case 'partida/ajustarCef':
        bloques.push(texto(t('Previsión de {p} ajustada por {por}.', { p: v(a.codigo, 'id'), por: v(por) })))
        bloques.push(kpisProyecto(despues, antes, { claves: ['cef', 'desviacion', 'disponible'] }))
        break
      case 'propuesta/autorizarLlamadas': {
        const comp = componerComparacion(despues)
        return { ...comp, sugerencias: comp.sugerencias.slice(0, 3) }
      }
      case 'propuesta/noLlamar':
        bloques.push(texto(t('No se llama a nadie. Tienes la lista de alternativas y tus requisitos para pedir presupuesto tú.')))
        sugerencias.push(sug('Optimiza los proveedores de la propuesta'))
        break
      case 'propuesta/elegir': {
        const linea = despues.propuesta.lineas.find((l) => l.id === a.lineaId)
        const tot = totalesPropuesta(despues)
        bloques.push(
          texto(
            a.altId
              ? t('{c}: {prov} por {imp}, elegido por {por}. La propuesta queda en {tot}, {dif}.', { c: v(linea.concepto), prov: v(linea.proveedor), imp: v(linea.importe, 'eur'), por: v(por), tot: v(tot.total, 'eur'), dif: textoDiferencia(tot) })
              : t('{c}: se mantiene {prov}. La propuesta sigue en {tot}, {dif}.', { c: v(linea.concepto), prov: v(linea.proveedor), tot: v(tot.total, 'eur'), dif: textoDiferencia(tot) }),
          ),
        )
        bloques.push(kpisPropuesta(despues, antes))
        const pendientes = Object.keys(despues.propuesta.llamadas).length && despues.propuesta.lineas.some((l) => !despues.propuesta.elecciones[l.id] && Object.values(despues.propuesta.llamadas).length && optimizacion(despues).some((o) => o.linea === l.id && o.resultado?.cumple))
        if (!pendientes) {
          bloques.push(texto(t('Ya has elegido en todos los costes con alternativa. Esta es la propuesta, edición {v}:', { v: v(despues.propuesta.version, 'num') })))
          bloques.push({ tipo: 'propuesta' })
        }
        sugerencias.push(sug('Añade 2 jornadas de dron con Dron Services Madrid por 3.200 €'))
        break
      }
      case 'propuesta/anadirLinea': {
        const tot = totalesPropuesta(despues)
        bloques.push(texto(t('Añadido «{c}» en {p}. La propuesta queda en {tot}, {dif}.', { c: v(a.linea.concepto), p: v(a.linea.partida, 'id'), tot: v(tot.total, 'eur'), dif: textoDiferencia(tot) })))
        bloques.push(kpisPropuesta(despues, antes))
        sugerencias.push(sug('Optimiza los proveedores de la propuesta'))
        break
      }
      case 'informe/aprobar':
        bloques.push(texto(t('Informe aprobado por {por}. En la demo no se descarga ni se envía: queda registrada la aprobación.', { por: v(por) })))
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
    if (!a.tipo.startsWith('propuesta/')) {
      sugerencias.push(sug('¿Cómo cerraremos el proyecto y llegamos con la caja?'))
      if (c.excepciones(despues).length) sugerencias.push(sug('¿Cómo vamos?'))
    }
    return {
      bloques,
      sugerencias: sugerencias.slice(0, 3),
      fuentes: ['Registro de decisiones'],
      reglas: [],
      noHecho: [t('No ha avisado a proveedores ni ha movido dinero.')],
    }
  },
}
