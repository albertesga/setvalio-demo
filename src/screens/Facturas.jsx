import { useEffect, useRef, useState } from 'react'
import { eur, eurCents } from '../lib/format.js'
import { Card, Chip, PageHeader, Th, Td, Button, EmptyState } from '../components/ui.jsx'
import { PROYECTO_DEMO_ID } from '../lib/data.js'
import { PRESUPUESTO_CAPITULOS_ICAA } from '../lib/proyectos.js'
import {
  IconAlert,
  IconCheck,
  IconChevronRight,
  IconFacturas,
  IconSparkle,
  IconUpload,
} from '../components/icons.jsx'

// Catálogo único de capítulos ICAA (fuente: lib/proyectos.js) para no duplicar nombres.
const CAPITULOS_ICAA = PRESUPUESTO_CAPITULOS_ICAA.map(({ id, nombre }) => ({ id, nombre }))

const PASOS_SUBIDA = ['Leyendo documento…', 'Extrayendo importes…', 'Clasificando a partida…']

const GASTOS_INICIALES = [
  gastoXml('g-001', 'Catering Estela S.L.', 'B-87412099', 4380, '12/06', '07', [
    'Servicios de catering rodaje día 14',
    'Menús equipo técnico y figuración',
  ]),
  gastoXml('g-002', 'Camera Rental Madrid', 'B-81249018', 9250, '11/06', '06', [
    'Alquiler cámara principal',
    'Ópticas adicionales semana 3',
  ]),
  gastoOcr('g-003', 'Gasolinera Repsol', 'A-78374725', 78.4, '11/06', 'OCR PDF', '06', 92, [
    'Combustible furgoneta producción',
  ]),
  gastoOcr('g-004', 'Ferretería El Tornillo', 'B-80817231', 154.2, '10/06', 'OCR PDF', '04', 71, [
    'Tornillería y pintura mate',
    'Material refuerzo decorado',
  ]),
  gastoOcr('g-005', 'Hotel NH (8 noches)', 'A-28027944', 1120, '10/06', 'Parte móvil', '07', 88, [
    'Alojamiento equipo producción',
    'Bloque exteriores Madrid',
  ]),
  gastoXml('g-006', 'Eléctricos Prado', 'B-86011277', 3120, '09/06', '03', [
    'Refuerzo eléctrico jornada noche',
  ]),
  gastoXml('g-007', 'Vestuario Luna', 'B-83761192', 2280, '09/06', '04', [
    'Prendas de continuidad',
    'Arreglos de vestuario',
  ]),
  gastoXml('g-008', 'Seguridad Set', 'B-85440127', 1760, '08/06', '05', [
    'Control accesos localización',
  ]),
  gastoXml('g-009', 'Producciones Auxiliares', 'B-82914005', 5400, '08/06', '03', [
    'Auxiliares de producción',
    'Apoyo regiduría',
  ]),
  gastoXml('g-010', 'Sonido Directo Ruiz', 'B-81994402', 1950, '07/06', '03', [
    'Microfonía inalámbrica adicional',
  ]),
  gastoXml('g-011', 'Atrezzo Norte', 'B-70188430', 640, '07/06', '04', [
    'Reposición atrezo escena teatro',
  ]),
  gastoOcr('g-012', 'Taxi Producción Madrid', 'B-79940132', 42.8, '07/06', 'Email', '07', 84, [
    'Traslado actriz secundaria',
  ]),
]

function capituloNombre(id) {
  const cap = CAPITULOS_ICAA.find((c) => c.id === id)
  return cap ? `${cap.id} ${cap.nombre}` : id
}

function gastoXml(id, proveedor, nif, total, fecha, capitulo, lineas) {
  return crearGasto({ id, proveedor, nif, total, fecha, origen: 'Factura-e XML', capitulo, confianza: null, lineas })
}

function gastoOcr(id, proveedor, nif, total, fecha, origen, capitulo, confianza, lineas) {
  return crearGasto({ id, proveedor, nif, total, fecha, origen, capitulo, confianza, lineas })
}

function crearGasto({ id, proveedor, nif, total, fecha, origen, capitulo, confianza, lineas }) {
  const tasa = proveedor.includes('Gasolinera') || proveedor.includes('Taxi') ? 10 : 21
  const base = Math.round((total / (1 + tasa / 100)) * 100) / 100
  const iva = Math.round((total - base) * 100) / 100
  return {
    id,
    proveedor,
    nif,
    importe: total,
    fecha,
    origen,
    capitulo,
    partida: capituloNombre(capitulo),
    confianza,
    base,
    iva,
    total,
    lineas,
  }
}

