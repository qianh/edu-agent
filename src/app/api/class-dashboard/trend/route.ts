import { prisma } from '@/lib/db'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export async function GET() {
  const submissions = await prisma.submission.findMany({
    where: { totalScoreConfirmed: { not: null } },
    select: { totalScoreConfirmed: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  if (submissions.length === 0) {
    return Response.json({ trend: [], stats: null })
  }

  const weekMap = new Map<string, number[]>()
  for (const s of submissions) {
    const key = getWeekStart(new Date(s.createdAt))
    if (!weekMap.has(key)) weekMap.set(key, [])
    weekMap.get(key)!.push(s.totalScoreConfirmed!)
  }

  const trend = Array.from(weekMap.entries()).map(([week, scores]) => ({
    week,
    avg: Math.round(scores.reduce((a, v) => a + v, 0) / scores.length),
    highest: Math.round(Math.max(...scores)),
    lowest: Math.round(Math.min(...scores)),
  }))

  const allScores = submissions.map((s) => s.totalScoreConfirmed!)
  const total = allScores.length
  const avg = Math.round(allScores.reduce((a, v) => a + v, 0) / total)
  const excellentRate = Math.round((allScores.filter((v) => v >= 80).length / total) * 1000) / 10
  const passRate = Math.round((allScores.filter((v) => v >= 60).length / total) * 1000) / 10

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklySubmit = submissions.filter((s) => new Date(s.createdAt) >= weekAgo).length

  return Response.json({ trend, stats: { avg, excellentRate, passRate, weeklySubmit } })
}
