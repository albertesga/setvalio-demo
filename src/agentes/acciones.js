// Reductor puro del mundo de los agentes.
//
// reducir(mundo, accion) nunca muta su entrada. Si la acción no procede (ya se
// aplicó, el documento no está en la bandeja…) devuelve el MISMO objeto: así es
// idempotente y la interfaz puede reintentar sin duplicar importes.

import { r2, pendiente, totales, desviaciones, excepciones, dossier, tesoreria, informeDesactualizado } from './calculos.js'
import { crearMundo } from './mundo.js'
import { ALTERNATIVAS_POR_ID, resultadoLlamada } from './propuesta.js'
import { riesgosAltos, riesgo as riesgoDe, jornadaOriginal } from './rodaje.js'

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
      // Riesgos: todo lo que cambia una novedad vive aquí, para que deshacer lo conserve.
      if (accion.eventoId === 'EV-CITACION') n.rodaje.senales.citacion.alerta = true
      if (accion.eventoId === 'EV-LLUVIA') n.rodaje.meteo['2026-06-03'] = 0.9
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
        const abierto = r2((o.importeAprobado ?? o.importe) - o.facturado)
        const mov = Math.min(resto, Math.max(0, abierto))
        if (mov > 0) {
          const po = n.partidas[o.partida]
          efectos.push({ ambito: 'partida', id: o.partida, campo: 'comprometido', antes: po.comprometido, despues: r2(po.comprometido - mov) })
          po.comprometido = r2(po.comprometido - mov)
          const pd = n.partidas[partida]
          efectos.push({ ambito: 'partida', id: partida, campo: 'gastado', antes: pd.gastado, despues: r2(pd.gastado + mov) })
          pd.gastado = r2(pd.gastado + mov)
          o.facturado = r2(o.facturado + mov)
          if (o.facturado >= (o.importeAprobado ?? o.importe) - 0.004) o.estado = 'Facturada'
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
      const id0 = accion.periodoId ?? m.periodo.id
      // Si ya hay un informe y las cifras no han cambiado, no se regenera (ni se pierde su aprobación).
      if (m.informes[id0] && !informeDesactualizado(m, id0)) return m
      const n = clonar(m)
      const id = id0
      const previo = n.informes[id]
      const des = desviaciones(n)
      const ex = excepciones(n)
      const dos = dossier(n)
      const tes = tesoreria(n)
      n.informes[id] = {
        id,
        periodo: n.periodo,
        estado: 'borrador',
        edicion: (previo?.edicion ?? 0) + 1,
        sustituyeAprobada: previo?.estado === 'aprobado',
        totales: totales(n),
        resumen: {
          sobrecostes: des.resumen.sobrecostes,
          ahorros: des.resumen.ahorros,
          capitulos: des.items.slice(0, 4).map((c) => ({ id: c.id, nombre: c.nombre, desviacion: c.desviacion, desviacionPct: c.desviacionPct, fueraRango: c.fueraRango })),
          decisiones: ex.length,
          conAprobacion: ex.filter((e) => e.nivel === 'aprueba').length,
          vencimiento: dos.reduce((a, d) => (d.dias < a.dias ? d : a), dos[0]),
          cajaMinima: { semana: tes.minimo.semana, fechas: tes.minimo.fechas, saldo: tes.minimo.saldo },
          reservas: totales(n).reservas,
          riesgosAltos: riesgosAltos(n).map((r) => ({ id: r.id, titulo: r.titulo, jornadas: r.jornadas })),
        },
      }
      return confirmar(n, accion, { tipo: 'informe', id })
    }

    case 'informe/aprobar': {
      const inf = m.informes[accion.informeId]
      if (!inf || inf.estado === 'aprobado' || informeDesactualizado(m, accion.informeId)) return m
      const n = clonar(m)
      n.informes[accion.informeId].estado = 'aprobado'
      n.informes[accion.informeId].aprobadoPor = accion.por ?? null
      return confirmar(n, accion, { tipo: 'informe', id: accion.informeId })
    }

    case 'borrador/crear': {
      // Un borrador descartado se puede volver a preparar; uno vigente no se duplica.
      const previo = m.borradores[accion.borrador.id]
      if (previo && previo.estado !== 'descartado') return m
      const n = clonar(m)
      n.borradores[accion.borrador.id] = { ...accion.borrador, estado: 'borrador' }
      return confirmar(n, accion, { tipo: 'borrador', id: accion.borrador.id })
    }

    case 'borrador/editar': {
      const b = m.borradores[accion.id]
      if (!b || b.estado !== 'borrador') return m
      if (b.textoAsunto === accion.asunto && b.textoCuerpo === accion.cuerpo) return m
      const n = clonar(m)
      n.borradores[accion.id].textoAsunto = accion.asunto
      n.borradores[accion.id].textoCuerpo = accion.cuerpo
      // Editar no es una decisión: no sube la versión ni entra en el historial.
      return n
    }

    case 'borrador/marcarListo': {
      const b = m.borradores[accion.id]
      if (!b || b.estado !== 'borrador') return m
      const n = clonar(m)
      if (accion.asunto !== undefined) n.borradores[accion.id].textoAsunto = accion.asunto
      if (accion.cuerpo !== undefined) n.borradores[accion.id].textoCuerpo = accion.cuerpo
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

    // ── Riesgos de producción ─────────────────────────────────────────────
    case 'riesgo/mitigar': {
      // Se puede cambiar el plan sin decisión previa, con una reserva aprobada o tras asumir el riesgo.
      const d0 = m.decisionesRiesgo[accion.riesgoId]
      if (d0?.estado === 'mitigado') return m
      const n = clonar(m)
      const efectos = []
      if (accion.riesgoId === 'RG-1') {
        // Intercambia el contenido de las dos jornadas; cada una conserva su número y su fecha.
        const { jornada: ja, intercambio: jb } = n.rodaje.senales.lluvia
        const a = n.rodaje.jornadas.find((j) => j.n === ja)
        const b = n.rodaje.jornadas.find((j) => j.n === jb)
        if (a.localizacion !== jornadaOriginal(ja).localizacion) return m
        for (const c of ['localizacion', 'tipo', 'franja', 'roles', 'nota']) [a[c], b[c]] = [b[c], a[c]]
        efectos.push({ ambito: 'plan', id: `J${ja}`, campo: 'localizacion', antes: b.localizacion, despues: a.localizacion })
        // El riesgo desaparece: se libera la reserva si la había.
        if (n.reservas[accion.riesgoId]) {
          efectos.push({ ambito: 'reserva', id: accion.riesgoId, campo: 'importe', antes: n.reservas[accion.riesgoId].importe, despues: 0 })
          delete n.reservas[accion.riesgoId]
        }
      } else if (accion.riesgoId === 'RG-5') {
        // Replanificar reduce las horas extra, no las elimina: una reserva aprobada se mantiene.
        for (const j of n.rodaje.jornadas.filter((x) => n.rodaje.senales.noches.jornadas.includes(x.n))) {
          j.franja = 'Tarde-noche'
          j.nota = 'Citación más tardía para reducir horas extra'
        }
        efectos.push({ ambito: 'plan', id: 'noches', campo: 'franja', antes: 'Noche', despues: 'Tarde-noche' })
      } else return m
      n.decisionesRiesgo[accion.riesgoId] = { estado: 'mitigado', opcion: accion.opcion ?? null, por: accion.por ?? null, reservaMantenida: n.reservas[accion.riesgoId]?.importe ?? null }
      return confirmar(n, accion, { tipo: 'riesgo', id: accion.riesgoId }, efectos)
    }

    case 'riesgo/reservar': {
      const d0 = m.decisionesRiesgo[accion.riesgoId]
      const vigente = riesgoDe(m, accion.riesgoId)?.reserva
      // Solo se reserva la cifra vigente: una tarjeta caducada no puede volver a un importe antiguo.
      if (!(accion.importe > 0) || vigente == null || Math.abs(vigente - accion.importe) > 0.5) return m
      if (d0 && !(d0.estado === 'reservado' && Math.abs(d0.importe - accion.importe) > 0.5)) return m
      const n = clonar(m)
      const antes = n.reservas[accion.riesgoId]?.importe ?? 0
      n.reservas[accion.riesgoId] = { importe: accion.importe, por: accion.por ?? null }
      n.decisionesRiesgo[accion.riesgoId] = { estado: 'reservado', importe: accion.importe, por: accion.por ?? null }
      return confirmar(n, accion, { tipo: 'riesgo', id: accion.riesgoId }, [{ ambito: 'reserva', id: accion.riesgoId, campo: 'importe', antes, despues: accion.importe }])
    }

    case 'riesgo/aceptar': {
      const d0 = m.decisionesRiesgo[accion.riesgoId]
      if (d0 && d0.estado !== 'reservado') return m
      const n = clonar(m)
      const efectos = []
      // Asumir con una reserva aprobada la libera.
      if (n.reservas[accion.riesgoId]) {
        efectos.push({ ambito: 'reserva', id: accion.riesgoId, campo: 'importe', antes: n.reservas[accion.riesgoId].importe, despues: 0 })
        delete n.reservas[accion.riesgoId]
      }
      n.decisionesRiesgo[accion.riesgoId] = { estado: 'aceptado', por: accion.por ?? null }
      return confirmar(n, accion, { tipo: 'riesgo', id: accion.riesgoId }, efectos)
    }

    // ── Propuesta de presupuesto ──────────────────────────────────────────
    case 'propuesta/anadirLinea': {
      const l = accion.linea
      if (!l || !l.concepto || !(l.importe > 0) || !m.partidas[l.partida]) return m
      const n = clonar(m)
      const p = n.propuesta
      const id = `L${p.lineas.length + 1}`
      const cap = l.partida.slice(0, 2)
      const efectos = [{ ambito: 'propuesta', id, campo: 'importe', antes: 0, despues: r2(l.importe) }]
      p.lineas.push({ id, partida: l.partida, concepto: l.concepto, detalle: l.detalle ?? '', proveedor: l.proveedor || 'Sin proveedor', importe: r2(l.importe), origen: 'Añadido por ti', requisitos: [] })
      if (accion.sustituyeEstimado) {
        const quita = Math.min(l.importe, p.porDetallar[cap] ?? 0)
        efectos.push({ ambito: 'propuesta', id: cap, campo: 'porDetallar', antes: p.porDetallar[cap], despues: r2(p.porDetallar[cap] - quita) })
        p.porDetallar[cap] = r2((p.porDetallar[cap] ?? 0) - quita)
      }
      return confirmar(n, accion, { tipo: 'linea', id }, efectos)
    }

    case 'propuesta/prepararLlamadas': {
      if (m.propuesta.autorizacion) return m
      const n = clonar(m)
      n.propuesta.autorizacion = 'pendiente'
      return confirmar(n, accion, { tipo: 'llamadas', id: 'R1' })
    }

    case 'propuesta/autorizarLlamadas': {
      if (m.propuesta.autorizacion !== 'pendiente') return m
      const n = clonar(m)
      n.propuesta.autorizacion = 'autorizada'
      n.propuesta.autorizadaPor = accion.por ?? null
      return confirmar(n, accion, { tipo: 'llamadas', id: 'R1' })
    }

    case 'propuesta/noLlamar': {
      if (m.propuesta.autorizacion !== 'pendiente') return m
      const n = clonar(m)
      n.propuesta.autorizacion = 'rechazada'
      return confirmar(n, accion, { tipo: 'llamadas', id: 'R1' })
    }

    case 'propuesta/registrarLlamada': {
      const a = ALTERNATIVAS_POR_ID[accion.altId]
      if (!a?.llamada || m.propuesta.autorizacion !== 'autorizada' || m.propuesta.llamadas[a.id]) return m
      const n = clonar(m)
      n.propuesta.llamadas[a.id] = resultadoLlamada(a.id)
      return confirmar(n, accion, { tipo: 'llamada', id: a.id })
    }

    case 'propuesta/elegir': {
      const p0 = m.propuesta
      const linea0 = p0.lineas.find((l) => l.id === accion.lineaId)
      if (!linea0 || p0.elecciones[accion.lineaId]) return m
      const a = accion.altId ? ALTERNATIVAS_POR_ID[accion.altId] : null
      if (a && (!p0.llamadas[a.id]?.cumple || a.linea !== accion.lineaId)) return m
      const n = clonar(m)
      const linea = n.propuesta.lineas.find((l) => l.id === accion.lineaId)
      const efectos = []
      if (a) {
        const precio = n.propuesta.llamadas[a.id].precioFinal
        efectos.push({ ambito: 'propuesta', id: linea.id, campo: 'importe', antes: linea.importe, despues: precio })
        linea.anterior = { proveedor: linea.proveedor, importe: linea.importe }
        linea.proveedor = a.proveedor
        linea.importe = precio
        linea.origen = 'Confirmado por teléfono'
      }
      n.propuesta.elecciones[accion.lineaId] = { altId: a?.id ?? null, por: accion.por ?? null }
      if (a) n.propuesta.version += 1
      return confirmar(n, accion, { tipo: 'eleccion', id: accion.lineaId }, efectos)
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
