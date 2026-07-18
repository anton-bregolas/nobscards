import { useState, useCallback, useMemo, useEffect, useRef, forwardRef } from 'react'
import type { View, Word, StoredWord, SrsCard, AppSettings, DictMeta } from '../types'
import { useTranslation } from '../i18n'
import { autoRateWords, autoRatePhrases, toCard, fromCard } from '../utils/srs'
import { createEmptyCard } from 'ts-fsrs'
import type { FSRS } from 'ts-fsrs'
import WordCard from './WordCard'
import InputArea from './InputArea'
import ActionButtons from './ActionButtons'
import ReviewButtons from './ReviewButtons'

interface HomeProps {
  words: Word[]
  favorites: StoredWord[]
  learned: StoredWord[]
  srsCards: SrsCard[]
  exFavorites: number[]
  settings: AppSettings
  dictMeta: DictMeta
  currentView: View
  onToggleFavorite: (id: number) => void
  onToggleLearned: (id: number) => void
  onAddViewed: (id: number) => void
  onAddAnswered: (id: number) => void
  onMatchResult: (pct: number | null) => void
  onUpdateFavoriteAccuStat: (id: number, pct: number) => void
  onReviewSaved: (wordId: number, rating: number) => void
  onRemoveFromSrs: (wordId: number) => void
  scheduler: FSRS
}

