import { useState, useCallback, useMemo, useEffect, useRef, forwardRef } from 'react'
import type { View, Word, StoredWord, AppSettings, DictMeta } from '../types'
import { useTranslation } from '../i18n'
import WordCard from './WordCard'
import InputArea from './InputArea'
import ActionButtons from './ActionButtons'

interface HomeProps {
  words: Word[]
  favorites: StoredWord[]
  learned: StoredWord[]
  settings: AppSettings
  dictMeta: DictMeta
  currentView: View
  onToggleFavorite: (id: number) => void
  onToggleLearned: (id: number) => void
  onAddViewed: (id: number) => void
  onAddAnswered: (id: number) => void
  onMatchResult: (pct: number | null) => void
  onUpdateFavoriteAccuStat: (id: number, pct: number) => void
}

const Home = forwardRef<HTMLInputElement, HomeProps>(function Home({
  words,
  favorites,
  learned,
  settings,
  dictMeta,
  currentView,
  onToggleFavorite,
  onToggleLearned,
  onAddViewed,
  onAddAnswered,
  onMatchResult,
  onUpdateFavoriteAccuStat,
}, ref) {
  const { t } = useTranslation()
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [clearKey, setClearKey] = useState(0)
  const [flyAnim, setFlyAnim] = useState<{ type: 'favorite' | 'learned' } | null>(null)
  const [matchPct, setMatchPct] = useState<number | null>(null)

  const handleMatchResult = useCallback((pct: number | null) => {
    setMatchPct(pct)
    onMatchResult(pct)
  }, [onMatchResult])
  const pendingNextRef = useRef(false)
  const prevView = useRef(currentView)
  const favoritesShownThisSession = useRef(new Set<number>())
  const initialFavoriteEligibleIds = useRef(new Set(
    favorites
      .filter(f => Date.now() - new Date(f.addedAt).getTime() >= 6 * 60 * 60 * 1000)
      .map(f => f.id),
  ))
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const autoLearnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const learnedIdsRef = useRef(new Set<number>())
  const cardContentRef = useRef<HTMLDivElement>(null)
  const hasPicked = useRef(false)

  const isTouch = useRef(
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  ).current

  useEffect(() => {
    if (prevView.current !== 'home' && currentView === 'home') {
      setIsFlipped(false)
      setWrongAttempts(0)
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

  const availableWords = useMemo(
    () => words.filter((w) => !learnedIds.has(w.id)),
    [words, learnedIds],
  )

  const trackShown = useCallback((id: number) => {
    if (favoriteIds.has(id)) {
      favoritesShownThisSession.current.add(id)
    }
  }, [favoriteIds])

  const pickRandom = useCallback(() => {
    if (availableWords.length === 0) return null

    const pendingFavorites = availableWords.filter(
      (w) => initialFavoriteEligibleIds.current.has(w.id) && !favoritesShownThisSession.current.has(w.id),
    )

    if (pendingFavorites.length > 0) {
      const idx = Math.floor(Math.random() * pendingFavorites.length)
      return pendingFavorites[idx]
    }

    const idx = Math.floor(Math.random() * availableWords.length)
    return availableWords[idx]
  }, [availableWords, favoriteIds])

  useEffect(() => {
    if (!currentId) {
      const w = pickRandom()
      if (w) {
        setCurrentId(w.id)
        trackShown(w.id)
      }
      hasPicked.current = true
    }
  }, [currentId, pickRandom, trackShown])

  useEffect(() => {
    if (currentId && currentView === 'home') onAddViewed(currentId)
  }, [currentId, currentView, onAddViewed])

  const currentWord = useMemo(
    () => words.find((w) => w.id === currentId) ?? null,
    [words, currentId],
  )

  useEffect(() => {
    if (isTouch && currentWord) {
      cardContentRef.current?.focus()
    }
  }, [isTouch, currentWord])

  const clearAutoLearnTimer = useCallback(() => {
    if (autoLearnTimerRef.current !== null) {
      clearTimeout(autoLearnTimerRef.current)
      autoLearnTimerRef.current = null
    }
  }, [])

  const handleNext = useCallback(() => {
    clearAutoLearnTimer()
    const w = pickRandom()
    if (w) {
      setCurrentId(w.id)
      trackShown(w.id)
    }
    setIsFlipped(false)
    setWrongAttempts(0)
    setMatchPct(null)
    onMatchResult(null)
    setClearKey((k) => k + 1)
  }, [pickRandom, trackShown, clearAutoLearnTimer, onMatchResult])

  const handleFlip = useCallback(() => {
    setIsFlipped((f) => !f)
  }, [])

  const handleCorrect = useCallback(() => {
    if (currentWord) onAddAnswered(currentWord.id)
    setIsFlipped(true)
    setWrongAttempts(0)

    if (settings.phrasebookMode && currentWord && favoriteIds.has(currentWord.id) && matchPct !== null) {
      onUpdateFavoriteAccuStat(currentWord.id, matchPct)
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
  }, [currentWord, onAddAnswered, clearAutoLearnTimer, settings.autoAddAnsweredToLearned, learnedIds, onToggleLearned, settings.autoAdvanceOnLearn, setFlyAnim, settings.phrasebookMode, favoriteIds, matchPct, onUpdateFavoriteAccuStat])

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
  }, [currentWord, onToggleLearned, learnedIds, handleNext, settings.autoAdvanceOnLearn, clearAutoLearnTimer])

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
