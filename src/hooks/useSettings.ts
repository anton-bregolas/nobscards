import { useMemo } from 'react'
import type { AppSettings } from '../types'
import { useLocalStorage } from './useLocalStorage'

const defaultSettings: AppSettings = {
  autoFlipOnWrong: false,
  autoAdvanceOnLearn: false,
  autoAddAnsweredToLearned: false,
  phrasebookMode: false,
  phrasebookThreshold: 75,
  useAltInputLang: false,
  useRefLangForLabels: false,
  sortTablesBy: ['date_desc'],
  language: 'ru',
}

export function useSettings() {
  const [raw, setRaw] = useLocalStorage<AppSettings>('cardsSettings', defaultSettings)
  const settings = useMemo(() => ({ ...defaultSettings, ...raw }), [raw])
  return [settings, setRaw] as const
}
