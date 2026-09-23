import { useMemo, useState } from 'react'
import { Button, Card, Chip, EmptyState, KPI, Modal, PageHeader, ProgressBar, SectionTitle, Td, Th } from '../components/ui.jsx'
import { IconAlert, IconCheckCircle, IconClock, IconDownload, IconFacturas, IconSearch, IconUpload } from '../components/icons.jsx'
import { eur, pct } from '../lib/format.js'
import { PROYECTO_DEMO_ID } from '../lib/data.js'

const BLOQUES = [
  'Proyecto y obra',
  'Nacionalidad y certificado cultural',
  'Presupuesto y coste',
  'Contratos',
  'Facturas y pagos',
  'Ayudas y subvenciones',
  'Coproducción',
  'Deducción fiscal / Art. 36',
]

const DOCUMENTOS_CLAVE = [
  {
    bloque: 'Nacionalidad y certificado cultural',
    documento: 'Certificado cultural ICAA',
    responsable: 'Productora',
    estado: 'Bloqueante',
    deadline: '05/06/2026',
    evidencia: 'No recibido',
    origen: 'Ayudas · ICAA Generales',
    razon: 'Acredita el carácter cultural de la obra y bloquea la deducción si no está disponible.',
    accion: 'Solicitar certificado',
  },
  {
    bloque: 'Facturas y pagos',
    documento: 'Justificantes de pago vinculados a facturas',
    responsable: 'Line producer',
    estado: 'Bloqueante',
    deadline: '14/06/2026',
    evidencia: '6 pagos sin justificante',
    origen: 'Bandeja de gastos',
    razon: 'El gasto debe estar soportado por factura y pago trazable para auditoría.',
    accion: 'Solicitar justificantes',
  },
  {
    bloque: 'Presupuesto y coste',
    documento: 'Coste reconocido por capítulos ICAA',
    responsable: 'Fiscalista',
    estado: 'Bloqueante',
    deadline: '20/06/2026',
    evidencia: 'Pendiente de cierre de coste',
    origen: 'Control de costes',
    razon: 'La base de deducción necesita cuadrar con el coste real y sus capítulos oficiales.',
    accion: 'Revisar coste',
  },
  {
    bloque: 'Nacionalidad y certificado cultural',
    documento: 'Certificado de nacionalidad española',
    responsable: 'Productora',
    estado: 'Pendiente',
    deadline: '12/06/2026',
    evidencia: 'Solicitud preparada',
    origen: 'Checklist documental',
    razon: 'Documento básico para justificar producción española ante ICAA y fiscalista.',
    accion: 'Marcar recibido',
  },
  {
    bloque: 'Ayudas y subvenciones',
    documento: 'Resolución ICAA Generales incorporada al plan',
    responsable: 'Productora',
    estado: 'Pendiente',
    deadline: '15/09/2026',
    evidencia: 'Convocatoria abierta',
    origen: 'Ayudas y financiación',
    razon: 'Las subvenciones minoran base de deducción y deben incorporarse al plan financiero.',
    accion: 'Actualizar cuando resuelva',
  },
  {
    bloque: 'Contratos',
    documento: 'Contrato de coproducción si aplica',
    responsable: 'Legal',
    estado: 'Revisar',
    deadline: '21/06/2026',
    evidencia: 'Borrador subido',
    origen: 'Centro documental',
    razon: 'Define participación, territorios y tratamiento de aportaciones en caso de coproducción.',
    accion: 'Solicitar corrección',
  },
  {
    bloque: 'Facturas y pagos',
    documento: 'Facturas con confianza de clasificación baja',
    responsable: 'Producción',
    estado: 'Revisar',
    deadline: '10/06/2026',
    evidencia: 'Ferretería El Tornillo · 71 %',
    origen: 'Bandeja de gastos',
    razon: 'Una partida mal clasificada puede mover la base por capítulos y afectar auditoría.',
    accion: 'Reasignar partida',
  },
  {
    bloque: 'Deducción fiscal / Art. 36',
    documento: 'Cálculo de intensidad ayudas + deducción',
    responsable: 'Fiscalista',
    estado: 'Pendiente',
    deadline: '30/06/2026',
    evidencia: 'Escenario recomendado guardado',
    origen: 'Optimizador de incentivos',
    razon: 'La suma de ayudas y deducción no debe superar los límites de intensidad aplicables.',
    accion: 'Validar cálculo',
  },
  {
    bloque: 'Deducción fiscal / Art. 36',
    documento: 'Modelo 200 y anexos Art. 36',
    responsable: 'Fiscalista',
    estado: 'Pendiente',
    deadline: '25/07/2026',
    evidencia: 'Borrador no generado',
    origen: 'Consola Despacho',
    razon: 'Entregable fiscal final, preparado por SetValio y validado por el asesor.',
    accion: 'Preparar anexos',
  },
  {
    bloque: 'Deducción fiscal / Art. 36',
    documento: 'Informe de auditoría de gasto',
    responsable: 'Auditor',
    estado: 'Pendiente',
    deadline: '18/07/2026',
    evidencia: 'Pendiente de facturas y pagos',
    origen: 'Informes',
    razon: 'Acredita el coste elegible y deja trazabilidad para la aplicación fiscal.',
    accion: 'Preparar paquete auditoría',
  },
  {
    bloque: 'Ayudas y subvenciones',
    documento: 'Declaración de ayudas recibidas',
    responsable: 'Fiscalista',
    estado: 'Pendiente',
    deadline: '30/06/2026',
    evidencia: 'Falta confirmar MEDIA',
    origen: 'Ayudas y financiación',
    razon: 'Evita superar límites de intensidad y documenta la minoración de base.',
    accion: 'Completar declaración',
  },
  {
    bloque: 'Proyecto y obra',
    documento: 'Memoria del proyecto',
    responsable: 'Productora',
    estado: 'Validado fiscalista',
    deadline: '01/06/2026',
    evidencia: 'PDF v3',
    origen: 'Proyecto',
    razon: 'Describe obra, equipo creativo y encaje cultural.',
    accion: 'Ver evidencia',
  },
  {
    bloque: 'Presupuesto y coste',
    documento: 'Presupuesto aprobado por capítulos',
    responsable: 'Line producer',
    estado: 'Validado fiscalista',
    deadline: '01/06/2026',
    evidencia: '12 capítulos ICAA',
    origen: 'Presupuesto',
    razon: 'Fuente única del coste presupuestado y base para plan financiero.',
    accion: 'Ver presupuesto',
  },
]

