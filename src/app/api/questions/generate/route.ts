import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { questionGenQueue } from '@/lib/queue/queues'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const genSchema = z.object({
  studentId: z.string().cuid().optional(),
  knowledgePointIds: z.array(z.string().cuid()).min(1),
  type: z.enum(['single', 'fill', 'answer']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  count: z.number().int().min(1).max(20),
  subject: z.string().min(1),
  grade: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = genSchema.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  const aiJob = await prisma.aIJob.create({
    data: { type: 'question_gen', status: 'processing' },
  })

  await questionGenQueue.add('question_gen', parsed.data, { jobId: aiJob.id })

  return Response.json({ jobId: aiJob.id, status: 'processing' }, { status: 202 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'draft'
  const page = parseInt(searchParams.get('page') ?? '1')

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: { status },
      include: { knowledgePoint: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.question.count({ where: { status } }),
  ])

  return Response.json({ questions, total })
}
