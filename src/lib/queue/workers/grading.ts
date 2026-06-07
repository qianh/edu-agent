import { Worker, Job } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { GradingJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'
import { masteryUpdateQueue } from '../queues'

const ERROR_TYPES = ['concept', 'formula', 'calculation', 'sign', 'reading', 'extraction', 'step_missing', 'format', 'method', 'transfer', 'comprehensive', 'careless'] as const

function buildGradingPrompt(question: {
  questionNo: string
  studentAnswer: string | null
  standardAnswer?: string | null
}): string {
  return `你是一位经验丰富的第${question.questionNo}题批改专家。

学生答案：${question.studentAnswer ?? '（未识别到答案）'}
标准答案：${question.standardAnswer ?? '（教师未提供标准答案，根据学科知识判断）'}

请评估这道题并以 JSON 格式返回：
{
  "is_correct": true|false,
  "partial_credit": true|false,
  "suggested_score_rate": 0.0-1.0,
  "error_type": "${ERROR_TYPES.join('|')}"|null,
  "knowledge_point_hint": "涉及知识点关键词",
  "feedback": "给学生的简短反馈（50字内）",
  "confidence": 0.0-1.0
}

错因类型说明：concept=概念不清, formula=公式误用, calculation=计算错误, sign=符号错误, reading=审题错误, extraction=信息提取错误, step_missing=步骤缺失, format=表达不规范, method=方法选择错误, transfer=迁移能力不足, comprehensive=综合应用弱, careless=粗心错误`
}

async function processGrading(job: Job<GradingJobData>) {
  const { submissionId } = job.data

  const gradingResults = await prisma.gradingResult.findMany({
    where: { submissionId, aiScore: null },
    include: { submission: { include: { assignment: true } } },
  })

  if (gradingResults.length === 0) {
    await generateFromTeacherMarks(submissionId)
    return { processed: 0, mode: 'teacher_mark' }
  }

  const textProvider = providerRegistry.getTextProvider()
  let processed = 0

  for (const gr of gradingResults) {
    const prompt = buildGradingPrompt({
      questionNo: gr.questionNo,
      studentAnswer: gr.studentAnswer,
      standardAnswer: gr.standardAnswer,
    })

    const rawResponse = await textProvider.generateText(prompt, { temperature: 0.1 })
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) continue

    const parsed = JSON.parse(jsonMatch[0])

    let knowledgePointId: string | undefined
    if (parsed.knowledge_point_hint) {
      const kp = await prisma.knowledgePoint.findFirst({
        where: {
          name: { contains: parsed.knowledge_point_hint, mode: 'insensitive' },
          subject: gr.submission.assignment.subject,
        },
      })
      knowledgePointId = kp?.id
    }

    await prisma.gradingResult.update({
      where: { id: gr.id },
      data: {
        aiScore: parsed.suggested_score_rate,
        isCorrect: parsed.is_correct,
        errorType: parsed.error_type ?? null,
        feedback: parsed.feedback,
        confidence: parsed.confidence,
        knowledgePointId,
        finalScore: parsed.suggested_score_rate,
        finalSource: 'ai',
      },
    })

    processed++
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'pending_confirm' },
  })

  await masteryUpdateQueue.add('mastery_update', { submissionId })

  return { processed }
}

async function generateFromTeacherMarks(submissionId: string) {
  const marks = await prisma.teacherMark.findMany({ where: { submissionId } })
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  })
  if (!submission) return

  const byQuestion = marks.reduce<Record<string, typeof marks>>((acc, m) => {
    acc[m.questionNo] = acc[m.questionNo] ?? []
    acc[m.questionNo].push(m)
    return acc
  }, {})

  const textProvider = providerRegistry.getTextProvider()

  for (const [questionNo, qMarks] of Object.entries(byQuestion)) {
    const isCorrect = qMarks.some((m) => m.markType === 'tick')
    const isWrong = qMarks.some((m) => m.markType === 'cross')
    const deductMark = qMarks.find((m) => m.markType === 'deduct')
    const commentMark = qMarks.find((m) => m.markType === 'comment')

    let errorType: string | null = null
    if (commentMark?.markText) {
      const errPrompt = `教师评语："${commentMark.markText}"。请从以下类型中选一个最匹配的错因类型，仅返回英文类型名：${ERROR_TYPES.join(', ')}`
      const errResponse = await textProvider.generateText(errPrompt, { temperature: 0.1, maxTokens: 20 })
      const matched = ERROR_TYPES.find((t) => errResponse.includes(t))
      errorType = matched ?? null
    }

    const confidence = Math.min(...qMarks.map((m) => m.confidence))

    await prisma.gradingResult.upsert({
      where: { id: `${submissionId}-${questionNo}` },
      create: {
        id: `${submissionId}-${questionNo}`,
        submissionId,
        questionNo,
        isCorrect: isCorrect && !isWrong,
        teacherScoreDetected: deductMark?.markText ? parseFloat(deductMark.markText) || null : null,
        errorType,
        feedback: commentMark?.markText ?? null,
        confidence,
        finalSource: 'teacher_detected',
      },
      update: {},
    })
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'pending_confirm' },
  })

  await masteryUpdateQueue.add('mastery_update', { submissionId })
}

export const gradingWorker = new Worker<GradingJobData>(
  'grading',
  async (job) => {
    try {
      return await processGrading(job)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const aiJob = await prisma.aIJob.findFirst({
        where: { submissionId: job.data.submissionId, type: 'image_analysis' },
      })
      if (aiJob) {
        await prisma.aIJob.update({ where: { id: aiJob.id }, data: { status: 'failed', error: msg } })
      }
      throw err
    }
  },
  { connection: getRedisConnection(), concurrency: 3 }
)
