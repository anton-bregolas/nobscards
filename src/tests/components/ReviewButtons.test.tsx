import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import ReviewButtons from '../../components/ReviewButtons'

function renderReviewButtons(visible = true, selected: number | null = null) {
  return render(
    <I18nProvider lang="en">
      <ReviewButtons visible={visible} selected={selected} onSelect={vi.fn()} />
    </I18nProvider>,
  )
}

describe('ReviewButtons', () => {
  it('renders all 5 rating options', () => {
    renderReviewButtons()
    expect(screen.getByTitle('Skip (Pretend I didn\'t see)')).toBeInTheDocument()
    expect(screen.getByTitle('Again (No idea)')).toBeInTheDocument()
    expect(screen.getByTitle('Hard (Barely remembered)')).toBeInTheDocument()
    expect(screen.getByTitle('Good (Needs just a bit more work)')).toBeInTheDocument()
    expect(screen.getByTitle('Easy (Nailed it immediately)')).toBeInTheDocument()
  })

  it('checks the selected rating', () => {
    renderReviewButtons(true, 3)
    const checked = screen.getByDisplayValue('3')
    expect(checked).toBeChecked()
  })

  it('hides when visible is false', () => {
    const { container } = renderReviewButtons(false)
    const el = container.querySelector('.srs-container')
    expect(el!.className).toContain('opacity-0')
    expect(el!.className).toContain('pointer-events-none')
  })
})
