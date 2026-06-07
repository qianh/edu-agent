import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      masteries: {
        include: { knowledgePoint: true },
        orderBy: { masteryScore: 'asc' },
      },
      submissions: {
        include: { assignment: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      reports: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!student) return errorResponse('NOT_FOUND', 'Student not found', 404)
  return Response.json(student)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const student = await prisma.student.update({
    where: { id },
    data: body,
  })
  return Response.json(student)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.student.delete({ where: { id } })
  return Response.json({ ok: true })
}
