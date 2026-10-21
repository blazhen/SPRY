const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
const moneyWhole = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export const fmtMoney = (n: number) => money.format(n)
export const fmtMoneyWhole = (n: number) => moneyWhole.format(n)

/** "21 Oct 2026" from an ISO date or timestamp. */
export function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const todayISO = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`

export const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('en-AU', { maximumFractionDigits: 2 }))
