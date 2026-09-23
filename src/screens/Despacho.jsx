import { Card, Chip, PageHeader, Button, Th, Td } from '../components/ui.jsx'
import { IconDownload } from '../components/icons.jsx'
import { eur } from '../lib/format.js'

const CLIENTES = [
  {
    productora: 'Candilejas Films',
    proyecto: 'La última función',
    deduccion: 851_420,
    documentacion: 'Completa',
    deadline: '05/06/2026',
    estado: 'Listo para revisión',
  },
  {
    productora: 'Costa Norte AIE',
    proyecto: 'Bruma',
    deduccion: 620_000,
    documentacion: 'Pendiente',
    deadline: '14/06/2026',
    estado: 'Falta certificado cultural',
  },
  {
    productora: 'Nébula Studio',
    proyecto: 'Atlas',
    deduccion: 1_240_000,
    documentacion: 'Completa',
    deadline: '30/06/2026',
    estado: 'Certificación en curso',
  },
  {
    productora: 'Mar Abierto Films',
    proyecto: 'Las mareas',
    deduccion: 480_000,
    documentacion: 'Pendiente',
    deadline: '08/07/2026',
    estado: 'Requiere auditoría de gasto',
  },
  {
    productora: 'Rodaje Sur',
    proyecto: 'Kilómetro cero',
    deduccion: 730_000,
    documentacion: 'Completa',
    deadline: '15/07/2026',
    estado: 'Preparado Modelo 200',
  },
  {
    productora: 'Prisma Animación',
    proyecto: 'Lúa',
    deduccion: 1_000_000,
    documentacion: 'Pendiente',
    deadline: '22/07/2026',
    estado: 'Pendiente anexos Art. 36',
  },
]

function docTone(doc) {
  return doc === 'Completa' ? 'positive' : 'warning'
}

function estadoTone(estado) {
  if (estado.includes('Listo') || estado.includes('Preparado')) return 'positive'
  if (estado.includes('curso')) return 'primary'
  if (estado.includes('Falta') || estado.includes('Pendiente') || estado.includes('Requiere')) return 'warning'
  return 'neutral'
}

export default function Despacho({ pushToast }) {
  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Consola Despacho"
        subtitle="28 clientes activos · documentación lista para revisar y certificar. Datos de demo: 01/06/2026."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="neutral" dot>Vista auditor</Chip>
            <Button variant="primary" icon={IconDownload} onClick={() => pushToast?.('Exportando Modelo 200 + anexos del Art. 36… (demo)')}>
              Exportar Modelo 200 + anexos Art. 36
            </Button>
          </div>
        }
      />

      <p className="mb-3 text-xs font-semibold text-muted">Tu fiscalista firma. SetValio prepara la documentación.</p>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr>
                <Th>Productora</Th>
                <Th>Proyecto</Th>
                <Th align="right">Deducción estimada</Th>
                <Th>Documentación</Th>
                <Th>Próximo deadline</Th>
                <Th>Estado fiscal</Th>
              </tr>
            </thead>
            <tbody>
              {CLIENTES.map((c) => (
                <tr key={`${c.productora}-${c.proyecto}`} className="border-t border-line transition hover:bg-surface/70">
                  <Td className="font-medium text-ink">{c.productora}</Td>
                  <Td className="text-muted">{c.proyecto}</Td>
                  <Td align="right" tabular className="font-semibold text-ink">{eur(c.deduccion)}</Td>
                  <Td><Chip tone={docTone(c.documentacion)} dot>{c.documentacion}</Chip></Td>
                  <Td tabular className="text-muted">{c.deadline}</Td>
                  <Td><Chip tone={estadoTone(c.estado)}>{c.estado}</Chip></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
