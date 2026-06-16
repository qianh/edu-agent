import { describe, it, expect } from 'vitest'
import { genSchema } from '@/lib/question-gen/schema'

const base = {
  studentId: 'clx0000000000000000000001',
  difficulty: 'medium' as const,
  subject: '数学',
  grade: '七年级',
  counts: { single: 3, fill: 2, answer: 1 },
  chartEnabled: false,
}

describe('genSchema', () => {
  it('accepts a valid payload without knowledgePointIds', () => {
    expect(genSchema.safeParse(base).success).toBe(true)
  })

  it('rejects missing studentId', () => {
    const { studentId, ...rest } = base
    expect(genSchema.safeParse(rest).success).toBe(false)
  })

  it('requires chartPercentage when chartEnabled is true', () => {
    const withChart = { ...base, chartEnabled: true }
    expect(genSchema.safeParse(withChart).success).toBe(false)
    expect(genSchema.safeParse({ ...withChart, chartPercentage: 30 }).success).toBe(true)
  })

  it('rejects chartPercentage out of 0-100 range', () => {
    expect(genSchema.safeParse({ ...base, chartEnabled: true, chartPercentage: 150 }).success).toBe(false)
  })

  it('accepts optional knowledgePointIds', () => {
    expect(genSchema.safeParse({ ...base, knowledgePointIds: ['clx0000000000000000000002'] }).success).toBe(true)
  })
})