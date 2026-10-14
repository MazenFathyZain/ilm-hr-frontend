import { useState } from 'react'
import { api } from '../api/client'
import type { Payslip, Settings, User } from '../api/types'
import { useToast } from '../components/Toast'
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Person, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { DEDUCTION_KEYS, EARNING_KEYS, deductionLabel, earningLabel, fmtMoney, fmtMonth, thisMonth } from '../lib/format'
import { useApi } from '../lib/useApi'

interface Suggestion {
  basic_salary: number
  earnings: Record<string, number>
  deductions: Record<string, number>
  basis: { absent_days: number; late_days: number; overtime_hours: number; daily_rate: number }
}

export function PayrollPage() {
  const toast = useToast()
  const { t } = useI18n()
  const [month, setMonth] = useState(thisMonth())
  const [editing, setEditing] = useState<{ userId: number | null; payslip: Payslip | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const settings = useApi(() => api.get<Settings>('/settings'))
  const { data, error, loading, reload } = useApi(() => api.get<Payslip[]>('/payslips', { month }), [month])
  const cur = settings.data?.currency

  async function bulk(action: 'generate' | 'publish') {
    if (action === 'publish' && !confirm(t('confirm_publish', { month: fmtMonth(month) }))) return
    setBusy(true)
    try {
      const res = await api.post<{ created?: number; published?: number }>(`/payslips/${action}`, { month })
      toast(action === 'generate' ? t('drafts_created', { n: res.created ?? 0 }) : t('published_n', { n: res.published ?? 0 }))
      reload()
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  const drafts = data?.filter((p) => p.status === 'draft').length ?? 0
  const total = data?.reduce((s, p) => s + p.net_salary, 0) ?? 0

  return (
    <>
      <PageHeader
        title={t('pay_title')}
        subtitle={t('pay_subtitle')}
        actions={
          <>
            <Button variant="secondary" icon="wallet" loading={busy} onClick={() => bulk('generate')}>{t('generate_drafts')}</Button>
            <Button icon="check" loading={busy} disabled={!drafts} onClick={() => bulk('publish')}>{t('publish_n', { n: drafts })}</Button>
          </>
        }
      />
      <Card>
        <div className="toolbar">
          <Field label={t('month')}><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
          <span className="spacer" />
          <div className="total-chip"><span className="muted small">{t('total_net')}</span><strong>{fmtMoney(total, cur)}</strong></div>
          <Button variant="secondary" icon="plus" onClick={() => setEditing({ userId: null, payslip: null })}>{t('single_payslip')}</Button>
        </div>
        {loading && !data ? <Loading /> : error ? <ErrorBox error={error} onRetry={reload} /> : !data?.length ? (
          <Empty icon="wallet">{t('no_payslips')}</Empty>
        ) : (
          <div className="table-wrap">
            <table className="clickable">
              <thead><tr><th>{t('employee')}</th><th className="end">{t('basic')}</th><th className="end">{t('earnings')}</th><th className="end">{t('deductions')}</th><th className="end">{t('net')}</th><th>{t('status')}</th></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} onClick={() => setEditing({ userId: p.user_id, payslip: p })}>
                    <td><Person name={p.user_name} sub={p.employee_code} /></td>
                    <td className="end">{fmtMoney(p.basic_salary, cur)}</td>
                    <td className="right text-green">+{fmtMoney(p.total_earnings, cur)}</td>
                    <td className="right text-red">−{fmtMoney(p.total_deductions, cur)}</td>
                    <td className="end"><strong>{fmtMoney(p.net_salary, cur)}</strong></td>
                    <td><StatusBadge kind="payslip" status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && (
        <PayslipEditor month={month} currency={cur} {...editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
      )}
    </>
  )
}

function PayslipEditor({ month, currency, userId, payslip, onClose, onSaved }: {
  month: string; currency?: string; userId: number | null; payslip: Payslip | null; onClose: () => void; onSaved: () => void
}) {
  const toast = useToast()
  const { t } = useI18n()
  const users = useApi(() => api.get<User[]>('/users', { active: 'true' }))
  const [uid, setUid] = useState(userId ? String(userId) : '')
  const [basic, setBasic] = useState(payslip?.basic_salary ?? 0)
  const [earnings, setEarnings] = useState<Record<string, number>>(payslip?.earnings ?? Object.fromEntries(EARNING_KEYS.map((k) => [k, 0])))
  const [deductions, setDeductions] = useState<Record<string, number>>(payslip?.deductions ?? Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, 0])))
  const [basis, setBasis] = useState<Suggestion['basis'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<unknown>(null)

  async function suggest(forUser = uid) {
    if (!forUser) return
    setFormError(null)
    try {
      const s = await api.get<Suggestion>('/payslips/suggest', { user_id: forUser, month })
      setBasic(s.basic_salary)
      // Keep manually entered items (tax, insurance…) and refresh the calculated ones.
      setEarnings((e) => ({ ...e, overtime: s.earnings.overtime, reward: s.earnings.reward, other: s.earnings.other }))
      setDeductions((d) => ({ ...d, absence: s.deductions.absence, penalties: s.deductions.penalties }))
      setBasis(s.basis)
    } catch (e) {
      setFormError(e)
    }
  }

  async function save(status: 'draft' | 'published') {
    setBusy(true)
    setFormError(null)
    try {
      await api.put('/payslips', { user_id: Number(uid), month, basic_salary: basic, earnings, deductions, status })
      toast(status === 'published' ? t('payslip_published') : t('draft_saved'))
      onSaved()
    } catch (e) {
      setFormError(e)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!payslip || !confirm(t('confirm_delete_payslip'))) return
    await api.del(`/payslips/${payslip.id}`).then(onSaved, setFormError)
  }

  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + (Number(b) || 0), 0)
  const net = basic + sum(earnings) - sum(deductions)
  const name = payslip?.user_name ?? users.data?.find((u) => String(u.id) === uid)?.name

  return (
    <Modal wide title={name ? t('payslip_title', { name, month: fmtMonth(month) }) : t('new_payslip', { month: fmtMonth(month) })} onClose={onClose} error={formError} footer={
      <>
        {payslip && <Button variant="danger" onClick={remove}>{t('delete')}</Button>}
        <span className="spacer" />
        <Button variant="secondary" loading={busy} disabled={!uid} onClick={() => save('draft')}>{t('save_draft')}</Button>
        <Button icon="check" loading={busy} disabled={!uid} onClick={() => save('published')}>{payslip?.status === 'published' ? t('save') : t('save_publish')}</Button>
      </>
    }>
      <div onChange={() => setFormError(null)}>
      <div className="form-grid">
        {!payslip && (
          <Field label={t('employee')}>
            <select value={uid} onChange={(e) => { setUid(e.target.value); suggest(e.target.value) }}>
              <option value="">{t('select')}</option>
              {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={t('basic_salary')}><input type="number" min={0} step="0.01" value={basic} onChange={(e) => setBasic(Number(e.target.value))} /></Field>
        <div className="field">
          <span className="field-label">&nbsp;</span>
          <Button variant="secondary" icon="clock" disabled={!uid} onClick={() => suggest()}>{t('recalc')}</Button>
        </div>
      </div>
      {basis && (
        <p className="muted small">
          {t('basis_text', { absent: basis.absent_days, late: basis.late_days, ot: basis.overtime_hours, rate: fmtMoney(basis.daily_rate, currency) })}
        </p>
      )}
      <div className="grid-2">
        <LineItems title={t('earnings')} keys={EARNING_KEYS} label={earningLabel} values={earnings} onChange={setEarnings} tone="green" />
        <LineItems title={t('deductions')} keys={DEDUCTION_KEYS} label={deductionLabel} values={deductions} onChange={setDeductions} tone="red" />
      </div>
      </div>
      <div className="net-row">{t('net_salary')} <strong>{fmtMoney(Math.round(net * 100) / 100, currency)}</strong></div>
    </Modal>
  )
}

function LineItems({ title, keys, label, values, onChange, tone }: { title: string; keys: readonly string[]; label: (k: string) => string; values: Record<string, number>; onChange: (v: Record<string, number>) => void; tone: string }) {
  return (
    <div className="line-items">
      <h3 className={`text-${tone}`}>{title}</h3>
      {keys.map((k) => (
        <label key={k} className="line-item">
          <span>{label(k)}</span>
          <input type="number" min={0} step="0.01" value={values[k] ?? 0} onChange={(e) => onChange({ ...values, [k]: Number(e.target.value) })} />
        </label>
      ))}
    </div>
  )
}
