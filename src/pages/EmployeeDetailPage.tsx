import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AttendanceRecord, HrRequest, LeaveBalances, MonthSummary, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Field, Loading, Stat, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { fmtDate, fmtMinutes, fmtMoney, requestSummary, requestTypeLabel, roleLabel, roleTone, thisMonth } from '../lib/format'
import { useApi } from '../lib/useApi'
import { EmployeeForm } from './EmployeesPage'

type Detail = User & { leave_balances: LeaveBalances }

export function EmployeeDetailPage() {
  const id = Number(useParams().id)
  const { user: me, isManager } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [month, setMonth] = useState(thisMonth())
  const [editing, setEditing] = useState(false)
  const { data: u, error, loading, reload } = useApi(() => api.get<Detail>(`/users/${id}`), [id])
  const att = useApi(() => api.get<{ summary: MonthSummary; records: AttendanceRecord[] }>(`/users/${id}/attendance`, { month }), [id, month])
  const reqs = useApi(() => api.get<HrRequest[]>('/requests', { user_id: id }), [id])

  if (loading && !u) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!u) return null

  async function toggleActive() {
    if (!u) return
    if (u.is_active && !confirm(t('confirm_deactivate', { name: u.name }))) return
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active })
      toast(u.is_active ? t('employee_deactivated') : t('employee_reactivated'))
      reload()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const lb = u.leave_balances
  const s = att.data?.summary
  const pct = (b: { total: number; remaining: number }) => (b.total ? Math.max(0, Math.min(100, (b.remaining / b.total) * 100)) : 0)

  return (
    <>
      <Link to="/employees" className="back-link"><Icon name="chevron" size={14} className="flip" /> {t('all_employees_back')}</Link>
      <section className="profile-hero pattern-bg">
        <Avatar name={u.name} size={72} />
        <div className="profile-hero-text">
          <h1>{u.name}</h1>
          <div className="profile-meta">
            <span className="mono">{u.employee_code}</span>
            <span>{u.job_title ?? '—'}</span>
            <Badge tone={roleTone(u.role)}>{roleLabel(u.role)}</Badge>
            {!u.is_active && <Badge tone="red">{t('deactivated')}</Badge>}
          </div>
        </div>
        {isManager && (
          <div className="page-actions">
            {u.id !== me?.id && <Button variant="secondary" onClick={toggleActive}>{u.is_active ? t('deactivate') : t('reactivate')}</Button>}
            <Button icon="settings" onClick={() => setEditing(true)}>{t('edit')}</Button>
          </div>
        )}
      </section>

      <div className="grid-2">
        <Card title={t('profile')} icon="user">
          <dl className="dl">
            <dt>{t('email')}</dt><dd dir="ltr">{u.email}</dd>
            <dt>{t('phone')}</dt><dd dir="ltr">{u.phone ?? '—'}</dd>
            <dt>{t('national_id')}</dt><dd className="mono">{u.national_id ?? '—'}</dd>
            <dt>{t('branch')}</dt><dd>{u.branch ?? '—'}</dd>
            <dt>{t('team')}</dt><dd>{u.team_name ?? '—'}</dd>
            <dt>{t('reports_to')}</dt><dd>{u.supervisor_id && u.supervisor_id !== u.id ? u.supervisor_name : '—'}</dd>
            <dt>{t('hire_date')}</dt><dd>{fmtDate(u.hire_date)}</dd>
            {u.basic_salary !== undefined && <><dt>{t('basic_salary')}</dt><dd>{fmtMoney(u.basic_salary)}</dd></>}
            <dt>{t('checkin_locations')}</dt>
            <dd>{u.locations.length
              ? <div className="tag-list">{u.locations.map((l) => <span key={l.id} className="tag"><Icon name="pin" size={12} />{l.name}</span>)}</div>
              : <span className="text-red">{t('none_assigned')}</span>}</dd>
          </dl>
        </Card>
        <Card title={t('leave_balance_year', { year: lb.year })} icon="calendar">
          {([['annual_remaining', lb.annual], ['casual_remaining', lb.casual]] as const).map(([label, b]) => (
            <div key={label} className="balance">
              <div className="balance-head">
                <span>{t(label)}</span>
                <strong>{b.remaining} <span className="muted">/ {b.total}</span></strong>
              </div>
              <div className="meter"><span style={{ width: `${pct(b)}%` }} /></div>
              <div className="muted small">{t('used_pending', { used: b.used, pending: b.pending })}</div>
            </div>
          ))}
          <div className="stats-grid compact">
            <Stat label={t('sick_taken')} value={lb.sick.used} />
            <Stat label={t('unpaid_taken')} value={lb.unpaid.used} />
          </div>
        </Card>
      </div>

      <Card title={t('nav_attendance')} icon="clock" actions={<Field label={t('month')}><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>}>
        {s && (
          <div className="stats-grid compact">
            <Stat label={t('present_days')} value={s.present_days} tone="green" hint={t('working_days_n', { n: s.working_days })} />
            <Stat label={t('late_days')} value={s.late_days} tone="amber" hint={t('total_late', { time: fmtMinutes(s.total_late_minutes) })} />
            <Stat label={t('absent_days')} value={s.absent_days} tone="red" />
            <Stat label={t('hours_worked')} value={s.worked_hours} />
          </div>
        )}
        {att.loading && !att.data ? <Loading /> : !att.data?.records.length ? <Empty icon="calendar">{t('no_checkins_month')}</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('date')}</th><th>{t('check_in')}</th><th>{t('check_out')}</th><th>{t('late')}</th><th>{t('worked')}</th></tr></thead>
              <tbody>
                {att.data.records.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.work_date)}</td>
                    <td className="num">{r.check_in_time ?? '—'} <span className="muted small">{r.check_in_location}</span></td>
                    <td className="num">{r.check_out_time ?? '—'} <span className="muted small">{r.check_out_location}</span></td>
                    <td>{r.late_minutes ? <Badge tone="amber">{fmtMinutes(r.late_minutes)}</Badge> : '—'}</td>
                    <td>{fmtMinutes(r.worked_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={t('nav_requests')} icon="inbox">
        {reqs.loading && !reqs.data ? <Loading /> : !reqs.data?.length ? <Empty>{t('no_requests')}</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('request')}</th><th>{t('reason')}</th><th>{t('submitted')}</th><th>{t('status')}</th></tr></thead>
              <tbody>
                {reqs.data.map((r) => (
                  <tr key={r.id}>
                    <td><span className={`type-pill type-${r.type}`}>{requestTypeLabel(r.type)}</span><div className="small">{requestSummary(r)}</div></td>
                    <td className="small wrap">{r.reason ?? '—'}</td>
                    <td className="small">{fmtDate(r.created_at)}</td>
                    <td><StatusBadge status={r.status} />{r.reviewer_name && <div className="muted small">{t('by_name', { name: r.reviewer_name })}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <EmployeeForm user={u} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); att.reload() }} />}
    </>
  )
}
