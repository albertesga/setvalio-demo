import { useState } from 'react'
import { PROVEEDORES, nombreCapitulo, PROYECTO_DEMO_ID } from '../lib/data.js'
import { eur } from '../lib/format.js'
import { Card, KPI, Chip, PageHeader, Th, Td, ProgressBar, EmptyState } from '../components/ui.jsx'
import { IconSearch, IconProveedores } from '../components/icons.jsx'

const TONO_ESTADO = (estado) => {
  if (estado.includes('validar')) return 'warning'
  if (estado.includes('Canarias')) return 'primary'
  return 'positive'
}

export default function Proveedores({ proyecto }) {
  const [busqueda, setBusqueda] = useState('')
  const sinDatos = proyecto && proyecto.id !== PROYECTO_DEMO_ID

  const contratadoTotal = PROVEEDORES.reduce((a, p) => a + p.contratado, 0)
  const facturadoTotal = PROVEEDORES.reduce((a, p) => a + p.facturado, 0)

  const filas = PROVEEDORES.filter((p) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return p.nombre.toLowerCase().includes(q) || p.cif.toLowerCase().includes(q)
  })

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader title="Proveedores" />

      {sinDatos ? (
        <EmptyState
          icon={IconProveedores}
          title="Aún sin proveedores para este proyecto"
        >
          Los proveedores aparecerán aquí cuando se registren órdenes o facturas.
        </EmptyState>
      ) : (
        <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KPI label="Proveedores activos" value={PROVEEDORES.length} sub="Con contrato o pedido" />
        <KPI label="Importe contratado" value={eur(contratadoTotal)} sub="Compromisos en firme" />
        <KPI label="Facturado a fecha" value={eur(facturadoTotal)} sub={`${eur(contratadoTotal - facturadoTotal)} pendiente`} />
        <KPI label="Avance de facturación" value={`${Math.round((facturadoTotal / contratadoTotal) * 100)} %`} footer={<ProgressBar value={facturadoTotal / contratadoTotal} tone="primary" />} />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <div className="relative">
          <IconSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar proveedor o CIF…"
            className="fp-input w-60 py-1.5 pl-8 pr-3 text-sm font-semibold placeholder:text-faint"
          />
        </div>
      </div>

      <Card className="mt-2 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Proveedor</Th>
                <Th className="hidden md:table-cell">Capítulo</Th>
                <Th align="right">Contratado</Th>
                <Th align="right">Facturado</Th>
                <Th align="right" className="hidden sm:table-cell">Pendiente</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.cif} className="border-t border-line transition hover:bg-surface">
                  <Td>
                    <div className="font-medium text-ink">{p.nombre}</div>
                    <div className="text-2xs text-faint">{p.cif}</div>
                  </Td>
                  <Td className="hidden text-xs text-muted md:table-cell">{nombreCapitulo(p.capitulo)}</Td>
                  <Td align="right" tabular className="text-muted">{eur(p.contratado)}</Td>
                  <Td align="right" tabular className="font-semibold text-ink">{eur(p.facturado)}</Td>
                  <Td align="right" tabular className="hidden text-muted sm:table-cell">{eur(p.contratado - p.facturado)}</Td>
                  <Td><Chip tone={TONO_ESTADO(p.estado)} dot>{p.estado}</Chip></Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/10 bg-surface font-semibold">
                <Td className="text-ink">Total</Td>
                <Td className="hidden md:table-cell" />
                <Td align="right" tabular className="text-ink">{eur(contratadoTotal)}</Td>
                <Td align="right" tabular className="text-ink">{eur(facturadoTotal)}</Td>
                <Td align="right" tabular className="hidden text-muted sm:table-cell">{eur(contratadoTotal - facturadoTotal)}</Td>
                <Td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
        </>
      )}
    </div>
  )
}
