import { describe, it, expect } from 'vitest'
import { calculateNewMastery, type MasteryEvidence } from '@/lib/mastery/calculator'

describe('calculateNewMastery', () => {
  it('returns low score when no prior mastery and incorrect answer', () => {
    const evidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 0,
      errorType: 'concept',
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const result = calculateNewMastery(null, [evidence])
    expect(result).toBeLessThan(40)
  })

  it('raises mastery on correct answer', () => {
    const evidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 1.0,
      errorType: null,
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const result = calculateNewMastery(60, [evidence])
    expect(result).toBeGreaterThan(60)
    expect(result).toBeLessThanOrEqual(100)
  })

  it('penalizes repeat errors more heavily', () => {
    const singleError: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 0,
      errorType: 'calculation',
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const repeatError: MasteryEvidence = {
      ...singleError,
      isRepeatError: true,
    }
    const singleResult = calculateNewMastery(70, [singleError])
    const repeatResult = calculateNewMastery(70, [repeatError])
    expect(repeatResult).toBeLessThan(singleResult)
  })

  it('clamps result to 0-100 range', () => {
    const highEvidence: MasteryEvidence = {
      questionDifficulty: 'hard',
      scoreRate: 1.0,
      errorType: null,
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const result = calculateNewMastery(99, [highEvidence, highEvidence, highEvidence])
    expect(result).toBeLessThanOrEqual(100)
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('weights recent evidence more than historical', () => {
    const oldEvidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 1.0,
      errorType: null,
      isRepeatError: false,
      recencyWeight: 0.3,
    }
    const newEvidence: MasteryEvidence = {
      questionDifficulty: 'medium',
      scoreRate: 0,
      errorType: 'concept',
      isRepeatError: false,
      recencyWeight: 1.0,
    }
    const result = calculateNewMastery(80, [oldEvidence, newEvidence])
    expect(result).toBeLessThan(80)
  })
})
