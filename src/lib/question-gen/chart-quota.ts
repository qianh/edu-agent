export function chartQuota(countType: number, percentage: number): number {
  if (countType === 0) return 0
  const raw = Math.round((countType * percentage) / 100)
  return Math.min(countType, Math.max(1, raw))
}