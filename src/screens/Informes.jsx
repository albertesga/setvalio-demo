import { useState } from 'react'
import { Card, Chip, PageHeader, Button, Modal } from '../components/ui.jsx'
import { IconDownload, IconFacturas, IconSparkle, IconCheckCircle, IconAlert } from '../components/icons.jsx'

const INFORMES = [
  {
    id: 'coste',
    nombre: 'Informe de coste semanal',
    estado: 'Listo',
    detalle: 'Corte de demo: 01/06/2026, 21:30',
    resumen: 'Coste estimado final, desviación por capítulo y proyección a cierre de la semana en curso.',
    secciones: ['Resumen ejecutivo de coste', 'Desviación por capítulo (modelo ICAA)', 'Proyección a cierre y alertas', 'Anexo: gasto a fecha por partida'],
  },
  {
    id: 'incentivo',
    nombre: 'Dossier incentivo fiscal',
    estado: 'Preparando',
    detalle: 'Incluye optimización Canarias y documentación ICAA',
    resumen: 'Dossier para la deducción del art. 36 LIS con la combinación óptima de territorio y ayudas.',
    secciones: ['Base de deducción y tipos aplicables', 'Comparativa por territorio', 'Requisitos y límites de intensidad', 'Anexo: documentación ICAA'],
  },
  {
    id: 'auditoria',
    nombre: 'Paquete auditoría facturas',
    estado: 'Pendiente',
    detalle: '12 gastos pendientes de clasificación',
    resumen: 'Paquete de facturas estructuradas listo para el auditor: clasificación por capítulo y trazabilidad.',
    secciones: ['Listado de facturas por capítulo', 'Factura electrónica vs OCR', 'Pendientes de validación (12)', 'Anexo: certificados y CIF'],
  },
]

function toneEstado(estado) {
  if (estado === 'Listo') return 'positive'
  if (estado === 'Preparando') return 'primary'
  return 'warning'
}

export default function Informes({ proyecto, pushToast }) {
  const [abierto, setAbierto] = useState(null)

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Informes"
        subtitle="Entregables para producción y fiscalidad."
        actions={<Button variant="secondary" icon={IconDownload} onClick={() => pushToast?.('Exportando índice de informes… (demo)')}>Compartir índice</Button>}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {INFORMES.map((informe) => (
          <Card key={informe.id} className="flex flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[color:var(--accent)]">
                {informe.estado === 'Listo' ? <IconFacturas size={17} /> : <IconSparkle size={17} />}
              </span>
              <Chip tone={toneEstado(informe.estado)} dot>{informe.estado}</Chip>
            </div>
            <h2 className="text-sm font-semibold text-ink">{informe.nombre}</h2>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{informe.detalle}</p>
            <Button variant="secondary" className="mt-4 w-fit" onClick={() => setAbierto(informe)}>Revisar entregable</Button>
          </Card>
        ))}
      </div>

      <Modal
        open={!!abierto}
        onClose={() => setAbierto(null)}
        width="max-w-xl"
        title={abierto?.nombre}
        subtitle={`${proyecto?.titulo ?? ''} · vista previa`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAbierto(null)}>Cerrar</Button>
            <Button
              variant="primary"
              icon={IconDownload}
              onClick={() => {
                pushToast?.(`Descargando «${abierto?.nombre}» en PDF… (demo)`)
                setAbierto(null)
              }}
            >
              Preparar PDF
            </Button>
          </>
        }
      >
        {abierto && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Chip tone={toneEstado(abierto.estado)} dot>{abierto.estado}</Chip>
              {abierto.estado !== 'Listo' && (
                <span className="inline-flex items-center gap-1 text-2xs text-warning">
                  <IconAlert size={13} /> Borrador: aún en preparación
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted">{abierto.resumen}</p>
            <div className="mt-4 text-2xs font-bold uppercase tracking-wide text-faint">Contenido del informe</div>
            <ul className="mt-2 space-y-2">
              {abierto.secciones.map((s) => (
                <li key={s} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface/50 px-3 py-2.5">
                  <IconCheckCircle size={16} className="mt-0.5 shrink-0 text-positive" />
                  <span className="text-sm text-ink">{s}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-2xs text-faint">Vista previa de demostración. El PDF final lo valida y firma tu asesor.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