const Home = forwardRef<HTMLInputElement, HomeProps>(function Home({
  words,
  favorites,
  learned,
  srsCards,
  exFavorites,
  settings,
  dictMeta,
  currentView,
  onToggleFavorite,
  onToggleLearned,
  onAddViewed,
  onAddAnswered,
  onMatchResult,
  onUpdateFavoriteAccuStat,
  onReviewSaved,
  onRemoveFromSrs,
  scheduler,
}, ref) {
  const { t } = useTranslation()
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [clearKey, setClearKey] = useState(0)
  const [flyAnim, setFlyAnim] = useState<{ type: 'favorite' | 'learned' } | null>(null)
  const [matchPct, setMatchPct] = useState<number | null>(null)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)

  const handleMatchResult = useCallback((pct: number | null) => {
    matchPctRef.current = pct
    setMatchPct(pct)
    onMatchResult(pct)
  }, [onMatchResult])
  const pendingNextRef = useRef(false)
  const prevView = useRef(currentView)
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const autoLearnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const learnedIdsRef = useRef(new Set<number>())
  const cardContentRef = useRef<HTMLDivElement>(null)
  const hasPicked = useRef(false)
  const matchPctRef = useRef<number | null>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    if (prevView.current !== 'home' && currentView === 'home') {
      setIsFlipped(false)
      setWrongAttempts(0)
      setSelectedRating(null)
    }
    prevView.current = currentView
  }, [currentView])

  const learnedIds = useMemo(
    () => new Set(learned.map((l) => l.id)),
    [learned],
  )
  learnedIdsRef.current = learnedIds

  useEffect(() => {
    return () => {
      if (autoLearnTimerRef.current !== null) {
        clearTimeout(autoLearnTimerRef.current)
        autoLearnTimerRef.current = null
      }
    }
  }, [])

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.id)),
    [favorites],
  )

  const exFavoriteIds = useMemo(
    () => new Set(exFavorites),
    [exFavorites],
  )

  const srsMap = useMemo(
    () => new Map(srsCards.map((s) => [s.id, s])),
    [srsCards],
  )

  const availableWords = useMemo(
    () => words.filter((w) => !learnedIds.has(w.id)),
    [words, learnedIds],
  )

  const pickRandom = useCallback(() => {
    if (availableWords.length === 0) return null

    const candidates = currentId != null
      ? availableWords.filter((w) => w.id !== currentId)
      : availableWords
    const pool = candidates.length > 0 ? candidates : availableWords

    const now = Date.now()
    const dueWords = pool.filter((w) => {
      const srs = srsMap.get(w.id)
      return srs && new Date(srs.due).getTime() <= now
    })

    if (dueWords.length > 0) {
      dueWords.sort((a, b) => {
        const aDue = new Date(srsMap.get(a.id)!.due).getTime()
        const bDue = new Date(srsMap.get(b.id)!.due).getTime()
        return aDue - bDue
      })
      return dueWords[0]
    }

    const idx = Math.floor(Math.random() * pool.length)
    return pool[idx]
  }, [availableWords, srsMap, currentId])

  useEffect(() => {
    if (!currentId) {
      const w = pickRandom()
      if (w) {
        setCurrentId(w.id)
      }
      hasPicked.current = true
    }
  }, [currentId, pickRandom])

  useEffect(() => {
    committedRef.current = false
  }, [currentId])

  useEffect(() => {
    if (currentId && currentView === 'home') onAddViewed(currentId)
  }, [currentId, currentView, onAddViewed])

  const currentWord = useMemo(
    () => words.find((w) => w.id === currentId) ?? null,
    [words, currentId],
  )

  const selectedRatingRef = useRef(selectedRating)
  selectedRatingRef.current = selectedRating
  const currentWordRef = useRef(currentWord)
  currentWordRef.current = currentWord
  const onReviewSavedRef = useRef(onReviewSaved)
  onReviewSavedRef.current = onReviewSaved
  const onRemoveFromSrsRef = useRef(onRemoveFromSrs)
  onRemoveFromSrsRef.current = onRemoveFromSrs

  useEffect(() => {
    return () => {
      const rating = selectedRatingRef.current
      const word = currentWordRef.current
      if (!committedRef.current && rating !== null && word) {
        if (rating !== 0) {
          onReviewSavedRef.current(word.id, rating)
        } else {
          onRemoveFromSrsRef.current(word.id)
        }
      }
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (committedRef.current || selectedRating === null || !currentWord) return
      committedRef.current = true

      try {
        const raw = localStorage.getItem('srsCards')
        const srsCards: SrsCard[] = raw ? JSON.parse(raw) : []
        const wordId = currentWord.id

        if (selectedRating === 0) {
          const updated = srsCards.filter((s) => s.id !== wordId)
          localStorage.setItem('srsCards', JSON.stringify(updated))
        } else {
          const existing = srsCards.find((s) => s.id === wordId)
          const addedAt = existing?.addedAt ?? new Date().toISOString().split('T')[0]
          const base = existing ? toCard(existing) : { ...createEmptyCard(), id: wordId }
          const result = scheduler.next(base, new Date(), selectedRating)
          const updated = fromCard(result.card, wordId, addedAt, selectedRating)
          const next = existing
            ? srsCards.map((s) => (s.id === wordId ? updated : s))
            : [...srsCards, updated]
          localStorage.setItem('srsCards', JSON.stringify(next))
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [selectedRating, currentWord, scheduler])

  const clearAutoLearnTimer = useCallback(() => {
    if (autoLearnTimerRef.current !== null) {
      clearTimeout(autoLearnTimerRef.current)
      autoLearnTimerRef.current = null
    }
  }, [])

  const handleNext = useCallback(() => {
    clearAutoLearnTimer()

    if (selectedRating !== null && currentWord) {
      committedRef.current = true
      if (selectedRating !== 0) {
        onReviewSaved(currentWord.id, selectedRating)
        if (settings.autoAddRankedToFavorites && !favoriteIds.has(currentWord.id) && !exFavoriteIds.has(currentWord.id)) {
          onToggleFavorite(currentWord.id)
        }
      } else {
        onRemoveFromSrs(currentWord.id)
      }
    }

    const w = pickRandom()
    if (w) {
      setCurrentId(w.id)
    }
    setIsFlipped(false)
    setWrongAttempts(0)
    setMatchPct(null)
    setSelectedRating(null)
    onMatchResult(null)
    setClearKey((k) => k + 1)
  }, [pickRandom, clearAutoLearnTimer, selectedRating, currentWord, onReviewSaved, onRemoveFromSrs, onMatchResult, settings.autoAddRankedToFavorites, favoriteIds, exFavoriteIds, onToggleFavorite])

  const handleFlip = useCallback(() => {
    const goingToBack = !isFlipped
    setIsFlipped((f) => !f)
    if (goingToBack && selectedRating === null) {
      setSelectedRating(wrongAttempts > 0 ? 1 : 0)
    }
  }, [isFlipped, wrongAttempts, selectedRating])

  const handleCorrect = useCallback(() => {
    if (currentWord) onAddAnswered(currentWord.id)
    setIsFlipped(true)
    setWrongAttempts(0)

    const mp = matchPctRef.current

    if (settings.phrasebookMode && currentWord && favoriteIds.has(currentWord.id) && mp !== null) {
      onUpdateFavoriteAccuStat(currentWord.id, mp)
    }

    if (currentWord) {
      let autoRating: number
      if (settings.phrasebookMode && (mp === null || mp === 0)) {
        autoRating = 0
      } else if (settings.phrasebookMode && mp !== null) {
        autoRating = autoRatePhrases(mp, settings.phrasebookThreshold)
      } else {
        autoRating = autoRateWords(mp, wrongAttempts)
      }
      setSelectedRating(autoRating)
    }

    clearAutoLearnTimer()
    if (settings.autoAddAnsweredToLearned && currentWord && !learnedIds.has(currentWord.id)) {
      const id = currentWord.id
      autoLearnTimerRef.current = setTimeout(() => {
        autoLearnTimerRef.current = null
        if (!learnedIdsRef.current.has(id)) {
          onToggleLearned(id)
          setFlyAnim({ type: 'learned' })
          if (settings.autoAdvanceOnLearn) {
            pendingNextRef.current = true
          }
        }
      }, 2000)
    }
  }, [currentWord, onAddAnswered, clearAutoLearnTimer, settings.autoAddAnsweredToLearned, learnedIds, onToggleLearned, settings.autoAdvanceOnLearn, setFlyAnim, settings.phrasebookMode, favoriteIds, wrongAttempts, onUpdateFavoriteAccuStat, settings.phrasebookThreshold])

  const handleWrongAttempt = useCallback(() => {
    setWrongAttempts((p) => p + 1)
  }, [])

  const handleFlyDone = useCallback(() => {
    setFlyAnim(null)
    if (pendingNextRef.current) {
      pendingNextRef.current = false
      handleNext()
    }
  }, [handleNext])

  const handleToggleFavorite = useCallback(() => {
    clearAutoLearnTimer()
    if (currentWord) {
      const isFavorite = favoriteIds.has(currentWord.id)
      onToggleFavorite(currentWord.id)
      if (!isFavorite) {
        setFlyAnim({ type: 'favorite' })
      }
    }
  }, [currentWord, onToggleFavorite, favoriteIds, clearAutoLearnTimer])

  const handleToggleLearned = useCallback(() => {
    clearAutoLearnTimer()
    if (currentWord) {
      committedRef.current = true
      onRemoveFromSrs(currentWord.id)
      setSelectedRating(null)
      const wasLearned = learnedIds.has(currentWord.id)
      onToggleLearned(currentWord.id)
      if (!wasLearned) {
        setFlyAnim({ type: 'learned' })
        if (settings.autoAdvanceOnLearn) {
          pendingNextRef.current = true
        } else {
          setClearKey((k) => k + 1)
          setTimeout(() => nextBtnRef.current?.focus(), 0)
        }
      }
    }
  }, [currentWord, onToggleLearned, learnedIds, settings.autoAdvanceOnLearn, clearAutoLearnTimer, onRemoveFromSrs])

  if (!currentWord) {
    if (!hasPicked.current) return null
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-text opacity-60">
        <i className="bi bi-check-all text-6xl" />
        <p className="text-lg">{t('home.completed')}</p>
      </div>
    )
  }

  return (
    <section className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      <div className="relative w-full">
        <WordCard
          ref={cardContentRef}
          word={currentWord}
          dictMeta={dictMeta}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          settings={settings}
          flyAnim={flyAnim}
          onFlyDone={handleFlyDone}
          onSwipeNext={handleNext}
          onSwipeFavorite={handleToggleFavorite}
          onSwipeLearned={handleToggleLearned}
          matchPct={matchPct}
        />
        <ReviewButtons
          visible={isFlipped}
          selected={selectedRating}
          onSelect={setSelectedRating}
        />
      </div>
      <InputArea
        ref={ref}
        word={currentWord}
        dictMeta={dictMeta}
        settings={settings}
        onCorrect={handleCorrect}
        onWrongAttempt={handleWrongAttempt}
        wrongAttempts={wrongAttempts}
        isFlipped={isFlipped}
        clearKey={clearKey}
        onMatchResult={handleMatchResult}
      />
      <ActionButtons
        ref={nextBtnRef}
        word={currentWord}
        favorites={favorites}
        learned={learned}
        onNext={handleNext}
        onToggleFavorite={handleToggleFavorite}
        onToggleLearned={handleToggleLearned}
      />
    </section>
  )
})

export default Home
