import { describe, it, expect } from 'vitest'
import { chartQuota } from '@/lib/question-gen/chart-quota'

describe('chartQuota', () => {
  it('rounds normally above the floor', () => {
    expect(chartQuota(10, 30)).toBe(3)
  })

  it('floors to 1 when rounding would go below 1', () => {
    expect(chartQuota(2, 10)).toBe(1)
  })

  it('returns 0 when type count is 0, regardless of percentage', () => {
    expect(chartQuota(0, 50)).toBe(0)
  })

  it('caps at the type count', () => {
    expect(chartQuota(3, 100)).toBe(3)
  })
})