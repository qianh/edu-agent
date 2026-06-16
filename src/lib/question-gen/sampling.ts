export interface MasteryPoint {
  knowledgePointId: string
  masteryScore: number
}

export interface SampleResult {
  assignments: string[]
  degraded: boolean
}

const WEAK_THRESHOLD = 60
const WEAK_RATIO = 0.9

export function sampleKnowledgePoints(pool: MasteryPoint[], count: number): SampleResult {
  if (pool.length === 0) {
    throw new Error('Knowledge point pool is empty: cannot sample without any StudentMastery records')
  }

  const weak = pool.filter((p) => p.masteryScore < WEAK_THRESHOLD)
  const good = pool.filter((p) => p.masteryScore >= WEAK_THRESHOLD)

  if (weak.length === 0) {
    return { assignments: repeatPick(good, count), degraded: true }
  }

  const weakCount = Math.round(count * WEAK_RATIO)
  const goodCount = count - weakCount

  const weakAssignments = repeatPick(weak, weakCount)
  const goodAssignments = good.length > 0 ? repeatPick(good, goodCount) : repeatPick(weak, goodCount)

  return { assignments: [...weakAssignments, ...goodAssignments], degraded: false }
}

function repeatPick(points: MasteryPoint[], count: number): string[] {
  if (count <= 0) return []
  const ids = points.map((p) => p.knowledgePointId)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(ids[i % ids.length])
  }
  return result
}