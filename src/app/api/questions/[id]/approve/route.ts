import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const question = await prisma.question.findUnique({ where: { id } })
  if (!question) return errorResponse('NOT_FOUND', 'Question not found', 404)

  const updated = await prisma.question.update({
    where: { id },
    data: { status: 'approved' },
  })

  return Response.json(updated)
}
