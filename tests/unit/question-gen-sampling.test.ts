import { describe, it, expect } from 'vitest'
import { sampleKnowledgePoints, type MasteryPoint } from '@/lib/question-gen/sampling'

function mp(id: string, score: number): MasteryPoint {
  return { knowledgePointId: id, masteryScore: score }
}

describe('sampleKnowledgePoints', () => {
  it('splits 90/10 weak/good when pool is sufficient', () => {
    const pool = [mp('w1', 30), mp('w2', 40), mp('w3', 50), mp('g1', 80), mp('g2', 90)]
    const result = sampleKnowledgePoints(pool, 10)
    expect(result.degraded).toBe(false)
    const weakCount = result.assignments.filter((id) => ['w1', 'w2', 'w3'].includes(id)).length
    const goodCount = result.assignments.filter((id) => ['g1', 'g2'].includes(id)).length
    expect(weakCount).toBe(9)
    expect(goodCount).toBe(1)
    expect(result.assignments).toHaveLength(10)
  })

  it('repeats weak points when insufficient, never borrows from good pool', () => {
    const pool = [mp('w1', 30), mp('w2', 40), mp('g1', 80)]
    const result = sampleKnowledgePoints(pool, 10)
    expect(result.degraded).toBe(false)
    const weakAssignments = result.assignments.filter((id) => id !== 'g1')
    expect(weakAssignments.length).toBe(9)
    expect(new Set(weakAssignments)).toEqual(new Set(['w1', 'w2']))
    expect(result.assignments.filter((id) => id === 'g1')).toHaveLength(1)
  })

  it('degrades to all-good when there are zero weak points', () => {
    const pool = [mp('g1', 70), mp('g2', 90)]
    const result = sampleKnowledgePoints(pool, 6)
    expect(result.degraded).toBe(true)
    expect(result.assignments).toHaveLength(6)
    expect(result.assignments.every((id) => ['g1', 'g2'].includes(id))).toBe(true)
  })

  it('throws when pool is completely empty', () => {
    expect(() => sampleKnowledgePoints([], 5)).toThrow()
  })
})