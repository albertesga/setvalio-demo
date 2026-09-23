import { Button, Card, Chip, EmptyState, KPI, PageHeader, SectionTitle, Td, Th } from '../components/ui.jsx'
import { eur, millonesRango, pct } from '../lib/format.js'
import { IconBookmark, IconCheckCircle, IconIncentivos, IconTrash } from '../components/icons.jsx'

const RISK_TONE = {
  Bajo: 'positive',
  Medio: 'warning',
  Alto: 'negative',
}

const STATE_TONE = {
  Recomendado: 'primary',
  Validado: 'positive',
  Borrador: 'neutral',
}

function fechaCorta(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

function ayudaLabel(escenario) {
  if (escenario.subvencionTotal > 0) return eur(escenario.subvencionTotal)
  if (escenario.ayudaHasta > 0) return `hasta ${eur(escenario.ayudaHasta)}`
  return 'Sin ayudas'
}

export default function Escenarios({ proyecto, onActualizarProyecto, pushToast, onNavigate }) {
  const escenarios = proyecto?.escenariosGuardados ?? []
  const mejor = escenarios.reduce((acc, e) => (!acc || (e.retornoNeto ?? e.bandaHi ?? 0) > (acc.retornoNeto ?? acc.bandaHi ?? 0) ? e : acc), null)
  const recomendados = escenarios.filter((e) => e.estado === 'Recomendado').length
  const ultimo = escenarios[0]

  const marcarRecomendado = (id) => {
    onActualizarProyecto?.((p) => ({
      ...p,
      escenariosGuardados: (p.escenariosGuardados ?? []).map((e) => ({
        ...e,
        estado: e.id === id ? 'Recomendado' : e.estado === 'Recomendado' ? 'Borrador' : e.estado,
      })),
    }))
    pushToast?.('Escenario marcado como recomendado.')
  }

  const eliminar = (id) => {
    onActualizarProyecto?.((p) => ({
      ...p,
      escenariosGuardados: (p.escenariosGuardados ?? []).filter((e) => e.id !== id),
    }))
    pushToast?.('Escenario eliminado.')
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Escenarios guardados"
        actions={
          <Button variant="accent" icon={IconIncentivos} onClick={() => onNavigate?.('incentivos')}>
            Nuevo escenario
          </Button>
        }
      />

      {escenarios.length === 0 ? (
        <EmptyState
          icon={IconBookmark}
          title="Aún no hay escenarios guardados"
          action={
            <Button variant="primary" icon={IconIncentivos} onClick={() => onNavigate?.('incentivos')}>
              Ir al optimizador
            </Button>
          }
          nota="Guarda el escenario activo desde el optimizador para comparar territorios, deducción estimada, ayudas y riesgo fiscal."
        >
          Calcula un escenario de incentivos y guárdalo para dejar trazabilidad de la decisión financiera.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPI label="Escenarios" value={escenarios.length} sub={`${recomendados} recomendado${recomendados === 1 ? '' : 's'}`} />
            <KPI label="Mejor retorno" value={eur(mejor?.retornoNeto ?? mejor?.bandaHi)} sub={mejor?.territorio} tone="text-positive" />
            <KPI label="Menor riesgo" value={escenarios.some((e) => e.riesgo === 'Bajo') ? 'Bajo' : 'Medio'} sub="Según requisito territorial y topes" />
            <KPI label="Último guardado" value={fechaCorta(ultimo?.creadoEn)} sub={ultimo?.nombre} />
          </div>

          {mejor && (
            <Card className="mb-4 border-[var(--accent)] bg-[var(--accent-soft)]/55 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <SectionTitle
                    right={
                      <Chip tone={STATE_TONE[mejor.estado] || 'neutral'} dot>
                        {mejor.estado}
                      </Chip>
                    }
                  >
                    Mejor escenario por retorno neto
                  </SectionTitle>
                  <p className="text-sm font-bold text-ink">{mejor.nombre}</p>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">{mejor.nota}</p>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <div className="tnum font-display text-2xl font-bold text-ink">{eur(mejor.retornoNeto ?? mejor.bandaHi)}</div>
                  <div className="tnum text-xs font-semibold text-[color:var(--accent)]">
                    {millonesRango(mejor.bandaLo, mejor.bandaHi)} · {pct(mejor.efectivo, 2)}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 px-5 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-ink">Comparativa de escenarios</h2>
                <p className="text-2xs text-faint">Snapshots en memoria del proyecto activo. No hay persistencia fuera de esta sesión.</p>
              </div>
              <Chip tone="primary" dot>
                Números tabulares
              </Chip>
            </div>
            <div className="mt-3 overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>Escenario</Th>
                    <Th>Territorio</Th>
                    <Th align="right">Presupuesto</Th>
                    <Th align="right">Deducción</Th>
                    <Th align="right">Ayudas</Th>
                    <Th align="right">Retorno neto</Th>
                    <Th>Riesgo</Th>
                    <Th>Estado</Th>
                    <Th align="right">Acción</Th>
                  </tr>
                </thead>
                <tbody>
                  {escenarios.map((e) => (
                    <tr key={e.id} className={`border-t border-line ${e.estado === 'Recomendado' ? 'bg-[var(--accent-soft)]/45' : 'hover:bg-surface/70'}`}>
                      <Td>
                        <div className="font-semibold text-ink">{e.nombre}</div>
                        <div className="text-2xs text-faint">{fechaCorta(e.creadoEn)} · {e.tipologia}</div>
                      </Td>
                      <Td className="text-muted">{e.territorio}</Td>
                      <Td align="right" tabular>{eur(e.presupuesto)}</Td>
                      <Td align="right" tabular className="font-semibold text-ink">{eur(e.deduccion)}</Td>
                      <Td align="right" tabular>{ayudaLabel(e)}</Td>
                      <Td align="right" tabular className="font-bold text-positive">{eur(e.retornoNeto ?? e.bandaHi)}</Td>
                      <Td>
                        <Chip tone={RISK_TONE[e.riesgo] || 'neutral'} dot>
                          {e.riesgo}
                        </Chip>
                      </Td>
                      <Td>
                        <Chip tone={STATE_TONE[e.estado] || 'neutral'} dot={e.estado === 'Recomendado'}>
                          {e.estado}
                        </Chip>
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" icon={IconCheckCircle} onClick={() => marcarRecomendado(e.id)} disabled={e.estado === 'Recomendado'}>
                            Recomendar
                          </Button>
                          <Button size="sm" variant="ghost" icon={IconTrash} onClick={() => eliminar(e.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
