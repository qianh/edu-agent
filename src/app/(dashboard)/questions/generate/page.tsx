'use client'
import { useState } from 'react'
import { Form, Select, InputNumber, Button, Card, Table, Tag, Space, message, Row, Col, Segmented } from 'antd'
import { HistoryOutlined, BulbOutlined, PlayCircleOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { JobProgressBar } from '@/components/shared/JobProgressBar'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TYPE_OPTIONS = [
  { value: 'single', label: '单选题' },
  { value: 'fill', label: '填空题' },
  { value: 'answer', label: '解答题' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '基础' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '提高' },
]

export default function QuestionGeneratePage() {
  const [form] = Form.useForm()
  const [jobId, setJobId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('fill')

  const { data: kpData } = useSWR('/api/knowledge/points', fetcher)
  const { data: qData, mutate: refetchQ } = useSWR(showResults ? '/api/questions?status=draft' : null, fetcher)

  const kpOptions = (kpData?.knowledgePoints ?? []).map(
    (k: { id: string; name: string; chapter?: string | null }) => ({
      value: k.id,
      label: `${k.chapter ? `[${k.chapter}] ` : ''}${k.name}`,
    })
  )

  async function handleGenerate(values: {
    knowledgePointIds: string[]
    difficulty: string
    count: number
    subject: string
    grade: string
  }) {
    setGenerating(true)
    const res = await fetch('/api/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, type: selectedType }),
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
        {/* Left: Form Panel */}
        <Col span={7}>
          <Card title="生成参数设置" bodyStyle={{ padding: '16px' }}>
            <Form form={form} layout="vertical" onFinish={handleGenerate} size="small">
              <Form.Item name="subject" label="学科" initialValue="数学" rules={[{ required: true }]}>
                <Select options={['数学', '语文', '英语', '物理', '化学'].map((s) => ({ value: s, label: s }))} />
              </Form.Item>

              <Form.Item name="grade" label="年级" initialValue="七年级" rules={[{ required: true }]}>
                <Select options={['七年级', '八年级', '九年级'].map((g) => ({ value: g, label: g }))} />
              </Form.Item>

              <Form.Item name="knowledgePointIds" label="知识点" rules={[{ required: true }]}>
                <Select mode="multiple" options={kpOptions} placeholder="选择要考查的知识点" maxTagCount={3} />
              </Form.Item>

              <Form.Item label="题型">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TYPE_OPTIONS.map((t) => (
                    <Tag.CheckableTag
                      key={t.value}
                      checked={selectedType === t.value}
                      onChange={(checked) => { if (checked) setSelectedType(t.value) }}
                      style={{
                        padding: '3px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 12,
                        border: `1px solid ${selectedType === t.value ? '#1677ff' : '#d9d9d9'}`,
                      }}
                    >
                      {t.label}
                    </Tag.CheckableTag>
                  ))}
                </div>
              </Form.Item>

              <Form.Item name="difficulty" label="难度" initialValue="medium" rules={[{ required: true }]}>
                <Segmented options={DIFFICULTY_OPTIONS} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="count" label="生成数量" initialValue={5} rules={[{ required: true }]}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={generating} block icon={<PlayCircleOutlined />} style={{ borderRadius: 8 }}>
                开始生成
              </Button>
            </Form>

            <JobProgressBar jobId={jobId} onDone={() => { setGenerating(false); setShowResults(true); refetchQ() }} />
          </Card>
        </Col>

        {/* Center: Preview Panel */}
        <Col span={10}>
          <Card
            title={`生成结果（${qData?.total ?? 0} 题，已入库 ${approvedCount} 题）`}
            bodyStyle={{ padding: 0, maxHeight: 560, overflowY: 'auto' }}
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
                  const row = r as unknown as { answer: string; explanation: string }
                  return (
                    <div style={{ fontSize: 12, padding: '6px 8px', background: '#fafafa', lineHeight: 1.8 }}>
                      <strong>答案：</strong>{row.answer}<br />
                      <strong>解析：</strong>{row.explanation}
                    </div>
                  )
                },
              }}
            />
          </Card>
        </Col>

        {/* Right: History + Suggestions */}
        <Col span={7}>
          <Card
            title={<span><HistoryOutlined style={{ marginRight: 6, color: '#666' }} />生成记录</span>}
            style={{ marginBottom: 10, height: 240 }}
            bodyStyle={{ padding: '10px 12px', height: 178, overflowY: 'auto' }}
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
            bodyStyle={{ padding: '10px 12px', fontSize: 12, color: '#555', lineHeight: 2 }}
          >
            <div>• 建议优先出填空题加强基础训练</div>
            <div>• 近期错误率高的知识点建议多出练习题</div>
            <div>• 可结合学生薄弱点定向生成题目</div>
            <div>• 难度梯度：基础题 60%，中等题 30%，提高题 10%</div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
