import { ar } from './ar'
import { en, type TKey } from './en'

export type Lang = 'en' | 'ar'
type Vars = Record<string, string | number>

const DICTS: Record<Lang, Record<TKey, string>> = { en, ar }
export const LANG_STORAGE_KEY = 'hr.lang'

// Read by the formatting helpers in lib/format.ts so they don't need the context.
let activeLang: Lang = 'en'
export const setActiveLang = (l: Lang) => (activeLang = l)
export const currentLang = () => activeLang
/** Arabic text with Latin digits keeps codes, times and amounts easy to compare with inputs. */
export const intlLocale = () => (activeLang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB')

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY)
    if (saved === 'ar' || saved === 'en') return saved
  } catch { /* storage unavailable */ }
  return navigator.language?.startsWith('ar') ? 'ar' : 'en'
}

export function translate(lang: Lang, key: TKey, vars?: Vars) {
  const text = DICTS[lang][key] ?? en[key] ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text
}

