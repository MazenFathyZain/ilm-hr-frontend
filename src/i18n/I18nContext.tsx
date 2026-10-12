import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { TKey } from './en'
import { LANG_STORAGE_KEY, initialLang, setActiveLang, translate, type Lang } from './translate'

type Vars = Record<string, string | number>

interface I18n {
  lang: Lang
  dir: 'rtl' | 'ltr'
  t: (key: TKey, vars?: Vars) => string
  setLang: (l: Lang) => void
  toggleLang: () => void
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => setActiveLang(initialLang()))

  useEffect(() => {
    setActiveLang(lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    try { localStorage.setItem(LANG_STORAGE_KEY, lang) } catch { /* storage unavailable */ }
  }, [lang])

  const setLang = useCallback((l: Lang) => { setActiveLang(l); setLangState(l) }, [])
  const value = useMemo<I18n>(() => ({
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    t: (key, vars) => translate(lang, key, vars),
    setLang,
    toggleLang: () => setLang(lang === 'ar' ? 'en' : 'ar'),
  }), [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
