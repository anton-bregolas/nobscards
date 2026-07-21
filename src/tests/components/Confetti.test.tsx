import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import Confetti from '../../components/Confetti'

describe('Confetti', () => {
  it('renders nothing when not active', () => {
    const { container } = render(<Confetti active={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders 24 particles when active', () => {
    const { container } = render(<Confetti active={true} />)
    const particles = container.querySelectorAll('.animate-confetti')
    expect(particles.length).toBe(24)
  })

  it('clears particles on deactivate', () => {
    const { container, rerender } = render(<Confetti active={true} />)
    expect(container.querySelectorAll('.animate-confetti').length).toBe(24)

    rerender(<Confetti active={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('clears particles after animation timeout', async () => {
    vi.useFakeTimers()
    const { container } = render(<Confetti active={true} />)
    expect(container.querySelectorAll('.animate-confetti').length).toBe(24)
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(container.innerHTML).toBe('')
    vi.useRealTimers()
  })
})
