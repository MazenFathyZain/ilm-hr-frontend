import { useState } from 'react'
import { api, download } from '../api/client'
import type { AttendanceRecord, Board, BoardStatus, Team, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Person, StatusBadge, Tabs } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { BOARD_STATUSES, boardLabel, fmtDate, fmtMinutes, today } from '../lib/format'
import { useApi } from '../lib/useApi'

interface EditTarget { user_id: number; name: string; work_date: string; check_in_time: string; check_out_time: string; note: string }

export function AttendancePage() {
  const [tab, setTab] = useState<'board' | 'records'>('board')
  const [edit, setEdit] = useState<EditTarget | null>(null)
  const [version, setVersion] = useState(0)
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('att_title')} subtitle={t('att_subtitle')} />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'board', label: t('tab_board') }, { value: 'records', label: t('tab_records') }]} />
      {tab === 'board' ? <DailyBoard key={version} onEdit={setEdit} /> : <Records key={version} onEdit={setEdit} />}
      {edit && <EditModal target={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setVersion((v) => v + 1) }} />}
    </>
  )
}

function DailyBoard({ onEdit }: { onEdit: (t: EditTarget) => void }) {
  const { isManager } = useAuth()
  const { t } = useI18n()
  const [date, setDate] = useState(today())
  const [filter, setFilter] = useState<BoardStatus | ''>('')
  const { data, error, loading, reload } = useApi(() => api.get<Board>('/attendance/board', { date }), [date])

  const rows = data?.rows.filter((r) => !filter || r.status === filter) ?? []
  return (
    <Card>
      <div className="toolbar">
        <Field label={t('date')}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="chips">
          <button className={`chip ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>{t('all')} <span className="chip-count">{data?.rows.length ?? 0}</span></button>
          {BOARD_STATUSES.filter((s) => data?.counts[s]).map((s) => (
            <button key={s} className={`chip chip-${s} ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {boardLabel(s)} <span className="chip-count">{data?.counts[s]}</span>
            </button>
          ))}
        </div>
      </div>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? <Empty icon="users">{t('no_employees_match')}</Empty> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t('employee')}</th><th>{t('team')}</th><th>{t('status')}</th><th>{t('check_in')}</th><th>{t('check_out')}</th><th>{t('late')}</th><th>{t('worked')}</th>{isManager && <th />}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Person name={r.name} sub={r.job_title} /></td>
                  <td>{r.team_name ?? '—'}</td>
                  <td><StatusBadge status={r.status} label={boardLabel(r.status)} /></td>
                  <td className="num">{r.record?.check_in_time ?? '—'}<div className="muted small">{r.record?.check_in_location}</div></td>
                  <td className="num">{r.record?.check_out_time ?? '—'}<div className="muted small">{r.record?.check_out_location}</div></td>
                  <td>{r.record?.late_minutes ? <Badge tone="amber">{fmtMinutes(r.record.late_minutes)}</Badge> : '—'}</td>
                  <td>{fmtMinutes(r.record?.worked_minutes)}</td>
                  {isManager && (
                    <td className="right">
                      <Button size="sm" variant="ghost" onClick={() => onEdit({
                        user_id: r.id, name: r.name, work_date: date,
                        check_in_time: r.record?.check_in_time ?? '', check_out_time: r.record?.check_out_time ?? '', note: r.record?.note ?? '',
                      })}>{t('edit')}</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Records({ onEdit }: { onEdit: (t: EditTarget) => void }) {
  const { isManager } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const monthStart = `${today().slice(0, 7)}-01`
  const [q, setQ] = useState({ from: monthStart, to: today(), user_id: '', team_id: '', late_only: false })
  const users = useApi(() => api.get<User[]>('/users', { active: 'true' }))
  const teams = useApi(() => api.get<Team[]>('/teams'))
  const query = { ...q, late_only: q.late_only ? 'true' : undefined }
  const { data, error, loading, reload } = useApi(() => api.get<AttendanceRecord[]>('/attendance', query), [JSON.stringify(q)])

  return (
    <Card>
      <div className="toolbar">
        <Field label={t('from')}><input type="date" value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })} /></Field>
        <Field label={t('to')}><input type="date" value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })} /></Field>
        <Field label={t('employee')}>
          <select value={q.user_id} onChange={(e) => setQ({ ...q, user_id: e.target.value })}>
            <option value="">{t('all')}</option>
            {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label={t('team')}>
          <select value={q.team_id} onChange={(e) => setQ({ ...q, team_id: e.target.value })}>
            <option value="">{t('all')}</option>
            {teams.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <label className="check"><input type="checkbox" checked={q.late_only} onChange={(e) => setQ({ ...q, late_only: e.target.checked })} /> {t('late_only')}</label>
        <Button variant="secondary" icon="download" onClick={() => download('/attendance/export', query, 'attendance.csv').catch((e) => toast(e.message, 'error'))}>{t('export_csv')}</Button>
      </div>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty icon="calendar">{t('no_records')}</Empty> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t('date')}</th><th>{t('employee')}</th><th>{t('check_in')}</th><th>{t('check_out')}</th><th>{t('late')}</th><th>{t('worked')}</th><th>{t('note')}</th>{isManager && <th />}</tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.work_date)}</td>
                  <td><Person name={r.user_name} sub={r.team_name} /></td>
                  <td className="num">{r.check_in_time ?? '—'}<div className="muted small">{r.check_in_location}</div></td>
                  <td className="num">{r.check_out_time ?? '—'}<div className="muted small">{r.check_out_location}</div></td>
                  <td>{r.late_minutes ? <Badge tone="amber">{fmtMinutes(r.late_minutes)}</Badge> : '—'}</td>
                  <td>{fmtMinutes(r.worked_minutes)}</td>
                  <td className="small">{r.note}{r.edited_by ? <span className="muted"> ({t('edited')})</span> : null}</td>
                  {isManager && (
                    <td className="right">
                      <Button size="sm" variant="ghost" onClick={() => onEdit({
                        user_id: r.user_id, name: r.user_name, work_date: r.work_date,
                        check_in_time: r.check_in_time ?? '', check_out_time: r.check_out_time ?? '', note: r.note ?? '',
                      })}>{t('edit')}</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function EditModal({ target, onClose, onSaved }: { target: EditTarget; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useI18n()
  const [form, setForm] = useState(target)
  const [busy, setBusy] = useState(false)

  async function save(clear = false) {
    setBusy(true)
    try {
      await api.put('/attendance', clear
        ? { user_id: form.user_id, work_date: form.work_date }
        : { ...form, check_out_time: form.check_out_time || undefined })
      toast(clear ? t('record_removed') : t('attendance_saved'))
      onSaved()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={t('correct_attendance', { name: target.name })} onClose={onClose} footer={
      <>
        {target.check_in_time && <Button variant="danger" onClick={() => save(true)} loading={busy}>{t('remove_record')}</Button>}
        <span className="spacer" />
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={() => save()} loading={busy} disabled={!form.check_in_time} icon="check">{t('save')}</Button>
      </>
    }>
      <p className="muted small">{t('manual_note_hint')}</p>
      <div className="form-grid">
        <Field label={t('date')}><input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} /></Field>
        <span />
        <Field label={t('check_in_time')}><input type="time" value={form.check_in_time} onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} /></Field>
        <Field label={t('check_out_time')}><input type="time" value={form.check_out_time} onChange={(e) => setForm({ ...form, check_out_time: e.target.value })} /></Field>
        <Field label={t('note')} wide><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('note_placeholder')} /></Field>
      </div>
    </Modal>
  )
}
