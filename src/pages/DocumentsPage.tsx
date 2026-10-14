import { useState } from 'react'
import { api, download } from '../api/client'
import type { HrDocument, User } from '../api/types'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Button, Card, Empty, ErrorBox, Field, Loading, PageHeader, Person, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { fmtDate } from '../lib/format'
import { useApi } from '../lib/useApi'

export function DocumentsPage() {
  const toast = useToast()
  const { t } = useI18n()
  const [status, setStatus] = useState('submitted')
  const [userId, setUserId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const users = useApi(() => api.get<User[]>('/users', { active: 'true' }))
  const { data, error, loading, reload } = useApi(() => api.get<HrDocument[]>('/documents', { status, user_id: userId }), [status, userId])

  async function review(d: HrDocument, next: 'approved' | 'rejected') {
    const note = next === 'rejected' ? prompt(t('reject_doc_prompt')) ?? undefined : undefined
    if (next === 'rejected' && note === undefined) return
    await api.patch(`/documents/${d.id}`, { status: next, note }).then(() => { toast(t('doc_status_changed')); reload() }, (e) => toast.error(e))
  }

  async function add() {
    if (!userId || !newTitle.trim()) return
    await api.post('/documents', { user_id: Number(userId), title: newTitle }).then(() => { setNewTitle(''); toast(t('doc_slot_added')); reload() }, (e) => toast.error(e))
  }

  return (
    <>
      <PageHeader title={t('doc_title')} subtitle={t('doc_subtitle')} />
      <Card>
        <div className="toolbar">
          <Field label={t('status')}>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="submitted">{t('doc_waiting')}</option><option value="missing">{t('ds_missing')}</option>
              <option value="rejected">{t('ds_rejected')}</option><option value="approved">{t('ds_approved')}</option><option value="">{t('all')}</option>
            </select>
          </Field>
          <Field label={t('employee')}>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">{t('all')}</option>
              {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          {userId && (
            <>
              <Field label={t('request_extra_doc')}><input value={newTitle} placeholder={t('doc_placeholder')} onChange={(e) => setNewTitle(e.target.value)} /></Field>
              <Button variant="secondary" icon="plus" onClick={add} disabled={!newTitle.trim()}>{t('add')}</Button>
            </>
          )}
        </div>
        {loading && !data ? <Loading /> : error ? <ErrorBox error={error} onRetry={reload} /> : !data?.length ? <Empty icon="file">{t('no_documents')}</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('employee')}</th><th>{t('document')}</th><th>{t('status')}</th><th>{t('updated')}</th><th /></tr></thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <td><Person name={d.user_name} /></td>
                    <td><span className="doc-title"><Icon name="file" size={15} />{d.title}</span>{d.note && <div className="muted small">{d.note}</div>}</td>
                    <td><StatusBadge kind="document" status={d.status} /></td>
                    <td className="small nowrap">{fmtDate(d.updated_at)}</td>
                    <td className="end">
                      <div className="row-actions end">
                        {d.has_file && <Button size="sm" variant="ghost" icon="download" onClick={() => download(`/documents/${d.id}/file`, undefined, d.original_name ?? d.title).catch((e) => toast.error(e))}>{t('download')}</Button>}
                        {d.status === 'submitted' && (
                          <>
                            <Button size="sm" icon="check" onClick={() => review(d, 'approved')}>{t('approve')}</Button>
                            <Button size="sm" variant="secondary" icon="x" onClick={() => review(d, 'rejected')}>{t('reject')}</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
