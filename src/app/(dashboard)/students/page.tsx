'use client'
import { Table, Tag, Button, Input, Tabs, Card, Progress, Avatar, Row, Col, Modal, Form, Select } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import useSWR from 'swr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const RISK_COLOR_MAP: Record<string, string> = { high: '#ff4d4f', warning: '#faad14', normal: '#52c41a' }
const RISK_LABEL_MAP: Record<string, string> = { high: '高风险', warning: '关注', normal: '正常' }

const STAT_CARDS = [
  { key: 'total', label: '总学生数', color: '#1677ff', bg: '#e6f4ff', border: '#1677ff' },
  { key: 'high', label: '高风险', color: '#ff4d4f', bg: '#fff1f0', border: '#ff4d4f' },
  { key: 'warning', label: '关注', color: '#faad14', bg: '#fffbe6', border: '#faad14' },
  { key: 'normal', label: '正常', color: '#52c41a', bg: '#f6ffed', border: '#52c41a' },
]

const SUMMARY_CARD_STYLE = {
  borderRadius: 10,
  minHeight: 128,
  height: '100%',
} as const

const SUMMARY_CARD_BODY_STYLE = {
  padding: '18px 20px',
  height: '100%',
} as const

export default function StudentsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [form] = Form.useForm()

  const query = new URLSearchParams({ page: String(page), limit: '20' })
  if (activeTab !== 'all') query.set('riskLevel', activeTab)
  const { data, isLoading, mutate } = useSWR(`/api/students?${query}`, fetcher)

  async function handleAddStudent() {
    try {
      const values = await form.validateFields()
      const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      if (res.ok) {
        form.resetFields()
        setAddModalOpen(false)
        mutate()
      }
    } catch {}
  }
  const students = data?.students ?? []

  const filtered = search
    ? students.filter((s: { name: string; studentNo: string }) =>
        s.name.includes(search) || (s.studentNo ?? '').includes(search))
    : students

  const counts = {
    total: data?.total ?? 0,
    high: students.filter((s: { riskLevel: string }) => s.riskLevel === 'high').length,
    warning: students.filter((s: { riskLevel: string }) => s.riskLevel === 'warning').length,
    normal: students.filter((s: { riskLevel: string }) => s.riskLevel === 'normal').length,
  }

  const pieData = [
    { name: '高风险', value: counts.high, fill: '#ff4d4f' },
    { name: '关注', value: counts.warning, fill: '#faad14' },
    { name: '正常', value: counts.normal, fill: '#52c41a' },
  ]

  const columns = [
    {
      title: '学生',
      key: 'student',
      width: 150,
      render: (_: unknown, r: { id: string; name: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={32} style={{ background: '#1677ff', fontSize: 14, flexShrink: 0 }}>
            {r.name?.[0] ?? '?'}
          </Avatar>
          <Button type="link" style={{ padding: 0, fontWeight: 500, fontSize: 13 }}
            onClick={() => router.push(`/students/${r.id}`)}>
            {r.name}
          </Button>
        </div>
      ),
    },
    { title: '学号', dataIndex: 'studentNo', key: 'studentNo', width: 110 },
    { title: '班级', dataIndex: ['class', 'name'], key: 'class', width: 80 },
    { title: '年级', dataIndex: 'grade', key: 'grade', width: 70 },
    {
      title: '最近得分',
      dataIndex: 'lastScore',
      key: 'lastScore',
      width: 90,
      render: (v: number | null) =>
        v !== null ? (
          <span style={{ fontWeight: 600, color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</span>
        ) : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '综合掌握度',
      dataIndex: 'avgMastery',
      key: 'avgMastery',
      width: 140,
      render: (v: number | null) =>
        v !== null ? (
          <Progress percent={Math.round(v)} size="small"
            strokeColor={v < 60 ? '#ff4d4f' : v < 75 ? '#faad14' : '#52c41a'}
            showInfo={false} />
        ) : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 90,
      render: (v: string) => (
        <Tag color={RISK_COLOR_MAP[v]} style={{ borderRadius: 10, fontSize: 11, padding: '0 8px' }}>
          {RISK_LABEL_MAP[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: unknown, r: { id: string }) => (
        <Button size="small" type="link" onClick={() => router.push(`/students/${r.id}`)}>
          查看详情
        </Button>
      ),
    },
  ]

  const tabItems = [
    { key: 'all', label: `全部（${counts.total}）` },
    { key: 'high', label: `高风险（${counts.high}）` },
    { key: 'warning', label: `关注（${counts.warning}）` },
    { key: 'normal', label: `正常（${counts.normal}）` },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>学生管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>新增学生</Button>
      </div>

      <Modal title="新增学生" open={addModalOpen} onOk={handleAddStudent} onCancel={() => { setAddModalOpen(false); form.resetFields() }} okText="确认" cancelText="取消">
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入学生姓名" />
          </Form.Item>
          <Form.Item name="studentNo" label="学号">
            <Input placeholder="请输入学号（选填）" />
          </Form.Item>
          <Form.Item label="班级" required>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="stage" rules={[{ required: true, message: '请选择阶段' }]} style={{ flex: 1, marginBottom: 0 }}>
                <Select placeholder="学校阶段" options={[{ label: '小学', value: '小学' }, { label: '初中', value: '初中' }, { label: '高中', value: '高中' }]} />
              </Form.Item>
              <Form.Item name="classNo" rules={[{ required: true, message: '请输入班级' }]} style={{ flex: 1, marginBottom: 0 }}>
                <Input placeholder="几班（如：1）" suffix="班" />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
            <Select placeholder="请选择" options={[{ label: '男', value: '男' }, { label: '女', value: '女' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Stat Cards + Donut */}
      <Row gutter={[10, 10]} style={{ marginBottom: 16 }} align="middle">
        {STAT_CARDS.map((sc) => (
          <Col xs={24} sm={12} lg={6} xl={4} key={sc.key}>
            <Card
              styles={{ body: SUMMARY_CARD_BODY_STYLE }}
              style={{ ...SUMMARY_CARD_STYLE, borderLeft: `4px solid ${sc.border}`, background: sc.bg, cursor: 'pointer' }}
              onClick={() => setActiveTab(sc.key === 'total' ? 'all' : sc.key)}
            >
              <div style={{ fontSize: 26, fontWeight: 700, color: sc.color }}>
                {counts[sc.key as keyof typeof counts]}<span style={{ fontSize: 13 }}>人</span>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{sc.label}</div>
            </Card>
          </Col>
        ))}
        <Col xs={24} lg={12} xl={8}>
          <Card
            styles={{ body: { ...SUMMARY_CARD_BODY_STYLE, display: 'flex', alignItems: 'center', gap: 18 } }}
            style={{ ...SUMMARY_CARD_STYLE, borderLeft: '4px solid #8c8c8c', background: '#fafafa' }}
          >
            <div style={{ minWidth: 86 }}>
              <div style={{ fontSize: 12, color: '#666' }}>风险分布</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: '#262626' }}>
                {counts.total}<span style={{ fontSize: 13, color: '#595959' }}>人</span>
              </div>
            </div>
            {counts.total > 0 ? (
              <ResponsiveContainer width="100%" height={92}>
                <PieChart>
                  <Pie data={pieData} cx="32%" cy="50%" innerRadius={26} outerRadius={42} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minHeight: 92 }}>
                <div style={{ width: 84, height: 84, borderRadius: '50%', border: '14px solid #f0f0f0' }} />
                <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                  {pieData.map((item) => (
                    <span key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: item.fill, fontWeight: 600 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.fill }} />
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Tab + Search */}
      <Card styles={{ body: { padding: '0 16px' } }} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(k) => { setActiveTab(k); setPage(1) }}
            items={tabItems}
            style={{ marginBottom: 0 }}
            size="small"
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="搜索姓名或学号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200, borderRadius: 16 }}
            size="small"
          />
        </div>
      </Card>

      {/* Table */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{
            total: data?.total, pageSize: 20, current: page,
            onChange: setPage, showSizeChanger: false, size: 'small',
          }}
        />
      </Card>
    </div>
  )
}
