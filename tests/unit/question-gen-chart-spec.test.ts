import { describe, it, expect } from 'vitest'
import { chartSpecSchema } from '@/lib/question-gen/chart-spec'

describe('chartSpecSchema', () => {
  it('accepts a geometry triangle spec', () => {
    const spec = {
      kind: 'geometry' as const,
      shape: 'triangle' as const,
      points: [{ x: 0, y: 0, label: 'A' }, { x: 4, y: 0, label: 'B' }, { x: 2, y: 3, label: 'C' }],
    }
    expect(chartSpecSchema.safeParse(spec).success).toBe(true)
  })

  it('accepts a data bar-chart spec', () => {
    const spec = {
      kind: 'data' as const,
      chartType: 'bar' as const,
      xKey: 'month',
      yKeys: ['sales'],
      data: [{ month: '1月', sales: 10 }, { month: '2月', sales: 20 }],
    }
    expect(chartSpecSchema.safeParse(spec).success).toBe(true)
  })

  it('rejects unknown kind', () => {
    const spec = { kind: 'unknown', foo: 'bar' }
    expect(chartSpecSchema.safeParse(spec).success).toBe(false)
  })
})