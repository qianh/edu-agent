'use client'
import { Card, Table, Tag, Button, Input, Select, Space, Row, Col, Statistic } from 'antd'
import { SearchOutlined, BookOutlined, PlusOutlined } from '@ant-design/icons'
import { useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

type KnowledgePoint = {
  id: string
  chapter: string | null
  name: string
  subject: string
  difficulty: string
  grade: string
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: 'success' },
  medium: { label: '中等', color: 'warning' },
  hard: { label: '困难', color: 'error' },
}

const columns = [
  { title: '章节', dataIndex: 'chapter', key: 'chapter', width: 100, render: (v: string | null) => v ?? '—' },
  { title: '知识点', dataIndex: 'name', key: 'name' },
  { title: '科目', dataIndex: 'subject', key: 'subject', width: 80 },
  {
    title: '难度',
    dataIndex: 'difficulty',
    key: 'difficulty',
    width: 80,
    render: (v: string) => <Tag color={DIFFICULTY_MAP[v]?.color}>{DIFFICULTY_MAP[v]?.label ?? v}</Tag>,
  },
]

export default function KnowledgePointsPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useSWR('/api/knowledge/points', fetcher)
  const points: KnowledgePoint[] = data?.knowledgePoints ?? []

  const filtered = points.filter((p) =>
    p.name.includes(search) || (p.chapter ?? '').includes(search)
  )

  const chapters = [...new Set(points.map((p) => p.chapter).filter(Boolean))].length

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card>
            <Statistic title="知识点总数" value={points.length}
              prefix={<BookOutlined style={{ color: '#1677ff' }} />} suffix="个" />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic title="关联章节" value={chapters}
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
              onChange={(e) => setSearch(e.target.value)}
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
          loading={isLoading}
          locale={{ emptyText: '暂无知识点，点击"添加知识点"开始录入' }}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        />
      </Card>
    </div>
  )
}
