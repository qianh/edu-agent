import { Worker } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { QuestionGenJobData } from '../queues'
import { prisma } from '@/lib/db'
import { providerRegistry } from '@/lib/ai/registry'
import { sampleKnowledgePoints, type MasteryPoint } from '@/lib/question-gen/sampling'
import { chartQuota } from '@/lib/question-gen/chart-quota'
import { chartSpecSchema, type ChartSpec } from '@/lib/question-gen/chart-spec'

const TYPE_LABEL: Record<string, string> = { single: '单选题', fill: '填空题', answer: '解答题' }
const MAX_OUTLINE_RETRIES = 2
const MAX_ITEM_RETRIES = 2

interface OutlineItem {
  draftContent: string
  draftAnswer: string
  knowledgePointId: string
  isChart: boolean
  chartKind?: 'geometry' | 'data' | 'experiment'
  chartDraft?: unknown
}

interface FinalItem {
  content: string
  answer: string
  explanation: string
  scoringCriteria: string | null
  difficultyLevel: number
  isChart: boolean
  chartSpec: ChartSpec | null
  chartImagePrompt: string | null
  knowledgePointId: string
}

async function loadMasteryPool(
  studentId: string,
  subject: string,
  grade: string,
  knowledgePointIds?: string[]
): Promise<MasteryPoint[]> {
  const masteries = await prisma.studentMastery.findMany({
    where: {
      studentId,
      ...(knowledgePointIds?.length
        ? { knowledgePointId: { in: knowledgePointIds } }
        : { knowledgePoint: { subject, grade } }),
    },
    select: { knowledgePointId: true, masteryScore: true },
  })
  return masteries
}

async function generateOutlineForType(
  type: string,
  count: number,
  chartCount: number,
  knowledgePointIds: string[],
  knowledgePointNames: Map<string, string>,
  subject: string,
  grade: string,
  difficulty: string
): Promise<OutlineItem[]> {
  if (count === 0) return []
  const textProvider = providerRegistry.getTextProvider()

  for (let attempt = 0; attempt <= MAX_OUTLINE_RETRIES; attempt++) {
    const kpNames = knowledgePointIds.map((id) => knowledgePointNames.get(id) ?? id)
    const prompt = `你是一位经验丰富的${subject}老师，请为${grade}年级学生拟一份${TYPE_LABEL[type]}的出题大纲（不是最终题目，只是草稿题干+草稿答案）。

考查知识点（按顺序逐题对应，共${count}道）：${kpNames.join('、')}
难度：${difficulty}
其中第 1 到第 ${chartCount} 道需要是图表题：几何图形或物理/化学/生物实验图，请在该题对象中标注 "chart_kind"（"geometry" 或 "experiment"），并给出 "chart_draft"（几何题给出图形类型与关键点坐标；实验题给出一段图片生成提示词文本）。

请严格以 JSON 数组返回，长度为 ${count}，每项：
{
  "draft_content": "草稿题干",
  "draft_answer": "草稿答案",
  "is_chart": true/false,
  "chart_kind": "geometry" | "experiment" | null,
  "chart_draft": { ... } | "提示词文本" | null
}`

    try {
      const raw = await textProvider.generateText(prompt, { temperature: 0.7, maxTokens: 4096 })
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error(`大纲生成 JSON 解析失败（题型：${type}）`)
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        draft_content: string; draft_answer: string; is_chart: boolean
        chart_kind: 'geometry' | 'experiment' | null; chart_draft: unknown
      }>
      if (parsed.length !== count) throw new Error(`大纲数量不符：期望 ${count}，实际 ${parsed.length}`)

      return parsed.map((item, idx) => ({
        draftContent: item.draft_content,
        draftAnswer: item.draft_answer,
        knowledgePointId: knowledgePointIds[idx],
        isChart: item.is_chart,
        chartKind: item.chart_kind ?? undefined,
        chartDraft: item.chart_draft,
      }))
    } catch (err) {
      if (attempt === MAX_OUTLINE_RETRIES) {
        throw new Error(`题型「${TYPE_LABEL[type]}」大纲生成重试 ${MAX_OUTLINE_RETRIES} 次后仍失败：${(err as Error).message}`)
      }
    }
  }
  return []
}

