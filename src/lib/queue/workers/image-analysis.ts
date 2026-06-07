import { Worker, Job } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { ImageAnalysisJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'
import { gradingQueue } from '../queues'

const TEACHER_MARK_PROMPT = `你是一个专业的作业批阅结果识别系统。

分析这份已被教师批阅的作业图片，识别所有批阅痕迹。

请以 JSON 格式返回，格式如下：
{
  "total_score": number | null,
  "marks": [
    {
      "question_no": "1",
      "mark_type": "tick|cross|half|deduct|score|comment|circle",
      "mark_text": "评语文字或null",
      "score_value": 5 或 null,
      "bbox": { "x": 0.1, "y": 0.2, "width": 0.05, "height": 0.03 },
      "confidence": 0.92
    }
  ]
}

注意：
1. 区分三层：印刷题目层、学生手写层、教师批阅层
2. 重点识别教师批阅层（对勾✓、叉号✗、扣分数字、评语）
3. bbox 坐标用图片宽高的百分比（0-1）
4. 将每个痕迹归属到最近的题号
5. confidence 为识别置信度（0-1）
6. 若归属不确定，confidence 设为 0.5 以下`

const AI_GRADE_PROMPT = `你是一个专业的作业批改系统。

分析这份学生作业图片，识别所有题目和学生的答题内容。

请以 JSON 格式返回：
{
  "total_score": null,
  "questions": [
    {
      "question_no": "1",
      "content": "题目内容（如可识别）",
      "student_answer": "学生填写的答案",
      "bbox": { "x": 0.0, "y": 0.0, "width": 1.0, "height": 0.2 },
      "confidence": 0.88
    }
  ],
  "marks": []
}`

async function processImageAnalysis(job: Job<ImageAnalysisJobData>) {
  const { submissionId, mode } = job.data

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  })

  if (!submission) throw new Error(`Submission ${submissionId} not found`)

  const imageProvider = providerRegistry.getImageProvider()
  const prompt = mode === 'ai_grade' ? AI_GRADE_PROMPT : TEACHER_MARK_PROMPT

  const storedName = submission.fileUrl.replace('/api/uploads/', '')
  const localPath = `./uploads/${storedName}`

  const result = await imageProvider.analyzeImage(localPath, prompt, { timeout: 60_000 })

  if (result.marks?.length) {
    await prisma.teacherMark.createMany({
      data: result.marks.map((mark) => ({
        submissionId,
        questionNo: mark.question_no,
        markType: mark.mark_type,
        markText: mark.mark_text,
        bbox: mark.bbox as object,
        confidence: mark.confidence,
      })),
    })
  }

  if (result.questions?.length) {
    await prisma.gradingResult.createMany({
      data: result.questions.map((q) => ({
        submissionId,
        questionNo: q.question_no,
        studentAnswer: q.student_answer,
        confidence: q.confidence ?? 0.8,
      })),
    })
  }

  if (result.total_score !== null) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { totalScoreDetected: result.total_score },
    })
  }

  await gradingQueue.add('grading', { submissionId, knowledgePointIds: [] })

  return { marksCount: result.marks?.length ?? 0, questionsCount: result.questions?.length ?? 0 }
}

export const imageAnalysisWorker = new Worker<ImageAnalysisJobData>(
  'image_analysis',
  async (job) => {
    await prisma.aIJob.update({
      where: { id: job.id! },
      data: { status: 'processing', attempts: job.attemptsMade + 1 },
    })

    try {
      const result = await processImageAnalysis(job)
      await prisma.aIJob.update({
        where: { id: job.id! },
        data: { status: 'completed', result },
      })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await prisma.aIJob.update({
        where: { id: job.id! },
        data: { status: 'failed', error: message },
      })
      throw err
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  }
)
