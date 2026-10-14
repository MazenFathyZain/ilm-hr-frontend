import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { Icon } from './Icon'
import { Button } from './ui'

/**
 * Catches render errors in the routed page so one broken page shows a friendly message
 * instead of a blank screen. Give it `key={pathname}` so navigating away resets it.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack)
  }

  render() {
    return this.state.error ? <PageCrashed onReset={() => this.setState({ error: null })} /> : this.props.children
  }
}

function PageCrashed({ onReset }: { onReset: () => void }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  return (
    <div className="crash" role="alert">
      <span className="crash-icon"><Icon name="triangle" size={28} /></span>
      <h1>{t('boundary_title')}</h1>
      <p className="muted">{t('boundary_text')}</p>
      <div className="page-actions">
        <Button icon="refresh" onClick={() => window.location.reload()}>{t('reload_page')}</Button>
        <Button variant="secondary" icon="overview" onClick={() => { onReset(); navigate('/') }}>{t('go_overview')}</Button>
      </div>
    </div>
  )
}
