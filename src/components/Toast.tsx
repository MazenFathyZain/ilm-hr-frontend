import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { errorMessage } from '../api/client'
import { useI18n } from '../i18n/I18nContext'
import { Icon, type IconName } from './Icon'

export type Tone = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: number; tone: Tone; message: string }

/**
 * `toast('Saved')` keeps working; the helpers pick the tone, and `toast.error(err)` accepts anything
 * thrown (ApiError, Error, string) and shows the right user-facing text.
 */
export interface ToastFn {
  (message: string, tone?: Tone): void
  success: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  error: (err: unknown) => void
}

const ICONS: Record<Tone, IconName> = { success: 'checkCircle', error: 'alert', warning: 'triangle', info: 'info' }
// Errors stay longer so there is time to read them.
const DURATION: Record<Tone, number> = { success: 3500, info: 4500, warning: 6000, error: 8000 }

function makeToastFn(push: (message: string, tone?: Tone) => void): ToastFn {
  return Object.assign((message: string, tone?: Tone) => push(message, tone), {
    success: (m: string) => push(m, 'success'),
    info: (m: string) => push(m, 'info'),
    warning: (m: string) => push(m, 'warning'),
    error: (err: unknown) => push(errorMessage(err), 'error'),
  })
}

const ToastContext = createContext<ToastFn>(makeToastFn(() => {}))

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  // One stable Map of auto-dismiss timers for the provider's lifetime.
  const [timers] = useState(() => new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    setToasts((list) => list.filter((x) => x.id !== id))
  }, [timers])

  const schedule = useCallback((id: number, tone: Tone) => {
    clearTimeout(timers.get(id))
    timers.set(id, setTimeout(() => dismiss(id), DURATION[tone]))
  }, [dismiss, timers])

  const hold = useCallback((id: number) => clearTimeout(timers.get(id)), [timers])

  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random()
    // The same message twice in a row (e.g. a double click) replaces the old one instead of stacking.
    setToasts((list) => [...list.filter((x) => !(x.message === message && x.tone === tone)), { id, tone, message }].slice(-4))
    schedule(id, tone)
  }, [schedule])

  useEffect(() => () => timers.forEach(clearTimeout), [timers])

  const value = useMemo(() => makeToastFn(push), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastList toasts={toasts} onDismiss={dismiss}
        onHold={hold}
        onRelease={(tst) => schedule(tst.id, tst.tone)} />
    </ToastContext.Provider>
  )
}

function ToastList({ toasts, onDismiss, onHold, onRelease }: {
  toasts: ToastItem[]; onDismiss: (id: number) => void; onHold: (id: number) => void; onRelease: (t: ToastItem) => void
}) {
  const { t } = useI18n()
  return (
    // Polite region for confirmations; error toasts carry role="alert" so screen readers announce them immediately.
    <div className="toasts" aria-live="polite" aria-label={t('notifications')}>
      {toasts.map((tst) => (
        <div key={tst.id} className={`toast toast-${tst.tone}`} role={tst.tone === 'error' ? 'alert' : 'status'}
          onMouseEnter={() => onHold(tst.id)} onMouseLeave={() => onRelease(tst)}
          onFocus={() => onHold(tst.id)} onBlur={() => onRelease(tst)}>
          <span className="toast-icon"><Icon name={ICONS[tst.tone]} size={18} /></span>
          <span className="toast-message">{tst.message}</span>
          <button type="button" className="toast-close" onClick={() => onDismiss(tst.id)} aria-label={t('dismiss')} title={t('dismiss')}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
