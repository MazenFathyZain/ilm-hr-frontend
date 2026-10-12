import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import logo from '../assets/logo.png'
import { useI18n } from '../i18n/I18nContext'
import { STATUS_TONE, initials, statusLabel } from '../lib/format'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
export function Button({ variant = 'primary', size, loading, icon, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm'; loading?: boolean; icon?: IconName }) {
  return (
    <button className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner spinner-inline" aria-hidden /> : icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

/** The circular seal logo. It has a white background, so it is always shown as a round badge. */
export function Seal({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src={logo} alt="" width={size} height={size} className={`seal ${className}`} />
}

export function Badge({ tone, children }: { tone?: 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'gold'; children: ReactNode }) {
  return <span className={`badge badge-${tone ?? 'gray'}`}>{children}</span>
}

export function StatusBadge({ status, kind = 'request', label }: { status: string; kind?: 'request' | 'payslip' | 'document'; label?: string }) {
  return <Badge tone={STATUS_TONE[status]}><span className="badge-dot" />{label ?? statusLabel(kind, status)}</Badge>
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  // Stable warm hue per name so people are easy to tell apart in lists.
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, ['--av-h' as string]: `${(hue % 50) + 15}` }} aria-hidden>
      {initials(name)}
    </span>
  )
}

export function Person({ name, sub }: { name: string; sub?: ReactNode }) {
  return (
    <span className="person">
      <Avatar name={name} />
      <span className="person-text">
        <strong>{name}</strong>
        {sub && <span className="muted small">{sub}</span>}
      </span>
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <Ornament />
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

/** Small gold divider echoing the logo's ornament. */
export function Ornament() {
  return (
    <svg className="ornament" width="120" height="12" viewBox="0 0 120 12" aria-hidden="true">
      <path d="M0 6h48M72 6h48" stroke="currentColor" strokeWidth="1" />
      <path d="M60 1l5 5-5 5-5-5z" fill="currentColor" />
      <circle cx="51" cy="6" r="1.5" fill="currentColor" /><circle cx="69" cy="6" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function Card({ title, icon, actions, children, className = '' }: { title?: ReactNode; icon?: IconName; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          {title && <h2>{icon && <span className="card-icon"><Icon name={icon} size={16} /></span>}{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}><Icon name="x" /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  )
}

export function Loading() {
  const { t } = useI18n()
  return <div className="center-pad"><span className="spinner" aria-label={t('loading')} /></div>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="error-box" role="alert">
      <Icon name="alert" />
      <span className="spacer">{message}</span>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>{t('retry')}</Button>}
    </div>
  )
}

export function Empty({ children, icon = 'inbox' }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={22} /></span>
      <div>{children}</div>
    </div>
  )
}

export function Stat({ label, value, tone, hint, icon }: { label: string; value: ReactNode; tone?: string; hint?: ReactNode; icon?: IconName }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon"><Icon name={icon} size={16} /></span>}
      </div>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={value === i.value} className={value === i.value ? 'active' : ''} onClick={() => onChange(i.value)}>
          {i.label}
        </button>
      ))}
    </div>
  )
}
