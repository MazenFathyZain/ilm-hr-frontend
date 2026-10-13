import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Overview } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { Card, Empty, ErrorBox, Loading, PageHeader, Person, Stat, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { fmtDay, fmtLongDate, requestSummary, requestTypeLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

export function OverviewPage() {
  const { user, isManager } = useAuth()
  const { t } = useI18n()
  const { data, error, loading, reload } = useApi(() => api.get<Overview>('/overview'))

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
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
