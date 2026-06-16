'use client'
import { useState } from 'react'
import { Form, Select, InputNumber, Button, Card, Table, Tag, Space, message, Row, Col, Segmented, Checkbox } from 'antd'
import { HistoryOutlined, BulbOutlined, PlayCircleOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { JobProgressBar } from '@/components/shared/JobProgressBar'
import { ChartQuestionView } from '@/components/questions/ChartQuestionView'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '基础' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '提高' },
]

interface GenerateFormValues {
  studentId: string
  knowledgePointIds?: string[]
  difficulty: string
  subject: string
  grade: string
  single: number
  fill: number
  answer: number
  chartEnabled: boolean
  chartPercentage?: number
}

export default function QuestionGeneratePage() {
  const [form] = Form.useForm<GenerateFormValues>()
  const [jobId, setJobId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [chartEnabled, setChartEnabled] = useState(false)

  const { data: studentData } = useSWR('/api/students?limit=100', fetcher)
  const { data: kpData } = useSWR('/api/knowledge/points', fetcher)
  const { data: qData, mutate: refetchQ } = useSWR(showResults ? '/api/questions?status=draft' : null, fetcher)

  const studentOptions = (studentData?.students ?? []).map((s: { id: string; name: string; class?: { name: string } }) => ({
    value: s.id,
    label: `${s.name}${s.class?.name ? `（${s.class.name}）` : ''}`,
  }))

  const kpOptions = (kpData?.knowledgePoints ?? []).map(
    (k: { id: string; name: string; chapter?: string | null }) => ({
      value: k.id,
      label: `${k.chapter ? `[${k.chapter}] ` : ''}${k.name}`,
    })
  )

  async function handleGenerate(values: GenerateFormValues) {
    setGenerating(true)
    const { single, fill, answer, chartEnabled: chartOn, chartPercentage, ...rest } = values
    const res = await fetch('/api/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...rest,
        counts: { single, fill, answer },
        chartEnabled: chartOn,
        ...(chartOn ? { chartPercentage } : {}),
      }),
    })
    const data = await res.json()
    setJobId(data.jobId)
  }

  async function handleApprove(id: string) {
    await fetch(`/api/questions/${id}/approve`, { method: 'POST' })
    message.success('已审核通过入库')
    refetchQ()
  }

  const approvedCount = (qData?.questions ?? []).filter(
    (q: { status: string }) => q.status === 'approved'
  ).length

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>个性化试题生成</div>

      <Row gutter={12}>
        <Col span={7}>
          <Card title="生成参数设置" styles={{ body: { padding: '16px' } }}>
            <Form form={form} layout="vertical" onFinish={handleGenerate} size="small">
              <Form.Item name="subject" label="学科" initialValue="数学" rules={[{ required: true }]}>
                <Select options={['数学', '语文', '英语', '物理', '化学'].map((s) => ({ value: s, label: s }))} />
              </Form.Item>

              <Form.Item name="grade" label="年级" initialValue="七年级" rules={[{ required: true }]}>
                <Select options={['七年级', '八年级', '九年级'].map((g) => ({ value: g, label: g }))} />
              </Form.Item>

              <Form.Item name="studentId" label="学生" rules={[{ required: true, message: '请选择学生' }]}>
                <Select options={studentOptions} placeholder="选择学生（驱动按学情自动抽样）" showSearch optionFilterProp="label" />
              </Form.Item>

              <Form.Item name="knowledgePointIds" label="知识点（可选）">
                <Select
                  mode="multiple"
                  options={kpOptions}
                  placeholder="不选则按学生学情自动 90/10 抽样"
                  maxTagCount={3}
                  allowClear
                />
              </Form.Item>

              <Form.Item label="题型数量" required>
                <Space.Compact block>
                  <Form.Item name="single" initialValue={0} noStyle rules={[{ required: true }]}>
                    <InputNumber min={0} max={20} addonBefore="单选" style={{ width: '33%' }} />
                  </Form.Item>
                  <Form.Item name="fill" initialValue={0} noStyle rules={[{ required: true }]}>
                    <InputNumber min={0} max={20} addonBefore="填空" style={{ width: '33%' }} />
                  </Form.Item>
                  <Form.Item name="answer" initialValue={0} noStyle rules={[{ required: true }]}>
                    <InputNumber min={0} max={20} addonBefore="解答" style={{ width: '34%' }} />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>

              <Form.Item name="difficulty" label="难度" initialValue="medium" rules={[{ required: true }]}>
                <Segmented options={DIFFICULTY_OPTIONS} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="chartEnabled" valuePropName="checked" initialValue={false}>
                <Checkbox onChange={(e) => setChartEnabled(e.target.checked)}>包含图表题</Checkbox>
              </Form.Item>

              {chartEnabled && (
                <Form.Item
                  name="chartPercentage"
                  label="图表题百分比"
                  initialValue={30}
                  rules={[{ required: true, type: 'number', min: 0, max: 100 }]}
                >
                  <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                </Form.Item>
              )}

              <Button type="primary" htmlType="submit" loading={generating} block icon={<PlayCircleOutlined />} style={{ borderRadius: 8 }}>
                开始生成
              </Button>
            </Form>

            <JobProgressBar jobId={jobId} onDone={() => { setGenerating(false); setShowResults(true); refetchQ() }} />
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={`生成结果（${qData?.total ?? 0} 题，已入库 ${approvedCount} 题）`}
            styles={{ body: { padding: 0, maxHeight: 560, overflowY: 'auto' } }}
          >
            <Table
              dataSource={qData?.questions ?? []}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: '点击"开始生成"后结果显示于此' }}
              columns={[
                { title: '题目', dataIndex: 'content', ellipsis: true,
                  render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
                { title: '知识点', dataIndex: ['knowledgePoint', 'name'], width: 90, ellipsis: true,
                  render: (v: string) => <span style={{ fontSize: 11 }}>{v}</span> },
                { title: '操作', width: 80, render: (_: unknown, r: { id: string; status: string }) => (
                  <Space size={4}>
                    {r.status === 'draft' && <Button size="small" type="primary" onClick={() => handleApprove(r.id)}>通过</Button>}
                    {r.status === 'approved' && <Tag color="success" style={{ fontSize: 11 }}>已入库</Tag>}
                  </Space>
                )},
              ]}
              expandable={{
                expandedRowRender: (r) => {
                  const row = r as unknown as {
                    answer: string; explanation: string
                    isChart: boolean; chartSpec: unknown; chartImagePrompt: string | null
                  }
                  return (
                    <div style={{ fontSize: 12, padding: '6px 8px', background: '#fafafa', lineHeight: 1.8 }}>
                      <strong>答案：</strong>{row.answer}<br />
                      <strong>解析：</strong>{row.explanation}
                      {row.isChart && <ChartQuestionView chartSpec={row.chartSpec} chartImagePrompt={row.chartImagePrompt} />}
                    </div>
                  )
                },
              }}
            />
          </Card>
        </Col>

        <Col span={7}>
          <Card
            title={<span><HistoryOutlined style={{ marginRight: 6, color: '#666' }} />生成记录</span>}
            style={{ marginBottom: 10, height: 240 }}
            styles={{ body: { padding: '10px 12px', height: 178, overflowY: 'auto' } }}
          >
            {(qData?.total ?? 0) === 0 ? (
              <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', paddingTop: 30 }}>暂无生成记录</div>
            ) : (
              <div style={{ fontSize: 12, color: '#555', lineHeight: 2 }}>
                <div>共生成题目：<strong>{qData?.total ?? 0}</strong> 题</div>
                <div>已审核入库：<strong style={{ color: '#52c41a' }}>{approvedCount}</strong> 题</div>
                <div>待审核：<strong style={{ color: '#faad14' }}>{(qData?.total ?? 0) - approvedCount}</strong> 题</div>
              </div>
            )}
          </Card>
          <Card
            title={<span><BulbOutlined style={{ color: '#faad14', marginRight: 6 }} />学情建议</span>}
            styles={{ body: { padding: '10px 12px', fontSize: 12, color: '#555', lineHeight: 2 } }}
          >
            <div>• 不选知识点时将按该生 90% 薄弱 / 10% 良好知识点自动抽样</div>
            <div>• 勾选图表题后，每种数量&gt;0的题型至少分配 1 道图表题</div>
            <div>• 难度梯度：基础题 60%，中等题 30%，提高题 10%</div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}