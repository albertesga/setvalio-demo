import { useMemo, useState } from 'react'
import { eur } from '../lib/format.js'
import { Card, Chip, EmptyState, KPI, PageHeader, Button, Th, Td } from '../components/ui.jsx'
import { PROYECTO_DEMO_ID } from '../lib/data.js'
import { IconAlert, IconCheck, IconChevronRight, IconPresupuesto, IconTrash } from '../components/icons.jsx'

const ORDENES_BASE = [
  {
    id: 'OC-104',
    proveedor: 'Hotel NH',
    concepto: 'Ampliación alojamiento exteriores',
    capitulo: '07 Viajes, hoteles y comidas',
    importe: 18_400,
    solicitante: 'Producción',
    aprobador: 'Line producer',
    fecha: '12/06',
    estado: 'Pendiente',
    impactoPct: 0.094,
    impacto: 'Cap. 07 quedaría +9,4 % sobre presupuesto',
    motivo: 'Supera umbral interno de desviación del 8 %.',
    alerta: true,
  },
  {
    id: 'OC-105',
    proveedor: 'Camera Rental Madrid',
    concepto: 'Ópticas adicionales semana 4',
    capitulo: '06 Maquinaria de rodaje y transportes',
    importe: 12_600,
    solicitante: 'Dirección de fotografía',
    aprobador: 'Line producer',
    fecha: '12/06',
    estado: 'Pendiente',
    impactoPct: 0.032,
    impacto: 'Dentro de margen del capítulo',
    motivo: 'Aprobación estándar por importe superior a 10.000 €.',
  },
  {
    id: 'OC-106',
    proveedor: 'Eléctricos Prado',
    concepto: 'Horas extra acumuladas noche',
    capitulo: '03 Equipo técnico',
    importe: 9_800,
    solicitante: 'Jefe de producción',
    aprobador: 'Producción ejecutiva',
    fecha: '11/06',
    estado: 'Pendiente',
    impactoPct: 0.086,
    impacto: 'Cap. 03 queda por encima del umbral',
    motivo: 'Requiere visto bueno por acumulación de horas extra.',
    alerta: true,
  },
  {
    id: 'OC-107',
    proveedor: 'Atrezzo Norte',
    concepto: 'Reposición decoración escena teatro',
    capitulo: '04 Escenografía',
    importe: 4_750,
    solicitante: 'Arte',
    aprobador: 'Line producer',
    fecha: '11/06',
    estado: 'Aprobada',
    impactoPct: 0.018,
    impacto: 'Dentro de presupuesto',
    motivo: 'Material necesario para continuidad.',
  },
  {
    id: 'OC-108',
    proveedor: 'Dron Services Madrid',
    concepto: 'Plano aéreo no previsto',
    capitulo: '06 Maquinaria de rodaje y transportes',
    importe: 14_200,
    solicitante: 'Dirección',
    aprobador: 'Producción ejecutiva',
    fecha: '10/06',
    estado: 'Rechazada',
    impactoPct: 0.079,
    impacto: 'Ahorro por no comprometer gasto',
    motivo: 'No imprescindible para montaje. Se sustituye por recurso de archivo.',
  },
  {
    id: 'OC-109',
    proveedor: 'Catering Estela S.L.',
    concepto: 'Refuerzo catering jornada 16',
    capitulo: '07 Viajes, hoteles y comidas',
    importe: 3_900,
    solicitante: 'Producción',
    aprobador: 'Jefe de producción',
    fecha: '10/06',
    estado: 'Aprobada',
    impactoPct: 0.026,
    impacto: 'Dentro de presupuesto',
    motivo: 'Jornada extendida autorizada.',
  },
]

function estadoTone(estado) {
  if (estado === 'Aprobada') return 'positive'
  if (estado === 'Rechazada') return 'negative'
  if (estado === 'Pendiente') return 'warning'
  return 'neutral'
}

function impactoTone(orden) {
  if (orden.estado === 'Rechazada') return 'positive'
  if (orden.alerta) return 'negative'
  return 'neutral'
}

function capituloId(orden) {
  return orden.capitulo.slice(0, 2)
}

