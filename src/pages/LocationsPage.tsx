import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Location, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { LocationMap } from '../components/LocationMap'
import { useToast } from '../components/Toast'
import { Avatar, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'
import { useApi } from '../lib/useApi'

export function LocationsPage() {
  const { isManager } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [editing, setEditing] = useState<Location | 'new' | null>(null)
  const { data, error, loading, reload } = useApi(() => api.get<Location[]>('/locations'))

  async function remove(l: Location) {
    if (!confirm(t('confirm_delete_location', { name: l.name, n: l.assigned_count }))) return
    try {
      await api.del(`/locations/${l.id}`)
      toast(t('location_deleted'))
      reload()
    } catch (e) {
      toast.error(e)
    }
  }

  return (
    <>
      <PageHeader
        title={t('loc_title')}
        subtitle={t('loc_subtitle')}
        actions={isManager && <Button icon="plus" onClick={() => setEditing('new')}>{t('add_location')}</Button>}
      />
      {loading && !data ? <Loading /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <div className="locations-layout">
          <Card className="map-card"><LocationMap points={data ?? []} height={460} /></Card>
          <div className="location-list">
            {!data?.length ? <Card><Empty icon="pin">{t('no_locations')}</Empty></Card> : data.map((l) => (
              <section key={l.id} className={`card location-card ${l.is_active ? '' : 'is-inactive'}`}>
                <div className="location-card-head">
                  <span className="team-emblem"><Icon name="pin" size={18} /></span>
                  <div className="spacer">
                    <h2>{l.name}</h2>
                    {l.address && <div className="muted small">{l.address}</div>}
                  </div>
                  <StatusBadge status={l.is_active ? 'active' : 'inactive'} label={l.is_active ? t('active') : t('inactive')} />
                </div>
                <div className="location-facts">
                  <span><span className="muted">{t('radius')}</span> <strong>{t('meters', { n: l.radius_meters })}</strong></span>
                  <span><span className="muted">{t('assigned_employees')}</span> <strong>{l.assigned_count}</strong></span>
                  <span className="mono small muted" dir="ltr">{l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}</span>
                </div>
                {isManager && (
                  <div className="row-actions">
                    <Button size="sm" variant="secondary" icon="settings" onClick={() => setEditing(l)}>{t('edit')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(l)}>{t('delete')}</Button>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
      {editing && (
        <LocationForm
          location={editing === 'new' ? null : editing}
          others={data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
    </>
  )
}

function LocationForm({ location, others, onClose, onSaved }: { location: Location | null; others: Location[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useI18n()
  const users = useApi(() => api.get<User[]>('/users', { active: 'true' }))
  const detail = useApi(() => (location ? api.get<Location>(`/locations/${location.id}`) : Promise.resolve(null)), [location?.id])
  const [form, setForm] = useState({
    name: location?.name ?? '',
    address: location?.address ?? '',
    latitude: location ? String(location.latitude) : '',
    longitude: location ? String(location.longitude) : '',
    radius_meters: String(location?.radius_meters ?? 100),
    is_active: location?.is_active ?? true,
  })
  const [userIds, setUserIds] = useState<number[] | null>(location ? null : [])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<unknown>(null)
  const [locating, setLocating] = useState(false)
  const assigned = userIds ?? detail.data?.users?.map((u) => u.id) ?? []

  const set = (patch: Partial<typeof form>) => { setFormError(null); setForm((f) => ({ ...f, ...patch })) }
  const pick = (lat: number, lng: number) => set({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) })

  function useMyPosition() {
    if (!navigator.geolocation) return toast.warning(t('geo_unavailable'))
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { pick(p.coords.latitude, p.coords.longitude); setLocating(false) },
      (e) => { toast.error(e); setLocating(false) },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFormError(null)
    const body = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), radius_meters: Number(form.radius_meters), user_ids: assigned }
    try {
      if (location) await api.patch(`/locations/${location.id}`, body)
      else await api.post('/locations', body)
      toast(location ? t('location_updated') : t('location_created'))
      onSaved()
    } catch (err) {
      setFormError(err)
    } finally {
      setBusy(false)
    }
  }

  const lat = Number(form.latitude)
  const lng = Number(form.longitude)
  const hasPoint = form.latitude !== '' && form.longitude !== '' && Number.isFinite(lat) && Number.isFinite(lng)

  return (
    <Modal wide title={location ? t('edit_location', { name: location.name }) : t('add_location')} onClose={onClose} error={formError} footer={
      <>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" form="location-form" icon="check" loading={busy} disabled={!hasPoint}>{t('save')}</Button>
      </>
    }>
      <p className="muted small">{t('map_hint')}</p>
      <LocationMap
        height={300}
        points={others}
        editing={{ id: location?.id, name: form.name, latitude: hasPoint ? lat : NaN, longitude: hasPoint ? lng : NaN, radius_meters: Number(form.radius_meters) || 0 }}
        onPick={pick}
      />
      <form id="location-form" className="form-grid" onSubmit={submit} onChange={() => setFormError(null)}>
        <Field label={`${t('name')} *`}><input required value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label={t('address')}><input value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field label={`${t('latitude')} *`}><input required dir="ltr" inputMode="decimal" value={form.latitude} onChange={(e) => set({ latitude: e.target.value })} /></Field>
        <Field label={`${t('longitude')} *`}><input required dir="ltr" inputMode="decimal" value={form.longitude} onChange={(e) => set({ longitude: e.target.value })} /></Field>
        <Field label={t('radius_label', { n: form.radius_meters })} hint={t('radius_hint')}>
          <input type="range" min={20} max={1000} step={10} value={form.radius_meters} onChange={(e) => set({ radius_meters: e.target.value })} />
        </Field>
        <div className="field">
          <span className="field-label">&nbsp;</span>
          <div className="row-actions">
            <Button type="button" variant="secondary" icon="pin" loading={locating} onClick={useMyPosition}>{t('use_my_position')}</Button>
            <label className="check"><input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} /> {t('active')}</label>
          </div>
        </div>
        <fieldset className="field-wide picker">
          <legend>{t('allowed_here', { n: assigned.length })}</legend>
          {users.loading || (location && detail.loading) ? <Loading /> : (
            <>
              <div className="row-actions">
                <Button type="button" size="sm" variant="ghost" onClick={() => setUserIds(users.data?.map((u) => u.id) ?? [])}>{t('select_all')}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setUserIds([])}>{t('clear')}</Button>
              </div>
              {users.data?.map((u) => (
                <label key={u.id} className="picker-option">
                  <input type="checkbox" checked={assigned.includes(u.id)} onChange={() => setUserIds(assigned.includes(u.id) ? assigned.filter((x) => x !== u.id) : [...assigned, u.id])} />
                  <Avatar name={u.name} src={u.avatar_url} size={26} />
                  <span><strong>{u.name}</strong> <span className="muted small">· {u.team_name ?? t('no_team')}{u.locations.length ? ` · ${t('locations_n', { n: u.locations.length })}` : ''}</span></span>
                </label>
              ))}
            </>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}
