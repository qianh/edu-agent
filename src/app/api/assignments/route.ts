import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      include: {
        assignment: { select: { title: true, subject: true, gradingMode: true } },
        student: { select: { id: true, name: true } },
        aiJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.submission.count(),
  ])

  return Response.json({ submissions, total, page, limit })
}
