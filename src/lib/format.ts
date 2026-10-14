import type { RequestType } from '../api/types'
import { currentLang, intlLocale, translate } from '../i18n/translate'
import type { TKey } from '../i18n/en'

const tr = (key: TKey, vars?: Record<string, string | number>) => translate(currentLang(), key, vars)

export const ROLES = ['manager', 'team_leader', 'employee'] as const
export const REQUEST_TYPES = ['leave', 'allowance', 'mission', 'early_leave', 'overtime', 'complaint'] as const
export const BOARD_STATUSES = ['present', 'late', 'absent', 'on_leave', 'day_off', 'not_yet'] as const
export const EARNING_KEYS = ['transport_allowance', 'extra_days', 'overtime', 'bonus_kpi', 'living_allowance', 'reward', 'other'] as const
export const DEDUCTION_KEYS = ['late', 'absence', 'advances', 'penalties', 'monthly_tax', 'social_insurance', 'health_insurance', 'other'] as const

export const roleLabel = (role: string) => tr(`role_${role}` as TKey)
export const requestTypeLabel = (type: string) => tr(`rt_${type}` as TKey)
export const boardLabel = (s: string) => tr(`st_${s}` as TKey)
export const earningLabel = (k: string) => tr(`e_${k}` as TKey)
export const deductionLabel = (k: string) => tr(`d_${k}` as TKey)
export const weekdayLabel = (d: number) => tr(`wd_${d}` as TKey)
/** "Friday and Saturday" / "الجمعة والسبت"; empty string when there are none. */
export const fmtDaysOff = (days: number[]) =>
  new Intl.ListFormat(intlLocale(), { style: 'long', type: 'conjunction' }).format([...days].sort((a, b) => a - b).map(weekdayLabel))

/** Label for request / payslip / document statuses. */
export function statusLabel(kind: 'request' | 'payslip' | 'document', status: string) {
  const prefix = kind === 'request' ? 'rs' : kind === 'payslip' ? 'ps' : 'ds'
  return tr(`${prefix}_${status}` as TKey)
}

export const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = {
  approved: 'green', present: 'green', published: 'green', active: 'green',
  pending: 'amber', late: 'amber', submitted: 'amber', draft: 'gray',
  rejected: 'red', absent: 'red', missing: 'red',
  cancelled: 'gray', day_off: 'gray', not_yet: 'gray', inactive: 'gray',
  on_leave: 'blue',
}

export const today = () => new Date().toLocaleDateString('en-CA')
export const thisMonth = () => today().slice(0, 7)

function parse(iso: string) {
  if (iso.length === 10) return new Date(`${iso}T00:00:00`)
  // SQLite datetime('now') values look like "2026-10-11 12:00:00" and are UTC.
  return new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`)
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return parse(iso).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDay(iso: string) {
  return parse(iso).toLocaleDateString(intlLocale(), { weekday: 'short', day: 'numeric' })
}

export function fmtMonth(month: string) {
  return parse(`${month}-01`).toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' })
}

export function fmtLongDate(iso: string) {
  return parse(iso).toLocaleDateString(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function fmtMinutes(min: number | null | undefined) {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  const [hu, mu] = currentLang() === 'ar' ? ['س', 'د'] : ['h', 'm']
  return h ? `${h}${hu} ${String(m).padStart(2, '0')}${mu}` : `${m}${mu}`
}

export const fmtNumber = (n: number) => n.toLocaleString(intlLocale(), { maximumFractionDigits: 2 })

export const fmtMoney = (n: number | null | undefined, currency = 'EGP') =>
  n == null ? '—' : `${fmtNumber(n)} ${currentLang() === 'ar' && currency === 'EGP' ? 'ج.م' : currency}`

export function requestSummary(r: { type: RequestType; leave_type: string | null; start_date: string | null; end_date: string | null; days: number | null; start_time: string | null; hours: number | null; amount: number | null; destination: string | null }) {
  const range = `${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}`
  switch (r.type) {
    case 'leave': return `${tr(`lt_${r.leave_type ?? 'annual'}` as TKey)} · ${range} · ${tr('days_n', { n: r.days ?? 0 })}`
    case 'mission': return `${r.destination} · ${range} · ${tr('days_n', { n: r.days ?? 0 })}`
    case 'early_leave': return `${fmtDate(r.start_date)} · ${tr('at_time', { time: r.start_time ?? '' })}`
    case 'overtime': return `${fmtDate(r.start_date)} · ${tr('hours_n', { n: r.hours ?? 0 })}`
    case 'allowance': return fmtMoney(r.amount)
    default: return ''
  }
}

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')

export const roleTone = (role: string) => (role === 'manager' ? 'gold' : role === 'team_leader' ? 'blue' : 'gray') as 'gold' | 'blue' | 'gray'
