import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const masteries = await prisma.studentMastery.findMany({
    where: { studentId: id },
    include: {
      knowledgePoint: {
        select: { id: true, name: true, subject: true, grade: true, chapter: true, difficulty: true },
      },
    },
    orderBy: { masteryScore: 'asc' },
  })

  if (masteries.length === 0) {
    const studentExists = await prisma.student.findUnique({ where: { id } })
    if (!studentExists) return errorResponse('NOT_FOUND', 'Student not found', 404)
  }

  return Response.json({ masteries })
}
