'use client'
import { Card, Table, Tag, Button, Input, Select, Space, Progress, Row, Col, Statistic } from 'antd'
import { SearchOutlined, BookOutlined, PlusOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useState } from 'react'

const MOCK_POINTS = [
  { id: '1', chapter: '第一章', name: '一元一次方程', subject: '数学', difficulty: 'easy', masteryRate: 85, studentCount: 32, status: 'active' },
  { id: '2', chapter: '第一章', name: '一元一次不等式', subject: '数学', difficulty: 'medium', masteryRate: 72, studentCount: 32, status: 'active' },
  { id: '3', chapter: '第二章', name: '二元一次方程组', subject: '数学', difficulty: 'medium', masteryRate: 68, studentCount: 32, status: 'active' },
  { id: '4', chapter: '第二章', name: '因式分解', subject: '数学', difficulty: 'hard', masteryRate: 54, studentCount: 32, status: 'active' },
  { id: '5', chapter: '第三章', name: '勾股定理', subject: '数学', difficulty: 'easy', masteryRate: 91, studentCount: 32, status: 'active' },
  { id: '6', chapter: '第三章', name: '相似三角形', subject: '数学', difficulty: 'hard', masteryRate: 48, studentCount: 32, status: 'active' },
  { id: '7', chapter: '第四章', name: '圆的基本概念', subject: '数学', difficulty: 'medium', masteryRate: 76, studentCount: 32, status: 'active' },
]

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: 'success' },
  medium: { label: '中等', color: 'warning' },
  hard: { label: '困难', color: 'error' },
}

const columns = [
  { title: '章节', dataIndex: 'chapter', key: 'chapter', width: 100 },
  { title: '知识点', dataIndex: 'name', key: 'name' },
  { title: '科目', dataIndex: 'subject', key: 'subject', width: 80 },
  {
    title: '难度',
    dataIndex: 'difficulty',
    key: 'difficulty',
    width: 80,
    render: (v: string) => <Tag color={DIFFICULTY_MAP[v]?.color}>{DIFFICULTY_MAP[v]?.label}</Tag>,
  },
  {
    title: '班级掌握率',
    dataIndex: 'masteryRate',
    key: 'masteryRate',
    width: 200,
    render: (v: number) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Progress percent={v} size="small" style={{ flex: 1, margin: 0 }}
          strokeColor={v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f'} />
        <span style={{ fontSize: 12, color: '#666', minWidth: 36 }}>{v}%</span>
      </div>
    ),
  },
  { title: '关联学生', dataIndex: 'studentCount', key: 'studentCount', width: 90,
    render: (v: number) => <span>{v}人</span> },
]

export default function KnowledgePointsPage() {
  const [search, setSearch] = useState('')
  const filtered = MOCK_POINTS.filter(p =>
    p.name.includes(search) || p.chapter.includes(search)
  )

  const avgMastery = Math.round(MOCK_POINTS.reduce((s, p) => s + p.masteryRate, 0) / MOCK_POINTS.length)
  const weakPoints = MOCK_POINTS.filter(p => p.masteryRate < 60).length

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="知识点总数" value={MOCK_POINTS.length}
              prefix={<BookOutlined style={{ color: '#1677ff' }} />} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均掌握率" value={avgMastery}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} suffix="%" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="薄弱知识点" value={weakPoints}
              prefix={<FileTextOutlined style={{ color: '#ff4d4f' }} />} suffix="个"
              valueStyle={{ color: weakPoints > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="关联章节" value={[...new Set(MOCK_POINTS.map(p => p.chapter))].length}
              prefix={<BookOutlined style={{ color: '#722ed1' }} />} suffix="章" />
          </Card>
        </Col>
      </Row>

      <Card
        title="知识点列表"
        extra={
          <Space>
            <Input
              placeholder="搜索知识点..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200 }}
              size="small"
            />
            <Select defaultValue="all" size="small" style={{ width: 100 }}>
              <Select.Option value="all">全部难度</Select.Option>
              <Select.Option value="easy">简单</Select.Option>
              <Select.Option value="medium">中等</Select.Option>
              <Select.Option value="hard">困难</Select.Option>
            </Select>
            <Button type="primary" size="small" icon={<PlusOutlined />}>添加知识点</Button>
          </Space>
        }
      >
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showTotal: total => `共 ${total} 条` }}
        />
      </Card>
    </div>
  )
}
