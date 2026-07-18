import { fsrs, Rating, State } from 'ts-fsrs'
import type { Card } from 'ts-fsrs'
import type { SrsCard } from '../types'
import type { StepUnit } from 'ts-fsrs'

export function createScheduler(customIntervalAgain: number | false, customIntervalGood: number | false) {
  const again = customIntervalAgain === false ? 1 : customIntervalAgain
  const good = customIntervalGood === false ? 10 : customIntervalGood
  const learningSteps = [`${again}m`, `${good}m`] as StepUnit[]
  const relearningSteps = [`${again}m`] as StepUnit[]
  
  return fsrs({
    request_retention: 0.9,
    maximum_interval: 36500,
    enable_fuzz: true,
    learning_steps: learningSteps,
    relearning_steps: relearningSteps,
  })
}

export function toCard(srs: SrsCard): Card {
  return {
    due: new Date(srs.due),
    stability: srs.stability,
    difficulty: srs.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: srs.reps,
    lapses: srs.lapses,
    state: srs.state as State,
    last_review: srs.lastReview ? new Date(srs.lastReview) : undefined,
  }
}

export function fromCard(card: Card, id: number, addedAt: string, lastRating?: number): SrsCard {
  return {
    id,
    addedAt,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.toISOString(),
    lastRating,
  }
}

export function autoRateWords(matchPct: number | null, wrongAttempts: number): Rating {
  if (matchPct === null || matchPct === 0) return Rating.Again
  if (wrongAttempts >= 2) return Rating.Again
  if (wrongAttempts === 1) return Rating.Hard
  return Rating.Good
}

export function autoRatePhrases(matchPct: number, threshold: number): Rating {
  if (matchPct < threshold) return Rating.Again
  const midpoint = (100 + threshold) / 2
  if (matchPct < midpoint) return Rating.Hard
  return Rating.Good
}

export { Rating }
