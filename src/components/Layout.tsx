import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import type { TKey } from '../i18n/en'
import { roleLabel } from '../lib/format'
import { useTheme, type ThemeMode } from '../theme/ThemeContext'
import { ErrorBoundary } from './ErrorBoundary'
import { Icon, type IconName } from './Icon'
import { OfflineBanner } from './OfflineBanner'
import { Avatar, Seal } from './ui'

interface NavItem { to: string; label: TKey; icon: IconName; end?: boolean; managerOnly?: boolean }

const SECTIONS: { title?: TKey; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'nav_overview', icon: 'overview', end: true }] },
  {
    title: 'nav_section_people',
    items: [
      { to: '/attendance', label: 'nav_attendance', icon: 'clock' },
      { to: '/requests', label: 'nav_requests', icon: 'inbox' },
      { to: '/employees', label: 'nav_employees', icon: 'users' },
      { to: '/teams', label: 'nav_teams', icon: 'team' },
      { to: '/locations', label: 'nav_locations', icon: 'pin' },
    ],
  },
  {
    title: 'nav_section_admin',
    items: [
      { to: '/payroll', label: 'nav_payroll', icon: 'wallet', managerOnly: true },
      { to: '/adjustments', label: 'nav_adjustments', icon: 'award', managerOnly: true },
      { to: '/documents', label: 'nav_documents', icon: 'file', managerOnly: true },
      { to: '/settings', label: 'nav_settings', icon: 'settings', managerOnly: true },
    ],
  },
]

export function Layout() {
  const { user, isManager, logout } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false) }

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <Seal size={52} />
          <div>
            <div className="brand-name">{t('app_name')}</div>
            <div className="brand-tagline">{t('app_tagline')}</div>
          </div>
        </div>
        <nav aria-label={t('menu')}>
          {SECTIONS.map((section, i) => {
            const items = section.items.filter((n) => !n.managerOnly || isManager)
            if (!items.length) return null
            return (
              <div key={i} className="nav-section">
                {section.title && <div className="nav-title">{t(section.title)}</div>}
                {items.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Icon name={n.icon} />
                    {t(n.label)}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="me">
            {user && <Avatar name={user.name} src={user.avatar_url} size={36} />}
            <div className="me-text">
              <div className="me-name">{user?.name}</div>
              <div className="me-role">{user && roleLabel(user.role)}</div>
            </div>
            <button className="icon-btn sidebar-logout" onClick={logout} title={t('sign_out')} aria-label={t('sign_out')}>
              <Icon name="logout" className="flip-rtl" />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <div className="topbar-wrap">
          <OfflineBanner />
          <header className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label={t('menu')}><Icon name="menu" size={20} /></button>
            {!isManager && <span className="scope-pill"><Icon name="team" size={14} />{t('scope_team_only')}</span>}
            <span className="spacer" />
            <Preferences />
          </header>
        </div>
        <main className="content">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

/** Language switch + light/dark/system theme picker. Also used on the login page. */
export function Preferences() {
  const { t, toggleLang } = useI18n()
  const { mode, setMode } = useTheme()
  const modes: { value: ThemeMode; icon: IconName; label: TKey }[] = [
    { value: 'light', icon: 'sun', label: 'theme_light' },
    { value: 'dark', icon: 'moon', label: 'theme_dark' },
    { value: 'system', icon: 'monitor', label: 'theme_system' },
  ]
  return (
    <div className="prefs">
      <button className="pref-lang" onClick={toggleLang} title={t('language')}>
        <Icon name="globe" size={16} />
        <span>{t('switch_language')}</span>
      </button>
      <div className="segmented" role="radiogroup" aria-label={t('theme')}>
        {modes.map((m) => (
          <button key={m.value} role="radio" aria-checked={mode === m.value} className={mode === m.value ? 'active' : ''}
            onClick={() => setMode(m.value)} title={t(m.label)} aria-label={t(m.label)}>
            <Icon name={m.icon} size={15} />
          </button>
        ))}
      </div>
    </div>
  )
}
