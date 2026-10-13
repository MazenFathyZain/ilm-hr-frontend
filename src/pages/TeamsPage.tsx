import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Team, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { roleLabel } from '../lib/format'
import { useApi } from '../lib/useApi'

export function TeamsPage() {
  const { isManager } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [editing, setEditing] = useState<Team | 'new' | null>(null)
  const { data, error, loading, reload } = useApi(() => api.get<Team[]>('/teams'))

  async function remove(team: Team) {
    if (!confirm(t('confirm_delete_team', { name: team.name }))) return
    try {
      await api.del(`/teams/${team.id}`)
      toast(t('team_deleted'))
      reload()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <>
      <PageHeader
        title={t('teams_title')}
        subtitle={t('teams_subtitle')}
        actions={isManager && <Button icon="plus" onClick={() => setEditing('new')}>{t('new_team')}</Button>}
      />
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? (
        <Card><Empty icon="team">{isManager ? t('no_teams') : t('not_leading')}</Empty></Card>
      ) : (
        <div className="cards-grid">
          {data.map((team) => <TeamCard key={team.id} team={team} canEdit={isManager} onEdit={() => setEditing(team)} onDelete={() => remove(team)} />)}
        </div>
      )}
      {editing && (
        <TeamForm team={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
      )}
    </>
  )
}

function TeamCard({ team, canEdit, onEdit, onDelete }: { team: Team; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n()
  const { data } = useApi(() => api.get<Team>(`/teams/${team.id}`), [team.id, team.member_count, team.leader_id])
  return (
    <section className="card team-card">
      <header className="team-card-head">
        <span className="team-emblem"><Icon name="team" size={20} /></span>
        <div className="spacer">
          <h2>{team.name}</h2>
          <span className="muted small">{t('members_count', { n: team.member_count })}</span>
        </div>
        {canEdit && (
          <div className="row-actions">
            <button className="icon-btn" onClick={onEdit} aria-label={t('edit')} title={t('edit')}><Icon name="settings" size={16} /></button>
            <button className="icon-btn danger" onClick={onDelete} aria-label={t('delete')} title={t('delete')}><Icon name="x" size={16} /></button>
          </div>
        )}
      </header>
      {team.description && <p className="muted small">{team.description}</p>}
      <div className="team-leader">
        <span className="muted small">{t('leader')}</span>
        {team.leader_name ? <strong>{team.leader_name}</strong> : <span className="text-red small">{t('no_leader_note')}</span>}
      </div>
      <ul className="list">
        {data?.members?.map((m) => (
          <li key={m.id} className="list-row">
            <Link to={`/employees/${m.id}`} className="person plain-link">
              <Avatar name={m.name} src={m.avatar_url} size={30} />
              <span className="person-text"><strong>{m.name}</strong><span className="muted small">{m.job_title}</span></span>
            </Link>
            {m.id === team.leader_id ? <Badge tone="gold">{t('leader')}</Badge> : !m.is_active ? <Badge tone="red">{t('inactive')}</Badge> : null}
          </li>
        ))}
        {data && !data.members?.length && <li className="muted small">{t('no_members')}</li>}
      </ul>
    </section>
  )
}

function TeamForm({ team, onClose, onSaved }: { team: Team | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useI18n()
  const users = useApi(() => api.get<User[]>('/users', { active: 'true' }))
  const current = useApi(() => (team ? api.get<Team>(`/teams/${team.id}`) : Promise.resolve(null)), [team?.id])
  const [name, setName] = useState(team?.name ?? '')
  const [description, setDescription] = useState(team?.description ?? '')
  const [leaderId, setLeaderId] = useState(team?.leader_id ? String(team.leader_id) : '')
  const [memberIds, setMemberIds] = useState<number[] | null>(team ? null : [])
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)

  const members = memberIds ?? current.data?.members?.map((m) => m.id) ?? []
  const toggle = (id: number) => setMemberIds(members.includes(id) ? members.filter((x) => x !== id) : [...members, id])
  const leader = users.data?.find((u) => String(u.id) === leaderId)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const body = { name, description, leader_id: leaderId ? Number(leaderId) : null, member_ids: members }
    try {
      if (team) await api.patch(`/teams/${team.id}`, body)
      else await api.post('/teams', body)
      toast(team ? t('team_updated') : t('team_created'))
      onSaved()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const visible = users.data?.filter((u) => !filter || u.name.toLowerCase().includes(filter.toLowerCase())) ?? []
  return (
    <Modal wide title={team ? t('edit_team', { name: team.name }) : t('new_team')} onClose={onClose} footer={
      <>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" form="team-form" icon="check" loading={busy}>{t('save')}</Button>
      </>
    }>
      <form id="team-form" className="form-grid" onSubmit={submit}>
        <Field label={`${t('team_name')} *`}><input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('team_leader')} hint={leader?.role === 'employee' ? t('will_promote', { name: leader.name }) : undefined}>
          <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
            <option value="">{t('no_leader')}</option>
            {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>)}
          </select>
        </Field>
        <Field label={t('description')} wide><input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <fieldset className="field-wide picker">
          <legend>{t('members_n', { n: members.length })} <span className="muted small">— {t('one_team_hint')}</span></legend>
          <input type="search" placeholder={t('filter_employees')} value={filter} onChange={(e) => setFilter(e.target.value)} className="picker-filter" />
          {users.loading || (team && current.loading) ? <Loading /> : visible.map((u) => (
            <label key={u.id} className="picker-option">
              <input type="checkbox" checked={members.includes(u.id)} onChange={() => toggle(u.id)} />
              <Avatar name={u.name} src={u.avatar_url} size={26} />
              <span>
                <strong>{u.name}</strong>
                <span className="muted small"> · {u.job_title ?? roleLabel(u.role)}{u.team_name && u.team_id !== team?.id ? ` · ${t('currently_in', { team: u.team_name })}` : ''}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </form>
    </Modal>
  )
}
