import { useEffect, useRef, useState } from 'react'
import type { View } from '../types'
import { useTranslation } from '../i18n'

interface TopBarProps {
  view: View
  onNavigate: (view: View) => void
  onSkipToSection?: () => void
}

const skipLabels: Partial<Record<View, string>> = {
  home: 'nav.skipToInput',
  settings: 'nav.skipToData',
}

export default function TopBar({ view, onNavigate, onSkipToSection }: TopBarProps) {
  const { t } = useTranslation()
  const homeRef = useRef<HTMLButtonElement>(null)
  const favRef = useRef<HTMLButtonElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const isInitialMount = useRef(true)
  const programmaticFocus = useRef(false)
  const [skipTabbable, setSkipTabbable] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey && document.activeElement === favRef.current) {
        e.preventDefault()
        programmaticFocus.current = true
        skipRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      setSkipTabbable(true)
      return
    }
    if (view === 'settings' || view === 'home') {
      programmaticFocus.current = true
      skipRef.current?.focus()
    } else {
      homeRef.current?.focus()
    }
  }, [view])

  return (
    <header className="fixed top-0 w-full z-10 pointer-events-none flex items-center justify-between px-2 py-3">
      <button
        title={t('nav.learned')}
        aria-label={t('nav.learned')}
        onClick={() => onNavigate('learned')}
        className={`pointer-events-auto sm:hidden w-12 h-12 flex items-center justify-center text-2xl transition-colors duration-200 hover:text-accent focus-visible:text-accent shrink-0 focus-ring focus-circle ${
          view === 'learned' ? 'text-accent' : 'text-subhead'
        }`}
      >
        <i className="bi bi-check-circle-fill" />
      </button>
      <button
        ref={homeRef}
        title={t('nav.home')}
        aria-label={t('nav.home')}
        onClick={() => onNavigate('home')}
        className={`pointer-events-auto hidden sm:flex w-12 h-12 items-center justify-center text-2xl transition-colors duration-200 hover:text-accent focus-visible:text-accent shrink-0 focus-ring focus-circle ${
          view === 'home' ? 'text-accent' : 'text-subhead'
        }`}
      >
        <i className="bi bi-house-door-fill" />
      </button>
      <button
        ref={favRef}
        title={t('nav.favorites')}
        aria-label={t('nav.favorites')}
        onClick={() => onNavigate('favorites')}
        className={`pointer-events-auto w-12 h-12 flex items-center justify-center text-2xl transition-colors duration-200 hover:text-accent focus-visible:text-accent shrink-0 focus-ring focus-circle ${
          view === 'favorites' ? 'text-accent' : 'text-subhead'
        }`}
      >
        <i className="bi bi-star-fill" />
      </button>
      {skipTabbable && (
        <button
          ref={skipRef}
          type="button"
          tabIndex={-1}
          className="skip-link"
          onFocus={() => {
            if (programmaticFocus.current) {
              programmaticFocus.current = false
              return
            }
            favRef.current?.focus()
          }}
          onClick={onSkipToSection}
        >
          {t((skipLabels[view] ?? 'nav.skipToSection') as 'nav.skipToInput')}
        </button>
      )}
    </header>
  )
}
