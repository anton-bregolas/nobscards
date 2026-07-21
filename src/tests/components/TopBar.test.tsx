import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import TopBar from '../../components/TopBar'

function renderTopBar(view: 'home' | 'favorites' | 'learned' | 'settings' = 'home') {
  const onNavigate = vi.fn()
  const onSkipToSection = vi.fn()
  const result = render(
    <I18nProvider lang="en">
      <TopBar view={view} onNavigate={onNavigate} onSkipToSection={onSkipToSection} />
    </I18nProvider>,
  )
  return { ...result, onNavigate, onSkipToSection }
}

describe('TopBar', () => {
  it('renders navigation buttons', () => {
    renderTopBar()
    expect(screen.getByTitle('Learned')).toBeInTheDocument()
    expect(screen.getByTitle('Favorites')).toBeInTheDocument()
  })

  it('shows skip button on home view', () => {
    renderTopBar('home')
    expect(screen.getByText('Skip to input')).toBeInTheDocument()
  })

  it('shows skip button on settings view', () => {
    renderTopBar('settings')
    expect(screen.getByText('Skip to data management')).toBeInTheDocument()
  })

  it('skip link on non-home/settings view redirects to favorites button', () => {
    renderTopBar('favorites')
    const skipLink = document.querySelector('.skip-link') as HTMLElement
    expect(skipLink).toBeInTheDocument()
    const favBtn = screen.getByTitle('Favorites')
    const focusSpy = vi.spyOn(favBtn, 'focus')
    fireEvent.focus(skipLink)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('skip link is tabbable on home view and not on learned view', () => {
    const { unmount } = renderTopBar('home')
    const skipLink = document.querySelector('.skip-link') as HTMLElement
    expect(skipLink.getAttribute('tabindex')).toBe('0')
    unmount()

    renderTopBar('learned')
    const skipLink2 = document.querySelector('.skip-link') as HTMLElement
    expect(skipLink2.getAttribute('tabindex')).toBe('-1')
  })
})
