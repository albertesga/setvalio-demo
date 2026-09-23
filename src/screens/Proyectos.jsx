import { Children, cloneElement, isValidElement, useId, useState } from 'react'
import { Card, Chip, PageHeader, SectionTitle, Th, Td, Button, Modal } from '../components/ui.jsx'
import { IconChevronRight, IconSparkle, IconAlert } from '../components/icons.jsx'
import { eur } from '../lib/format.js'
import {
  TIPOLOGIAS,
  CANALES,
  ESTADOS,
  IDIOMAS,
  TERRITORIOS_PY,
  aplicaV2,
  capaD3,
  esSerie,
  etiquetaTipologia,
  etiquetaEstado,
  etiquetaCapa,
  toneEstado,
  actualizarPresupuestoTotal,
  proyectoVacio,
} from '../lib/proyectos.js'

const PAISES = ['Francia', 'Italia', 'Portugal', 'Alemania', 'Bélgica', 'Argentina', 'México', 'Chile', 'Colombia']
const TONE_CAPA = { ligera: 'neutral', media: 'primary', pesada: 'warning', recurrente: 'neutral' }

const inputCls =
  'fp-input w-full px-3.5 py-2 text-sm font-semibold placeholder:text-faint'

export default function Proyectos({ proyectos, proyectoActivoId, onAbrir, onGuardar, pushToast }) {
  const [editando, setEditando] = useState(null)

  const guardar = (p) => {
    onGuardar(p)
    setEditando(null)
    pushToast(p.id ? 'Proyecto actualizado.' : 'Proyecto creado.')
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Proyectos"
        actions={
          <Button variant="primary" onClick={() => setEditando(proyectoVacio())}>
            Nuevo proyecto
          </Button>
        }
      />

      {proyectos.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="mx-auto max-w-md text-sm text-muted">
            Aún no tienes proyectos. Crea el primero para optimizar incentivos y controlar el gasto.
          </p>
          <div className="mt-4">
            <Button variant="primary" onClick={() => setEditando(proyectoVacio())}>
              Nuevo proyecto
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr>
                  <Th>Título</Th>
                  <Th>Tipología</Th>
                  <Th>Estado</Th>
                  <Th align="right">Presupuesto</Th>
                  <Th>Tax credit</Th>
                  <Th>Control</Th>
                  <Th align="right">Acción</Th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map((p) => {
                  const activo = p.id === proyectoActivoId
                  const capa = capaD3(p)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onAbrir(p.id)}
                      className="cursor-pointer border-t border-line transition hover:bg-surface/70"
                    >
                      <Td>
                        <div className="flex items-center gap-2 font-bold text-ink">
                          {p.titulo}
                          {activo && <Chip tone="primary">Activo</Chip>}
                        </div>
                        <div className="text-2xs text-faint">{p.productora}</div>
                      </Td>
                      <Td><Chip tone="neutral">{etiquetaTipologia(p.tipologia)}</Chip></Td>
                      <Td><Chip tone={toneEstado(p.estado)} dot>{etiquetaEstado(p.estado)}</Chip></Td>
                      <Td align="right" tabular className="font-semibold text-ink">{eur(p.presupuesto)}</Td>
                      <Td>
                        {aplicaV2(p) ? (
                          <Chip tone="positive" dot>Tax credit · aplica</Chip>
                        ) : (
                          <Chip tone="neutral">Tax credit · no aplica</Chip>
                        )}
                      </Td>
                      <Td><Chip tone={TONE_CAPA[capa]}>{etiquetaCapa(capa)}</Chip></Td>
                      <Td align="right">
                        <Button
                          variant="ghost"
                          className="py-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAbrir(p.id)
                          }}
                        >
                          Abrir <IconChevronRight size={14} />
                        </Button>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editando && (
        <ProyectoForm
          key={editando.id ?? 'nuevo'}
          inicial={editando}
          onClose={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}
    </div>
  )
}

// ── Primitivos de formulario ────────────────────────────────────────────────
function Field({ label, children, hint, className = '' }) {
  const id = useId()
  const labelId = `${id}-label`
  // Asocia la etiqueta visible con el primer control hijo para darle nombre accesible.
  let asignado = false
  const kids = Children.map(children, (child) => {
    if (asignado || !isValidElement(child)) return child
    asignado = true
    return cloneElement(child, {
      id,
      'aria-labelledby': [labelId, child.props['aria-labelledby']].filter(Boolean).join(' '),
    })
  })
  return (
    <div className={className}>
      <label id={labelId} htmlFor={id} className="mb-1.5 block text-2xs font-semibold uppercase tracking-wide text-faint">{label}</label>
      {kids}
      {hint && <p className="mt-1 text-2xs text-faint">{hint}</p>}
    </div>
  )
}

function Switch({ checked, onChange, className = '', ...rest }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`inline-flex items-center gap-2.5 py-1.5 ${className}`} {...rest}>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-[var(--accent)]' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span className="text-sm font-medium text-ink">{checked ? 'Sí' : 'No'}</span>
    </button>
  )
}

