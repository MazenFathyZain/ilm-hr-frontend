import { useSyncExternalStore } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { Icon } from './Icon'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** Thin warning strip shown while the browser reports no network connection. */
export function OfflineBanner() {
  const { t } = useI18n()
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online) return null
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <Icon name="wifiOff" size={16} />
      <span>{t('offline_banner')}</span>
    </div>
  )
}
