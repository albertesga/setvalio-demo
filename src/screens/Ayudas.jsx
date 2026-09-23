import { useEffect, useMemo, useState } from 'react'
import { Card, Chip, PageHeader, SectionTitle, Th, Td, Button, Modal } from '../components/ui.jsx'
import { IconAlert, IconCheck, IconChevronRight, IconClock } from '../components/icons.jsx'
import { combinar, escenarios, TERRITORIOS } from '../lib/incentivos.js'
import { eur, eurSigned } from '../lib/format.js'

const FECHA_REFERENCIA = new Date('2026-06-01T12:00:00')

const FILTROS = {
  tipologia: ['Todas', 'Largometraje ficción', 'Animación', 'Documental', 'Serie/TV'],
  territorio: ['Todos', 'España', 'Cataluña', 'Europa', 'Iberoamérica'],
  fase: ['Todas', 'Desarrollo', 'Producción', 'Coproducción'],
}

const AYUDAS = [
  {
    id: 'icaa-selectivas',
    ayuda: 'Ayudas Selectivas a la producción de largometrajes',
    organismo: 'ICAA',
    importe: '800.000 € (1.000.000 € animación)',
    importeSugerido: 800_000,
    deadline: 'jun 2025',
    deadlineDate: '2025-06-23',
    probabilidad: 'Media',
    estado: 'Cerrada',
    tipologias: ['Largometraje ficción', 'Animación', 'Documental'],
    territorio: 'España',
    fase: 'Producción',
  },
  {
    id: 'icaa-generales',
    ayuda: 'Ayudas Generales a la producción',
    organismo: 'ICAA',
    importe: 'Por baremo',
    importeSugerido: 600_000,
    deadline: '5 jun 2026 / 15 sep 2026',
    deadlineDate: '2026-06-05',
    probabilidad: 'Media',
    estado: 'Abierta',
    tipologias: ['Largometraje ficción', 'Animación', 'Documental'],
    territorio: 'España',
    fase: 'Producción',
  },
  {
    id: 'icec-llargmetratges',
    ayuda: 'Ajuts a la producció de llargmetratges',
    organismo: 'ICEC (Cataluña)',
    importe: 'Dotación 10 M€',
    importeSugerido: 200_000,
    deadline: '7 may 2026',
    deadlineDate: '2026-05-07',
    probabilidad: 'Baja',
    estado: 'Cerrada',
    tipologias: ['Largometraje ficción'],
    territorio: 'Cataluña',
    fase: 'Producción',
  },
  {
    id: 'media-slate',
    ayuda: 'European Slate Development',
    organismo: 'Creative Europe MEDIA',
    importe: '90.000–510.000 €',
    importeSugerido: 120_000,
    deadline: 'dic 2026',
    deadlineDate: '2026-12-10',
    probabilidad: 'Media',
    estado: 'Próxima',
    tipologias: ['Largometraje ficción', 'Animación', 'Documental', 'Serie/TV'],
    territorio: 'Europa',
    fase: 'Desarrollo',
  },
  {
    id: 'media-codev',
    ayuda: 'European Co-development (CODEV)',
    organismo: 'Creative Europe MEDIA',
    importe: '120.000 € (200.000 € series)',
    importeSugerido: 120_000,
    deadline: '23 feb 2026',
    deadlineDate: '2026-02-23',
    probabilidad: 'Media',
    estado: 'Cerrada',
    tipologias: ['Largometraje ficción', 'Animación', 'Documental', 'Serie/TV'],
    territorio: 'Europa',
    fase: 'Coproducción',
  },
  {
    id: 'media-tv-online',
    ayuda: 'TV & Online Content',
    organismo: 'Creative Europe MEDIA',
    importe: 'Ficción 500.000 €–2 M€; doc 300.000 €',
    importeSugerido: 300_000,
    deadline: 'sep 2026',
    deadlineDate: '2026-09-17',
    probabilidad: 'Media',
    estado: 'Próxima',
    tipologias: ['Documental', 'Serie/TV'],
    territorio: 'Europa',
    fase: 'Producción',
  },
  {
    id: 'ibermedia-coproduccion',
    ayuda: 'Coproducción de películas',
    organismo: 'Programa Ibermedia',
    importe: 'Préstamo, máx. 50 % / 200.000 USD',
    importeSugerido: 180_000,
    deadline: '30 mar 2026',
    deadlineDate: '2026-03-30',
    probabilidad: 'Media',
    estado: 'Cerrada',
    tipologias: ['Largometraje ficción', 'Documental'],
    territorio: 'Iberoamérica',
    fase: 'Coproducción',
  },
  {
    id: 'eurimages-coproduction',
    ayuda: 'Co-production Support',
    organismo: 'Eurimages',
    importe: 'Máx. 500.000 € o 17 %',
    importeSugerido: 300_000,
    deadline: '8 sep 2026',
    deadlineDate: '2026-09-08',
    probabilidad: 'Baja',
    estado: 'Próxima',
    tipologias: ['Largometraje ficción', 'Animación', 'Documental'],
    territorio: 'Europa',
    fase: 'Coproducción',
  },
]

