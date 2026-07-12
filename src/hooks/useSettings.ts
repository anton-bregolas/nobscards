import { useMemo } from 'react'
import type { AppSettings } from '../types'
import { useLocalStorage } from './useLocalStorage'

const defaultSettings: AppSettings = {
  autoFlipOnWrong: false,
  autoAdvanceOnLearn: false,
  autoAddGuessedToLearned: false,
  phrasebookMode: false,
  phrasebookThreshold: 75,
  useAltInputLang: false,
  useRefLangForLabels: false,
  sortTablesBy: ['date_desc'],
}

export function useSettings() {
  const [raw, setRaw] = useLocalStorage<AppSettings>('cardsSettings', defaultSettings)
  const settings = useMemo(() => ({ ...defaultSettings, ...raw }), [raw])
  return [settings, setRaw] as const
}
