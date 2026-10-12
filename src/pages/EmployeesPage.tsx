import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Location, Role, Team, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Person, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { ROLES, roleLabel, roleTone } from '../lib/format'
import { useApi } from '../lib/useApi'

export function EmployeesPage() {
  const { isManager } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [teamId, setTeamId] = useState('')
  const [active, setActive] = useState('true')
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const teams = useApi(() => api.get<Team[]>('/teams'))
  const { data, error, loading, reload } = useApi(
    () => api.get<User[]>('/users', { search, role, team_id: teamId, active }),
    [search, role, teamId, active],
  )

  return (
    <>
      <PageHeader
        title={t('emp_title')}
        subtitle={isManager ? t('emp_subtitle_manager') : t('emp_subtitle_leader')}
        actions={isManager && <Button icon="plus" onClick={() => setEditing('new')}>{t('add_employee')}</Button>}
      />
      <Card>
        <div className="toolbar">
          <Field label={t('search')}>
            <span className="input-icon">
              <Icon name="search" size={16} />
              <input type="search" placeholder={t('search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </span>
          </Field>
          <Field label={t('role')}>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">{t('all_roles')}</option>
              {ROLES.map((k) => <option key={k} value={k}>{roleLabel(k)}</option>)}
            </select>
          </Field>
          <Field label={t('team')}>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">{t('all_teams')}</option>
              {teams.data?.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </Field>
          <Field label={t('status')}>
            <select value={active} onChange={(e) => setActive(e.target.value)}>
              <option value="true">{t('active')}</option>
              <option value="false">{t('deactivated')}</option>
              <option value="">{t('all')}</option>
            </select>
          </Field>
        </div>
        {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty icon="users">{t('no_employees')}</Empty> : (
          <div className="table-wrap">
            <table className="clickable">
              <thead>
                <tr><th>{t('employee')}</th><th>{t('role')}</th><th>{t('team')}</th><th>{t('reports_to')}</th><th>{t('checkin_locations')}</th><th>{t('status')}</th></tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} onClick={() => navigate(`/employees/${u.id}`)}>
                    <td>
                      <Link to={`/employees/${u.id}`} onClick={(e) => e.stopPropagation()} className="plain-link">
                        <Person name={u.name} sub={<><span className="mono">{u.employee_code}</span> · {u.job_title ?? u.email}</>} />
                      </Link>
                    </td>
                    <td><Badge tone={roleTone(u.role)}>{roleLabel(u.role)}</Badge></td>
                    <td>{u.team_name ?? '—'}</td>
                    <td>{u.supervisor_id === u.id ? <span className="muted">{t('leads_team')}</span> : u.supervisor_name ?? '—'}</td>
                    <td className="small">
                      {u.locations.length
                        ? <div className="tag-list">{u.locations.map((l) => <span key={l.id} className="tag"><Icon name="pin" size={12} />{l.name}</span>)}</div>
                        : <span className="text-red">{t('no_locations_cannot_checkin')}</span>}
                    </td>
                    <td><StatusBadge status={u.is_active ? 'active' : 'inactive'} label={u.is_active ? t('active') : t('deactivated')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && (
        <EmployeeForm
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => { setEditing(null); reload(); if (editing === 'new') navigate(`/employees/${u.id}`) }}
        />
      )}
    </>
  )
}

export function EmployeeForm({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: (u: User) => void }) {
  const toast = useToast()
  const { t } = useI18n()
  const teams = useApi(() => api.get<Team[]>('/teams'))
  const locations = useApi(() => api.get<Location[]>('/locations'))
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    employee_code: user?.employee_code ?? '',
    national_id: user?.national_id ?? '',
    phone: user?.phone ?? '',
    job_title: user?.job_title ?? '',
    branch: user?.branch ?? '',
    role: (user?.role ?? 'employee') as Role,
    team_id: user?.team_id ? String(user.team_id) : '',
    hire_date: user?.hire_date ?? '',
    basic_salary: String(user?.basic_salary ?? ''),
    annual_leave_balance: user ? String(user.annual_leave_balance) : '',
    casual_leave_balance: user ? String(user.casual_leave_balance) : '',
    location_ids: user?.locations.map((l) => l.id) ?? [],
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const body: Record<string, unknown> = {
      ...form,
      team_id: form.team_id ? Number(form.team_id) : null,
      basic_salary: form.basic_salary === '' ? 0 : Number(form.basic_salary),
    }
    // Empty leave balances fall back to the defaults from settings; an empty password keeps the current one.
    for (const k of ['annual_leave_balance', 'casual_leave_balance'] as const) body[k] = form[k] === '' ? undefined : Number(form[k])
    if (!form.password) delete body.password
    try {
      const saved = user ? await api.patch<User>(`/users/${user.id}`, body) : await api.post<User>('/users', body)
      toast(user ? t('employee_updated') : t('employee_created'))
      onSaved(saved)
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggleLocation = (id: number) =>
    set('location_ids', form.location_ids.includes(id) ? form.location_ids.filter((x) => x !== id) : [...form.location_ids, id])

  return (
    <Modal wide title={user ? t('edit_employee', { name: user.name }) : t('add_employee')} onClose={onClose} footer={
      <>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" form="employee-form" icon="check" loading={busy}>{user ? t('save_changes') : t('create_employee')}</Button>
      </>
    }>
      <form id="employee-form" className="form-grid" onSubmit={submit}>
        <Field label={`${t('full_name')} *`}><input required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label={`${t('email_login')} *`}><input required type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label={user ? t('new_password') : `${t('password')} *`} hint={user ? t('keep_password_hint') : t('password_min_hint')}>
          <input type="password" dir="ltr" autoComplete="new-password" required={!user} minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} />
        </Field>
        <Field label={t('employee_code')} hint={user ? undefined : t('auto_code_hint')}><input dir="ltr" value={form.employee_code} onChange={(e) => set('employee_code', e.target.value)} /></Field>
        <Field label={`${t('role')} *`} hint={t('role_hint')}>
          <select value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
            {ROLES.map((k) => <option key={k} value={k}>{roleLabel(k)}</option>)}
          </select>
        </Field>
        <Field label={t('team')}>
          <select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}>
            <option value="">{t('no_team')}</option>
            {teams.data?.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
          </select>
        </Field>
        <Field label={t('job_title')}><input value={form.job_title} onChange={(e) => set('job_title', e.target.value)} /></Field>
        <Field label={t('branch')}><input value={form.branch} onChange={(e) => set('branch', e.target.value)} /></Field>
        <Field label={t('national_id')}><input inputMode="numeric" dir="ltr" value={form.national_id} onChange={(e) => set('national_id', e.target.value)} /></Field>
        <Field label={t('phone')}><input type="tel" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label={t('hire_date')}><input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} /></Field>
        <Field label={t('basic_salary')}><input type="number" min={0} step="0.01" value={form.basic_salary} onChange={(e) => set('basic_salary', e.target.value)} /></Field>
        <Field label={t('annual_leave_days')} hint={user ? undefined : t('defaults_hint')}><input type="number" min={0} value={form.annual_leave_balance} onChange={(e) => set('annual_leave_balance', e.target.value)} /></Field>
        <Field label={t('casual_leave_days')} hint={user ? undefined : t('defaults_hint')}><input type="number" min={0} value={form.casual_leave_balance} onChange={(e) => set('casual_leave_balance', e.target.value)} /></Field>

        <fieldset className="field-wide picker">
          <legend>{t('checkin_locations')} <span className="muted small">— {t('checkin_locations_hint')}</span></legend>
          {locations.loading ? <Loading /> : !locations.data?.length ? (
            <p className="muted small"><Link to="/locations">{t('no_locations_yet')}</Link></p>
          ) : locations.data.map((l) => (
            <label key={l.id} className={`picker-option ${l.is_active ? '' : 'inactive'}`}>
              <input type="checkbox" checked={form.location_ids.includes(l.id)} onChange={() => toggleLocation(l.id)} />
              <Icon name="pin" size={16} />
              <span><strong>{l.name}</strong><span className="muted small"> · {t('radius_m', { n: l.radius_meters })}{l.is_active ? '' : ` · ${t('inactive')}`}</span></span>
            </label>
          ))}
        </fieldset>
      </form>
    </Modal>
  )
}
