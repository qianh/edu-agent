import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { masteryUpdateQueue } from '@/lib/queue/queues'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const confirmSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    teacherScoreConfirmed: z.number().optional(),
    errorType: z.string().nullable().optional(),
    knowledgePointId: z.string().nullable().optional(),
  })),
  totalScoreConfirmed: z.number().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  const submission = await prisma.submission.findUnique({ where: { id } })
  if (!submission) return errorResponse('NOT_FOUND', 'Submission not found', 404)

  await Promise.all(
    parsed.data.results.map((r) =>
      prisma.gradingResult.update({
        where: { id: r.id },
        data: {
          teacherScoreConfirmed: r.teacherScoreConfirmed,
          finalScore: r.teacherScoreConfirmed ?? undefined,
          finalSource: r.teacherScoreConfirmed !== undefined ? 'teacher_confirmed' : undefined,
          errorType: r.errorType,
          knowledgePointId: r.knowledgePointId,
        },
      })
    )
  )

  await prisma.submission.update({
    where: { id },
    data: {
      status: 'confirmed',
      totalScoreConfirmed: parsed.data.totalScoreConfirmed,
    },
  })

  await masteryUpdateQueue.add('mastery_update', { submissionId: id })

  return Response.json({ ok: true, submissionId: id })
}
