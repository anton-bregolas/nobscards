import { useState, useEffect, useRef } from 'react'
import type { View } from '../types'
import { useTranslation } from '../i18n'

interface BottomBarProps {
  view: View
  onNavigate: (view: View) => void
  viewedCount: number
  answeredCount: number
  learnedCount: number
  totalWords: number
  matchPct: number | null
  phrasebookMode: boolean
}

export default function BottomBar({ view, onNavigate, viewedCount, answeredCount, learnedCount, totalWords, matchPct, phrasebookMode }: BottomBarProps) {
  const { t } = useTranslation()
  const [pctVisible, setPctVisible] = useState(false)
  const [pctColor, setPctColor] = useState('')
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    if (matchPct === null || !phrasebookMode) {
      setPctVisible(false)
      return
    }

    const initialColor = matchPct < 50 ? 'text-error' : matchPct < 80 ? 'text-subhead' : 'text-accent'
    setPctColor(initialColor)
    setPctVisible(true)

    const colorTimer = setTimeout(() => setPctColor('text-text/60'), 1000)

    hideTimerRef.current = setTimeout(() => {
      setPctVisible(false)
      hideTimerRef.current = null
    }, 4000)

    return () => {
      clearTimeout(colorTimer)
    }
  }, [matchPct, phrasebookMode])
  return (
    <footer className="fixed bottom-0 w-full pointer-events-none flex items-center justify-between px-2 py-3">
      <button
        title={t('nav.settings')}
        aria-label={t('nav.settings')}
        onClick={() => onNavigate('settings')}
        className={`pointer-events-auto w-12 h-12 flex items-center justify-center text-2xl transition-colors duration-200 hover:text-accent focus-visible:text-accent shrink-0 focus-ring focus-circle ${
          view === 'settings' ? 'text-accent' : 'text-subhead'
        }`}
      >
        <i className="bi bi-gear-fill" />
      </button>
      <div className="relative flex flex-row items-center gap-3 max-sm:flex-1 max-sm:justify-center max-sm:[font-family:var(--font-mono)]">
        {view === 'home' && phrasebookMode && pctVisible && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              position: 'absolute',
              top: '-2.3rem',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
            className={`text-xs text-center pointer-events-none transition-all duration-1000 ${pctColor}`}
          >
            {t('stats.match', { pct: matchPct! })}
          </div>
        )}
        {view === 'home' && (
          <>
            <span className="text-xs text-text/60 hidden sm:smh:inline">{t('stats.viewed', { viewed: viewedCount, total: totalWords })}</span>
            <span className="text-xs text-text/60 hidden sm:smh:inline">{t('stats.answered', { answered: answeredCount, total: totalWords })}</span>
            <span className="text-xs text-text/60 hidden smh:inline">{t('stats.learned', { learned: learnedCount, total: totalWords })}</span>
          </>
        )}
      </div>
      <button
        title={t('nav.home')}
        aria-label={t('nav.home')}
        onClick={() => onNavigate('home')}
        className={`sm:hidden pointer-events-auto w-12 h-12 flex items-center justify-center text-2xl transition-colors duration-200 hover:text-accent focus-visible:text-accent shrink-0 focus-ring focus-circle ${
          view === 'home' ? 'text-accent' : 'text-subhead'
        }`}
      >
        <i className="bi bi-house-door-fill" />
      </button>
      <button
        title={t('nav.learned')}
        aria-label={t('nav.learned')}
        onClick={() => onNavigate('learned')}
        className={`hidden sm:flex pointer-events-auto w-12 h-12 items-center justify-center text-2xl transition-colors duration-200 hover:text-accent focus-visible:text-accent shrink-0 focus-ring focus-circle ${
          view === 'learned' ? 'text-accent' : 'text-subhead'
        }`}
      >
        <i className="bi bi-check-circle-fill" />
      </button>
    </footer>
  )
}