const CHECKLIST = [
  'Certificado de nacionalidad española',
  'Certificado cultural ICAA',
  'Plan de financiación',
  'Presupuesto detallado por capítulos',
  'Contrato de coproducción (si aplica)',
  'Memoria del proyecto',
]

function Combi({ label, value, tone = 'text-ink' }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-faint">{label}</div>
      <div className={`tnum text-sm font-bold ${tone}`}>{value}</div>
    </div>
  )
}

const TERRITORIO_OPTIONS = TERRITORIOS.map((t) => ({ id: t.id, label: t.territorio }))

function normalizarTerritorio(id) {
  if (id === 'alava' || id === 'gipuzkoa') return 'alava_gipuzkoa'
  return TERRITORIOS.some((t) => t.id === id) ? id : 'comun'
}

function tipologiaMotor(tipologia) {
  return (
    {
      largometraje_ficcion: 'Largometraje de ficción',
      serie_ficcion: 'Serie de ficción',
      documental: 'Documental',
      serie_documental: 'Documental',
      animacion: 'Animación',
    }[tipologia] || 'Largometraje de ficción'
  )
}

function formProyecto(proyecto) {
  return {
    presupuesto: proyecto?.presupuesto ?? 0,
    tipologia: tipologiaMotor(proyecto?.tipologia),
    idioma: proyecto?.idioma === 'euskera' ? 'Euskera' : 'Castellano',
    novel: !!proyecto?.direccionNovel,
    coproduccion: !!proyecto?.coproduccionUE,
    paises: proyecto?.paises ?? [],
    territorios: proyecto?.territoriosCandidatos ?? ['comun'],
    pctGasto: Math.max(...Object.values(proyecto?.pctGastoTerritorio ?? { comun: 100 })),
    subvenciones: [],
    obraDificil: !!proyecto?.obraDificil,
    aplicarTope80: false,
  }
}

function territorioPorDefecto(proyecto, contexto) {
  if (contexto?.territorio) return normalizarTerritorio(contexto.territorio)
  const recomendado = escenarios(formProyecto(proyecto)).find((e) => e.recomendado)
  return normalizarTerritorio(recomendado?.territorioId || proyecto?.territoriosCandidatos?.[0] || 'comun')
}

function pctGastoTerritorio(proyecto, territorio) {
  if (!proyecto?.pctGastoTerritorio) return 1
  if (territorio === 'alava_gipuzkoa') {
    return Math.max(
      proyecto.pctGastoTerritorio.alava ?? 0,
      proyecto.pctGastoTerritorio.gipuzkoa ?? 0,
      proyecto.pctGastoTerritorio.alava_gipuzkoa ?? 0,
    ) / 100
  }
  return ((proyecto.pctGastoTerritorio[territorio] ?? (territorio === 'comun' ? 100 : 60)) / 100)
}

