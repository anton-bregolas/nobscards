import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import BottomBar from '../../components/BottomBar'

function renderBottomBar(overrides = {}) {
  const defaults = {
    view: 'home' as const,
    viewedCount: 10,
    answeredCount: 5,
    learnedCount: 3,
    totalWords: 100,
    matchPct: null,
    phrasebookMode: false,
    onNavigate: vi.fn(),
  }
  return render(
    <I18nProvider lang="en">
      <BottomBar {...defaults} {...overrides} />
    </I18nProvider>,
  )
}

describe('BottomBar', () => {
  it('renders settings button', () => {
    renderBottomBar()
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
  })

  it('shows viewed/answered/learned counts', () => {
    renderBottomBar()
    expect(screen.getByText('10 / 100 viewed')).toBeInTheDocument()
    expect(screen.getByText('5 / 100 answered')).toBeInTheDocument()
    expect(screen.getByText('3 / 100 learned')).toBeInTheDocument()
  })

  it('highlights settings button when view is settings', () => {
    renderBottomBar({ view: 'settings' })
    const btn = screen.getByTitle('Settings')
    expect(btn.className).toContain('text-accent')
  })

  it('shows match percentage when matchPct is provided in phrasebook mode', () => {
    renderBottomBar({ matchPct: 85, phrasebookMode: true })
    expect(screen.getByText('Match: 85%')).toBeInTheDocument()
  })

  it('applies correct color for match percentage - error', () => {
    renderBottomBar({ matchPct: 30, phrasebookMode: true })
    const el = screen.getByText('Match: 30%')
    expect(el.className).toContain('text-error')
  })

  it('applies correct color for match percentage - subhead', () => {
    renderBottomBar({ matchPct: 65, phrasebookMode: true })
    const el = screen.getByText('Match: 65%')
    expect(el.className).toContain('text-subhead')
  })

  it('applies correct color for match percentage - accent', () => {
    renderBottomBar({ matchPct: 95, phrasebookMode: true })
    const el = screen.getByText('Match: 95%')
    expect(el.className).toContain('text-accent')
  })

  it('hides match percentage when matchPct is null in phrasebook mode', () => {
    renderBottomBar({ matchPct: null, phrasebookMode: true })
    expect(screen.queryByText(/Match:/)).not.toBeInTheDocument()
  })

  it('hides match percentage when matchPct is provided but not in phrasebook mode', () => {
    renderBottomBar({ matchPct: 85, phrasebookMode: false })
    expect(screen.queryByText(/Match:/)).not.toBeInTheDocument()
  })

  it('hides match percentage after 4 seconds', async () => {
    vi.useFakeTimers()
    renderBottomBar({ matchPct: 85, phrasebookMode: true })
    expect(screen.getByText('Match: 85%')).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByText(/Match:/)).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('fades color after 1 second', async () => {
    vi.useFakeTimers()
    renderBottomBar({ matchPct: 85, phrasebookMode: true })
    const el = screen.getByText('Match: 85%')
    expect(el.className).toContain('text-accent')
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(el.className).toContain('text-text/60')
    vi.useRealTimers()
  })

  it('renders home button (mobile only)', () => {
    const onNavigate = vi.fn()
    renderBottomBar({ onNavigate, view: 'learned' })
    const homeBtn = screen.getByTitle('Home')
    expect(homeBtn).toBeInTheDocument()
    expect(homeBtn.className).toContain('sm:hidden')
    fireEvent.click(homeBtn)
    expect(onNavigate).toHaveBeenCalledWith('home')
  })

  it('renders learned button (desktop only)', () => {
    const onNavigate = vi.fn()
    renderBottomBar({ onNavigate })
    const learnedBtn = screen.getByTitle('Learned')
    expect(learnedBtn).toBeInTheDocument()
    expect(learnedBtn.className).toContain('hidden sm:flex')
    fireEvent.click(learnedBtn)
    expect(onNavigate).toHaveBeenCalledWith('learned')
  })

  it('clears hide timer on matchPct change', async () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <I18nProvider lang="en">
        <BottomBar view="home" viewedCount={10} answeredCount={5} learnedCount={3} totalWords={100} matchPct={85} phrasebookMode={true} onNavigate={vi.fn()} />
      </I18nProvider>,
    )
    expect(screen.getByText('Match: 85%')).toBeInTheDocument()
    rerender(
      <I18nProvider lang="en">
        <BottomBar view="home" viewedCount={10} answeredCount={5} learnedCount={3} totalWords={100} matchPct={92} phrasebookMode={true} onNavigate={vi.fn()} />
      </I18nProvider>,
    )
    expect(screen.getByText('Match: 92%')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
