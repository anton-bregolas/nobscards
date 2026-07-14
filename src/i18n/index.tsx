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

type RuKey = keyof typeof ru

interface I18nValue {
  t: (key: RuKey, params?: Record<string, string | number>) => string
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
