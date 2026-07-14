import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { Word, AppSettings, DictMeta } from '../types'
import { useTranslation } from '../i18n'
import { bestMatch } from '../utils/compare'
import Confetti from './Confetti'

interface InputAreaProps {
  word: Word | null
  dictMeta: DictMeta
  settings: AppSettings
  onCorrect: () => void
  onWrongAttempt: () => void
  wrongAttempts: number
  isFlipped: boolean
  clearKey?: number
  onMatchResult?: (pct: number | null) => void
}

const InputArea = forwardRef<HTMLInputElement, InputAreaProps>(function InputArea({
  word,
  dictMeta,
  settings,
  onCorrect,
  onWrongAttempt,
  wrongAttempts,
  isFlipped,
  clearKey,
  onMatchResult,
}, ref) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [shake, setShake] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const clearKeyRef = useRef(clearKey)
  const isTouch = useRef(
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  ).current

  useImperativeHandle(ref, () => inputRef.current!, [])

  const updateMatchResult = useCallback((newPct: number | null) => {
    onMatchResult?.(newPct)
  }, [onMatchResult])

  useEffect(() => {
    if (!isTouch) {
      inputRef.current?.focus()
    }
  }, [word])

  useEffect(() => {
    if (!inputDisabled && !isTouch) {
      inputRef.current?.focus()
    }
  }, [inputDisabled])

  useEffect(() => {
    if (clearKeyRef.current !== clearKey) {
      clearKeyRef.current = clearKey
      setInputValue('')
      updateMatchResult(null)
      setFeedback(null)
      setShake(false)
      setInputDisabled(false)
    }
  }, [clearKey, updateMatchResult])

  const checkAnswer = useCallback(
    (value: string) => {
      if (!word) return
      const normalized = value.trim().toLowerCase()
      if (!normalized) return

      let isCorrect: boolean
      let matchPct: number = 100
      const isDefaultForType =
        (dictMeta.type === 'words' && !settings.phrasebookMode) ||
        (dictMeta.type === 'phrases' && settings.phrasebookMode)

      let targetKey: string
      if (isDefaultForType) {
        targetKey = settings.useAltInputLang && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo
      } else {
        targetKey = settings.useAltInputLang && dictMeta.langRef ? dictMeta.langRef : dictMeta.langFrom
      }

      const target = word[targetKey]

      if (settings.phrasebookMode) {
        const targets = Array.isArray(target) ? target.map(String) : [String(target ?? '')]
        const result = bestMatch(value, targets)
        matchPct = result.percent
        isCorrect = matchPct >= settings.phrasebookThreshold
        console.log(`Input / control match: ${matchPct}%`)
      } else {
        isCorrect = Array.isArray(target) && target.some((t) => t.toLowerCase() === normalized)
        matchPct = isCorrect ? 100 : 0
      }

      if (isCorrect) {
        updateMatchResult(matchPct)
        if (isFlipped) {
          setFeedback('correct')
          setInputValue('')
          setTimeout(() => setFeedback(null), 500)
        } else {
          setFeedback('correct')
          setConfetti(true)
          setInputDisabled(true)
          setTimeout(() => {
            onCorrect()
          }, 300)
          setTimeout(() => {
            setInputValue('')
            setFeedback(null)
            setInputDisabled(false)
            setConfetti(false)
          }, 800)
        }
      } else {
        updateMatchResult(matchPct)
        setFeedback('wrong')
        setShake(true)
        onWrongAttempt()
        setTimeout(() => {
          setShake(false)
        }, 400)

        if (
          typeof settings.autoFlipOnWrong === 'number' &&
          wrongAttempts + 1 >= settings.autoFlipOnWrong
        ) {
          setInputDisabled(true)
          setTimeout(() => {
            onCorrect()
            setFeedback(null)
            setInputDisabled(false)
          }, 500)
        } else {
          setTimeout(() => setFeedback(null), 1500)
        }
      }
    },
    [word, dictMeta, settings, onCorrect, onWrongAttempt, wrongAttempts, isFlipped, updateMatchResult],
  )

  const handleSubmit = () => {
    checkAnswer(inputValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const isDefaultForType =
    (dictMeta.type === 'words' && !settings.phrasebookMode) ||
    (dictMeta.type === 'phrases' && settings.phrasebookMode)

  const inputLangKey = isDefaultForType
    ? (settings.useAltInputLang && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo)
    : (settings.useAltInputLang && dictMeta.langRef ? dictMeta.langRef : dictMeta.langFrom)

  const langLabel = inputLangKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  const placeholder = t('input.placeholder', { lang: langLabel })

  return (
    <>
      <Confetti active={confetti} />
      <div
        className={`flex items-center w-full max-w-md mx-auto rounded-full bg-subhead-alt border-2 transition-all duration-200 ${
          feedback === 'correct'
            ? 'border-accent'
            : feedback === 'wrong'
              ? 'border-error'
              : 'border-text/20 focus-within:border-accent'
        } ${shake ? 'animate-shake' : ''}`}
      >
          <button
            onClick={() => { setInputValue(''); inputRef.current?.focus() }}
            tabIndex={inputValue ? 0 : -1}
            aria-hidden={!inputValue}
            className={`ml-0.5 w-12 h-12 rounded-full flex items-center justify-center shrink-0 focus-ring focus-circle transition-colors duration-200 ${
              inputValue ? 'text-text/40 hover:text-text' : 'invisible'
            }`}
            title={t('input.clearLabel')}
            aria-label={t('input.clearLabel')}
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 min-w-0 bg-transparent border-none outline-none px-2 py-3 text-center text-lg placeholder-text/40 ${
            feedback === 'correct' ? 'caret-accent' : 'caret-caret'
          }`}
          aria-label={placeholder}
          disabled={!word || inputDisabled}
        />
        <button
          onClick={handleSubmit}
          disabled={!word || !inputValue.trim() || inputDisabled}
          className="mr-0.5 w-12 h-12 rounded-full bg-accent text-bg flex items-center justify-center text-xl transition-all duration-200 hover:bg-accent/80 focus-visible:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-ring focus-circle"
          title={t('input.check')}
          aria-label={t('input.check')}
        >
          <i className="bi bi-arrow-right" />
        </button>
      </div>
    </>
  )
})

export default InputArea
