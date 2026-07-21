import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import ActionButtons from '../../components/ActionButtons'

function renderActionButtons(word: any = null, favorites: any[] = [], learned: any[] = []) {
  const props = {
    word,
    favorites,
    learned,
    onNext: vi.fn(),
    onToggleFavorite: vi.fn(),
    onToggleLearned: vi.fn(),
  }
  return render(
    <I18nProvider lang="en">
      <ActionButtons {...props} />
    </I18nProvider>,
  )
}

describe('ActionButtons', () => {
  it('renders nothing when word is null', () => {
    const { container } = renderActionButtons(null)
    expect(container.innerHTML).toBe('')
  })

  it('renders buttons for a word', () => {
    renderActionButtons({ id: 1 })
    expect(screen.getByTitle('Skip to next word (Random pick)')).toBeInTheDocument()
    expect(screen.getByTitle('Add to Favorites')).toBeInTheDocument()
    expect(screen.getByTitle('Add to Learned (Don\'t show again)')).toBeInTheDocument()
  })

  it('shows remove labels when word is in favorites/learned', () => {
    renderActionButtons({ id: 1 }, [{ id: 1, addedAt: '2024-01-01' }], [{ id: 1, addedAt: '2024-01-01' }])
    expect(screen.getByTitle('Remove from Favorites')).toBeInTheDocument()
    expect(screen.getByTitle('Remove from Learned')).toBeInTheDocument()
  })
})
