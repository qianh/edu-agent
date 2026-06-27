import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()
  if (!session) return Response.json({ error: '未登录' }, { status: 401 })
  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true, grade: true, subject: true },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  })
  return Response.json(classes)
}