export default function Compras({ proyecto, pushToast, onNavigate, contexto }) {
  const sinDatos = proyecto && proyecto.id !== PROYECTO_DEMO_ID
  const [ordenes, setOrdenes] = useState(ORDENES_BASE)
  const capituloActivoId = contexto?.capituloId
  const ordenesCapitulo = capituloActivoId ? ordenes.filter((o) => capituloId(o) === capituloActivoId) : []

  const resumen = useMemo(() => {
    const pendientes = ordenes.filter((o) => o.estado === 'Pendiente')
    const aprobadas = ordenes.filter((o) => o.estado === 'Aprobada')
    const rechazadas = ordenes.filter((o) => o.estado === 'Rechazada')
    const alertasPendientes = pendientes.filter((o) => o.alerta)
    return {
      pendientes: pendientes.length,
      pendienteImporte: pendientes.reduce((a, o) => a + o.importe, 0),
      aprobado: aprobadas.reduce((a, o) => a + o.importe, 0),
      riesgoEvitado: rechazadas.reduce((a, o) => a + o.importe, 0),
      alertas: alertasPendientes.length,
      alertasPendientes,
    }
  }, [ordenes])

  const cambiarEstado = (id, estado) => {
    setOrdenes((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)))
    const orden = ordenes.find((o) => o.id === id)
    const accion = estado === 'Aprobada' ? 'aprobada' : estado === 'Rechazada' ? 'rechazada' : 'reabierta'
    pushToast?.(`${orden?.id} ${accion}.`)
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Órdenes de compra"
        subtitle="Aprueba el gasto antes de comprometerlo."
        actions={
          capituloActivoId && (
            <Button variant="secondary" onClick={() => onNavigate?.('coste', { capituloId: capituloActivoId })}>
              Volver al coste
            </Button>
          )
        }
      />

      {sinDatos ? (
        <EmptyState icon={IconPresupuesto} title="Aún sin órdenes de compra para este proyecto">
          Crea solicitudes de compra para controlar compromisos antes de que lleguen facturas.
        </EmptyState>
      ) : (
        <>
          {capituloActivoId && (
            <Card className="mb-3 border-[var(--accent)] bg-[var(--accent-soft)]/45 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-2xs font-bold uppercase tracking-wide text-[color:var(--accent)]">Capítulo conectado</div>
                  <div className="mt-0.5 text-sm font-bold text-ink">Capítulo {capituloActivoId} · {ordenesCapitulo.length} órdenes relacionadas</div>
                  <p className="mt-1 text-xs text-muted">Decide ahora qué se aprueba para que no llegue como sobrecoste cerrado.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onNavigate?.('facturas', { capituloId: capituloActivoId })}>Ver gastos</Button>
                  <Button size="sm" variant="accent" onClick={() => onNavigate?.('elegibilidad', { capituloId: capituloActivoId })}>Ver elegibilidad</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KPI label="Solicitudes pendientes" value={resumen.pendientes} sub={eur(resumen.pendienteImporte)} />
            <KPI label="Aprobado" value={eur(resumen.aprobado)} sub="Compromiso autorizado" tone="text-positive" />
            <KPI label="Riesgo evitado" value={eur(resumen.riesgoEvitado)} sub="Gasto rechazado antes de factura" tone="text-positive" />
            <KPI label="Alertas" value={resumen.alertas} sub="Sobre umbral del 8 %" tone={resumen.alertas ? 'text-negative' : 'text-positive'} />
          </div>

          <Card className="mt-4 border-warning/25 bg-warning-soft/50 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                <IconAlert size={18} />
              </span>
              <div>
                <div className="font-display text-sm font-bold text-ink">
                  {resumen.alertas
                    ? `${resumen.alertas} ${resumen.alertas === 1 ? 'solicitud requiere' : 'solicitudes requieren'} decisión antes de comprometer gasto`
                    : 'No hay solicitudes por encima del umbral'}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-warning">
                  {resumen.alertas
                    ? `${resumen.alertasPendientes.map((o) => `${o.proveedor}: ${o.impacto}`).join(' · ')}. Revisa antes de aprobar.`
                    : 'Las órdenes pendientes están dentro de margen.'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="mt-4 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <h2 className="text-sm font-semibold text-ink">Solicitudes</h2>
              <p className="text-xs text-muted">Solo lo aprobado pasa a coste comprometido.</p>
            </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[940px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <Th>Orden</Th>
                      <Th>Proveedor / concepto</Th>
                      <Th>Capítulo</Th>
                      <Th align="right">Importe</Th>
                      <Th>Impacto</Th>
                      <Th>Estado</Th>
                      <Th align="right">Acción</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenes.map((o) => {
                      const activo = capituloActivoId && capituloId(o) === capituloActivoId
                      return (
                      <tr key={o.id} className={`border-t border-line ${activo ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]' : o.alerta && o.estado === 'Pendiente' ? 'bg-warning-soft/40' : 'hover:bg-surface'}`}>
                        <Td>
                          <div className="tnum font-bold text-ink">{o.id}</div>
                          <div className="text-2xs text-faint">{o.fecha} · {o.solicitante}</div>
                        </Td>
                        <Td>
                          <div className="font-semibold text-ink">{o.proveedor}</div>
                          <div className="text-2xs text-muted">{o.concepto}</div>
                        </Td>
                        <Td className="text-muted">{o.capitulo}</Td>
                        <Td align="right" tabular className="font-semibold text-ink">{eur(o.importe)}</Td>
                        <Td>
                          <Chip tone={impactoTone(o)} dot>{o.impacto}</Chip>
                          <div className="mt-1 text-2xs text-faint">{o.motivo}</div>
                        </Td>
                        <Td><Chip tone={estadoTone(o.estado)} dot>{o.estado}</Chip></Td>
                        <Td align="right">
                          {o.estado === 'Pendiente' ? (
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="secondary" icon={IconCheck} onClick={() => cambiarEstado(o.id, 'Aprobada')}>Aprobar</Button>
                              <Button size="sm" variant="ghost" icon={IconTrash} onClick={() => cambiarEstado(o.id, 'Rechazada')}>Rechazar</Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => cambiarEstado(o.id, 'Pendiente')}>Reabrir</Button>
                              <Button size="sm" variant="ghost" icon={IconChevronRight} onClick={() => onNavigate?.('facturas', { capituloId: capituloId(o) })}>Ver gastos</Button>
                            </div>
                          )}
                        </Td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
          </Card>
        </>
      )}
    </div>
  )
}
