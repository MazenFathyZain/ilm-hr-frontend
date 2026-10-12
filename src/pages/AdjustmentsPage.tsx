import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Adjustment, User } from '../api/types'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Person } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { fmtDate, fmtMoney, today } from '../lib/format'
import { useApi } from '../lib/useApi'

export function AdjustmentsPage() {
  const toast = useToast()
  const { t } = useI18n()
  const [kind, setKind] = useState('')
  const [userId, setUserId] = useState('')
  const [adding, setAdding] = useState(false)
  const users = useApi(() => api.get<User[]>('/users', { active: 'true' }))
  const { data, error, loading, reload } = useApi(() => api.get<Adjustment[]>('/adjustments', { kind, user_id: userId }), [kind, userId])

  async function remove(a: Adjustment) {
    if (!confirm(t('confirm_delete_entry'))) return
    await api.del(`/adjustments/${a.id}`).then(() => { toast(t('deleted')); reload() }, (e) => toast(e.message, 'error'))
  }

  return (
    <>
      <PageHeader title={t('adj_title')} subtitle={t('adj_subtitle')} actions={<Button icon="plus" onClick={() => setAdding(true)}>{t('add_entry')}</Button>} />
      <Card>
        <div className="toolbar">
          <Field label={t('type')}>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">{t('all')}</option><option value="reward">{t('rewards')}</option><option value="penalty">{t('penalties')}</option>
            </select>
          </Field>
          <Field label={t('employee')}>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">{t('all')}</option>
              {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        </div>
        {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty icon="award">{t('nothing_recorded')}</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('date')}</th><th>{t('employee')}</th><th>{t('type')}</th><th>{t('reason')}</th><th className="end">{t('amount')}</th><th>{t('by')}</th><th /></tr></thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td className="nowrap">{fmtDate(a.date)}</td>
                    <td><Person name={a.user_name} /></td>
                    <td><Badge tone={a.kind === 'reward' ? 'green' : 'red'}><Icon name={a.kind === 'reward' ? 'award' : 'alert'} size={12} />{a.kind === 'reward' ? t('reward') : t('penalty')}</Badge></td>
                    <td className="wrap">{a.reason}</td>
                    <td className={`end ${a.kind === 'reward' ? 'text-green' : 'text-red'}`}>{a.amount ? `${a.kind === 'reward' ? '+' : '−'}${fmtMoney(a.amount)}` : '—'}</td>
                    <td className="small muted">{a.created_by_name}</td>
                    <td className="end"><Button size="sm" variant="ghost" onClick={() => remove(a)}>{t('delete')}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {adding && <AdjustmentForm users={users.data ?? []} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
    </>
  )
}

function AdjustmentForm({ users, onClose, onSaved }: { users: User[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useI18n()
  const [form, setForm] = useState({ user_id: '', kind: 'reward', amount: '', reason: '', date: today() })
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/adjustments', { ...form, user_id: Number(form.user_id), amount: Number(form.amount || 0) })
      toast(t('saved_notified'))
      onSaved()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={t('add_adj_title')} onClose={onClose} footer={
      <><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" form="adj-form" icon="check" loading={busy}>{t('save')}</Button></>
    }>
      <form id="adj-form" className="form-grid" onSubmit={submit}>
        <Field label={`${t('employee')} *`}>
          <select required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
            <option value="">{t('select')}</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label={`${t('type')} *`}>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="reward">{t('reward')}</option><option value="penalty">{t('penalty')}</option>
          </select>
        </Field>
        <Field label={t('amount')} hint={t('amount_hint')}><input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label={`${t('date')} *`}><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label={`${t('reason')} *`} wide><textarea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
      </form>
    </Modal>
  )
}