function estadoInicialCombinacion() {
  return Object.fromEntries(AYUDAS.map((a) => [a.id, { incluida: false, importe: a.importeSugerido }]))
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function toneProbabilidad(probabilidad) {
  if (probabilidad === 'Alta') return 'positive'
  if (probabilidad === 'Media') return 'warning'
  return 'negative'
}

function toneEstado(estado) {
  if (estado === 'Abierta') return 'positive'
  if (estado === 'Próxima') return 'primary'
  return 'neutral'
}

function parseFecha(fecha) {
  return new Date(`${fecha}T12:00:00`)
}

function diasHasta(fecha) {
  return Math.ceil((parseFecha(fecha) - FECHA_REFERENCIA) / (1000 * 60 * 60 * 24))
}

function cierraPronto(ayuda) {
  const dias = diasHasta(ayuda.deadlineDate)
  return ayuda.estado === 'Abierta' && dias >= 0 && dias <= 30
}

function markerLeft(deadlineDate) {
  const d = parseFecha(deadlineDate)
  const diasMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const monthStartPct = (d.getMonth() / 12) * 100
  const monthSpanPct = 100 / 12
  const dayPct = ((d.getDate() - 1) / diasMes) * monthSpanPct
  return Math.min(99, Math.max(1, monthStartPct + dayPct))
}

function fechaCorta(deadlineDate) {
  const d = parseFecha(deadlineDate)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '')
}

// Formato uniforme «5 jun 2026» para la columna de cierre (evita el formato libre heterogéneo).
function fechaLarga(deadlineDate) {
  const d = parseFecha(deadlineDate)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
}

function timelineTone(estado) {
  if (estado === 'Abierta') return {
    chip: 'positive',
    dot: 'bg-positive ring-positive/20',
    line: 'bg-positive/70',
    card: 'border-positive/25 bg-positive-soft text-positive',
    text: 'text-positive',
  }
  if (estado === 'Próxima') return {
    chip: 'primary',
    dot: 'bg-[var(--accent)] ring-[var(--accent-soft)]',
    line: 'bg-[var(--accent)]',
    card: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]',
    text: 'text-[color:var(--accent)]',
  }
  return {
    chip: 'neutral',
    dot: 'bg-faint ring-line/70',
    line: 'bg-line-strong',
    card: 'border-line bg-surface/80 text-muted',
    text: 'text-muted',
  }
}

function asignarCarriles(ayudas) {
  const ordenadas = [...ayudas]
    .map((ayuda) => ({ ...ayuda, left: markerLeft(ayuda.deadlineDate) }))
    .sort((a, b) => parseFecha(a.deadlineDate) - parseFecha(b.deadlineDate))

  const ultimoPorCarril = []
  return ordenadas.map((ayuda) => {
    const carril = ultimoPorCarril.findIndex((left) => ayuda.left - left > 18)
    const lane = carril === -1 ? ultimoPorCarril.length : carril
    ultimoPorCarril[lane] = ayuda.left
    return { ...ayuda, lane }
  })
}

function pasaFiltros(ayuda, filtros) {
  const tipologiaOk = filtros.tipologia === 'Todas' || ayuda.tipologias.includes(filtros.tipologia)
  const territorioOk = filtros.territorio === 'Todos' || ayuda.territorio === filtros.territorio
  const faseOk = filtros.fase === 'Todas' || ayuda.fase === filtros.fase
  return tipologiaOk && territorioOk && faseOk
}

function SelectFiltro({ label, value, options, onChange, className = '' }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-2xs font-extrabold uppercase tracking-[0.12em] text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="fp-input w-full min-w-0 px-3.5 py-2 text-sm font-semibold"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

function ControlCombinar({ ayuda, combinada, onToggle, onImporte }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-label={`Incluir ${ayuda.ayuda} en la combinación`}
        aria-checked={combinada.incluida}
        onClick={onToggle}
        className={`min-h-11 rounded-full border px-3 text-2xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          combinada.incluida
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]'
            : 'border-line bg-canvas text-muted hover:bg-surface'
        }`}
      >
        Incluir
      </button>
      <input
        aria-label={`Importe en euros de ${ayuda.ayuda}`}
        type="number"
        min={0}
        step={10000}
        value={combinada.importe}
        onChange={(e) => onImporte(Math.max(0, Number(e.target.value) || 0))}
        className={`tnum min-h-11 w-28 rounded-xl border px-2 py-1.5 text-right text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
          combinada.incluida ? 'border-[var(--accent)] bg-canvas text-ink' : 'border-line bg-surface text-muted'
        }`}
      />
      <span className="text-xs font-semibold text-muted" aria-hidden="true">€</span>
    </div>
  )
}