function formatImporte(n) {
  return Number.isInteger(n) ? eur(n) : eurCents(n)
}

function origenTone(origen) {
  if (origen === 'Factura-e XML') return 'positive'
  if (origen === 'Email') return 'primary'
  return 'neutral'
}

function needsReview(gasto) {
  return gasto.origen !== 'Factura-e XML' && gasto.confianza < 80
}

function getCounts(gastos) {
  const facturaE = gastos.filter((g) => g.origen === 'Factura-e XML').length
  return { total: gastos.length, facturaE, ocr: gastos.length - facturaE }
}

export default function Facturas({ proyecto, pushToast, onNavigate, contexto, onPendingCountChange }) {
  const sinDatos = proyecto && proyecto.id !== PROYECTO_DEMO_ID
  const [gastos, setGastos] = useState(GASTOS_INICIALES)
  const [detalle, setDetalle] = useState(null)
  const [partidaEdit, setPartidaEdit] = useState('07')
  const [faseSubida, setFaseSubida] = useState('idle')
  const [paso, setPaso] = useState(0)
  const [subidas, setSubidas] = useState(0)
  const timers = useRef([])

  const counts = getCounts(gastos)
  const capituloActivoId = contexto?.capituloId
  const gastoActivoId = contexto?.gastoId
  const gastosCapitulo = capituloActivoId ? gastos.filter((g) => g.capitulo === capituloActivoId) : []

  useEffect(() => {
    onPendingCountChange?.(sinDatos ? 0 : gastos.length)
  }, [gastos.length, onPendingCountChange, sinDatos])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (!gastoActivoId) return
    const gasto = gastos.find((g) => g.id === gastoActivoId)
    if (gasto) abrirDetalle(gasto)
  }, [gastoActivoId, gastos])

  const abrirDetalle = (gasto) => {
    setDetalle(gasto)
    setPartidaEdit(gasto.capitulo)
  }

  const probarSubida = () => {
    if (faseSubida === 'scanning') return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setFaseSubida('scanning')
    setPaso(0)
    PASOS_SUBIDA.forEach((_, i) => {
      timers.current.push(setTimeout(() => setPaso(i), i * 720))
    })
    timers.current.push(
      setTimeout(() => {
        const next = subidas + 1
        setSubidas(next)
        const nuevo = gastoOcr(
          `g-new-${next}`,
          'Papelería Rodaje Norte',
          'B-76112044',
          64.9,
          '12/06',
          'OCR PDF',
          '11',
          83,
          ['Carpetas, rotuladores y cinta de marcaje'],
        )
        setGastos((prev) => [nuevo, ...prev])
        setFaseSubida('done')
        pushToast?.('Gasto de Papelería Rodaje Norte clasificado en 11 Gastos generales.')
      }, PASOS_SUBIDA.length * 720 + 250),
    )
  }

  const confirmar = () => {
    if (!detalle) return
    setGastos((prev) => prev.filter((g) => g.id !== detalle.id))
    pushToast?.(`Gasto de ${detalle.proveedor} confirmado.`)
    setDetalle(null)
  }

  const reasignar = () => {
    if (!detalle) return
    setGastos((prev) =>
      prev.map((g) =>
        g.id === detalle.id
          ? { ...g, capitulo: partidaEdit, partida: capituloNombre(partidaEdit), confianza: g.origen === 'Factura-e XML' ? null : 100 }
          : g,
      ),
    )
    const actualizado = { ...detalle, capitulo: partidaEdit, partida: capituloNombre(partidaEdit), confianza: detalle.origen === 'Factura-e XML' ? null : 100 }
    setDetalle(actualizado)
    pushToast?.(`Partida reasignada a ${capituloNombre(partidaEdit)}.`)
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Bandeja de gastos"
        subtitle={sinDatos ? 'Sin gastos cargados' : `${counts.total} pendientes · ${counts.facturaE} factura-e · ${counts.ocr} OCR y otros`}
        actions={
          capituloActivoId && (
            <Button variant="secondary" onClick={() => onNavigate?.('coste', { capituloId: capituloActivoId })}>
              Volver al coste
            </Button>
          )
        }
      />

      {sinDatos ? (
        <EmptyState
          icon={IconFacturas}
          title="Sin gastos cargados"
        >
          Los gastos de este proyecto aparecerán aquí cuando se registren facturas o partes.
        </EmptyState>
      ) : (
        <>
      {capituloActivoId && (
        <Card className="mb-3 border-[var(--accent)] bg-[var(--accent-soft)]/45 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-2xs font-bold uppercase tracking-wide text-[color:var(--accent)]">Capítulo conectado</div>
              <div className="mt-0.5 text-sm font-bold text-ink">Capítulo {capituloActivoId} · {gastosCapitulo.length} gastos en bandeja</div>
              <p className="mt-1 text-xs text-muted">Revisa importes, origen y confianza antes de pasarlos a base fiscal.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => onNavigate?.('compras', { capituloId: capituloActivoId })}>Ver órdenes</Button>
              <Button size="sm" variant="accent" onClick={() => onNavigate?.('elegibilidad', { capituloId: capituloActivoId })}>Validar fiscalidad</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-xs text-[color:var(--accent)]">
        <IconSparkle size={16} className="mt-0.5 shrink-0" />
        <span>Factura-e: datos estructurados. PDF y tickets: OCR con revisión.</span>
      </div>

      <UploadZone fase={faseSubida} paso={paso} onUpload={probarSubida} />

      <Card className="mt-3 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Proveedor</Th>
                <Th align="right">Importe</Th>
                <Th>Fecha</Th>
                <Th>Origen</Th>
                <Th>Partida sugerida</Th>
                <Th>Confianza</Th>
                <Th align="right">Decisión</Th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => {
                const revisar = needsReview(g)
                const activo = g.id === gastoActivoId || (capituloActivoId && g.capitulo === capituloActivoId)
                return (
                  <tr
                    key={g.id}
                    onClick={() => abrirDetalle(g)}
                    className={`cursor-pointer border-t border-line transition ${
                      activo ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]' : revisar ? 'bg-warning-soft/60 hover:bg-warning-soft' : 'hover:bg-surface/70'
                    }`}
                  >
                    <Td>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); abrirDetalle(g) }}
                        className="text-left font-semibold text-ink hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        aria-label={`Revisar gasto de ${g.proveedor}`}
                      >
                        {g.proveedor}
                      </button>
                      {revisar && (
                        <span className="mt-1 inline-flex items-center gap-1 text-2xs font-semibold text-warning" title="Revisa esta factura: confianza baja en la clasificación">
                          <IconAlert size={12} /> Confianza baja · revisar
                        </span>
                      )}
                    </Td>
                    <Td align="right" tabular className="font-semibold text-ink">{formatImporte(g.importe)}</Td>
                    <Td tabular className="text-muted">{g.fecha}</Td>
                    <Td><Origen gasto={g} /></Td>
                    <Td className="text-muted">{g.partida}</Td>
                    <Td><Confianza gasto={g} /></Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={IconChevronRight}
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigate?.('elegibilidad', { capituloId: g.capitulo, gastoId: g.id })
                        }}
                      >
                        Fiscalidad
                      </Button>
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

      <DetallePanel
        gasto={detalle}
        partidaEdit={partidaEdit}
        setPartidaEdit={setPartidaEdit}
        onClose={() => setDetalle(null)}
        onConfirm={confirmar}
        onReassign={reasignar}
        onNavigate={onNavigate}
      />
    </div>
  )
}

