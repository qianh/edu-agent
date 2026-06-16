import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const updateTeacherSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  subject: z.string().min(1).optional(),
})

export async function GET() {
  const session = await requireAuth()
  if (!session?.user?.id) {
    return Response.json({ error: '未登录' }, { status: 401 })
  }
  const teacher = await prisma.teacher.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, subject: true, email: true, phone: true },
  })
  return Response.json(teacher)
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth()
  if (!session?.user?.id) {
    return Response.json({ error: '未登录' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateTeacherSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)
  }

  const { email, ...rest } = parsed.data
  const teacher = await prisma.teacher.update({
    where: { id: session.user.id },
    data: { ...rest, email: email === '' ? null : email },
    select: { id: true, name: true, subject: true, email: true },
  })
  return Response.json(teacher)
}
