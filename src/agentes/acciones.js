// Reductor puro del mundo de los agentes.
//
// reducir(mundo, accion) nunca muta su entrada. Si la acción no procede (ya se
// aplicó, el documento no está en la bandeja…) devuelve el MISMO objeto: así es
// idempotente y la interfaz puede reintentar sin duplicar importes.

import { r2, pendiente, totales } from './calculos.js'
import { crearMundo } from './mundo.js'

function clonar(m) {
  return JSON.parse(JSON.stringify(m))
}

function confirmar(n, accion, ref, efectos = []) {
  n.version += 1
  n.historial.push({ version: n.version, tipo: accion.tipo, ref, por: accion.por ?? null, efectos })
  return n
}

/** Aplica un coste nuevo a una partida: consume el pendiente y el exceso sube el CEF. */
function aplicarCoste(n, codigo, importe, campo, efectos) {
  const p = n.partidas[codigo]
  const disponible = Math.max(0, pendiente(p))
  const consume = Math.min(importe, disponible)
  const exceso = r2(importe - consume)
  efectos.push({ ambito: 'partida', id: codigo, campo, antes: p[campo], despues: r2(p[campo] + importe) })
  p[campo] = r2(p[campo] + importe)
  if (exceso > 0) {
    efectos.push({ ambito: 'partida', id: codigo, campo: 'cef', antes: p.cef, despues: r2(p.cef + exceso) })
    p.cef = r2(p.cef + exceso)
  }
  return { consume, exceso }
}