const COMPLETOS = [
  ['Proyecto y obra', 'Ficha técnica del proyecto', 'Productora'],
  ['Proyecto y obra', 'Sinopsis y tratamiento', 'Productora'],
  ['Proyecto y obra', 'Cadena de titularidad de derechos', 'Legal'],
  ['Proyecto y obra', 'Listado de equipo creativo', 'Producción'],
  ['Proyecto y obra', 'Plan de rodaje aprobado', 'Line producer'],
  ['Presupuesto y coste', 'Presupuesto total firmado', 'Line producer'],
  ['Presupuesto y coste', 'Cap. 01 Guion y música', 'Producción'],
  ['Presupuesto y coste', 'Cap. 02 Personal artístico', 'Producción'],
  ['Presupuesto y coste', 'Cap. 03 Equipo técnico', 'Producción'],
  ['Presupuesto y coste', 'Cap. 04 Escenografía', 'Producción'],
  ['Presupuesto y coste', 'Cap. 05 Estudios de rodaje y varios de producción', 'Producción'],
  ['Presupuesto y coste', 'Cap. 06 Maquinaria de rodaje y transportes', 'Producción'],
  ['Presupuesto y coste', 'Cap. 07 Viajes, hoteles y comidas', 'Producción'],
  ['Presupuesto y coste', 'Cap. 08 Soportes y material sensible', 'Producción'],
  ['Presupuesto y coste', 'Cap. 09 Laboratorio y postproducción', 'Postproducción'],
  ['Presupuesto y coste', 'Cap. 10 Seguros', 'Producción'],
  ['Presupuesto y coste', 'Cap. 11 Gastos generales', 'Producción'],
  ['Presupuesto y coste', 'Cap. 12 Gastos de explotación, comercial y financieros', 'Finanzas'],
  ['Contratos', 'Contrato director/a', 'Legal'],
  ['Contratos', 'Contratos reparto principal', 'Legal'],
  ['Contratos', 'Contratos equipo técnico clave', 'Legal'],
  ['Contratos', 'Cesión derechos música original', 'Legal'],
  ['Facturas y pagos', 'Factura-e XML estructuradas', 'Administración'],
  ['Facturas y pagos', 'Relación de facturas por capítulo', 'Administración'],
  ['Facturas y pagos', 'Parte móvil de gastos de rodaje', 'Producción'],
  ['Ayudas y subvenciones', 'Plan de financiación vigente', 'Finanzas'],
  ['Ayudas y subvenciones', 'Ficha ICAA Selectivas 2025', 'Finanzas'],
  ['Ayudas y subvenciones', 'Ficha Eurimages / anticipo reembolsable', 'Finanzas'],
  ['Coproducción', 'Declaración no coproducción UE', 'Productora'],
]

