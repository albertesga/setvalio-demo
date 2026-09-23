import { Children, cloneElement, isValidElement, useEffect, useId, useState } from 'react'
import { actualizarPresupuestoTotal, aplicaV2, etiquetaIdioma } from '../lib/proyectos.js'
import { tablaTerritorios, escenarios } from '../lib/incentivos.js'
import { INTENSIDAD } from '../lib/incentivos.js'
import { eur, pct, millonesRango } from '../lib/format.js'
import { Card, Chip, PageHeader, SectionTitle, Button, Th, Td } from '../components/ui.jsx'
import {
  IconChevronRight,
  IconChevronDown,
  IconCheckCircle,
  IconCheck,
  IconLocation,
  IconAlert,
  IconBookmark,
  IconAyudas,
  IconSparkle,
} from '../components/icons.jsx'

const TIPOLOGIAS = ['Largometraje de ficción', 'Serie de ficción', 'Documental', 'Animación']
const IDIOMAS = ['Castellano', 'Catalán', 'Euskera', 'Gallego']
const TERRITORIOS_OPCIONES = [
  { id: 'comun', label: 'Territorio común' },
  { id: 'canarias', label: 'Canarias' },
  { id: 'bizkaia', label: 'Bizkaia' },
  { id: 'gipuzkoa', label: 'Gipuzkoa' },
  { id: 'alava', label: 'Álava' },
  { id: 'navarra', label: 'Navarra' },
]
const PAISES = ['Francia', 'Italia', 'Portugal', 'Alemania', 'Bélgica', 'Argentina', 'México', 'Chile', 'Colombia'].map(
  (p) => ({ id: p, label: p }),
)
const SUBVENCIONES_DISPONIBLES = [
  { nombre: 'ICAA Generales', importe: 600_000 },
  { nombre: 'Ayuda autonómica', importe: 150_000 },
  { nombre: 'MEDIA / Creative Europe', importe: 300_000 },
]

const REGLAS = [
  'Base de deducción = coste + copias + P&P (máx. 40 %)',
  'La base no supera el 80 % del coste',
  'Las subvenciones minoran la base de deducción',
  'Intensidad máxima de ayuda: 50 % (60 % en coproducción UE)',
  'Mínimo 50 % de gasto en territorio español',
]

const inputCls =
  'fp-input w-full px-3.5 py-2 text-sm font-semibold placeholder:text-faint'

// ── Primitivos de formulario ──────────────────────────────────────────────
function Field({ label, children, className = '' }) {
  const id = useId()
  const labelId = `${id}-label`
  // Asocia la etiqueta visible con el primer control hijo (input/select/Switch/
  // ChipMulti…) vía htmlFor/id y aria-labelledby, para que tenga nombre accesible.
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
      <label
        id={labelId}
        htmlFor={id}
        className="mb-1.5 block text-2xs font-semibold uppercase tracking-wide text-faint"
      >
        {label}
      </label>
      {kids}
    </div>
  )
}