export default function Ayudas({ proyecto, contexto }) {
  const [filtros, setFiltros] = useState({ tipologia: 'Todas', territorio: 'Todos', fase: 'Todas' })
  const [seleccionada, setSeleccionada] = useState(null)
  const [territorioCombinacion, setTerritorioCombinacion] = useState(() => territorioPorDefecto(proyecto, contexto))
  const [combina, setCombina] = useState(estadoInicialCombinacion)

  const territorioInicial = useMemo(() => territorioPorDefecto(proyecto, contexto), [proyecto, contexto])
  useEffect(() => {
    setTerritorioCombinacion(territorioInicial)
  }, [territorioInicial])

  const subvencionesSeleccionadas = useMemo(
    () =>
      AYUDAS
        .filter((a) => combina[a.id]?.incluida)
        .map((a) => ({
          nombre: a.ayuda,
          importe: Math.max(0, Number(combina[a.id]?.importe) || 0),
        })),
    [combina],
  )

  const combinacion = useMemo(
    () =>
      combinar({
        coste: proyecto?.presupuesto ?? 0,
        territorio: territorioCombinacion,
        euskera: proyecto?.idioma === 'euskera',
        coproduccionUE: !!proyecto?.coproduccionUE,
        subvenciones: subvencionesSeleccionadas,
        pctGasto: pctGastoTerritorio(proyecto, territorioCombinacion),
        tipologia: tipologiaMotor(proyecto?.tipologia),
        novel: !!proyecto?.direccionNovel,
        obraDificil: !!proyecto?.obraDificil,
      }),
    [proyecto, territorioCombinacion, subvencionesSeleccionadas],
  )

  const toggleCombina = (id) =>
    setCombina((prev) => ({ ...prev, [id]: { ...prev[id], incluida: !prev[id]?.incluida } }))

  const setImporteCombina = (id, importe) =>
    setCombina((prev) => ({ ...prev, [id]: { ...prev[id], importe } }))

  const filas = useMemo(() => AYUDAS.filter((a) => pasaFiltros(a, filtros)), [filtros])
  const proximas30 = AYUDAS.filter(cierraPronto)
  const seleccionadasCount = subvencionesSeleccionadas.length
  const deltaNeto = combinacion.retornoNeto - combinacion.deduccionSola
  const empeora = seleccionadasCount > 0 && deltaNeto < 0
  const capLabel = `${Math.round((combinacion.capPct ?? 0.5) * 100)} %`

  const setFiltro = (key, value) => setFiltros((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Ayudas compatibles"
        subtitle="Selecciona convocatorias y compara el retorno neto."
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <SelectFiltro
            label="Tipología"
            value={filtros.tipologia}
            options={FILTROS.tipologia}
            onChange={(v) => setFiltro('tipologia', v)}
            className="col-span-2 lg:col-span-1 lg:min-w-[200px]"
          />
          <SelectFiltro
            label="Territorio"
            value={filtros.territorio}
            options={FILTROS.territorio}
            onChange={(v) => setFiltro('territorio', v)}
          />
          <SelectFiltro
            label="Fase"
            value={filtros.fase}
            options={FILTROS.fase}
            onChange={(v) => setFiltro('fase', v)}
          />
        </div>
        <div className="rounded-full bg-surface px-3 py-1.5 text-2xs font-extrabold text-faint">
          {filas.length} de {AYUDAS.length} convocatorias visibles
        </div>
      </Card>

      <div className="mb-4 flex items-start gap-2.5 rounded-[20px] border border-warning/30 bg-warning-soft px-4 py-3 text-xs font-semibold text-warning">
        <IconClock size={16} className="mt-0.5 shrink-0" />
        <span>A 01/06/2026, {proximas30.length} {proximas30.length === 1 ? 'convocatoria cierra' : 'convocatorias cierran'} en 30 días.</span>
      </div>

      <Card className="mb-3 p-5">
        <SectionTitle
          right={
            seleccionadasCount > 0 ? (
              <Chip tone={combinacion.topado ? 'warning' : 'positive'} dot>
                {combinacion.topado ? 'Recorta por intensidad' : 'Dentro del tope'}
              </Chip>
            ) : (
              <Chip tone="neutral">Sin ayudas incluidas</Chip>
            )
          }
        >
          Combinar deducción y ayudas
        </SectionTitle>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.7fr)]">
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Territorio de deducción</span>
              <select
                value={territorioCombinacion}
                onChange={(e) => setTerritorioCombinacion(e.target.value)}
                className="fp-input w-full px-3.5 py-2 text-sm font-semibold"
              >
                {TERRITORIO_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-muted">Base del proyecto: <strong className="tnum text-ink">{eur(proyecto?.presupuesto ?? 0)}</strong></p>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted">Deducción sola</div>
                <div className="tnum mt-1 font-display text-xl font-bold text-ink">{eur(combinacion.deduccionSola)}</div>
              </div>
              <div className="border-l border-line pl-4">
                <div className="text-xs font-medium text-muted">Con ayudas · neto</div>
                <div className={`tnum mt-1 font-display text-xl font-bold ${empeora ? 'text-negative' : seleccionadasCount ? 'text-positive' : 'text-ink'}`}>{eur(combinacion.retornoNeto)}</div>
                {seleccionadasCount > 0 && <div className={`tnum mt-0.5 text-xs font-semibold ${empeora ? 'text-negative' : 'text-positive'}`}>{eurSigned(deltaNeto)} frente a deducción sola</div>}
              </div>
            </div>
            {seleccionadasCount === 0 && <p className="mt-4 text-xs text-muted">Incluye una ayuda en la tabla para ver su efecto.</p>}
            {seleccionadasCount > 0 && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                  <Combi label="Ayudas incluidas" value={eur(combinacion.subvencionTotal)} />
                  <Combi label="Base minorada" value={eur(combinacion.baseMinorada)} />
                  <Combi label={`Tope ${capLabel}`} value={eur(combinacion.cap)} />
                  <Combi label="Recorte por tope" value={eur(combinacion.recorte)} tone={combinacion.topado ? 'text-warning' : 'text-ink'} />
                </div>
                <details className="mt-3 text-xs text-muted">
                  <summary className="w-fit cursor-pointer font-semibold text-ink">Ver desglose del cálculo</summary>
                  <p className="mt-2 leading-relaxed">Las ayudas reducen la base en {eur(combinacion.subvencionTotal)} y la deducción en {eur(Math.abs(combinacion.efectoMinoracion))}. El tope de intensidad es el {capLabel} del coste.</p>
                </details>
              </>
            )}
            {empeora && (
              <div className="mt-3 rounded-lg bg-negative-soft px-3 py-2.5 text-xs font-semibold text-negative">
                {seleccionadasCount === 1 ? 'Esta ayuda reduce' : 'Estas ayudas reducen'} el retorno neto en <span className="tnum">{eur(Math.abs(deltaNeto))}</span>.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1160px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Ayuda</Th>
                <Th>Organismo</Th>
                <Th align="right">Importe máx.</Th>
                <Th>Deadline</Th>
                <Th>Probabilidad</Th>
                <Th>Estado</Th>
                <Th align="right" className="hidden lg:table-cell">Combinar</Th>
                <Th align="right" className="hidden lg:table-cell">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((a) => {
                const combinada = combina[a.id] || { incluida: false, importe: a.importeSugerido }
                return (
                <tr key={a.id} className="border-t border-line transition hover:bg-surface/70">
                  <Td>
                    <div className="font-medium text-ink">{a.ayuda}</div>
                    <div className="text-2xs text-faint">{a.fase} · {a.territorio}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 lg:hidden">
                      <ControlCombinar ayuda={a} combinada={combinada} onToggle={() => toggleCombina(a.id)} onImporte={(importe) => setImporteCombina(a.id, importe)} />
                      <Button variant="ghost" className="text-xs" onClick={() => setSeleccionada(a)}>Requisitos</Button>
                    </div>
                  </Td>
                  <Td className="text-muted">{a.organismo}</Td>
                  <Td align="right" tabular className="text-ink">{a.importe}</Td>
                  <Td tabular className="text-muted">{fechaLarga(a.deadlineDate)}</Td>
                  <Td><Chip tone={toneProbabilidad(a.probabilidad)} dot>{a.probabilidad}</Chip></Td>
                  <Td><Chip tone={toneEstado(a.estado)} dot>{a.estado}</Chip></Td>
                  <Td align="right" className="hidden lg:table-cell">
                    <ControlCombinar ayuda={a} combinada={combinada} onToggle={() => toggleCombina(a.id)} onImporte={(importe) => setImporteCombina(a.id, importe)} />
                  </Td>
                  <Td align="right" className="hidden lg:table-cell">
                    <Button variant="ghost" className="py-1.5 text-xs" onClick={() => setSeleccionada(a)}>
                      Requisitos <IconChevronRight size={14} />
                    </Button>
                  </Td>
                </tr>
                )
              })}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-faint">
                    No hay convocatorias que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Timeline ayudas={filas} />

      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-warning">
        <IconAlert size={16} className="mt-0.5 shrink-0" />
        <span>
          Ibermedia y Eurimages son préstamos/anticipos reembolsables: afectan al plan de financiación y minoran la base de deducción.
        </span>
      </div>

      <ChecklistModal ayuda={seleccionada} onClose={() => setSeleccionada(null)} />
    </div>
  )
}