export function reducir(m, accion) {
  switch (accion.tipo) {
    case 'evento/recibir': {
      if (!m.entrantes.includes(accion.eventoId)) return m
      const n = clonar(m)
      n.entrantes = n.entrantes.filter((e) => e !== accion.eventoId)
      if (accion.eventoId === 'EV-01') {
        n.documentos['F-2026-078'].estado = 'en_bandeja'
        n.documentos['F-2026-078'].recibida = n.corte.fecha
      }
      if (accion.eventoId === 'EV-02') n.ordenes['OC-104'].estado = 'Pendiente'
      if (accion.eventoId === 'EV-03') n.avisos.push({ id: 'DOS-01', tipo: 'vencimiento' })
      return confirmar(n, accion, { tipo: 'evento', id: accion.eventoId })
    }

    case 'documento/contabilizar': {
      const d0 = m.documentos[accion.docId]
      if (!d0 || d0.estado !== 'en_bandeja') return m
      const n = clonar(m)
      const d = n.documentos[accion.docId]
      const partida = accion.partida ?? d.partida
      if (!n.partidas[partida]) return m
      const efectos = []
      let resto = d.base
      const o = d.oc ? n.ordenes[d.oc] : null
      if (o && (o.estado === 'Aprobada' || o.estado === 'Facturada')) {
        const abierto = r2(o.importe - o.facturado)
        const mov = Math.min(resto, Math.max(0, abierto))
        if (mov > 0) {
          const po = n.partidas[o.partida]
          efectos.push({ ambito: 'partida', id: o.partida, campo: 'comprometido', antes: po.comprometido, despues: r2(po.comprometido - mov) })
          po.comprometido = r2(po.comprometido - mov)
          const pd = n.partidas[partida]
          efectos.push({ ambito: 'partida', id: partida, campo: 'gastado', antes: pd.gastado, despues: r2(pd.gastado + mov) })
          pd.gastado = r2(pd.gastado + mov)
          o.facturado = r2(o.facturado + mov)
          if (o.facturado >= o.importe - 0.004) o.estado = 'Facturada'
          resto = r2(resto - mov)
        }
      }
      if (resto > 0) aplicarCoste(n, partida, resto, 'gastado', efectos)
      d.partida = partida
      d.capitulo = partida.slice(0, 2)
      d.estado = 'contabilizada'
      d.contabilizadaPor = accion.por ?? null
      return confirmar(n, accion, { tipo: 'documento', id: d.id }, efectos)
    }

    case 'documento/aplazar': {
      const d0 = m.documentos[accion.docId]
      if (!d0 || d0.estado !== 'en_bandeja' || d0.aplazado) return m
      const n = clonar(m)
      n.documentos[accion.docId].aplazado = true
      return confirmar(n, accion, { tipo: 'documento', id: accion.docId })
    }

    case 'documento/revision': {
      if (m.revisiones[accion.docId]) return m
      const n = clonar(m)
      n.revisiones[accion.docId] = { rol: accion.rol ?? 'Fiscalista', estado: 'solicitada', por: accion.por ?? null }
      return confirmar(n, accion, { tipo: 'revision', id: accion.docId })
    }

    case 'orden/aprobar': {
      const o0 = m.ordenes[accion.ocId]
      if (!o0 || o0.estado !== 'Pendiente') return m
      const n = clonar(m)
      const o = n.ordenes[accion.ocId]
      const importe = accion.importe ?? o.importe
      const efectos = []
      const { exceso } = aplicarCoste(n, o.partida, importe, 'comprometido', efectos)
      if (exceso > 0 && o.semanaPago) {
        n.tesoreria.ajustes.push({ semana: o.semanaPago, pagos: exceso, origen: o.id })
        efectos.push({ ambito: 'caja', id: o.semanaPago, campo: 'pagos', antes: 0, despues: exceso })
      }
      o.estado = 'Aprobada'
      o.importeAprobado = importe
      delete o.escaladaA
      return confirmar(n, accion, { tipo: 'orden', id: o.id }, efectos)
    }

    case 'orden/rechazar': {
      const o0 = m.ordenes[accion.ocId]
      if (!o0 || o0.estado !== 'Pendiente') return m
      const n = clonar(m)
      n.ordenes[accion.ocId].estado = 'Rechazada'
      delete n.ordenes[accion.ocId].escaladaA
      return confirmar(n, accion, { tipo: 'orden', id: accion.ocId })
    }

    case 'orden/escalar': {
      const o0 = m.ordenes[accion.ocId]
      if (!o0 || o0.estado !== 'Pendiente' || o0.escaladaA === accion.a) return m
      const n = clonar(m)
      n.ordenes[accion.ocId].escaladaA = accion.a
      return confirmar(n, accion, { tipo: 'orden', id: accion.ocId })
    }

    case 'partida/ajustarCef': {
      const p0 = m.partidas[accion.codigo]
      if (!p0 || m.ajustesCef[accion.codigo] || Math.abs(p0.cef - accion.cef) < 0.004) return m
      const n = clonar(m)
      const p = n.partidas[accion.codigo]
      const efectos = [{ ambito: 'partida', id: p.codigo, campo: 'cef', antes: p.cef, despues: accion.cef }]
      n.ajustesCef[p.codigo] = { antes: p.cef, despues: accion.cef, por: accion.por ?? null }
      p.cef = accion.cef
      return confirmar(n, accion, { tipo: 'cef', id: p.codigo }, efectos)
    }

    case 'informe/generar': {
      const n = clonar(m)
      const id = accion.periodoId ?? n.periodo.id
      const previo = n.informes[id]
      n.informes[id] = { id, periodo: n.periodo, estado: 'borrador', edicion: (previo?.edicion ?? 0) + 1, totales: totales(n) }
      return confirmar(n, accion, { tipo: 'informe', id })
    }

    case 'informe/aprobar': {
      const inf = m.informes[accion.informeId]
      if (!inf || inf.estado === 'aprobado') return m
      const n = clonar(m)
      n.informes[accion.informeId].estado = 'aprobado'
      n.informes[accion.informeId].aprobadoPor = accion.por ?? null
      return confirmar(n, accion, { tipo: 'informe', id: accion.informeId })
    }

    case 'borrador/crear': {
      if (m.borradores[accion.borrador.id]) return m
      const n = clonar(m)
      n.borradores[accion.borrador.id] = { ...accion.borrador, estado: 'borrador' }
      return confirmar(n, accion, { tipo: 'borrador', id: accion.borrador.id })
    }

    case 'borrador/marcarListo': {
      const b = m.borradores[accion.id]
      if (!b || b.estado !== 'borrador') return m
      const n = clonar(m)
      n.borradores[accion.id].estado = 'listo'
      n.borradores[accion.id].listoPor = accion.por ?? null
      return confirmar(n, accion, { tipo: 'borrador', id: accion.id })
    }

    case 'borrador/descartar': {
      const b = m.borradores[accion.id]
      if (!b || b.estado !== 'borrador') return m
      const n = clonar(m)
      n.borradores[accion.id].estado = 'descartado'
      return confirmar(n, accion, { tipo: 'borrador', id: accion.id })
    }

    case 'mundo/reiniciar':
      return crearMundo()

    default:
      return m
  }
}

export function reducirVarias(m, acciones = []) {
  return acciones.reduce((acc, a) => reducir(acc, a), m)
}
