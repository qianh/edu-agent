import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { errorResponse } from '@/lib/errors'

const createSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  chapter: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  parentId: z.string().cuid().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subject = searchParams.get('subject')
  const grade = searchParams.get('grade')

  const knowledgePoints = await prisma.knowledgePoint.findMany({
    where: {
      status: 'active',
      ...(subject ? { subject } : {}),
      ...(grade ? { grade } : {}),
    },
    include: { children: true },
    orderBy: [{ chapter: 'asc' }, { name: 'asc' }],
  })

  return Response.json({ knowledgePoints })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  const kp = await prisma.knowledgePoint.create({ data: parsed.data })
  return Response.json(kp, { status: 201 })
}
