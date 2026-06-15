import { prisma } from '@/lib/db'

export async function GET() {
  const teacher = await prisma.teacher.findFirst({
    select: { id: true, name: true, subject: true, email: true },
  })
  return Response.json(teacher)
}
