import { describe, it, expect } from 'vitest'
import { createScheduler, toCard, fromCard, autoRateWords, autoRatePhrases, Rating } from '../../utils/srs'
import type { SrsCard } from '../../types'

describe('createScheduler', () => {
  it('creates scheduler with default intervals', () => {
    const s = createScheduler(false, false)
    expect(s).toBeDefined()
    expect(typeof s.next).toBe('function')
  })

  it('creates scheduler with custom intervals', () => {
    const s = createScheduler(5, 15)
    expect(s).toBeDefined()
  })
})

describe('toCard', () => {
  it('converts SrsCard to Card format', () => {
    const srs: SrsCard = {
      id: 1,
      addedAt: '2024-01-01',
      due: '2024-01-01T00:00:00.000Z',
      stability: 2.5,
      difficulty: 0.5,
      reps: 0,
      lapses: 0,
      state: 0,
    }
    const card = toCard(srs)
    expect(card.due).toBeInstanceOf(Date)
    expect(card.stability).toBe(2.5)
    expect(card.difficulty).toBe(0.5)
    expect(card.reps).toBe(0)
    expect(card.lapses).toBe(0)
    expect(card.state).toBe(0)
  })

  it('handles lastReview', () => {
    const srs: SrsCard = {
      id: 1,
      addedAt: '2024-01-01',
      due: '2024-01-01T00:00:00.000Z',
      stability: 2.5,
      difficulty: 0.5,
      reps: 1,
      lapses: 0,
      state: 1,
      lastReview: '2024-01-02T00:00:00.000Z',
    }
    const card = toCard(srs)
    expect(card.last_review).toBeInstanceOf(Date)
    expect(card.last_review!.toISOString()).toBe('2024-01-02T00:00:00.000Z')
  })
})

describe('fromCard', () => {
  it('converts Card back to SrsCard', () => {
    const srs = fromCard(
      {
        due: new Date('2024-01-05T00:00:00.000Z'),
        stability: 3.0,
        difficulty: 0.4,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 1,
        last_review: new Date('2024-01-01T00:00:00.000Z'),
      },
      42,
      '2024-01-01',
      3,
    )
    expect(srs.id).toBe(42)
    expect(srs.addedAt).toBe('2024-01-01')
    expect(srs.stability).toBe(3.0)
    expect(srs.difficulty).toBe(0.4)
    expect(srs.reps).toBe(1)
    expect(srs.lapses).toBe(0)
    expect(srs.state).toBe(1)
    expect(srs.lastRating).toBe(3)
  })
})

describe('autoRateWords', () => {
  it('returns Again for null matchPct', () => {
    expect(autoRateWords(null, 0)).toBe(Rating.Again)
  })

  it('returns Again for 0 matchPct', () => {
    expect(autoRateWords(0, 0)).toBe(Rating.Again)
  })

  it('returns Again when wrongAttempts >= 2', () => {
    expect(autoRateWords(100, 2)).toBe(Rating.Again)
    expect(autoRateWords(100, 5)).toBe(Rating.Again)
  })

  it('returns Hard when wrongAttempts === 1', () => {
    expect(autoRateWords(100, 1)).toBe(Rating.Hard)
  })

  it('returns Good when no wrong attempts', () => {
    expect(autoRateWords(100, 0)).toBe(Rating.Good)
  })
})

describe('autoRatePhrases', () => {
  const threshold = 75

  it('returns Again when matchPct < threshold', () => {
    expect(autoRatePhrases(50, threshold)).toBe(Rating.Again)
    expect(autoRatePhrases(74, threshold)).toBe(Rating.Again)
  })

  it('returns Hard when matchPct below midpoint', () => {
    expect(autoRatePhrases(75, threshold)).toBe(Rating.Hard)
    expect(autoRatePhrases(80, threshold)).toBe(Rating.Hard)
    expect(autoRatePhrases(86, threshold)).toBe(Rating.Hard)
  })

  it('returns Good when matchPct >= midpoint', () => {
    expect(autoRatePhrases(88, threshold)).toBe(Rating.Good)
    expect(autoRatePhrases(100, threshold)).toBe(Rating.Good)
  })
})
