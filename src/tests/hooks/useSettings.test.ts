import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSettings } from '../../hooks/useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default settings on first call', () => {
    const { result } = renderHook(() => useSettings())
    const [settings] = result.current
    expect(settings.language).toBe('ru')
    expect(settings.phrasebookMode).toBe(false)
    expect(settings.phrasebookThreshold).toBe(75)
    expect(settings.autoFlipOnWrongAttempts).toBe(false)
    expect(settings.autoAdvanceOnLearn).toBe(false)
    expect(settings.autoAddAnsweredToLearned).toBe(false)
    expect(settings.autoAddRankedToFavorites).toBe(false)
  })

  it('merges stored values with defaults via localStorage', () => {
    localStorage.setItem(
      'cardsSettings',
      JSON.stringify({ language: 'en', phrasebookMode: true }),
    )
    const { result } = renderHook(() => useSettings())
    const [settings] = result.current
    expect(settings.language).toBe('en')
    expect(settings.phrasebookMode).toBe(true)
    expect(settings.phrasebookThreshold).toBe(75)
  })
})