function documentos(proyecto) {
  const cerrados = COMPLETOS.map(([bloque, documento, responsable], i) => ({
    bloque,
    documento,
    responsable,
    estado: i % 3 === 0 ? 'Validado fiscalista' : 'Completo',
    deadline: '01/06/2026',
    evidencia: i % 2 === 0 ? 'Archivo validado' : 'Dato estructurado',
    origen: bloque === 'Facturas y pagos' ? 'Bandeja de gastos' : bloque,
    razon: 'Documento disponible y trazado dentro del expediente fiscal.',
    accion: 'Ver evidencia',
  }))
  return [...DOCUMENTOS_CLAVE, ...cerrados].map((d, i) => ({
    id: `doc-${String(i + 1).padStart(2, '0')}`,
    proyecto: proyecto?.titulo ?? 'Proyecto',
    ...d,
  }))
}

function toneEstado(estado) {
  if (estado === 'Completo' || estado === 'Validado fiscalista') return 'positive'
  if (estado === 'Bloqueante') return 'negative'
  if (estado === 'Revisar') return 'warning'
  return 'primary'
}

function iconoEstado(estado) {
  if (estado === 'Completo' || estado === 'Validado fiscalista') return IconCheckCircle
  if (estado === 'Bloqueante') return IconAlert
  return IconClock
}

function resumenBloques(docs) {
  return BLOQUES.map((bloque) => {
    const items = docs.filter((d) => d.bloque === bloque)
    const completos = items.filter((d) => d.estado === 'Completo' || d.estado === 'Validado fiscalista').length
    return { bloque, total: items.length, completos, pct: items.length ? completos / items.length : 0 }
  })
}

