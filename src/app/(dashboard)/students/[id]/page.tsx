'use client'
import { Card, Row, Col, Table, Tag, Avatar, Empty, Spin } from 'antd'
import { BulbOutlined, TrophyOutlined, BookOutlined, PercentageOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { use } from 'react'
import { RadarChart } from '@/components/students/RadarChart'
import { MasteryHeatmap } from '@/components/students/MasteryHeatmap'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Mastery {
  knowledgePointId: string
  masteryScore: number
  knowledgePoint: { name: string; chapter?: string | null }
}

interface Submission {
  id: string
  totalScoreConfirmed: number | null
  status: string
  createdAt: string
  assignment?: { title: string }
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: student, isLoading } = useSWR(`/api/students/${id}`, fetcher)

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  )
  if (!student || student.error) return <div>学生不存在</div>

  const masteries: Mastery[] = student.masteries ?? []
  const submissions: Submission[] = student.submissions ?? []

  const radarData = masteries.slice(0, 7).map((m) => ({
    subject: m.knowledgePoint.name.slice(0, 6),
    score: Math.round(m.masteryScore),
    fullMark: 100,
  }))

  const weakPoints = masteries.filter((m) => m.masteryScore < 60)

  const avgScore = masteries.length
    ? Math.round(masteries.reduce((s, m) => s + m.masteryScore, 0) / masteries.length)
    : 0

  const correctRate = submissions.length
    ? Math.round(submissions.filter((s) => (s.totalScoreConfirmed ?? 0) >= 60).length / submissions.length * 100)
    : 0

  const PROFILE_STATS = [
    { label: '综合得分', value: avgScore, suffix: '分', icon: <TrophyOutlined />, color: '#1677ff' },
    { label: '本周作业', value: submissions.length, suffix: '次', icon: <BookOutlined />, color: '#722ed1' },
    { label: '正确率', value: correctRate, suffix: '%', icon: <PercentageOutlined />, color: '#52c41a' },
  ]

  return (
    <div>
      {/* Profile Header */}
      <Card
        style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f4ff 100%)', border: '1px solid #bae0ff' }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar size={56} style={{ background: '#1677ff', fontSize: 24, flexShrink: 0 }}>
            {student.name?.[0] ?? '?'}
          </Avatar>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{student.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              学号：{student.studentNo} &nbsp;·&nbsp;
              班级：{student.class?.name ?? '—'} &nbsp;·&nbsp;
              年级：{student.grade ?? '—'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {PROFILE_STATS.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                  {s.value}<span style={{ fontSize: 14 }}>{s.suffix}</span>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 3-Column Layout */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        {/* Left: Weak Points */}
        <Col span={6}>
          <Card
            title={<span style={{ fontSize: 13 }}>薄弱知识点 <Tag color="red" style={{ fontSize: 11 }}>{weakPoints.length}</Tag></span>}
            style={{ height: 380 }}
            styles={{ body: { padding: '8px 12px', height: 320, overflowY: 'auto' } }}
          >
            {weakPoints.length === 0 ? (
              <Empty description="暂无薄弱点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              weakPoints.map((m) => (
                <div key={m.knowledgePointId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px solid #f5f5f5',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{m.knowledgePoint.name}</div>
                    {m.knowledgePoint.chapter && (
                      <div style={{ fontSize: 11, color: '#999' }}>{m.knowledgePoint.chapter}</div>
                    )}
                  </div>
                  <Tag color="red" style={{ fontSize: 11, margin: 0 }}>{Math.round(m.masteryScore)}分</Tag>
                </div>
              ))
            )}
          </Card>
        </Col>

        {/* Center: Heatmap */}
        <Col span={12}>
          <Card title="知识点掌握热力图" style={{ height: 380 }} styles={{ body: { padding: 8, height: 320, overflowY: 'auto' } }}>
            {masteries.length > 0 ? (
              <MasteryHeatmap masteries={masteries} />
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* Right: Radar + Suggestions */}
        <Col span={6}>
          <Card title="能力雷达图" style={{ marginBottom: 8, height: 224 }} styles={{ body: { padding: 8 } }}>
            {radarData.length > 0 ? (
              <RadarChart data={radarData} />
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
          <Card
            title={<span><BulbOutlined style={{ color: '#faad14', marginRight: 6 }} />教师建议</span>}
            style={{ height: 148 }}
            styles={{ body: { padding: '10px 12px', fontSize: 12, color: '#555', lineHeight: 1.8 } }}
          >
            {weakPoints.length > 0
              ? `建议重点复习：${weakPoints.slice(0, 2).map((m) => m.knowledgePoint.name).join('、')}等知识点，增加针对性练习。`
              : '该学生各项知识点掌握良好，请继续保持！'}
          </Card>
        </Col>
      </Row>

      {/* Bottom: Assignment History */}
      <Card title="作业历史" styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={submissions}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 5, size: 'small' }}
          columns={[
            { title: '作业名称', dataIndex: ['assignment', 'title'], ellipsis: true },
            { title: '得分', dataIndex: 'totalScoreConfirmed', width: 80,
              render: (v: number | null) => v !== null
                ? <span style={{ fontWeight: 600, color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</span>
                : <span style={{ color: '#ccc' }}>待确认</span> },
            { title: '状态', dataIndex: 'status', width: 90,
              render: (v: string) => <Tag style={{ fontSize: 11 }}>{v === 'confirmed' ? '已确认' : v === 'pending_confirm' ? '待确认' : v}</Tag> },
            { title: '提交时间', dataIndex: 'createdAt', width: 110,
              render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
          ]}
        />
      </Card>
    </div>
  )
}