function Timeline({ ayudas }) {
  const eventos = useMemo(() => asignarCarriles(ayudas), [ayudas])
  const carriles = Math.max(1, ...eventos.map((e) => e.lane + 1))
  const railY = 126
  const alto = 180 + carriles * 62
  const hoyLeft = markerLeft('2026-06-01')

  return (
    <Card className="mt-4 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line bg-surface/40 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Calendario de convocatorias 2026</h2>
            <Chip tone="neutral">{ayudas.length} hitos</Chip>
          </div>
          <p className="mt-1 text-sm font-medium text-muted">Fechas de cierre por mes según los filtros activos. Referencia: 1 de junio de 2026.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-full border border-line bg-canvas px-3 py-2 text-2xs font-bold text-muted shadow-sm">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-positive" /> Abierta</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /> Próxima</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-faint" /> Cerrada</span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="relative min-w-[1060px] px-5 pb-6 pt-5" style={{ height: alto }}>
          <div className="absolute inset-x-5 top-5 grid grid-cols-12 overflow-hidden rounded-[24px] border border-line bg-canvas shadow-sm">
            {MESES.map((m, index) => (
              <div key={m} className="border-r border-line px-2 py-3 text-center last:border-r-0">
                <div className="font-display text-sm font-extrabold uppercase tracking-tight text-ink">{m}</div>
                <div className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.12em] text-faint sm:block">{MESES_LARGOS[index]}</div>
              </div>
            ))}
          </div>

          <div className="absolute inset-x-5 top-[96px] bottom-6 rounded-[26px] border border-line bg-surface/60">
            <div className="absolute inset-0 grid grid-cols-12">
              {MESES.map((m) => (
                <div key={m} className="border-r border-line/80 last:border-r-0" />
              ))}
            </div>
            <div className="absolute left-4 right-4 top-[30px] h-1 rounded-full bg-line/80" />
            <div
              className="absolute bottom-0 top-0 z-10 border-l border-dashed border-warning/80"
              style={{ left: `${hoyLeft}%` }}
              aria-hidden="true"
            >
              <span className="absolute left-2 top-2 whitespace-nowrap rounded-full border border-warning/20 bg-warning-soft px-2 py-0.5 text-[10px] font-extrabold text-warning shadow-sm">
                Hoy · 1 jun
              </span>
            </div>
          </div>

          {eventos.length === 0 && (
            <div className="absolute inset-x-5 top-[132px] rounded-[24px] border border-dashed border-line bg-canvas/80 px-4 py-8 text-center text-sm font-medium text-muted">
              No hay deadlines en el timeline con los filtros activos.
            </div>
          )}

          {eventos.map((a) => {
            const tone = timelineTone(a.estado)
            const cerrado = a.estado === 'Cerrada'
            const top = 152 + a.lane * 62
            const stemTop = railY - top
            const stemHeight = top - railY
            const dotTop = railY - top - 7
            const alignStyle = a.left < 10
              ? { transform: 'translateX(0)' }
              : a.left > 90
                ? { transform: 'translateX(-100%)' }
                : { transform: 'translateX(-50%)' }
            return (
              <button
                key={a.ayuda}
                type="button"
                className={`group absolute z-20 text-left focus:outline-none ${cerrado ? 'opacity-70' : ''}`}
                style={{ left: `calc(${a.left}% + ${20 - a.left * 0.4}px)`, top }}
                aria-label={`${a.ayuda}. ${a.estado}. Cierre ${fechaLarga(a.deadlineDate)}. ${a.importe}`}
              >
                <span
                  className={`absolute left-0 w-px ${tone.line}`}
                  style={{ top: stemTop, height: stemHeight }}
                  aria-hidden="true"
                />
                <span
                  className={`absolute left-[-8px] h-4 w-4 rounded-full border-[3px] border-canvas shadow-sm ring-4 ${tone.dot}`}
                  style={{ top: dotTop }}
                  aria-hidden="true"
                />
                <span
                  className={`block w-[212px] rounded-[20px] border px-3 py-2.5 shadow-card transition group-hover:-translate-y-0.5 group-hover:shadow-modal group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent)] ${tone.card}`}
                  style={alignStyle}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="tnum text-2xs font-extrabold uppercase tracking-[0.12em]">{fechaCorta(a.deadlineDate)}</span>
                    <Chip tone={tone.chip}>{a.estado}</Chip>
                  </span>
                  <span className="mt-1.5 block truncate text-xs font-extrabold text-ink">{a.organismo}</span>
                  <span className="mt-0.5 block truncate text-2xs font-semibold text-muted">{a.ayuda}</span>
                </span>
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-12 hidden w-80 -translate-x-1/2 rounded-[18px] border border-line bg-ink px-3 py-2.5 text-left text-2xs text-canvas shadow-modal group-hover:block group-focus:block">
                  <span className="block font-extrabold">{a.ayuda}</span>
                  <span className="mt-1 block font-semibold text-primary-soft/85">{a.importe}</span>
                  <span className="mt-0.5 block text-primary-soft/80">Deadline: {a.deadline}</span>
                  <span className="mt-0.5 block text-primary-soft/80">{a.fase} · {a.territorio}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function ChecklistModal({ ayuda, onClose }) {
  if (!ayuda) return null
  return (
    <Modal
      open={!!ayuda}
      onClose={onClose}
      title="Checklist documental"
      subtitle={`${ayuda.ayuda} · ${ayuda.organismo}`}
      width="max-w-xl"
      footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}
    >
      <div className="space-y-2.5">
        {CHECKLIST.map((item) => (
          <label key={item} className="flex items-center gap-3 rounded-lg border border-line bg-surface/50 px-3 py-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line bg-canvas text-[color:var(--accent)]">
              <IconCheck size={13} />
            </span>
            <span className="text-sm text-ink">{item}</span>
          </label>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-3 py-2.5 text-xs leading-relaxed text-[color:var(--accent)]">
        El gestor/fiscalista valida y firma. SetValio prepara la documentación.
      </p>
    </Modal>
  )
}
