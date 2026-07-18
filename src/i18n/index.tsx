import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import ru from './ru.json'
import en from './en.json'
import sr from './sr.json'

const resources = { ru, en, sr }

export const APP_LANGUAGES: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  sr: 'Srpski',
}

interface I18nValue {
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nCtx = createContext<I18nValue>({
  t: (k) => k,
})

function makeT(lang: string): (key: string, params?: Record<string, string | number>) => string {
  const dict = (resources as Record<string, Record<string, string>>)[lang] ?? resources.ru
  const fallback = resources.ru as Record<string, string>
  return (key: string, params?: Record<string, string | number>) => {
    let val = dict[key] ?? fallback[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replaceAll(`{{${k}}}`, String(v))
      }
    }
    return val
  }
}

export function I18nProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => ({ t: makeT(lang) }), [lang])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export function useTranslation() {
  return useContext(I18nCtx)
}

export function timeUnitKey(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'settings.timeUnitMinutes1'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return 'settings.timeUnitMinutes234'
  return 'settings.timeUnitMinutes56789'
}
