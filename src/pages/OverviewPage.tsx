import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Overview } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { Button, Card, Empty, ErrorBox, Field, Loading, PageHeader, Person, Stat, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { fmtDate, fmtDay, fmtLongDate, fmtNumber, requestSummary, requestTypeLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

export function OverviewPage() {
  const { user, isManager } = useAuth()
  const { t, lang } = useI18n()
  const [draftFrom, setDraftFrom] = useState<string | null>(null)
  const [draftTo, setDraftTo] = useState<string | null>(null)
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [rangeError, setRangeError] = useState<'order' | 'length' | null>(null)
  const { data, error, loading, reload } = useApi(
    () => api.get<Overview>('/overview', range ?? {}),
    [range?.from, range?.to],
  )

  const labels = lang === 'ar' ? {
    title: 'إحصائيات الحضور', currentMonth: 'الشهر الحالي', apply: 'عرض الفترة', invalid: 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساويًا له.', tooLong: 'الحد الأقصى للفترة هو ٣٦٦ يومًا.',
    hours: 'ساعات العمل', hoursHint: 'المناوبات المكتملة بعد خصم وقت الخروج', averageHours: 'متوسط الساعات يوميًا', averageHoursHint: 'إجمالي ساعات العمل ÷ أيام العمل التي اكتمل فيها تسجيل الانصراف',
    attended: 'أيام الحضور', absent: 'أيام الغياب', late: 'أيام التأخير', excused: 'أيام الإجازات والمأموريات',
    rate: 'نسبة الحضور', finishedDays: 'أيام العمل المكتملة فقط', empty: 'لا يوجد موظفون ضمن هذا النطاق.',
    rateHint: 'من أيام العمل المكتملة المتوقعة',
  } : {
    title: 'Attendance statistics', currentMonth: 'Current month', apply: 'Show range', invalid: 'The start date must be on or before the end date.', tooLong: 'Select a range of at most 366 days.',
    hours: 'Work hours', hoursHint: 'Completed shifts, excluding time away', averageHours: 'Avg. hours/day', averageHoursHint: 'Total work hours divided by days with a completed check-out',
    attended: 'Attendance days', absent: 'Absent days', late: 'Late days', excused: 'Leave and mission days',
    rate: 'Attendance rate', finishedDays: 'Completed workdays only', empty: 'No employees in this scope.',
    rateHint: 'Of expected completed workdays',
  }

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const from = draftFrom ?? data?.period.from ?? ''
    const to = draftTo ?? data?.period.to ?? ''
    if (!from || !to || from > to) { setRangeError('order'); return }
    if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 > 365) {
      setRangeError('length')
      return
    }
    setRangeError(null)
    setRange({ from, to })
  }

  function resetRange() {
    setDraftFrom(null)
    setDraftTo(null)
    setRangeError(null)
    if (range) setRange(null)
    else reload()
  }

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return null

  const s = data.today
  const present = (s.present ?? 0) + (s.late ?? 0)
  const maxTrend = Math.max(1, ...data.attendance_trend.map((d) => d.on_time + d.late))
  const rate = data.employees ? Math.round((present / data.employees) * 100) : 0

  return (
    <>
      <PageHeader
        title={t('welcome', { name: user?.name ?? '' })}
        subtitle={`${fmtLongDate(data.date)} · ${isManager ? t('whole_company') : t('your_team')}${data.is_working_day ? '' : ` · ${t('day_off')}`}`}
      />
      <div className="stats-grid">
        <Stat icon="check" label={t('present_today')} value={present} tone="green" hint={t('of_employees', { n: data.employees })} />
        <Stat icon="clock" label={t('late_today')} value={s.late ?? 0} tone="amber" />
        <Stat icon="alert" label={t('absent_today')} value={s.absent ?? 0} tone="red" hint={s.not_yet ? t('not_in_yet', { n: s.not_yet }) : undefined} />
        <Stat icon="plane" label={t('on_leave_mission')} value={s.on_leave ?? 0} tone="blue" />
        <Stat icon="inbox" label={t('pending_requests')} value={data.requests.pending} tone="gold"
          hint={<Link to="/requests" className="link-arrow">{t('review_link')} <Icon name="chevron" size={14} className="flip-rtl" /></Link>} />
        <Stat icon="team" label={isManager ? t('teams_count') : t('teams_you_lead')} value={data.teams} hint={t('active_locations', { n: data.locations })} />
      </div>

      <Card title={labels.title} icon="calendar">
        <form className="toolbar" onSubmit={applyRange}>
          <Field label={t('from')}><input type="date" required value={draftFrom ?? data.period.from} onChange={(e) => { setDraftFrom(e.target.value); setRangeError(null) }} /></Field>
          <Field label={t('to')}><input type="date" required value={draftTo ?? data.period.to} onChange={(e) => { setDraftTo(e.target.value); setRangeError(null) }} /></Field>
          <Button type="submit" icon="search" loading={loading}>{labels.apply}</Button>
          <Button type="button" variant="secondary" onClick={resetRange}>{labels.currentMonth}</Button>
        </form>
        {rangeError && <p className="text-red small" role="alert">{rangeError === 'length' ? labels.tooLong : labels.invalid}</p>}
        <p className="muted small">{fmtDate(data.period.from)} – {fmtDate(data.period.to)} · {isManager ? t('whole_company') : t('your_team')}</p>
        {data.period.employees.length === 0 ? <Empty icon="users">{labels.empty}</Empty> : (
          <div className="table-wrap" aria-busy={loading}>
            <table>
              <thead><tr>
                <th>{t('employee')}</th>
                <th className="end" title={labels.hoursHint}>{labels.hours}</th>
                <th className="end" title={labels.averageHoursHint}>{labels.averageHours}</th>
                <th className="end">{labels.attended}</th>
                <th className="end" title={labels.finishedDays}>{labels.absent}</th>
                <th className="end">{labels.late}</th>
                <th className="end" title={labels.finishedDays}>{labels.excused}</th>
                <th className="end" title={labels.rateHint}>{labels.rate}</th>
              </tr></thead>
              <tbody>
                {data.period.employees.map((employee) => (
                  <tr key={employee.user_id}>
                    <td><Link to={`/employees/${employee.user_id}`}><Person name={employee.name} avatar={employee.avatar_url} sub={[employee.employee_code, employee.team_name].filter(Boolean).join(' · ')} /></Link></td>
                    <td className="end nowrap">{fmtNumber(employee.worked_hours)}</td>
                    <td className="end nowrap">{fmtNumber(employee.average_hours_per_day)}</td>
                    <td className="end">{fmtNumber(employee.attendance_days)}</td>
                    <td className="end">{fmtNumber(employee.absent_days)}</td>
                    <td className="end">{fmtNumber(employee.late_days)}</td>
                    <td className="end">{fmtNumber(employee.excused_days)}</td>
                    <td className="end nowrap">{fmtNumber(employee.attendance_rate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid-2">
        <Card title={t('checkins_14d')} icon="calendar" actions={<span className="legend"><i className="dot dot-on" />{t('on_time')} <i className="dot dot-late" />{t('late')}</span>}>
          <div className="attendance-rate">
            <div className="rate-ring" style={{ ['--p' as string]: rate }} role="img" aria-label={`${rate}%`}>
              <span>{rate}%</span>
            </div>
            <div className="muted small">{t('present_today')}<br /><strong className="text">{present}</strong> / {data.employees}</div>
          </div>
          <div className="bar-chart" role="img" aria-label={t('checkins_14d')}>
            {data.attendance_trend.map((d) => (
              <div key={d.date} className="bar-col" title={`${fmtDay(d.date)} — ${t('on_time')}: ${d.on_time}, ${t('late')}: ${d.late}`}>
                <div className="bar-stack" style={{ height: `${((d.on_time + d.late) / maxTrend) * 100}%` }}>
                  <div className="bar bar-late" style={{ flex: d.late }} />
                  <div className="bar bar-on" style={{ flex: d.on_time }} />
                </div>
                <span className="bar-label">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t('waiting_review')} icon="inbox" actions={<Link to="/requests" className="small link-arrow">{t('all_requests')} <Icon name="chevron" size={14} className="flip-rtl" /></Link>}>
          {data.pending_requests.length === 0 ? <Empty icon="check">{t('nothing_to_review')}</Empty> : (
            <ul className="list">
              {data.pending_requests.map((r) => (
                <li key={r.id} className="list-row">
                  <Person name={r.user_name} avatar={r.user_avatar_url} sub={<><strong className="text">{requestTypeLabel(r.type)}</strong> · {requestSummary(r) || r.reason}</>} />
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