export default function Documental({ proyecto, pushToast, contexto }) {
  const docs = useMemo(() => documentos(proyecto), [proyecto])
  const [filtroBloque, setFiltroBloque] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [activo, setActivo] = useState(null)
  const sinDatos = proyecto && proyecto.id !== PROYECTO_DEMO_ID

  const completos = docs.filter((d) => d.estado === 'Completo' || d.estado === 'Validado fiscalista').length
  const pendientes = docs.filter((d) => d.estado === 'Pendiente' || d.estado === 'Revisar').length
  const criticos = docs.filter((d) => d.estado === 'Bloqueante').length
  const avance = completos / docs.length
  const filtrados = docs.filter((d) => (filtroBloque === 'Todos' || d.bloque === filtroBloque) && (filtroEstado === 'Todos' || d.estado === filtroEstado))
  const bloques = resumenBloques(docs)

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Dossier fiscal"
        subtitle="Certificados, justificantes y validación fiscal."
        actions={
          <>
            <Button variant="secondary" icon={IconUpload} disabled={sinDatos} onClick={() => pushToast?.('Preparando subida documental…')}>
              Subir documento
            </Button>
            <Button variant="primary" icon={IconDownload} disabled={sinDatos} onClick={() => pushToast?.('Generando dossier fiscal…')}>
              Preparar dossier fiscal
            </Button>
          </>
        }
      />

      {contexto?.capituloId && !sinDatos && (
        <Card className="mb-3 border-[var(--accent)] bg-[var(--accent-soft)]/45 px-4 py-3">
          <div className="text-sm font-semibold text-ink">Capítulo {contexto.capituloId}{contexto.gastoId ? ` · gasto ${contexto.gastoId}` : ''}</div>
        </Card>
      )}

      {sinDatos ? (
        <EmptyState
          icon={IconFacturas}
          title="Sin documentos cargados"
        >
          El expediente aparecerá aquí cuando se registren certificados, facturas y justificantes.
        </EmptyState>
      ) : (
        <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <KPI label="Completos" value={`${completos} / ${docs.length}`} sub={pct(avance)} tone="text-positive" footer={<ProgressBar value={avance} tone="positive" />} />
        </div>
        <KPI label="Pendientes" value={pendientes} sub="Pendiente o revisar" tone="text-warning" />
        <KPI label="Bloqueantes" value={criticos} sub="Impiden el cierre fiscal" tone="text-negative" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <Card className="p-5">
          <SectionTitle>Checklist Art. 36</SectionTitle>
          <div className="space-y-2.5">
            {bloques.map((b) => (
              <button
                key={b.bloque}
                type="button"
                onClick={() => setFiltroBloque(b.bloque)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition hover:bg-surface ${
                  filtroBloque === b.bloque ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-line bg-canvas'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-ink">{b.bloque}</span>
                  <span className="tnum text-xs font-semibold text-muted">{b.completos}/{b.total}</span>
                </div>
                <ProgressBar value={b.pct} tone={b.pct === 1 ? 'positive' : 'primary'} className="mt-2" />
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => setFiltroBloque('Todos')}>
            Ver todos los bloques
          </Button>
        </Card>

        <Card className="p-5">
          <SectionTitle right={<Chip tone="warning" dot>Próximo hito 05/06/2026</Chip>}>
            Riesgos documentales
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {docs.filter((d) => d.estado === 'Bloqueante' || d.estado === 'Revisar').map((d) => {
              const Icon = iconoEstado(d.estado)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActivo(d)}
                  className="rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:bg-canvas"
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${d.estado === 'Bloqueante' ? 'bg-negative-soft text-negative' : 'bg-warning-soft text-warning'}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{d.documento}</span>
                      <span className="mt-1 block text-2xs leading-relaxed text-muted">{d.evidencia} · {d.deadline}</span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 px-5 pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-ink">Matriz documental</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-muted">
              Bloque
              <select value={filtroBloque} onChange={(e) => setFiltroBloque(e.target.value)} className="bg-transparent font-bold text-ink">
                <option>Todos</option>
                {BLOQUES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-muted">
              Estado
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="bg-transparent font-bold text-ink">
                {['Todos', 'Completo', 'Validado fiscalista', 'Pendiente', 'Revisar', 'Bloqueante'].map((e) => <option key={e}>{e}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Bloque</Th>
                <Th>Documento</Th>
                <Th>Responsable</Th>
                <Th>Estado</Th>
                <Th>Fecha límite</Th>
                <Th>Evidencia</Th>
                <Th align="right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d) => {
                const Icon = iconoEstado(d.estado)
                return (
                  <tr key={d.id} className={`border-t border-line transition hover:bg-surface/70 ${d.estado === 'Bloqueante' ? 'bg-negative-soft/35' : d.estado === 'Revisar' ? 'bg-warning-soft/35' : ''}`}>
                    <Td className="text-muted">{d.bloque}</Td>
                    <Td>
                      <div className="font-semibold text-ink">{d.documento}</div>
                      <div className="text-2xs text-faint">{d.origen}</div>
                    </Td>
                    <Td className="text-muted">{d.responsable}</Td>
                    <Td>
                      <Chip tone={toneEstado(d.estado)} dot>
                        <Icon size={12} /> {d.estado}
                      </Chip>
                    </Td>
                    <Td tabular className={d.estado === 'Bloqueante' ? 'font-semibold text-negative' : 'text-muted'}>{d.deadline}</Td>
                    <Td className="text-muted">{d.evidencia}</Td>
                    <Td align="right">
                      <Button size="sm" variant="secondary" icon={IconSearch} onClick={() => setActivo(d)}>
                        Resolver
                      </Button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" icon={IconDownload} onClick={() => pushToast?.('Preparando ZIP documental…')}>
          Preparar ZIP documental
        </Button>
        <Button variant="secondary" icon={IconFacturas} onClick={() => pushToast?.('Preparando Modelo 200 + anexos…')}>
          Preparar Modelo 200 + anexos Art. 36
        </Button>
        <Button variant="accent" onClick={() => pushToast?.('Enviando expediente al fiscalista…')}>
          Enviar paquete al fiscalista
        </Button>
      </div>
        </>
      )}

      <Modal
        open={!!activo}
        onClose={() => setActivo(null)}
        width="max-w-2xl"
        title={activo?.documento}
        subtitle={activo ? `${activo.bloque} · ${activo.proyecto}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActivo(null)}>Cerrar</Button>
            <Button variant="secondary" onClick={() => pushToast?.('Solicitud de corrección enviada.')}>Solicitar corrección</Button>
            <Button variant="primary" onClick={() => {
              pushToast?.('Documento marcado para validación fiscal.')
              setActivo(null)
            }}>
              Marcar listo para firma
            </Button>
          </>
        }
      >
        {activo && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={toneEstado(activo.estado)} dot>{activo.estado}</Chip>
              <Chip tone="neutral">{activo.responsable}</Chip>
              <span className="text-xs text-faint">Límite {activo.deadline}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-3">
                <div className="text-2xs font-bold uppercase tracking-wide text-faint">Por qué se necesita</div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{activo.razon}</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-3">
                <div className="text-2xs font-bold uppercase tracking-wide text-faint">Evidencia asociada</div>
                <p className="mt-1 text-sm font-semibold text-ink">{activo.evidencia}</p>
                <p className="mt-1 text-xs text-muted">Origen: {activo.origen}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-3">
              <div className="text-2xs font-bold uppercase tracking-wide text-faint">Acción recomendada</div>
              <p className="mt-1 text-sm text-ink">{activo.accion}</p>
              <p className="mt-2 text-2xs text-faint">Tu fiscalista firma. SetValio prepara la documentación.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
