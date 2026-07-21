import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider, useTranslation, timeUnitKey, APP_LANGUAGES } from '../../i18n'

describe('APP_LANGUAGES', () => {
  it('has Russian, English, Serbian', () => {
    expect(APP_LANGUAGES.ru).toBe('Русский')
    expect(APP_LANGUAGES.en).toBe('English')
    expect(APP_LANGUAGES.sr).toBe('Srpski')
  })
})

describe('I18nProvider + useTranslation', () => {
  it('returns the correct translation for a key', () => {
    function TestChild() {
      const { t } = useTranslation()
      return <div>{t('nav.home')}</div>
    }
    render(
      <I18nProvider lang="en">
        <TestChild />
      </I18nProvider>,
    )
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('falls back to Russian when the key is missing in the selected lang', () => {
    function TestChild() {
      const { t } = useTranslation()
      return <div>{t('nav.settings')}</div>
    }
    render(
      <I18nProvider lang="sr">
        <TestChild />
      </I18nProvider>,
    )
    expect(screen.getByText('Podešavanja')).toBeInTheDocument()
  })

  it('returns the key itself when not found in any language', () => {
    function TestChild() {
      const { t } = useTranslation()
      return <div>{t('nonexistent.key')}</div>
    }
    render(
      <I18nProvider lang="en">
        <TestChild />
      </I18nProvider>,
    )
    expect(screen.getByText('nonexistent.key')).toBeInTheDocument()
  })

  it('interpolates params into the translation string', () => {
    function TestChild() {
      const { t } = useTranslation()
      return <div>{t('stats.match', { pct: 85 })}</div>
    }
    render(
      <I18nProvider lang="en">
        <TestChild />
      </I18nProvider>,
    )
    expect(screen.getByText('Match: 85%')).toBeInTheDocument()
  })

  it('memoizes the t function', () => {
    function TestChild() {
      const { t } = useTranslation()
      return <div data-testid="child">{t('nav.home')}</div>
    }
    const { rerender } = render(
      <I18nProvider lang="en">
        <TestChild />
      </I18nProvider>,
    )
    expect(screen.getByText('Home')).toBeInTheDocument()

    rerender(
      <I18nProvider lang="ru">
        <TestChild />
      </I18nProvider>,
    )
    expect(screen.getByText('Главный экран')).toBeInTheDocument()
  })

  it('reverts to key for unknown language', () => {
    function TestChild() {
      const { t } = useTranslation()
      return <div>{t('nav.home')}</div>
    }
    render(
      <I18nProvider lang="de">
        <TestChild />
      </I18nProvider>,
    )
    expect(screen.getByText('Главный экран')).toBeInTheDocument()
  })
})

describe('timeUnitKey', () => {
  it('returns minutes1 for numbers ending with 1 (except 11)', () => {
    expect(timeUnitKey(1)).toBe('settings.timeUnitMinutes1')
    expect(timeUnitKey(21)).toBe('settings.timeUnitMinutes1')
    expect(timeUnitKey(101)).toBe('settings.timeUnitMinutes1')
  })

  it('returns minutes234 for numbers ending with 2-4 (except 12-14)', () => {
    expect(timeUnitKey(2)).toBe('settings.timeUnitMinutes234')
    expect(timeUnitKey(3)).toBe('settings.timeUnitMinutes234')
    expect(timeUnitKey(4)).toBe('settings.timeUnitMinutes234')
    expect(timeUnitKey(23)).toBe('settings.timeUnitMinutes234')
  })

  it('returns minutes56789 for other numbers', () => {
    expect(timeUnitKey(5)).toBe('settings.timeUnitMinutes56789')
    expect(timeUnitKey(10)).toBe('settings.timeUnitMinutes56789')
    expect(timeUnitKey(11)).toBe('settings.timeUnitMinutes56789')
    expect(timeUnitKey(12)).toBe('settings.timeUnitMinutes56789')
    expect(timeUnitKey(13)).toBe('settings.timeUnitMinutes56789')
    expect(timeUnitKey(14)).toBe('settings.timeUnitMinutes56789')
    expect(timeUnitKey(20)).toBe('settings.timeUnitMinutes56789')
    expect(timeUnitKey(100)).toBe('settings.timeUnitMinutes56789')
  })
})
