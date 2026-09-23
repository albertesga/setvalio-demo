import { useMemo, useState } from 'react'
import { eur, eurCents } from '../lib/format.js'
import { Card, Chip, EmptyState, KPI, PageHeader, ProgressBar, SectionTitle, Button, Th, Td } from '../components/ui.jsx'
import { PROYECTO_DEMO_ID } from '../lib/data.js'
import { IconAlert, IconCheck, IconCheckCircle, IconSearch, IconTrash } from '../components/icons.jsx'

const TIPO_DEDUCCION = 0.2708

const GASTOS_BASE = [
  gasto('ef-001', 'Catering Estela S.L.', '07 Viajes, hoteles y comidas', 4380, 'Elegible', 4380, 'Factura-e + pago trazado', 'Ninguno'),
  gasto('ef-002', 'Camera Rental Madrid', '06 Maquinaria de rodaje y transportes', 9250, 'Elegible', 9250, 'Factura-e + contrato alquiler', 'Ninguno'),
  gasto('ef-003', 'Gasolinera Repsol', '06 Maquinaria de rodaje y transportes', 78.4, 'Elegible', 78.4, 'Ticket OCR + parte vehículo', 'Ninguno'),
  gasto('ef-004', 'Ferretería El Tornillo', '04 Escenografía', 154.2, 'Revisar', 0, 'OCR confianza 71 %', 'Confirmar partida y pago'),
  gasto('ef-005', 'Hotel NH (8 noches)', '07 Viajes, hoteles y comidas', 1120, 'Parcial', 980, 'Parte móvil + factura pendiente', 'Separar extras no deducibles'),
  gasto('ef-006', 'Eléctricos Prado', '03 Equipo técnico', 3120, 'Elegible', 3120, 'Factura-e + orden aprobada', 'Ninguno'),
  gasto('ef-007', 'Vestuario Luna', '04 Escenografía', 2280, 'Elegible', 2280, 'Factura-e estructurada', 'Ninguno'),
  gasto('ef-008', 'Taxi Producción Madrid', '07 Viajes, hoteles y comidas', 42.8, 'No elegible', 0, 'Email sin factura completa', 'Solicitar factura o excluir'),
  gasto('ef-009', 'Dron Services Madrid', '06 Maquinaria de rodaje y transportes', 14200, 'No elegible', 0, 'Orden rechazada', 'No comprometer'),
  gasto('ef-010', 'Sonido Directo Ruiz', '03 Equipo técnico', 1950, 'Revisar', 0, 'Factura-e sin contrato asociado', 'Vincular contrato de servicio'),
]

function gasto(id, proveedor, capitulo, importe, elegibilidad, baseFiscal, evidencia, pendiente) {
  return { id, proveedor, capitulo, importe, elegibilidad, baseFiscal, evidencia, pendiente }
}

function formatImporte(n) {
  return Number.isInteger(n) ? eur(n) : eurCents(n)
}

function estadoTone(estado) {
  if (estado === 'Elegible') return 'positive'
  if (estado === 'Parcial') return 'warning'
  if (estado === 'Revisar') return 'primary'
  if (estado === 'No elegible') return 'negative'
  return 'neutral'
}

function accionPrincipal(estado) {
  if (estado === 'Elegible') return 'Validado'
  if (estado === 'No elegible') return 'Excluido'
  if (estado === 'Parcial') return 'Validar parcial'
  return 'Validar'
}

function capituloId(gasto) {
  return gasto.capitulo.slice(0, 2)
}

function normalizarGastoId(id) {
  return id ? id.replace(/^g-/, 'ef-') : null
}

