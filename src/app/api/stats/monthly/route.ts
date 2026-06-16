import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()
  if (!session) return Response.json({ error: '未登录' }, { status: 401 })
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [submissions, assignments] = await Promise.all([
    prisma.submission.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.assignment.count({ where: { createdAt: { gte: monthStart } } }),
  ])

  return Response.json({ submissions, assignments })
}
