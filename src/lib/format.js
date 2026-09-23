// Formateo es-ES. Una sola fuente de verdad para toda cifra de la interfaz.

// useGrouping: 'always' fuerza el separador de miles también en cifras de cuatro
// dígitos (6.000 €), para que las columnas tabulares queden alineadas.
const eur0 = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: 'always',
})

const eur2 = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

const num0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' })

/** 1.170.000 € — sin decimales (uso general en KPIs y tablas de presupuesto). */
export function eur(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return eur0.format(Math.round(n))
}

/** 28.314,00 € — con dos decimales (importes de factura). */
export function eurCents(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return eur2.format(n)
}

/** +33.000 € / −6.000 € — con signo explícito para desviaciones. */
export function eurSigned(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const s = eur0.format(Math.abs(Math.round(n)))
  if (n > 0) return `+${s}`
  if (n < 0) return `−${s}`
  return s
}

/** Recibe una RATIO (0–1) y devuelve el porcentaje: pct(0,4875) → «48,75 %». */
export function pct(n, decimals = 1) {
  if (n == null || Number.isNaN(n)) return '—'
  const f = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${f.format(n * 100)} %`
}

/** Ratio (0–1) con signo: pctSigned(0,014) → «+1,4 %». */
export function pctSigned(n, decimals = 1) {
  if (n == null || Number.isNaN(n)) return '—'
  const f = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const v = f.format(Math.abs(n) * 100)
  if (n > 0) return `+${v} %`
  if (n < 0) return `−${v} %`
  return `${v} %`
}

/** Entero con separador de miles (18 / 30 días, recuentos). */
export function num(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return num0.format(n)
}

/** 1.200.000 → «1,20 M€» (millones, para bandas de retorno). */
export function millones(n, decimals = 2) {
  if (n == null || Number.isNaN(n)) return '—'
  const f = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${f.format(n / 1e6)} M€`
}

/** Rango en millones: «1,10–1,20 M€». */
export function millonesRango(lo, hi, decimals = 2) {
  if (lo == null || hi == null) return '—'
  const f = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${f.format(lo / 1e6)}–${f.format(hi / 1e6)} M€`
}
