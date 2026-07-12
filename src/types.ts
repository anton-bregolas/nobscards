export interface DictMeta {
  type: string
  langFrom: string
  langTo: string
  langToAlt: string
  langRef: string
}

export interface Word {
  id: number
  [key: string]: string | string[] | number | null
}

export type View = 'home' | 'favorites' | 'learned' | 'settings'

export interface StoredWord {
  id: number
  addedAt: string
  accuStat?: number[]
}

export interface AppSettings {
  autoFlipOnWrong: number | false
  autoAdvanceOnLearn: boolean
  autoAddGuessedToLearned: boolean
  phrasebookMode: boolean
  phrasebookThreshold: number
  useAltInputLang: boolean
  useRefLangForLabels: boolean
  sortTablesBy: string[]
}

export interface ExportedData {
  dictId: string
  version: number
  fromToFavorites: StoredWord[]
  fromToLearned: StoredWord[]
  fromToGuessed: number[]
  fromToViewed: number[]
  toFromFavorites: StoredWord[]
  toFromLearned: StoredWord[]
  toFromGuessed: number[]
  toFromViewed: number[]
}
