import { Worker } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { QuestionGenJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'

function buildQuestionGenPrompt(data: QuestionGenJobData, weakPoints: string[]): string {
  return `你是一位经验丰富的${data.subject}老师，请为${data.grade}年级学生生成 ${data.count} 道${data.type}题。

薄弱知识点：${weakPoints.join('、')}
题型：${data.type}
难度：${data.difficulty}（基础/中等/提高）
目标：补弱训练

请以 JSON 数组格式返回，每道题包含：
[
  {
    "content": "完整题目内容",
    "answer": "标准答案",
    "explanation": "解题过程（100-200字）",
    "scoring_criteria": "评分标准（主观题）或null",
    "knowledge_point_hint": "主要考查的知识点名称",
    "difficulty_level": 1-5
  }
]

要求：
1. 题目符合${data.grade}年级认知水平
2. 难度与要求一致
3. 答案完整正确
4. 解析清晰易懂`
}

export const questionGenWorker = new Worker<QuestionGenJobData>(
  'question_gen',
  async (job) => {
    const { knowledgePointIds, subject, grade } = job.data

    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where: { id: { in: knowledgePointIds } },
    })
    const kpNames = knowledgePoints.map((k) => k.name)

    const textProvider = providerRegistry.getTextProvider()
    const prompt = buildQuestionGenPrompt(job.data, kpNames)
    const raw = await textProvider.generateText(prompt, { temperature: 0.7, maxTokens: 4096 })

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Failed to parse generated questions JSON')

    const questions: Array<{
      content: string; answer: string; explanation: string;
      scoring_criteria: string | null; knowledge_point_hint: string;
      difficulty_level: number;
    }> = JSON.parse(jsonMatch[0])

    const created = await Promise.all(
      questions.map(async (q) => {
        const kp = knowledgePoints.find((k) => q.knowledge_point_hint?.includes(k.name))
        return prisma.question.create({
          data: {
            content: q.content,
            type: job.data.type,
            answer: q.answer,
            explanation: q.explanation,
            scoringCriteria: q.scoring_criteria,
            subject,
            grade,
            difficulty: q.difficulty_level ?? 3,
            knowledgePointId: kp?.id ?? knowledgePointIds[0],
            source: 'ai_generated',
            status: 'draft',
          },
        })
      })
    )

    const aiJob = await prisma.aIJob.findFirst({ where: { id: job.id!, type: 'question_gen' } })
    if (aiJob) {
      await prisma.aIJob.update({
        where: { id: aiJob.id },
        data: { status: 'completed', result: { questionIds: created.map((q) => q.id) } },
      })
    }

    return { count: created.length, questionIds: created.map((q) => q.id) }
  },
  { connection: getRedisConnection(), concurrency: 2 }
)