function Switch({ checked, onChange, className = '', ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2.5 py-1.5 ${className}`}
      {...rest}
    >
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

// Mapea la tipología (enum) del proyecto al valor del select del optimizador.
function tipologiaParaForm(t) {
  return (
    {
      largometraje_ficcion: 'Largometraje de ficción',
      serie_ficcion: 'Serie de ficción',
      documental: 'Documental',
      serie_documental: 'Documental',
      animacion: 'Animación',
    }[t] || 'Largometraje de ficción'
  )
}

// Inicializa el formulario del Paso 1 desde el proyecto activo.
function initDesdeProyecto(p) {
  const territorios = p?.territoriosCandidatos?.length ? p.territoriosCandidatos : ['comun']
  const conRequisito = territorios.filter((id) => id !== 'comun')
  const pctMax = conRequisito.length ? Math.max(...conRequisito.map((id) => p?.pctGastoTerritorio?.[id] ?? 0)) : 60
  return {
    titulo: p?.titulo ?? '',
    tipologia: tipologiaParaForm(p?.tipologia),
    presupuesto: p?.presupuesto ?? 1_000_000,
    genero: '',
    idioma: etiquetaIdioma(p?.idioma) || 'Castellano',
    personajes: 5,
    semanas: p?.semanasRodaje ?? 6,
    novel: !!p?.direccionNovel,
    coproduccion: !!p?.coproduccionUE,
    paises: p?.paises ?? [],
    territorios,
    pctGasto: pctMax,
    obraDificil: !!p?.obraDificil,
    aplicarTope80: false,
    subvenciones: [],
  }
}

// ── Pantalla ──────────────────────────────────────────────────────────────
export default function Incentivos({ proyecto, onActualizarProyecto, pushToast, onNavigate }) {
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState(() => initDesdeProyecto(proyecto))

  useEffect(() => {
    const presupuesto = proyecto?.presupuesto ?? 1_000_000
    setForm((prev) => (prev.presupuesto === presupuesto ? prev : { ...prev, presupuesto }))
  }, [proyecto?.presupuesto])

  // Tipología que no accede al tax credit cultural (p. ej. programa de TV).
  if (!aplicaV2(proyecto)) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <PageHeader title="Optimizador de incentivos" subtitle="Compara la deducción por territorio." />
        <Card className="px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-warning-soft text-warning">
            <IconAlert size={20} />
          </div>
          <h2 className="font-display text-base font-bold text-ink">Este proyecto no accede al tax credit</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
            Los programas de entretenimiento no se acogen a la deducción cultural del art. 36 LIS. Consulta las ayudas disponibles para «{proyecto?.titulo}».
          </p>
          <div className="mt-4">
            <Button variant="primary" icon={IconAyudas} onClick={() => onNavigate?.('ayudas')}>
              Buscar ayudas no fiscales
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))
  const setPresupuesto = (v) => {
    const importe = Math.max(0, Number(v) || 0)
    setForm((prev) => ({ ...prev, presupuesto: importe }))
    onActualizarProyecto?.((p) => actualizarPresupuestoTotal(p, importe))
  }
  const toggleIn = (k, id) =>
    setForm((prev) => ({
      ...prev,
      [k]: prev[k].includes(id) ? prev[k].filter((x) => x !== id) : [...prev[k], id],
    }))

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Optimizador de incentivos"
        subtitle="Compara la deducción por territorio."
      />

      {/* Stepper */}
      <div className="mb-5 flex items-center gap-1">
        {[
          { n: 1, label: 'Datos del proyecto' },
          { n: 2, label: 'Resultados' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center">
            <button
              onClick={() => setPaso(s.n)}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                paso === s.n ? 'text-ink' : 'text-faint hover:text-muted'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-2xs ${
                paso === s.n ? 'bg-[var(--accent)] text-[color:var(--accent-contrast)]' : paso > s.n ? 'bg-positive text-canvas' : 'bg-surface text-muted'
                }`}
              >
                {paso > s.n ? <IconCheck size={13} strokeWidth={3} /> : s.n}
              </span>
              {s.label}
            </button>
            {i === 0 && <IconChevronRight size={16} className="text-faint" />}
          </div>
        ))}
      </div>

      {paso === 1 ? (
        <Paso1
          form={form}
          set={set}
          setPresupuesto={setPresupuesto}
          toggleIn={toggleIn}
          onSubmit={() => {
            setPaso(2)
            if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
          }}
        />
      ) : (
        <Paso2
          form={form}
          set={set}
          setPresupuesto={setPresupuesto}
          onEditar={() => setPaso(1)}
          onActualizarProyecto={onActualizarProyecto}
          pushToast={pushToast}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}

// ── Paso 1 — Datos del proyecto ─────────────────────────────────────────────
function Paso1({ form, set, setPresupuesto, toggleIn, onSubmit }) {
  const [avanzadas, setAvanzadas] = useState(false)
  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Título del proyecto" className="md:col-span-2">
          <input className={inputCls} value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        </Field>

        <Field label="Tipología">
          <select className={inputCls} value={form.tipologia} onChange={(e) => set('tipologia', e.target.value)}>
            {TIPOLOGIAS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Presupuesto estimado (€)">
          <input
            type="number"
            className={`${inputCls} tnum`}
            value={form.presupuesto}
            min={0}
            step={50000}
            onChange={(e) => setPresupuesto(e.target.value)}
          />
        </Field>

        <Field label="Género">
          <input className={inputCls} value={form.genero} onChange={(e) => set('genero', e.target.value)} placeholder="Drama, comedia, thriller…" />
        </Field>

        <Field label="Idioma de la obra">
          <select className={inputCls} value={form.idioma} onChange={(e) => set('idioma', e.target.value)}>
            {IDIOMAS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Nº de personajes principales">
          <input
            type="number"
            className={`${inputCls} tnum`}
            value={form.personajes}
            min={0}
            onChange={(e) => set('personajes', Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>

        <Field label="Semanas de rodaje">
          <input
            type="number"
            className={`${inputCls} tnum`}
            value={form.semanas}
            min={0}
            onChange={(e) => set('semanas', Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>

        <Field label="¿Dirección novel?">
          <Switch checked={form.novel} onChange={(v) => set('novel', v)} />
        </Field>

        <Field label="¿Coproducción internacional?">
          <Switch checked={form.coproduccion} onChange={(v) => set('coproduccion', v)} />
        </Field>

        {form.coproduccion && (
          <Field label="Países coproductores" className="md:col-span-2">
            <ChipMulti options={PAISES} selected={form.paises} onToggle={(id) => toggleIn('paises', id)} />
          </Field>
        )}

        <Field label="Territorios de rodaje candidatos" className="md:col-span-2">
          <ChipMulti options={TERRITORIOS_OPCIONES} selected={form.territorios} onToggle={(id) => toggleIn('territorios', id)} />
        </Field>
      </div>

      {/* Opciones avanzadas (parámetros fiscales) — plegadas por defecto */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        <button
          type="button"
          onClick={() => setAvanzadas((v) => !v)}
          aria-expanded={avanzadas}
          aria-controls="opciones-avanzadas"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-ink">
            <IconSparkle size={15} className="text-[color:var(--accent)]" /> Opciones avanzadas (fiscal)
          </span>
          <span className="flex items-center gap-2 text-2xs text-faint">
            <span className="hidden sm:inline">% de gasto · obra difícil · tope de base</span>
            <IconChevronDown size={16} className={`transition-transform ${avanzadas ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {avanzadas && (
          <div id="opciones-avanzadas" className="grid grid-cols-1 gap-4 border-t border-line px-4 py-4 md:grid-cols-2">
            <Field label={`% de gasto en el territorio incentivado — ${form.pctGasto} %`} className="md:col-span-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.pctGasto}
                onChange={(e) => set('pctGasto', Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <p className="mt-1 text-2xs text-faint">
                Habilita los tipos máximos en los territorios con requisito de gasto mínimo (Canarias ≥ 50 %, País Vasco ≥ 50 %, Navarra ≥ 40 %).
              </p>
            </Field>

            <Field label="¿Obra difícil? (corto, 1.ª/2.ª obra, bajo presupuesto…)">
              <Switch checked={form.obraDificil} onChange={(v) => set('obraDificil', v)} />
              <p className="mt-1 text-2xs text-faint">Queda exenta del tope de intensidad de ayuda.</p>
            </Field>

            <Field label="Aplicar tope de base al 80 % del coste">
              <Switch checked={form.aplicarTope80} onChange={(v) => set('aplicarTope80', v)} />
              <p className="mt-1 text-2xs text-faint">Régimen de copias + P&P (doc §3.2). Pendiente de confirmar con asesoría fiscal.</p>
            </Field>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <Button variant="primary" onClick={onSubmit}>
          Calcular incentivos
        </Button>
        <p className="mt-2 max-w-xl text-2xs leading-relaxed text-faint">
          Estimación orientativa. No sustituye el criterio de tu asesor fiscal.
        </p>
      </div>
    </Card>
  )
}

// ── Paso 2 — Resultados ──────────────────────────────────────────────────────
function Paso2({ form, set, setPresupuesto, onEditar, onActualizarProyecto, pushToast, onNavigate }) {
  const base = form.presupuesto
  const tabla = tablaTerritorios(form)
  const escs = escenarios(form)
  const [escenarioActivoId, setEscenarioActivoId] = useState(() => (escs.find((e) => e.recomendado) || escs[0])?.id)
  const escenarioActivo = escs.find((e) => e.id === escenarioActivoId) || escs.find((e) => e.recomendado) || escs[0]
  const maxDed = Math.max(...tabla.map((t) => t.deduccionEstimada), 1)
  const maxBanda = Math.max(...escs.map((e) => e.bandaHi), 1)
  const irAyudas = () => onNavigate?.('ayudas', { territorio: escenarioActivo?.territorioId || 'comun' })

  // Info de base / tope (común a todos los territorios).
  const baseCalc = tabla[0]?.base ?? base
  const capPct = tabla[0]?.capPct ?? INTENSIDAD.general
  const capIntensidad = tabla[0]?.capIntensidad ?? capPct * base
  const sumSubv = (form.subvenciones ?? []).reduce((a, s) => a + s.importe, 0)
  const topaAlguno = tabla.some((t) => t.topaIntensidad)

  const toggleSubvencion = (s) =>
    set(
      'subvenciones',
      (form.subvenciones ?? []).some((x) => x.nombre === s.nombre)
        ? form.subvenciones.filter((x) => x.nombre !== s.nombre)
        : [...(form.subvenciones ?? []), s],
    )

  const notaFila = (t) =>
    t.topaIntensidad
      ? `Tope de intensidad ${Math.round(t.capPct * 100)} %`
      : !t.factible && t.requisitoLabel
        ? `No cumple: ${t.requisitoLabel}`
        : t.nota

  const guardarEscenario = () => {
    if (!escenarioActivo) return
    const ahora = new Date().toISOString()
    const nuevo = {
      id: `esc-${Date.now()}`,
      nombre: `${escenarioActivo.etiqueta} · ${escenarioActivo.territorio}`,
      creadoEn: ahora,
      estado: escenarioActivo.recomendado ? 'Recomendado' : 'Borrador',
      proyectoTitulo: form.titulo,
      territorioId: escenarioActivo.territorioId || escenarioActivo.id,
      territorio: escenarioActivo.territorio,
      tipologia: form.tipologia,
      idioma: form.idioma,
      coproduccion: form.coproduccion,
      presupuesto: base,
      pctGasto: form.pctGasto,
      deduccion: escenarioActivo.deduccion,
      efectivo: escenarioActivo.efectivo,
      bandaLo: escenarioActivo.bandaLo,
      bandaHi: escenarioActivo.bandaHi,
      ayudas: escenarioActivo.ayudas,
      subvenciones: form.subvenciones ?? [],
      subvencionTotal: sumSubv,
      baseMinorada: baseCalc,
      capPct,
      capIntensidad,
      retornoNeto: escenarioActivo.bandaHi,
      topaIntensidad: !!escenarioActivo.topaIntensidad,
      factible: escenarioActivo.factible,
      riesgo: !escenarioActivo.factible ? 'Alto' : escenarioActivo.topaIntensidad ? 'Medio' : 'Bajo',
      nota: escenarioActivo.nota,
    }
    onActualizarProyecto?.((p) => ({ ...p, escenariosGuardados: [nuevo, ...(p.escenariosGuardados ?? [])].slice(0, 12) }))
    pushToast?.('Escenario guardado. Revísalo en Escenarios guardados.')
  }

  return (
    <div>
      {/* La base puede ajustarse sin volver al formulario. */}
      <Card className="mb-3 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">Datos del cálculo</div>
          <div className="mt-0.5 text-xs text-muted">{form.tipologia} · {form.idioma}{form.coproduccion ? ' · coproducción' : ''}</div>
          <button onClick={onEditar} className="mt-2 min-h-10 text-xs font-semibold text-[color:var(--accent)] hover:underline">
            Editar datos
          </button>
        </div>

        <div className="sm:text-right">
          <label htmlFor="base-deduccion" className="mb-1 block text-xs font-semibold text-muted">Presupuesto del proyecto</label>
          <div className="flex items-center gap-2 sm:justify-end">
            <input
              id="base-deduccion"
              type="number"
              step={50000}
              min={0}
              value={base}
              onChange={(e) => setPresupuesto(e.target.value)}
              className={`${inputCls} tnum w-44 text-right`}
            />
            <span className="text-sm text-muted">€</span>
          </div>
        </div>
      </Card>

      {/* A) Optimizador */}
      <SectionTitle>Escenarios recomendados</SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {escs.map((e) => (
          <EscenarioCard
            key={e.id}
            esc={e}
            maxBanda={maxBanda}
            active={escenarioActivo?.id === e.id}
            onSelect={() => setEscenarioActivoId(e.id)}
          />
        ))}
      </div>

      {/* Combinar con ayudas (§7) */}
      <Card className="mt-3 p-5">
        <SectionTitle
          right={
            sumSubv > 0 ? (
              <Chip tone={topaAlguno ? 'warning' : 'positive'} dot>
                {topaAlguno ? 'Alcanza el tope de intensidad' : 'Dentro del tope'}
              </Chip>
            ) : null
          }
        >
          Combinar con ayudas
        </SectionTitle>
        <p className="mb-3 text-2xs text-faint">
          Las subvenciones minoran la base de deducción y suman al tope de intensidad ({Math.round(capPct * 100)} % del coste = {eur(capIntensidad)}).
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUBVENCIONES_DISPONIBLES.map((s) => {
            const on = (form.subvenciones ?? []).some((x) => x.nombre === s.nombre)
            return (
              <button
                key={s.nombre}
                type="button"
                onClick={() => toggleSubvencion(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]' : 'border-line bg-canvas text-muted hover:bg-surface'
                }`}
              >
                {s.nombre} · {eur(s.importe)}
              </button>
            )
          })}
        </div>
        {sumSubv > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
            <Combi label="Subvenciones" value={eur(sumSubv)} />
            <Combi label="Base tras minoración" value={eur(baseCalc)} />
            <Combi label="Tope de intensidad" value={eur(capIntensidad)} />
            <Combi
              label={topaAlguno ? 'Efecto del tope' : 'Margen sobre el tope'}
              value={topaAlguno ? 'Recorta deducción' : eur(Math.max(0, capIntensidad - sumSubv))}
              tone={topaAlguno ? 'text-warning' : 'text-positive'}
            />
          </div>
        )}
      </Card>

      {/* Comparación precisa y lectura visual. */}
      <div className="mt-3 space-y-3">
          {/* B) Tabla */}
          <Card className="overflow-hidden">
            <div className="px-5 pt-4">
              <h2 className="text-sm font-semibold text-ink">Deducción por territorio</h2>
              <p className="text-2xs text-faint">
                Base de deducción: {eur(baseCalc)}
                {sumSubv > 0 ? ` · tras minorar ${eur(sumSubv)} de ayudas` : ''}
              </p>
            </div>
            <div className="mt-2 overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>Territorio</Th>
                    <Th align="right">% aplicable</Th>
                    <Th align="right">Base deducible</Th>
                    <Th align="right">Deducción estimada</Th>
                    <Th>Límite/nota</Th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map((t) => {
                    const esMax = t.deduccionEstimada === maxDed
                    return (
                      <tr key={t.id} className={`border-t border-line ${esMax ? 'bg-positive-soft/60' : ''}`}>
                        <Td className="font-medium text-ink">{t.territorio}</Td>
                        <Td align="right" tabular className="text-muted">{t.pctLabel}</Td>
                        <Td align="right" tabular className="text-muted">{eur(t.base)}</Td>
                        <Td align="right" tabular className={`font-semibold ${esMax ? 'text-positive' : 'text-ink'}`}>
                          {eur(t.deduccionEstimada)}
                        </Td>
                        <Td className="text-2xs">
                          <span className={t.topaIntensidad ? 'text-warning' : !t.factible ? 'text-muted' : 'text-faint'}>
                            {notaFila(t)}
                          </span>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* C) Gráfico */}
          <Card className="p-5">
            <SectionTitle>Retorno por territorio</SectionTitle>
            <div className="space-y-2.5">
              {tabla.map((t) => {
                const esMax = t.deduccionEstimada === maxDed
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs text-muted" title={t.territorio}>{t.territorio}</span>
                    <div className="relative h-5 flex-1 rounded bg-surface">
                      <div
                        className={`flex h-full items-center justify-end rounded pr-2 ${esMax ? 'bg-positive' : 'bg-[var(--accent)]'}`}
                        style={{ width: `${Math.max(6, (t.deduccionEstimada / maxDed) * 100)}%` }}
                      >
                        <span className="tnum text-2xs font-semibold text-white">{eur(t.deduccionEstimada)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        <details className="rounded-lg border border-line bg-canvas p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Ver reglas aplicadas</summary>
          <ul className="mt-4 space-y-2.5">
            {REGLAS.map((r) =>
              r.startsWith('Intensidad') ? `Intensidad máxima de ayuda: ${Math.round(capPct * 100)} % del coste = ${eur(capIntensidad)}` : r,
            ).map((r) => (
              <li key={r} className="flex items-start gap-2.5">
                <IconCheckCircle size={16} className="mt-0.5 shrink-0 text-positive" />
                <span
                  className="text-xs leading-relaxed text-muted"
                  title={r.includes('Intensidad') ? 'La suma de deducción y subvenciones no puede superar el 50 % del coste (60 % en coproducción UE).' : undefined}
                >
                  {r}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* Límite de intensidad y salida a la combinación detallada. */}
      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-warning">
        <IconAlert size={16} className="mt-0.5 shrink-0" />
        <span title="La suma de deducción y subvenciones no puede superar el 50 % del coste (60 % en coproducción UE).">
          La ayuda total tiene un tope del {Math.round(capPct * 100)} % del coste.{' '}
          <button onClick={irAyudas} className="font-semibold underline">
            Ver combinación en Ayudas.
          </button>
        </span>
      </div>

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" icon={IconAyudas} onClick={irAyudas}>
          Combinar ayudas
        </Button>
        <Button variant="secondary" icon={IconBookmark} onClick={guardarEscenario}>Guardar escenario</Button>
        <Button variant="ghost" onClick={() => onNavigate?.('escenarios')}>Ver guardados</Button>
      </div>
      <p className="mt-3 text-2xs text-faint">Estimación orientativa. No sustituye el criterio de tu asesor fiscal.</p>
    </div>
  )
}

function Combi({ label, value, tone = 'text-ink' }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-faint">{label}</div>
      <div className={`tnum text-sm font-bold ${tone}`}>{value}</div>
    </div>
  )
}

function EscenarioCard({ esc, maxBanda, active = false, onSelect }) {
  return (
    <Card
      as="button"
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        active ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : esc.recomendado ? 'border-[var(--accent)]/60' : ''
      }`}
    >
      {esc.recomendado && (
        <Chip tone="primary" dot className="absolute right-4 top-4">
          Recomendado
        </Chip>
      )}
      {active && (
        <span className="absolute right-4 top-12 rounded-full bg-[var(--accent)] px-2 py-0.5 text-2xs font-bold text-[color:var(--accent-contrast)]">
          Activo
        </span>
      )}
      <div className="text-2xs font-semibold uppercase tracking-wide text-faint">{esc.etiqueta}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <IconLocation size={15} className="text-[color:var(--accent)]" />
        {esc.territorio}
      </div>

      <div className="mt-3 text-2xs uppercase tracking-wide text-faint">Deducción estimada</div>
      <div className="flex items-baseline gap-2">
        <span className="tnum text-2xl font-semibold text-ink">{eur(esc.deduccion)}</span>
        <span className="tnum text-sm font-bold text-[color:var(--accent)]">{pct(esc.efectivo, 2)}</span>
      </div>
      {esc.ayudaHasta > 0 && <div className="tnum text-2xs text-muted">+ hasta {eur(esc.ayudaHasta)} de ayuda</div>}

      <div className="mt-3">
        <div className="flex items-center justify-between text-2xs">
          <span className="text-faint">Retorno total estimado</span>
          <span className="tnum font-semibold text-ink">{millonesRango(esc.bandaLo, esc.bandaHi)}</span>
        </div>
        <div className="relative mt-1 h-2 w-full rounded-full bg-surface">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-soft)]" style={{ width: `${(esc.bandaHi / maxBanda) * 100}%` }} />
          <div
            className="absolute inset-y-0 rounded-full bg-[var(--accent)]"
            style={{ left: `${(esc.bandaLo / maxBanda) * 100}%`, width: `${((esc.bandaHi - esc.bandaLo) / maxBanda) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {esc.ayudas.map((a) => (
          <span key={a} className="rounded-md border border-line bg-surface px-2 py-0.5 text-2xs text-muted">
            {a}
          </span>
        ))}
      </div>

      <p className="mt-3 border-t border-line pt-3 text-2xs leading-relaxed text-muted">{esc.nota}</p>
    </Card>
  )
}
