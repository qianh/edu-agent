export interface MasteryEvidence {
  questionDifficulty: 'easy' | 'medium' | 'hard'
  scoreRate: number
  errorType: string | null
  isRepeatError: boolean
  recencyWeight: number
}

const DIFFICULTY_WEIGHT = { easy: 0.7, medium: 1.0, hard: 1.4 }
const ERROR_PENALTY = { concept: 1.3, calculation: 1.0, careless: 0.6, default: 1.0 }
const REPEAT_ERROR_MULTIPLIER = 1.4
const LEARNING_RATE = 0.25

export function calculateNewMastery(
  currentScore: number | null,
  evidences: MasteryEvidence[]
): number {
  let score = currentScore ?? 50

  for (const ev of evidences) {
    const diffWeight = DIFFICULTY_WEIGHT[ev.questionDifficulty]
    const isCorrect = ev.scoreRate >= 0.7

    if (isCorrect) {
      const gain = LEARNING_RATE * diffWeight * ev.scoreRate * ev.recencyWeight
      score = score + gain * (100 - score)
    } else {
      const errKey = ev.errorType && ev.errorType in ERROR_PENALTY
        ? (ev.errorType as keyof typeof ERROR_PENALTY)
        : 'default'
      const errPenalty = ERROR_PENALTY[errKey]
      const repeatMultiplier = ev.isRepeatError ? REPEAT_ERROR_MULTIPLIER : 1.0
      const loss = LEARNING_RATE * diffWeight * errPenalty * repeatMultiplier * ev.recencyWeight
      score = score - loss * score
    }

    score = score * (0.8 + 0.2 * ev.recencyWeight)
  }

  return Math.min(100, Math.max(0, Math.round(score * 10) / 10))
}