function ChipMulti({ options, selected, onToggle, ...rest }) {
  return (
    <div role="group" className="flex flex-wrap gap-1.5" {...rest}>
      {options.map((o) => {
        const on = selected.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]' : 'border-line bg-canvas text-muted hover:bg-surface'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <SectionTitle>{titulo}</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

// ── Alta / edición ────────────────────────────────────────────────────────────
function ProyectoForm({ inicial, onClose, onGuardar }) {
  const [p, setP] = useState(inicial)
  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }))
  const setPct = (id, v) => setP((prev) => ({ ...prev, pctGastoTerritorio: { ...prev.pctGastoTerritorio, [id]: v } }))
  const toggleArr = (k, id) =>
    setP((prev) => ({ ...prev, [k]: prev[k].includes(id) ? prev[k].filter((x) => x !== id) : [...prev[k], id] }))

  const serie = esSerie(p)
  const valido = p.titulo.trim() && p.presupuesto > 0
  const programaTv = p.tipologia === 'programa_tv'

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      title={inicial.id ? 'Editar proyecto' : 'Nuevo proyecto'}
      subtitle="Solo te pedimos lo que mueve los cálculos. Podrás completar el resto más tarde."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valido} onClick={() => onGuardar(p)}>Guardar proyecto</Button>
        </>
      }
    >
      {/* Banner contextual por tipología */}
      <div
        className={`mb-4 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs ${
          programaTv ? 'border-warning/30 bg-warning-soft text-warning' : 'border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]'
        }`}
      >
        {programaTv ? <IconAlert size={16} className="mt-0.5 shrink-0" /> : <IconSparkle size={16} className="mt-0.5 shrink-0" />}
        <span>
          {programaTv
            ? 'Los programas de entretenimiento no acceden al tax credit cultural. El control de costes funciona en modo presupuesto recurrente.'
            : 'Este proyecto puede acogerse al tax credit (art. 36 LIS).'}
        </span>
      </div>

      <div className="space-y-5">
        <Seccion titulo="Identidad">
          <Field label="Título del proyecto" className="sm:col-span-2">
            <input className={inputCls} value={p.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Título de la obra" />
          </Field>
          <Field label="Productora" className="sm:col-span-2">
            <input className={inputCls} value={p.productora} onChange={(e) => set('productora', e.target.value)} />
          </Field>
        </Seccion>

        <Seccion titulo="Tipología y formato">
          <Field label="Tipología">
            <select className={inputCls} value={p.tipologia} onChange={(e) => set('tipologia', e.target.value)}>
              {TIPOLOGIAS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Canal">
            <select className={inputCls} value={p.canal} onChange={(e) => set('canal', e.target.value)}>
              {CANALES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputCls} value={p.estado} onChange={(e) => set('estado', e.target.value)}>
              {ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          {serie && (
            <Field label="Episodios">
              <input type="number" min={0} className={`${inputCls} tnum`} value={p.episodios ?? ''} onChange={(e) => set('episodios', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} />
            </Field>
          )}
          {serie && (
            <Field label="Bloques de rodaje" hint="2 o más bloques elevan la capa de control.">
              <input type="number" min={0} className={`${inputCls} tnum`} value={p.bloques ?? ''} onChange={(e) => set('bloques', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} />
            </Field>
          )}
        </Seccion>

        <Seccion titulo="Económico">
          <Field label="Presupuesto estimado (€)">
            <input
              type="number"
              min={0}
              step={50000}
              className={`${inputCls} tnum`}
              value={p.presupuesto}
              onChange={(e) => setP((prev) => actualizarPresupuestoTotal(prev, Math.max(0, Number(e.target.value) || 0)))}
            />
          </Field>
          <Field label="¿Coproducción internacional?">
            <Switch checked={p.coproduccionUE} onChange={(v) => set('coproduccionUE', v)} />
          </Field>
          {p.coproduccionUE && (
            <Field label="Países coproductores" className="sm:col-span-2">
              <ChipMulti options={PAISES.map((x) => ({ id: x, label: x }))} selected={p.paises} onToggle={(id) => toggleArr('paises', id)} />
            </Field>
          )}
          <Field label="Territorios de rodaje candidatos" className="sm:col-span-2">
            <ChipMulti options={TERRITORIOS_PY} selected={p.territoriosCandidatos} onToggle={(id) => toggleArr('territoriosCandidatos', id)} />
          </Field>
          {p.territoriosCandidatos.length > 0 && (
            <Field label="% de gasto por territorio" className="sm:col-span-2" hint="Solo para los territorios seleccionados; habilita los tipos máximos del optimizador.">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.territoriosCandidatos.map((id) => {
                  const t = TERRITORIOS_PY.find((x) => x.id === id)
                  return (
                    <label key={id} className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5">
                      <span className="flex-1 truncate text-2xs text-muted">{t?.label || id}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-14 rounded-lg border border-line bg-canvas px-2 py-1 text-right text-xs tnum focus:border-[var(--accent)] focus:outline-none"
                        value={p.pctGastoTerritorio[id] ?? 0}
                        onChange={(e) => setPct(id, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      />
                      <span className="text-2xs text-faint">%</span>
                    </label>
                  )
                })}
              </div>
            </Field>
          )}
        </Seccion>

        <Seccion titulo="Fiscal e idioma">
          <Field label="Idioma de la obra">
            <select className={inputCls} value={p.idioma} onChange={(e) => set('idioma', e.target.value)}>
              {IDIOMAS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </Field>
          <div />
          <Field label="¿Dirección novel?">
            <Switch checked={p.direccionNovel} onChange={(v) => set('direccionNovel', v)} />
          </Field>
          <Field label="¿Obra difícil?" hint="Corto, 1.ª/2.ª obra, bajo presupuesto, euskera…">
            <Switch checked={p.obraDificil} onChange={(v) => set('obraDificil', v)} />
          </Field>
        </Seccion>

        <Seccion titulo="Calendario">
          <Field label="Días de rodaje">
            <input type="number" min={0} className={`${inputCls} tnum`} value={p.diasRodaje ?? ''} onChange={(e) => set('diasRodaje', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} />
          </Field>
          <Field label="Semanas de rodaje">
            <input type="number" min={0} className={`${inputCls} tnum`} value={p.semanasRodaje ?? ''} onChange={(e) => set('semanasRodaje', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))} />
          </Field>
          <Field label="Inicio de rodaje">
            <input className={inputCls} value={p.fechaInicioRodaje} onChange={(e) => set('fechaInicioRodaje', e.target.value)} placeholder="dd/mm/aaaa" />
          </Field>
          <Field label="Entrega">
            <input className={inputCls} value={p.fechaEntrega} onChange={(e) => set('fechaEntrega', e.target.value)} placeholder="dd/mm/aaaa" />
          </Field>
        </Seccion>

        <Seccion titulo="Equipo">
          <Field label="Productor/a ejecutivo/a">
            <input className={inputCls} value={p.productorEjecutivo} onChange={(e) => set('productorEjecutivo', e.target.value)} />
          </Field>
          <Field label="Line producer">
            <input className={inputCls} value={p.lineProducer} onChange={(e) => set('lineProducer', e.target.value)} />
          </Field>
        </Seccion>
      </div>
    </Modal>
  )
}