async function generateAndValidateItem(
  type: string,
  outline: OutlineItem,
  subject: string,
  grade: string,
  difficulty: string
): Promise<FinalItem | null> {
  const textProvider = providerRegistry.getTextProvider()

  for (let attempt = 0; attempt <= MAX_ITEM_RETRIES; attempt++) {
    try {
      const prompt = `请把下面这道${subject}${TYPE_LABEL[type]}的草稿"润色/完整化"为正式题目，不要改变题干主旨与答案结论。

草稿题干：${outline.draftContent}
草稿答案：${outline.draftAnswer}
年级：${grade}　难度：${difficulty}
${outline.isChart ? `这是一道图表题，图表草稿：${JSON.stringify(outline.chartDraft)}` : ''}

请以 JSON 返回：
{
  "content": "完整题干",
  "answer": "标准答案",
  "explanation": "解题过程（100-200字）",
  "scoring_criteria": "评分标准或null",
  "difficulty_level": 1-5
  ${outline.isChart && outline.chartKind === 'geometry' ? ', "chart_spec": { "kind": "geometry", ... }' : ''}
  ${outline.isChart && outline.chartKind === 'experiment' ? ', "chart_image_prompt": "图片生成提示词"' : ''}
}`
      const raw = await textProvider.generateText(prompt, { temperature: 0.5, maxTokens: 2048 })
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('逐题生成 JSON 解析失败')
      const item = JSON.parse(jsonMatch[0]) as {
        content: string; answer: string; explanation: string
        scoring_criteria: string | null; difficulty_level: number
        chart_spec?: unknown; chart_image_prompt?: string
      }

      if (!isConsistentWithOutline(item, outline)) {
        throw new Error('生成结果偏离大纲（题干主旨或答案结论不一致）')
      }

      let chartSpec: ChartSpec | null = null
      if (outline.isChart && outline.chartKind === 'geometry') {
        const result = chartSpecSchema.safeParse(item.chart_spec)
        if (!result.success) throw new Error('chartSpec 校验失败，与题干图形描述不一致')
        chartSpec = result.data
      }

      return {
        content: item.content,
        answer: item.answer,
        explanation: item.explanation,
        scoringCriteria: item.scoring_criteria,
        difficultyLevel: item.difficulty_level ?? 3,
        isChart: outline.isChart,
        chartSpec,
        chartImagePrompt: outline.isChart && outline.chartKind === 'experiment' ? (item.chart_image_prompt ?? null) : null,
        knowledgePointId: outline.knowledgePointId,
      }
    } catch {
      if (attempt === MAX_ITEM_RETRIES) return null
    }
  }
  return null
}

function isConsistentWithOutline(
  item: { content: string; answer: string },
  outline: OutlineItem
): boolean {
  return item.content.length > 0 && item.answer.length > 0
}

export const questionGenWorker = new Worker<QuestionGenJobData>(
  'question_gen',
  async (job) => {
    const { studentId, knowledgePointIds, counts, chartEnabled, chartPercentage, subject, grade, difficulty } = job.data

    const pool = await loadMasteryPool(studentId, subject, grade, knowledgePointIds)

    if (pool.length === 0) {
      const errorMessage =
        '该学生在所选学科/年级下没有学情记录，无法自动抽样知识点。请先录入作业批改数据或手动选择知识点。'
      const aiJob = await prisma.aIJob.findFirst({ where: { id: job.id!, type: 'question_gen' } })
      if (aiJob) {
        await prisma.aIJob.update({
          where: { id: aiJob.id },
          data: { status: 'failed', error: errorMessage },
        })
      }
      throw new Error(errorMessage)
    }

    const allKpIds = Array.from(new Set(pool.map((p) => p.knowledgePointId)))
    const knowledgePoints = await prisma.knowledgePoint.findMany({ where: { id: { in: allKpIds } } })
    const kpNameMap = new Map(knowledgePoints.map((k) => [k.id, k.name]))

    let degraded = false
    const skipped: string[] = []
    let succeeded = 0
    let total = 0

    for (const type of ['single', 'fill', 'answer'] as const) {
      const count = counts[type]
      if (count === 0) continue
      total += count

      const sample = sampleKnowledgePoints(pool, count)
      degraded = degraded || sample.degraded

      const chartCount = chartEnabled ? chartQuota(count, chartPercentage ?? 0) : 0
      const outline = await generateOutlineForType(
        type, count, chartCount, sample.assignments, kpNameMap, subject, grade, difficulty
      )

      for (const item of outline) {
        const finalItem = await generateAndValidateItem(type, item, subject, grade, difficulty)
        if (!finalItem) {
          skipped.push(`${TYPE_LABEL[type]}：知识点 ${kpNameMap.get(item.knowledgePointId) ?? item.knowledgePointId}`)
          continue
        }
        await prisma.question.create({
          data: {
            content: finalItem.content,
            type,
            answer: finalItem.answer,
            explanation: finalItem.explanation,
            scoringCriteria: finalItem.scoringCriteria,
            subject,
            grade,
            difficulty: finalItem.difficultyLevel,
            knowledgePointId: finalItem.knowledgePointId,
            isChart: finalItem.isChart,
            chartSpec: finalItem.chartSpec ?? undefined,
            chartImagePrompt: finalItem.chartImagePrompt,
            source: 'ai_generated',
            status: 'draft',
          },
        })
        succeeded++
      }
    }

    const aiJob = await prisma.aIJob.findFirst({ where: { id: job.id!, type: 'question_gen' } })
    const resultSummary = {
      total,
      succeeded,
      skipped,
      degradedToGoodPoints: degraded,
    }
    if (aiJob) {
      await prisma.aIJob.update({
        where: { id: aiJob.id },
        data: { status: 'completed', result: resultSummary },
      })
    }

    return resultSummary
  },
  { connection: getRedisConnection(), concurrency: 2 }
)