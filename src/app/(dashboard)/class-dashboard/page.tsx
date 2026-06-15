'use client'
import { Card, Row, Col, Table, Tag, Avatar } from 'antd'
import {
  TrophyOutlined, RiseOutlined, CheckCircleOutlined,
  TeamOutlined, FileTextOutlined,
} from '@ant-design/icons'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const MOCK_TREND = [
  { week: '4/28', avg: 72, highest: 95, lowest: 45 },
  { week: '5/5', avg: 75, highest: 96, lowest: 48 },
  { week: '5/12', avg: 71, highest: 93, lowest: 42 },
  { week: '5/19', avg: 78, highest: 97, lowest: 55 },
  { week: '5/26', avg: 80, highest: 98, lowest: 58 },
]

const STAT_CARDS = [
  { key: 'avg', label: '班级平均分', value: '78.6', suffix: '分', icon: <TrophyOutlined />, color: '#1677ff', bg: '#e6f4ff' },
  { key: 'excellent', label: '优秀率', value: '92.4', suffix: '%', icon: <RiseOutlined />, color: '#52c41a', bg: '#f6ffed' },
  { key: 'pass', label: '合格率', value: '63.8', suffix: '%', icon: <CheckCircleOutlined />, color: '#722ed1', bg: '#f9f0ff' },
  { key: 'submit', label: '本周提交', value: '42', suffix: '份', icon: <FileTextOutlined />, color: '#fa8c16', bg: '#fff7e6' },
  { key: 'total', label: '学生总数', value: '—', suffix: '人', icon: <TeamOutlined />, color: '#13c2c2', bg: '#e6fffb' },
]

export default function ClassDashboardPage() {
  const { data: students } = useSWR('/api/students?limit=50', fetcher)
  const studentList: Array<{
    id: string
    name: string
    lastScore: number | null
    avgMastery: number | null
    riskLevel: string
  }> = students?.students ?? []

  const totalCount = students?.total ?? '—'

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>班级学情看板</div>

      {/* Stat Cards */}
      <Row gutter={10} style={{ marginBottom: 16 }}>
        {STAT_CARDS.map((sc) => (
          <Col key={sc.key} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
            <Card
              styles={{ body: { padding: '14px 16px' } }}
              style={{ borderRadius: 10, borderTop: `3px solid ${sc.color}`, background: sc.bg }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ color: sc.color, fontSize: 16 }}>{sc.icon}</span>
                <span style={{ fontSize: 11, color: '#666' }}>{sc.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: sc.color, lineHeight: 1 }}>
                {sc.key === 'total' ? String(totalCount) : sc.value}
                <span style={{ fontSize: 13, fontWeight: 400 }}>{sc.suffix}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={12}>
        {/* Left: Trend Chart */}
        <Col span={8}>
          <Card title="班级成绩趋势" style={{ height: 360 }} styles={{ body: { padding: '8px 4px' } }}>
            <ResponsiveContainer width="100%" height={290}>
              <LineChart data={MOCK_TREND} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} width={30} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="avg" stroke="#1677ff" strokeWidth={2} dot={{ r: 3 }} name="平均分" />
                <Line type="monotone" dataKey="highest" stroke="#52c41a" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="最高分" />
                <Line type="monotone" dataKey="lowest" stroke="#ff4d4f" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="最低分" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Middle: Student Score Table */}
        <Col span={10}>
          <Card
            title={`学生成绩明细（${studentList.length} 人）`}
            style={{ height: 360 }}
            styles={{ body: { padding: 0, height: 308, overflowY: 'auto' } }}
          >
            <Table
              dataSource={studentList}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: '学生', key: 'name', width: 100,
                  render: (_: unknown, r: { name: string }) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar size={22} style={{ background: '#1677ff', fontSize: 11, flexShrink: 0 }}>{r.name?.[0]}</Avatar>
                      <span style={{ fontSize: 12 }}>{r.name}</span>
                    </div>
                  ),
                },
                {
                  title: '最近得分', dataIndex: 'lastScore', width: 80,
                  render: (v: number | null) => v !== null
                    ? <span style={{ fontWeight: 600, color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</span>
                    : <span style={{ color: '#ccc' }}>—</span>,
                },
                {
                  title: '掌握度', dataIndex: 'avgMastery', width: 70,
                  render: (v: number | null) => v !== null
                    ? <span style={{ fontSize: 12 }}>{Math.round(v)}%</span>
                    : <span style={{ color: '#ccc' }}>—</span>,
                },
                {
                  title: '风险', dataIndex: 'riskLevel', width: 65,
                  render: (v: string) => (
                    <Tag color={v === 'high' ? 'red' : v === 'warning' ? 'orange' : 'green'} style={{ fontSize: 10, padding: '0 4px' }}>
                      {v === 'high' ? '高风险' : v === 'warning' ? '关注' : '正常'}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Right: Rankings */}
        <Col span={6}>
          <Card title="🏆 成绩排名 Top 5" style={{ marginBottom: 10, height: 172 }} styles={{ body: { padding: '8px 12px' } }}>
            {studentList
              .filter((s) => s.lastScore !== null)
              .sort((a, b) => (b.lastScore ?? 0) - (a.lastScore ?? 0))
              .slice(0, 5)
              .map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: i < 3 ? '#faad14' : '#aaa', fontWeight: 700, width: 18 }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <span style={{ fontWeight: 600, color: '#1677ff' }}>{s.lastScore}</span>
                </div>
              ))}
            {studentList.filter((s) => s.lastScore !== null).length === 0 && (
              <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', paddingTop: 16 }}>暂无数据</div>
            )}
          </Card>

          <Card title="⚠️ 需关注学生" style={{ height: 178 }} styles={{ body: { padding: '8px 12px' } }}>
            {studentList
              .filter((s) => s.riskLevel === 'high' || s.riskLevel === 'warning')
              .slice(0, 5)
              .map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span>{s.name}</span>
                  <Tag color={s.riskLevel === 'high' ? 'red' : 'orange'} style={{ fontSize: 10, padding: '0 4px' }}>
                    {s.riskLevel === 'high' ? '高风险' : '关注'}
                  </Tag>
                </div>
              ))}
            {studentList.filter((s) => s.riskLevel !== 'normal').length === 0 && (
              <div style={{ color: '#52c41a', fontSize: 12, textAlign: 'center', paddingTop: 16 }}>全班学生状态良好 ✓</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
