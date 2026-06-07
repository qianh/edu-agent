import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      gradingResults: {
        include: { knowledgePoint: true },
        orderBy: { questionNo: 'asc' },
      },
      teacherMarks: { orderBy: { questionNo: 'asc' } },
      student: { select: { id: true, name: true } },
      assignment: { select: { title: true, gradingMode: true } },
      aiJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  if (!submission) return errorResponse('NOT_FOUND', 'Submission not found', 404)
  return Response.json(submission)
}