function UploadZone({ fase, paso, onUpload }) {
  const [dragActive, setDragActive] = useState(false)
  return (
    <Card
      className={`border-dashed p-5 transition ${dragActive ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50 ring-2 ring-[color:var(--accent)]/30' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragActive) setDragActive(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragActive(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        onUpload()
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[color:var(--accent)]">
            <IconUpload size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Subir gasto</h2>
            <p className="mt-1 text-sm text-muted">
              Arrastra una factura o foto de ticket para probar la clasificación.
            </p>
          </div>
        </div>
        <Button variant="primary" icon={IconUpload} onClick={onUpload} disabled={fase === 'scanning'}>
          Simular subida
        </Button>
      </div>

      {fase === 'scanning' && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="fp-sweep absolute inset-y-0 w-1/3 rounded-full bg-[var(--accent)]" />
          </div>
          <div className="flex flex-wrap gap-2">
            {PASOS_SUBIDA.map((texto, i) => {
              const activo = i === paso
              const hecho = i < paso
              return (
                <span
                  key={texto}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${
                    hecho ? 'bg-positive-soft text-positive' : activo ? 'bg-[var(--accent-soft)] text-[color:var(--accent)]' : 'bg-surface text-faint'
                  }`}
                >
                  {hecho ? <IconCheck size={12} /> : <span className={`h-1.5 w-1.5 rounded-full bg-current ${activo ? 'fp-pulse-dot' : ''}`} />}
                  {texto}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {fase === 'done' && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-positive-soft px-3 py-2 text-xs font-semibold text-positive">
          <IconFacturas size={15} />
          Fila nueva añadida con partida propuesta.
        </div>
      )}
    </Card>
  )
}

