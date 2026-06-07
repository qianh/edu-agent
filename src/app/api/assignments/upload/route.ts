import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getStorageProvider } from '@/lib/storage'
import { imageAnalysisQueue } from '@/lib/queue/queues'
import { errorResponse } from '@/lib/errors'
import { z } from 'zod'

const MAX_FILE_SIZE = 20 * 1024 * 1024

const uploadSchema = z.object({
  title: z.string().min(1),
  classId: z.string().cuid(),
  teacherId: z.string().cuid(),
  studentId: z.string().cuid(),
  subject: z.string().min(1),
  gradingMode: z.enum(['ai_grade', 'teacher_mark', 'ai_review']),
})

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return errorResponse('VALIDATION_ERROR', 'Invalid form data', 400)

  const file = formData.get('file') as File | null
  if (!file) return errorResponse('VALIDATION_ERROR', 'No file provided', 400)

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('VALIDATION_ERROR', 'File too large (max 20MB)', 400)
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return errorResponse('VALIDATION_ERROR', 'Unsupported file type. Use JPG, PNG, or PDF', 400)
  }

  const meta = {
    title: formData.get('title') as string,
    classId: formData.get('classId') as string,
    teacherId: formData.get('teacherId') as string,
    studentId: formData.get('studentId') as string,
    subject: formData.get('subject') as string,
    gradingMode: formData.get('gradingMode') as string,
  }

  const parsed = uploadSchema.safeParse(meta)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.message, 400)

  const storage = getStorageProvider()
  const buffer = Buffer.from(await file.arrayBuffer())
  const storedPath = await storage.save(buffer, file.name, file.type)
  const fileUrl = storage.getUrl(storedPath)

  const assignment = await prisma.assignment.upsert({
    where: { id: `${parsed.data.classId}-${parsed.data.title}` },
    create: {
      id: `${parsed.data.classId}-${parsed.data.title}`,
      title: parsed.data.title,
      subject: parsed.data.subject,
      classId: parsed.data.classId,
      teacherId: parsed.data.teacherId,
      gradingMode: parsed.data.gradingMode,
      knowledgeScope: [],
    },
    update: {},
  })

  const submission = await prisma.submission.create({
    data: {
      assignmentId: assignment.id,
      studentId: parsed.data.studentId,
      fileUrl,
      gradingMode: parsed.data.gradingMode,
      status: 'processing',
    },
  })

  const aiJob = await prisma.aIJob.create({
    data: {
      type: 'image_analysis',
      status: 'pending',
      submissionId: submission.id,
    },
  })

  await imageAnalysisQueue.add(
    'image_analysis',
    { submissionId: submission.id, mode: parsed.data.gradingMode as 'ai_grade' | 'teacher_mark' | 'ai_review' },
    { jobId: aiJob.id }
  )

  await prisma.aIJob.update({ where: { id: aiJob.id }, data: { status: 'processing' } })

  return Response.json({ jobId: aiJob.id, submissionId: submission.id, status: 'processing' }, { status: 202 })
}
