import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await requireAuth()
  if (!session?.user?.id) {
    return Response.json({ error: '未登录' }, { status: 401 })
  }
  const teacher = await prisma.teacher.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, subject: true, email: true },
  })
  return Response.json(teacher)
}