function Origen({ gasto }) {
  if (gasto.origen === 'Factura-e XML') {
    return (
      <span
        className="inline-flex flex-col items-start gap-1"
        title="Leída como dato estructurado de la factura electrónica. Sin OCR, sin errores de lectura."
      >
        <Chip tone="positive" dot>Factura-e XML</Chip>
        <span className="text-2xs font-semibold text-positive">Datos estructurados — fiable</span>
      </span>
    )
  }
  return <Chip tone={origenTone(gasto.origen)} dot>{gasto.origen}</Chip>
}

function Confianza({ gasto }) {
  if (gasto.origen === 'Factura-e XML')
    return (
      <span
        className="text-2xs font-semibold text-muted"
        title="No aplica: dato estructurado, sin OCR."
        aria-label="No aplica: dato estructurado sin OCR"
      >
        —
      </span>
    )
  const revisar = needsReview(gasto)
  return <Chip tone={revisar ? 'warning' : 'primary'} dot>{revisar ? `Revisar · ${gasto.confianza} %` : `${gasto.confianza} %`}</Chip>
}

function DetallePanel({ gasto, partidaEdit, setPartidaEdit, onClose, onConfirm, onReassign, onNavigate }) {
  if (!gasto) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[440px] flex-col border-l border-line bg-canvas shadow-modal">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">{gasto.proveedor}</h2>
              <p className="mt-0.5 text-sm text-muted">{formatImporte(gasto.total)} · {gasto.fecha}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-faint hover:bg-surface hover:text-ink"
              aria-label="Cerrar detalle"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center gap-2">
            <Origen gasto={gasto} />
            {needsReview(gasto) && <Chip tone="warning" dot>Revisa esta factura: confianza baja en la clasificación</Chip>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Emisor" value={gasto.proveedor} className="col-span-2" />
            <Campo label="NIF" value={gasto.nif} />
            <Campo label="Base imponible" value={eurCents(gasto.base)} />
            <Campo label="IVA" value={eurCents(gasto.iva)} />
            <Campo label="Total" value={eurCents(gasto.total)} />
          </div>

          <div className="mt-4 rounded-lg border border-line">
            <div className="border-b border-line bg-surface px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-faint">
              Líneas de detalle
            </div>
            <div className="divide-y divide-line">
              {gasto.lineas.map((linea) => (
                <div key={linea} className="px-3 py-2 text-sm text-muted">{linea}</div>
              ))}
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-2xs font-semibold uppercase tracking-wide text-faint">Partida</span>
            <select
              value={partidaEdit}
              onChange={(e) => setPartidaEdit(e.target.value)}
              className="fp-input w-full px-3.5 py-2 text-sm font-semibold"
            >
              {CAPITULOS_ICAA.map((c) => (
                <option key={c.id} value={c.id}>{c.id} · {c.nombre}</option>
              ))}
            </select>
          </label>

          <p className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-3 py-2.5 text-xs leading-relaxed text-[color:var(--accent)]">
            Tu corrección entrena las sugerencias futuras de este proyecto.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface/60 px-5 py-3">
          <Button variant="ghost" onClick={() => onNavigate?.('coste', { capituloId: partidaEdit })}>Ver coste</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('elegibilidad', { capituloId: partidaEdit, gastoId: gasto.id })}>Validar fiscalidad</Button>
          <Button variant="secondary" onClick={onReassign}>Reasignar partida</Button>
          <Button variant="primary" icon={IconCheck} onClick={onConfirm}>Confirmar</Button>
        </div>
      </aside>
    </div>
  )
}

function Campo({ label, value, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface/50 p-3 ${className}`}>
      <div className="text-2xs font-semibold uppercase tracking-wide text-faint">{label}</div>
      <div className="tnum mt-0.5 text-sm font-medium text-ink">{value}</div>
    </div>
  )
}
