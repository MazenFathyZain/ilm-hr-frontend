import { useState } from 'react'
import { api } from '../api/client'
import type { HrRequest, RequestStatus, RequestType, Team } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Person, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { REQUEST_TYPES, fmtDate, requestSummary, requestTypeLabel, statusLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

const STATUS_TABS: (RequestStatus | '')[] = ['pending', 'approved', 'rejected', 'cancelled', '']

export function RequestsPage() {
  const { user, isManager } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [status, setStatus] = useState<RequestStatus | ''>('pending')
  const [type, setType] = useState<RequestType | ''>('')
  const [teamId, setTeamId] = useState('')
  const [review, setReview] = useState<{ request: HrRequest; decision: 'approve' | 'reject' } | null>(null)
  const teams = useApi(() => api.get<Team[]>('/teams'))
  const { data, error, loading, reload } = useApi(
    () => api.get<HrRequest[]>('/requests', { status, type, team_id: teamId }),
    [status, type, teamId],
  )

  return (
    <>
      <PageHeader title={t('req_title')} subtitle={isManager ? t('req_subtitle_manager') : t('req_subtitle_leader')} />
      <Card>
        <div className="toolbar">
          <div className="chips">
            {STATUS_TABS.map((s) => (
              <button key={s || 'all'} className={`chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                {s ? statusLabel('request', s) : t('all')}
              </button>
            ))}
          </div>
          <span className="spacer" />
          <Field label={t('type')}>
            <select value={type} onChange={(e) => setType(e.target.value as RequestType | '')}>
              <option value="">{t('all_types')}</option>
              {REQUEST_TYPES.map((k) => <option key={k} value={k}>{requestTypeLabel(k)}</option>)}
            </select>
          </Field>
          <Field label={t('team')}>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">{t('all_teams')}</option>
              {teams.data?.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </Field>
        </div>

        {loading && !data ? <Loading /> : error ? <ErrorBox error={error} onRetry={reload} /> : !data?.length ? <Empty>{t('no_requests')}</Empty> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>{t('employee')}</th><th>{t('request')}</th><th>{t('reason')}</th><th>{t('submitted')}</th><th>{t('status')}</th><th /></tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td><Person name={r.user_name} avatar={r.user_avatar_url} sub={r.team_name ?? t('no_team')} /></td>
                    <td>
                      <span className={`type-pill type-${r.type}`}>{requestTypeLabel(r.type)}</span> <span className="muted small">#{r.id}</span>
                      <div className="small">{requestSummary(r)}</div>
                    </td>
                    <td className="small wrap">{r.reason ?? '—'}</td>
                    <td className="small nowrap">{fmtDate(r.created_at)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.reviewer_name && <div className="muted small">{t('by_name', { name: r.reviewer_name })}</div>}
                      {r.review_note && <div className="muted small wrap">“{r.review_note}”</div>}
                    </td>
                    <td className="end nowrap">
                      {r.status === 'pending' && r.user_id !== user?.id && (
                        <div className="row-actions end">
                          <Button size="sm" icon="check" onClick={() => setReview({ request: r, decision: 'approve' })}>{t('approve')}</Button>
                          <Button size="sm" variant="secondary" icon="x" onClick={() => setReview({ request: r, decision: 'reject' })}>{t('reject')}</Button>
                        </div>
                      )}
                      {r.status === 'pending' && r.user_id === user?.id && <span className="muted small">{t('own_request_note')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {review && (
        <ReviewModal
          {...review}
          onClose={() => setReview(null)}
          onDone={(msg) => { toast(msg); setReview(null); reload() }}
        />
      )}
    </>
  )
}

function ReviewModal({ request, decision, onClose, onDone }: { request: HrRequest; decision: 'approve' | 'reject'; onClose: () => void; onDone: (m: string) => void }) {
  const { t } = useI18n()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<unknown>(null)
  async function submit() {
    setBusy(true)
    setFormError(null)
    try {
      await api.patch(`/requests/${request.id}/${decision}`, { note })
      onDone(decision === 'approve' ? t('request_approved') : t('request_rejected'))
    } catch (e) {
      setFormError(e)
      setBusy(false)
    }
  }
  const typeName = requestTypeLabel(request.type)
  return (
    <Modal title={decision === 'approve' ? t('approve_title', { type: typeName }) : t('reject_title', { type: typeName })} onClose={onClose} error={formError} footer={
      <>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button variant={decision === 'approve' ? 'primary' : 'danger'} icon={decision === 'approve' ? 'check' : 'x'} loading={busy} onClick={submit}>
          {decision === 'approve' ? t('approve') : t('reject')}
        </Button>
      </>
    }>
      <div className="review-summary">
        <Person name={request.user_name} avatar={request.user_avatar_url} sub={request.team_name} />
        <p className="small">{requestSummary(request)}</p>
        {request.reason && <blockquote>{request.reason}</blockquote>}
      </div>
      <Field label={decision === 'reject' ? t('reject_reason_label') : t('approve_note_label')}>
        <textarea rows={3} value={note} onChange={(e) => { setNote(e.target.value); setFormError(null) }} />
      </Field>
    </Modal>
  )
}
