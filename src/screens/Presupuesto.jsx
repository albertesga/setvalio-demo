import { actualizarPresupuestoCapitulo, actualizarPresupuestoTotal, totalPresupuestoCapitulos } from '../lib/proyectos.js'
import { eur, pct } from '../lib/format.js'
import { Card, PageHeader, Th, Td, Button } from '../components/ui.jsx'
import { IconChevronRight, IconDownload } from '../components/icons.jsx'

const inputCls =
  'fp-input px-3.5 py-2 text-sm font-semibold'

export default function Presupuesto({ proyecto, onActualizarProyecto, pushToast, onNavigate }) {
  const capitulos = proyecto?.presupuestoCapitulos ?? []
  const total = totalPresupuestoCapitulos(capitulos)
  const diasRodaje = proyecto?.diasRodaje || 30
  const costeDia = diasRodaje ? total / diasRodaje : 0

  const cambiarTotal = (importe) => {
    onActualizarProyecto?.((p) => actualizarPresupuestoTotal(p, importe))
  }

  const cambiarCapitulo = (id, importe) => {
    onActualizarProyecto?.((p) => actualizarPresupuestoCapitulo(p, id, importe))
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Presupuesto ICAA"
        subtitle="Edita los capítulos; retorno y costes se actualizan con el total."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate?.('coste')}>Ver impacto en costes</Button>
            <Button variant="secondary" icon={IconDownload} onClick={() => pushToast?.('Exportando presupuesto… (demo)')}>
              Exportar presupuesto
            </Button>
          </>
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Presupuesto total</span>
            <input
              type="number"
              min={0}
              step={50000}
              value={total}
              onChange={(e) => cambiarTotal(Math.max(0, Number(e.target.value) || 0))}
              className={`${inputCls} tnum w-full min-w-[220px] text-right font-semibold sm:w-64`}
            />
          </label>
          <div className="text-sm text-muted sm:text-right">
            <div>{capitulos.length} capítulos ICAA</div>
            <div className="tnum mt-1 font-semibold text-ink">{eur(costeDia)} por día · {diasRodaje} días</div>
          </div>
        </div>
      </Card>

      <Card className="mt-3 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Capítulo</Th>
                <Th align="right">Presupuesto</Th>
                <Th align="right">% s/total</Th>
                <Th align="right">Decisión</Th>
              </tr>
            </thead>
            <tbody>
              {capitulos.map((c) => {
                const peso = total ? c.importe / total : 0
                return (
                  <tr key={c.id} className="border-t border-line transition hover:bg-surface">
                    <Td>
                      <span className="inline-flex items-center gap-2.5">
                        <span className="tnum text-2xs font-semibold text-faint">{c.id}</span>
                        <span className="font-medium text-ink">{c.nombre}</span>
                      </span>
                    </Td>
                    <Td align="right" tabular>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={c.importe}
                        onChange={(e) => cambiarCapitulo(c.id, Math.max(0, Number(e.target.value) || 0))}
                        className={`${inputCls} tnum w-36 text-right font-semibold`}
                        aria-label={`Presupuesto del capítulo ${c.id} ${c.nombre}`}
                      />
                    </Td>
                    <Td align="right" tabular className="text-muted">{pct(peso)}</Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={IconChevronRight}
                        onClick={() => onNavigate?.('coste', { capituloId: c.id })}
                      >
                        Ver impacto
                      </Button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/10 bg-surface font-semibold">
                <Td className="text-ink">Total presupuesto</Td>
                <Td align="right" tabular className="text-ink">{eur(total)}</Td>
                <Td align="right" tabular className="text-muted">100,0 %</Td>
                <Td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