export default function Elegibilidad({ proyecto, pushToast, onNavigate, contexto }) {
  const sinDatos = proyecto && proyecto.id !== PROYECTO_DEMO_ID
  const [gastos, setGastos] = useState(GASTOS_BASE)
  const capituloActivoId = contexto?.capituloId
  const gastoActivoId = normalizarGastoId(contexto?.gastoId)
  const gastosCapitulo = capituloActivoId ? gastos.filter((g) => capituloId(g) === capituloActivoId) : []

  const resumen = useMemo(() => {
    const baseFiscal = gastos.reduce((a, g) => a + g.baseFiscal, 0)
    const total = gastos.reduce((a, g) => a + g.importe, 0)
    const revisar = gastos.filter((g) => g.elegibilidad === 'Revisar' || g.elegibilidad === 'Parcial').length
    const noElegible = gastos.reduce((a, g) => a + (g.elegibilidad === 'No elegible' ? g.importe : Math.max(0, g.importe - g.baseFiscal)), 0)
    return { baseFiscal, total, revisar, noElegible, recuperacion: baseFiscal * TIPO_DEDUCCION }
  }, [gastos])

  const validar = (id) => {
    setGastos((prev) => prev.map((g) => (g.id === id ? { ...g, elegibilidad: 'Elegible', baseFiscal: g.importe, pendiente: 'Ninguno' } : g)))
    pushToast?.('Gasto validado como elegible para base fiscal.')
  }

  const excluir = (id) => {
    setGastos((prev) => prev.map((g) => (g.id === id ? { ...g, elegibilidad: 'No elegible', baseFiscal: 0, pendiente: 'Excluido de base' } : g)))
    pushToast?.('Gasto excluido de la base fiscal.')
  }

  const capitulos = useMemo(() => {
    const map = new Map()
    gastos.forEach((g) => {
      const actual = map.get(g.capitulo) || { capitulo: g.capitulo, base: 0, total: 0 }
      actual.base += g.baseFiscal
      actual.total += g.importe
      map.set(g.capitulo, actual)
    })
    return [...map.values()].sort((a, b) => b.base - a.base)
  }, [gastos])

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Elegibilidad fiscal"
        subtitle="Revisa qué gastos suman a la base deducible."
        actions={
          capituloActivoId && (
            <Button variant="secondary" onClick={() => onNavigate?.('facturas', { capituloId: capituloActivoId, gastoId: contexto?.gastoId })}>
              Volver al gasto
            </Button>
          )
        }
      />

      {sinDatos ? (
        <EmptyState icon={IconSearch} title="Aún sin gastos para revisar fiscalmente">
          Cuando entren facturas y órdenes de compra, SetValio propondrá elegibilidad fiscal por capítulo.
        </EmptyState>
      ) : (
        <>
          {capituloActivoId && (
            <Card className="mb-3 border-[var(--accent)] bg-[var(--accent-soft)]/45 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-2xs font-bold uppercase tracking-wide text-[color:var(--accent)]">Capítulo conectado</div>
                  <div className="mt-0.5 text-sm font-bold text-ink">Capítulo {capituloActivoId} · {gastosCapitulo.length} gastos revisados fiscalmente</div>
                  <p className="mt-1 text-xs text-muted">La misma partida se puede seguir desde coste, órdenes, factura y dossier.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onNavigate?.('coste', { capituloId: capituloActivoId })}>Ver coste</Button>
                  <Button size="sm" variant="secondary" onClick={() => onNavigate?.('facturas', { capituloId: capituloActivoId, gastoId: contexto?.gastoId })}>Ver gasto</Button>
                  <Button size="sm" variant="accent" onClick={() => onNavigate?.('documental', { capituloId: capituloActivoId })}>Ver dossier</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KPI label="Base fiscal defendible" value={eur(resumen.baseFiscal)} sub="Suma a deducción" tone="text-positive" />
            <KPI label="Deducción estimada" value={eur(resumen.recuperacion)} sub="Tipo de demo: 27,08 %" tone="text-positive" />
            <KPI label="Gasto excluido" value={eur(resumen.noElegible)} sub="No suma a base" tone="text-negative" />
            <KPI label="Por revisar" value={resumen.revisar} sub="Requieren evidencia" tone={resumen.revisar ? 'text-warning' : 'text-positive'} />
          </div>
          <p className="mt-2 text-xs text-muted">Estimación orientativa. No sustituye el criterio de tu asesor fiscal.</p>

          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <SectionTitle>Gastos revisados</SectionTitle>
              <span className="tnum text-xs text-muted">{gastos.length} gastos · {eur(resumen.total)}</span>
            </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <Th>Gasto</Th>
                      <Th>Capítulo</Th>
                      <Th align="right">Importe</Th>
                      <Th>Elegibilidad</Th>
                      <Th align="right">Base fiscal</Th>
                      <Th>Evidencia / pendiente</Th>
                      <Th align="right">Acción</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((g) => {
                      const activo = g.id === gastoActivoId || (capituloActivoId && capituloId(g) === capituloActivoId)
                      return (
                      <tr key={g.id} className={`border-t border-line ${activo ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]' : g.elegibilidad === 'Revisar' ? 'bg-warning-soft/35' : g.elegibilidad === 'No elegible' ? 'bg-negative-soft/30' : 'hover:bg-surface'}`}>
                        <Td>
                          <div className="font-semibold text-ink">{g.proveedor}</div>
                          <div className="text-2xs text-faint">{g.id}</div>
                        </Td>
                        <Td className="text-muted">{g.capitulo}</Td>
                        <Td align="right" tabular className="font-semibold text-ink">{formatImporte(g.importe)}</Td>
                        <Td><Chip tone={estadoTone(g.elegibilidad)} dot>{g.elegibilidad}</Chip></Td>
                        <Td align="right" tabular className={g.baseFiscal ? 'font-semibold text-positive' : 'text-faint'}>{formatImporte(g.baseFiscal)}</Td>
                        <Td>
                          <div className="text-xs text-muted">{g.evidencia}</div>
                          {g.pendiente !== 'Ninguno' && (
                            <div className="mt-1 inline-flex items-center gap-1 text-2xs font-semibold text-warning">
                              <IconAlert size={12} /> {g.pendiente}
                            </div>
                          )}
                        </Td>
                        <Td align="right">
                          {g.elegibilidad === 'Elegible' ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-bold text-positive"><IconCheck size={12} /> Validado</span>
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="secondary" icon={IconCheck} onClick={() => validar(g.id)}>{accionPrincipal(g.elegibilidad)}</Button>
                              <Button size="sm" variant="ghost" icon={IconTrash} onClick={() => excluir(g.id)}>Excluir</Button>
                              <Button size="sm" variant="ghost" onClick={() => onNavigate?.('documental', { capituloId: capituloId(g), gastoId: g.id })}>Dossier</Button>
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

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <SectionTitle>Base fiscal por capítulo</SectionTitle>
                <div className="space-y-3">
                  {capitulos.map((c) => (
                    <div key={c.capitulo}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-ink">{c.capitulo}</span>
                        <span className="tnum text-xs font-semibold text-muted">{eur(c.base)}</span>
                      </div>
                      <ProgressBar value={c.total ? c.base / c.total : 0} tone={c.base === c.total ? 'positive' : 'warning'} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <SectionTitle>Criterios de validación</SectionTitle>
                <ul className="space-y-2.5">
                  {[
                    ['Factura válida', 'Factura-e XML o PDF verificado.'],
                    ['Pago trazado', 'Justificante o movimiento bancario asociado.'],
                    ['Contrato/OC', 'Servicios relevantes vinculados a contrato u orden aprobada.'],
                    ['Capítulo ICAA', 'Partida fiscalmente coherente con el gasto.'],
                  ].map(([title, text]) => (
                    <li key={title} className="flex items-start gap-2.5">
                      <IconCheckCircle size={16} className="mt-0.5 shrink-0 text-positive" />
                      <span>
                        <span className="block text-xs font-bold text-ink">{title}</span>
                        <span className="block text-2xs text-muted">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

          </div>
        </>
      )}
    </div>
  )
}
