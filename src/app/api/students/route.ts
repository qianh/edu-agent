import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const createStudentSchema = z.object({
  name: z.string().min(1),
  studentNo: z.string().min(1).optional(),
  stage: z.enum(['小学', '初中', '高中']),
  classNo: z.string().min(1),
  gender: z.string().min(1),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const classId = searchParams.get('classId')
  const riskLevel = searchParams.get('riskLevel')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const where: Record<string, unknown> = {}
  if (classId) where.classId = classId

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true, grade: true } },
        masteries: {
          select: { masteryScore: true, knowledgePointId: true },
          orderBy: { lastUpdated: 'desc' },
          take: 10,
        },
        submissions: {
          select: { totalScoreConfirmed: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.student.count({ where }),
  ])

  const studentsWithMastery = students.map((s) => {
    const avgMastery = s.masteries.length
      ? s.masteries.reduce((sum, m) => sum + m.masteryScore, 0) / s.masteries.length
      : null

    let riskLevelCalc = 'normal'
    if (avgMastery !== null && avgMastery < 60) riskLevelCalc = 'high'
    else if (avgMastery !== null && avgMastery < 75) riskLevelCalc = 'warning'

    return {
      ...s,
      avgMastery: avgMastery ? Math.round(avgMastery) : null,
      riskLevel: riskLevelCalc,
      lastScore: s.submissions[0]?.totalScoreConfirmed ?? null,
    }
  })

  const filtered = riskLevel
    ? studentsWithMastery.filter((s) => s.riskLevel === riskLevel)
    : studentsWithMastery

  return Response.json({ students: filtered, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = createStudentSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)
  }

  const { stage, classNo, ...rest } = parsed.data
  const className = classNo.endsWith('班') ? classNo : `${classNo}班`

  const teacher = await prisma.teacher.findFirst()
  if (!teacher) return errorResponse('NOT_FOUND', '暂无教师账户，请先创建教师', 400)

  let cls = await prisma.class.findFirst({ where: { grade: stage, name: className } })
  if (!cls) {
    cls = await prisma.class.create({ data: { grade: stage, name: className, subject: '通用', teacherId: teacher.id } })
  }

  const student = await prisma.student.create({
    data: { ...rest, grade: stage, classId: cls.id },
  })
  return Response.json(student, { status: 201 })
}
