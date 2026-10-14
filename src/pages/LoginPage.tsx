import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Preferences } from '../components/Layout'
import { Button, ErrorBox, Field, Ornament, Seal } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'

export function LoginPage() {
  const { login } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero pattern-bg">
        <Seal size={220} className="login-seal" />
        <h2 className="login-hero-name">{t('app_name')}</h2>
        <p className="login-hero-tagline">{t('app_tagline')}</p>
      </aside>
      <div className="login-side">
        <div className="login-prefs"><Preferences /></div>
        <form className="login-card" onSubmit={submit}>
          <Seal size={88} className="login-seal-small" />
          <h1>{t('login_welcome')}</h1>
          <Ornament />
          <p className="muted">{t('login_subtitle')}</p>
          <Field label={t('email')}>
            <input type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }} required autoFocus />
          </Field>
          <Field label={t('password')}>
            <input type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null) }} required />
          </Field>
          <ErrorBox compact error={error} />
          <Button type="submit" loading={busy} icon="login" className="btn-block btn-lg">{t('sign_in')}</Button>
          <p className="muted small center">{t('login_title')}</p>
        </form>
      </div>
    </div>
  )
}
