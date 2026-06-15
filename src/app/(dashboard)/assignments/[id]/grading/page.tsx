'use client'
import { useState, use } from 'react'
import { Button, Table, InputNumber, Select, Alert, Space, Row, Col, Card, Avatar, message } from 'antd'
import useSWR from 'swr'
import { AnnotatedImageViewer } from '@/components/assignments/AnnotatedImageViewer'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { JobProgressBar } from '@/components/shared/JobProgressBar'
import { useRouter, useSearchParams } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const errorTypeLabels: Record<string, string> = {
  concept: '概念不清', formula: '公式误用', calculation: '计算错误',
  sign: '符号错误', reading: '审题错误', extraction: '信息提取错误',
  step_missing: '步骤缺失', format: '表达不规范', method: '方法错误',
  transfer: '迁移能力不足', comprehensive: '综合应用弱', careless: '粗心',
}

export default function GradingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const router = useRouter()

  const [selectedQ, setSelectedQ] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { score?: number; errorType?: string; kpId?: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [jobDone, setJobDone] = useState(!jobId)

  const { data: submission, mutate } = useSWR(jobDone ? `/api/assignments/${id}/grading` : null, fetcher)

  const lowConfidence = (submission?.gradingResults ?? []).filter((r: { confidence: number | null }) => (r.confidence ?? 1) < 0.70)

  async function handleConfirm() {
    if (lowConfidence.length > 0 && !window.confirm(`还有 ${lowConfidence.length} 个低置信度项未处理，确认继续？`)) return

    setSubmitting(true)
    const results = (submission?.gradingResults ?? []).map((r: { id: string; aiScore: number | null; errorType: string | null; knowledgePointId: string | null }) => ({
      id: r.id,
      teacherScoreConfirmed: edits[r.id]?.score ?? r.aiScore,
      errorType: edits[r.id]?.errorType ?? r.errorType,
      knowledgePointId: edits[r.id]?.kpId ?? r.knowledgePointId,
    }))

    const totalConfirmed = results.reduce((sum: number, r: { teacherScoreConfirmed: number | null }) => sum + (r.teacherScoreConfirmed ?? 0), 0)

    const res = await fetch(`/api/assignments/${id}/grading/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, totalScoreConfirmed: totalConfirmed }),
    })

    setSubmitting(false)
    if (res.ok) {
      message.success('批改结果已确认，正在更新学生画像...')
      router.push(`/students/${submission?.student?.id}`)
    } else {
      message.error('确认失败，请重试')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {submission && (
          <Card
            style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f4ff 100%)', border: '1px solid #bae0ff' }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={44} style={{ background: '#1677ff', fontSize: 18, flexShrink: 0 }}>
                  {submission.student?.name?.[0] ?? '?'}
                </Avatar>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{submission.student?.name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {submission.assignment?.title ?? '—'}
                    {submission.createdAt ? ` · ${new Date(submission.createdAt).toLocaleString('zh-CN')}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'AI总分', value: (submission.gradingResults?.reduce((s: number, r: { aiScore: number | null }) => s + (r.aiScore ?? 0), 0) ?? 0).toFixed(1), color: '#1677ff' },
                  { label: '错题数', value: String(submission.gradingResults?.filter((r: { isCorrect: boolean | null }) => r.isCorrect === false).length ?? 0), color: '#ff4d4f' },
                  { label: '低置信项', value: String((submission.gradingResults ?? []).filter((r: { confidence: number | null }) => (r.confidence ?? 1) < 0.70).length), color: '#faad14' },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      <JobProgressBar jobId={jobDone ? null : jobId} onDone={() => { setJobDone(true); mutate() }} />

      {submission && (
        <>
          {lowConfidence.length > 0 && (
            <Alert type="warning" style={{ marginBottom: 16 }}
              message={`${lowConfidence.length} 个题目识别置信度低于 70%，请重点确认`} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <AnnotatedImageViewer
                imageUrl={submission.fileUrl}
                marks={submission.teacherMarks ?? []}
                selectedQuestionNo={selectedQ}
                onMarkClick={setSelectedQ}
              />
            </div>

            <div>
              <Table
                dataSource={submission.gradingResults ?? []}
                rowKey="id"
                size="small"
                pagination={false}
                rowClassName={(r) => {
                  const row = r as unknown as { questionNo: string }
                  return row.questionNo === selectedQ ? 'ant-table-row-selected' : ''
                }}
                onRow={(r) => {
                  const row = r as unknown as { questionNo: string }
                  return { onClick: () => setSelectedQ(row.questionNo) }
                }}
                columns={[
                  { title: '题号', dataIndex: 'questionNo', width: 60 },
                  { title: 'AI 分', dataIndex: 'aiScore', width: 80, render: (v: number | null) => v?.toFixed(1) ?? '-' },
                  { title: '教师改分', width: 100, render: (_: unknown, r) => {
                    const row = r as unknown as { id: string; aiScore: number | null }
                    return (
                      <InputNumber size="small" min={0} max={100} step={0.5}
                        defaultValue={row.aiScore ?? undefined}
                        onChange={(v) => setEdits((e) => ({ ...e, [row.id]: { ...e[row.id], score: v ?? undefined } }))}
                      />
                    )
                  }},
                  { title: '错因', width: 120, render: (_: unknown, r) => {
                    const row = r as unknown as { id: string; errorType: string | null }
                    return (
                      <Select size="small" style={{ width: '100%' }}
                        defaultValue={row.errorType ?? undefined}
                        allowClear
                        options={Object.entries(errorTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
                        onChange={(v) => setEdits((e) => ({ ...e, [row.id]: { ...e[row.id], errorType: v } }))}
                      />
                    )
                  }},
                  { title: '置信度', dataIndex: 'confidence', width: 90, render: (v: number | null) =>
                    v !== null ? <ConfidenceBadge confidence={v} size="small" /> : '-'
                  },
                ]}
              />

              <Space style={{ marginTop: 16 }}>
                <Button type="primary" loading={submitting} onClick={handleConfirm}>确认全部入库</Button>
                <Button onClick={() => router.back()}>返回</Button>
              </Space>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
