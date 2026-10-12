import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Holiday, Settings } from '../api/types'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Button, Card, ErrorBox, Field, Loading, PageHeader } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { fmtLongDate, weekdayLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

export function SettingsPage() {
  const { data, error, loading, reload } = useApi(() => api.get<Settings>('/settings'))
  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  return data && <SettingsForm initial={data} />
}

function SettingsForm({ initial }: { initial: Settings }) {
  const toast = useToast()
  const { t } = useI18n()
  const holidays = useApi(() => api.get<Holiday[]>('/holidays'))
  const [form, setForm] = useState(initial)
  const [docs, setDocs] = useState(initial.required_documents.join('\n'))
  const [busy, setBusy] = useState(false)
  const [holiday, setHoliday] = useState({ date: '', name: '' })

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const saved = await api.patch<Settings>('/settings', { ...form, required_documents: docs.split('\n').map((d) => d.trim()).filter(Boolean) })
      setForm(saved)
      toast(t('settings_saved'))
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function addHoliday(e: FormEvent) {
    e.preventDefault()
    await api.put('/holidays', holiday).then(() => { setHoliday({ date: '', name: '' }); holidays.reload() }, (err) => toast(err.message, 'error'))
  }

  const toggleDay = (d: number) => setForm({ ...form, weekend_days: form.weekend_days.includes(d) ? form.weekend_days.filter((x) => x !== d) : [...form.weekend_days, d] })

  return (
    <>
      <PageHeader title={t('set_title')} subtitle={t('set_subtitle')} />
      <form onSubmit={save}>
        <Card title={t('company_hours')} icon="clock" actions={<Button type="submit" icon="check" loading={busy}>{t('save_settings')}</Button>}>
          <div className="form-grid">
            <Field label={t('company_name')}><input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
            <Field label={t('timezone')} hint={t('tz_hint')}><input dir="ltr" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Field>
            <Field label={t('work_starts')}><input type="time" value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })} /></Field>
            <Field label={t('work_ends')}><input type="time" value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })} /></Field>
            <Field label={t('grace')} hint={t('grace_hint')}><input type="number" min={0} value={form.late_grace_minutes} onChange={(e) => setForm({ ...form, late_grace_minutes: Number(e.target.value) })} /></Field>
            <Field label={t('currency')}><input dir="ltr" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
            <fieldset className="field-wide plain-fieldset">
              <legend className="field-label">{t('weekend_days')}</legend>
              <div className="chips">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <label key={i} className={`chip ${form.weekend_days.includes(i) ? 'active' : ''}`}>
                    <input type="checkbox" className="sr-only" checked={form.weekend_days.includes(i)} onChange={() => toggleDay(i)} />{weekdayLabel(i)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Card>
        <Card title={t('leave_docs')} icon="file">
          <div className="form-grid">
            <Field label={t('default_annual')} hint={t('applied_new')}><input type="number" min={0} value={form.default_annual_leave} onChange={(e) => setForm({ ...form, default_annual_leave: Number(e.target.value) })} /></Field>
            <Field label={t('default_casual')} hint={t('applied_new')}><input type="number" min={0} value={form.default_casual_leave} onChange={(e) => setForm({ ...form, default_casual_leave: Number(e.target.value) })} /></Field>
            <Field label={t('required_docs')} hint={t('required_docs_hint')} wide>
              <textarea rows={6} value={docs} onChange={(e) => setDocs(e.target.value)} />
            </Field>
          </div>
        </Card>
      </form>
      <Card title={t('holidays')} icon="calendar" actions={<span className="muted small">{t('holidays_hint')}</span>}>
        <form className="toolbar" onSubmit={addHoliday}>
          <Field label={t('date')}><input type="date" required value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} /></Field>
          <Field label={t('holiday_name')}><input required value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} /></Field>
          <Button type="submit" variant="secondary" icon="plus">{t('add_holiday')}</Button>
        </form>
        <ul className="list">
          {holidays.data?.map((h) => (
            <li key={h.date} className="list-row">
              <span className="person"><span className="team-emblem small"><Icon name="calendar" size={15} /></span><span className="person-text"><strong>{h.name}</strong><span className="muted small">{fmtLongDate(h.date)}</span></span></span>
              <Button size="sm" variant="ghost" onClick={() => api.del(`/holidays/${h.date}`).then(holidays.reload)}>{t('remove')}</Button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
