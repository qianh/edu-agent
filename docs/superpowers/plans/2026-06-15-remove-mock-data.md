# Remove Mock Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded mock data in dashboard pages with real API/DB data across 5 frontend pages and 3 new API routes.

**Architecture:** Create 3 new GET API routes that query Prisma directly, then update each frontend page to use `useSWR` to fetch from those routes. Remove columns/stats that have no real data source (masteryRate, studentCount). Empty-state fallback everywhere.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, SWR, TypeScript, Ant Design 5

---

## File Map

**Create:**
- `src/app/api/teacher/route.ts` — GET /api/teacher → prisma.teacher.findFirst()
- `src/app/api/class-dashboard/route.ts` — GET /api/class-dashboard/trend → weekly score analytics
- `src/app/api/stats/monthly/route.ts` — GET /api/stats/monthly → submission + assignment counts

**Modify:**
- `src/app/(dashboard)/knowledge/points/page.tsx` — remove MOCK_POINTS, use /api/knowledge/points; remove masteryRate/studentCount columns
- `src/app/(dashboard)/class-dashboard/page.tsx` — remove MOCK_TREND + hardcoded STAT_CARDS values
- `src/app/(dashboard)/settings/page.tsx` — remove 王老师 + hardcoded stats
- `src/app/(dashboard)/layout.tsx` — remove 王老师 from drawer message + avatar
- `src/app/(dashboard)/page.tsx` — remove INIT_MESSAGES hardcoded content

---

### Task 1: Create GET /api/teacher

**Files:**
- Create: `src/app/api/teacher/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { prisma } from '@/lib/db'

export async function GET() {
  const teacher = await prisma.teacher.findFirst({
    select: { id: true, name: true, subject: true, email: true },
  })
  return Response.json(teacher)
}
```

- [ ] **Step 2: Verify the endpoint returns JSON (dev server must be running)**

```bash
curl -s http://localhost:3000/api/teacher | head -c 200
```

Expected: `{"id":"...","name":"...","subject":"...","email":"..."}` or `null` if Teacher table is empty.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/teacher/route.ts
git commit -m "feat: add GET /api/teacher endpoint"
```

---

### Task 2: Create GET /api/class-dashboard/trend

**Files:**
- Create: `src/app/api/class-dashboard/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { prisma } from '@/lib/db'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export async function GET() {
  const submissions = await prisma.submission.findMany({
    where: { totalScoreConfirmed: { not: null } },
    select: { totalScoreConfirmed: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  if (submissions.length === 0) {
    return Response.json({ trend: [], stats: null })
  }

  const weekMap = new Map<string, number[]>()
  for (const s of submissions) {
    const key = getWeekStart(new Date(s.createdAt))
    if (!weekMap.has(key)) weekMap.set(key, [])
    weekMap.get(key)!.push(s.totalScoreConfirmed!)
  }

  const trend = Array.from(weekMap.entries()).map(([week, scores]) => ({
    week,
    avg: Math.round(scores.reduce((a, v) => a + v, 0) / scores.length),
    highest: Math.round(Math.max(...scores)),
    lowest: Math.round(Math.min(...scores)),
  }))

  const allScores = submissions.map((s) => s.totalScoreConfirmed!)
  const total = allScores.length
  const avg = Math.round(allScores.reduce((a, v) => a + v, 0) / total)
  const excellentRate = Math.round((allScores.filter((v) => v >= 80).length / total) * 1000) / 10
  const passRate = Math.round((allScores.filter((v) => v >= 60).length / total) * 1000) / 10

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklySubmit = submissions.filter((s) => new Date(s.createdAt) >= weekAgo).length

  return Response.json({ trend, stats: { avg, excellentRate, passRate, weeklySubmit } })
}
```

- [ ] **Step 2: Verify the endpoint**

```bash
curl -s http://localhost:3000/api/class-dashboard/trend | head -c 300
```

Expected: `{"trend":[],"stats":null}` (empty DB) or `{"trend":[...],"stats":{"avg":...}}`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/class-dashboard/route.ts
git commit -m "feat: add GET /api/class-dashboard/trend with weekly score analytics"
```

---

### Task 3: Create GET /api/stats/monthly

**Files:**
- Create: `src/app/api/stats/monthly/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { prisma } from '@/lib/db'

export async function GET() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [submissions, assignments] = await Promise.all([
    prisma.submission.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.assignment.count({ where: { createdAt: { gte: monthStart } } }),
  ])

  return Response.json({ submissions, assignments })
}
```

- [ ] **Step 2: Verify the endpoint**

```bash
curl -s http://localhost:3000/api/stats/monthly
```

Expected: `{"submissions":0,"assignments":0}` (or real counts).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stats/monthly/route.ts
git commit -m "feat: add GET /api/stats/monthly for monthly submission and assignment counts"
```

---

### Task 4: Update knowledge/points/page.tsx

Remove `MOCK_POINTS`. Use `/api/knowledge/points`. Remove the `masteryRate` and `studentCount` columns (no real data source). Keep: 章节, 知识点, 科目, 难度.

**Files:**
- Modify: `src/app/(dashboard)/knowledge/points/page.tsx`

- [ ] **Step 1: Rewrite the file**

```typescript
'use client'
import { Card, Table, Tag, Button, Input, Select, Space, Row, Col, Statistic } from 'antd'
import { SearchOutlined, BookOutlined, PlusOutlined } from '@ant-design/icons'
import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hong/John/ai/edu-agent && pnpm tsc --noEmit 2>&1 | grep "knowledge"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/knowledge/points/page.tsx
git commit -m "feat: knowledge/points page — replace MOCK_POINTS with real /api/knowledge/points"
```

---

### Task 5: Update class-dashboard/page.tsx

Remove `MOCK_TREND` and hardcoded `STAT_CARDS` values. Fetch from `/api/class-dashboard/trend`.

**Files:**
- Modify: `src/app/(dashboard)/class-dashboard/page.tsx`

- [ ] **Step 1: Rewrite the file**

```typescript
'use client'
import { Card, Row, Col, Table, Tag, Avatar, Skeleton } from 'antd'
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

const STAT_CARD_META = [
  { key: 'avg', label: '班级平均分', suffix: '分', icon: <TrophyOutlined />, color: '#1677ff', bg: '#e6f4ff' },
  { key: 'excellentRate', label: '优秀率', suffix: '%', icon: <RiseOutlined />, color: '#52c41a', bg: '#f6ffed' },
  { key: 'passRate', label: '合格率', suffix: '%', icon: <CheckCircleOutlined />, color: '#722ed1', bg: '#f9f0ff' },
  { key: 'weeklySubmit', label: '本周提交', suffix: '份', icon: <FileTextOutlined />, color: '#fa8c16', bg: '#fff7e6' },
  { key: 'total', label: '学生总数', suffix: '人', icon: <TeamOutlined />, color: '#13c2c2', bg: '#e6fffb' },
]

export default function ClassDashboardPage() {
  const { data: trendData, isLoading: trendLoading } = useSWR('/api/class-dashboard/trend', fetcher)
  const { data: students } = useSWR('/api/students?limit=50', fetcher)

  const trend: Array<{ week: string; avg: number; highest: number; lowest: number }> = trendData?.trend ?? []
  const stats: { avg: number; excellentRate: number; passRate: number; weeklySubmit: number } | null = trendData?.stats ?? null

  const studentList: Array<{
    id: string
    name: string
    lastScore: number | null
    avgMastery: number | null
    riskLevel: string
  }> = students?.students ?? []

  const totalCount = students?.total ?? '—'

  function getStatValue(key: string): string {
    if (key === 'total') return String(totalCount)
    if (!stats) return '—'
    const v = stats[key as keyof typeof stats]
    return v !== undefined ? String(v) : '—'
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>班级学情看板</div>

      {/* Stat Cards */}
      <Row gutter={10} style={{ marginBottom: 16 }}>
        {STAT_CARD_META.map((sc) => (
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
                {getStatValue(sc.key)}
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
            {trendLoading ? (
              <Skeleton active style={{ padding: 16 }} />
            ) : trend.length === 0 ? (
              <div style={{ height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>
                暂无批改数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <LineChart data={trend} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
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
            )}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/hong/John/ai/edu-agent && pnpm tsc --noEmit 2>&1 | grep "class-dashboard"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/class-dashboard/page.tsx
git commit -m "feat: class-dashboard — replace MOCK_TREND and hardcoded stats with real API data"
```

---

### Task 6: Update settings/page.tsx

Replace "王老师" hardcoded profile with `/api/teacher`. Replace monthly stats with `/api/stats/monthly`. Storage → `—`.

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Rewrite the file**

```typescript
'use client'
import { Card, Form, Input, Select, Switch, Button, Divider, Avatar, Upload, Row, Col, message, Skeleton } from 'antd'
import { UserOutlined, UploadOutlined, BellOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Teacher = { id: string; name: string; subject: string; email: string } | null
type MonthlyStats = { submissions: number; assignments: number }

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const { data: teacher, isLoading: teacherLoading } = useSWR<Teacher>('/api/teacher', fetcher)
  const { data: monthly, isLoading: monthlyLoading } = useSWR<MonthlyStats>('/api/stats/monthly', fetcher)

  async function handleSave() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    message.success('设置已保存')
  }

  const teacherName = teacher?.name ?? ''
  const avatarChar = teacherName?.[0] ?? '—'

  return (
    <Row gutter={16}>
      <Col span={16}>
        {/* Profile */}
        <Card title={<><UserOutlined style={{ marginRight: 8 }} />个人信息</>} style={{ marginBottom: 16 }}>
          {teacherLoading ? (
            <Skeleton active avatar paragraph={{ rows: 3 }} />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <Avatar size={64} style={{ background: '#1677ff', fontSize: 24 }}>{avatarChar}</Avatar>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{teacherName || '—'}</div>
                  <div style={{ color: '#999', fontSize: 13 }}>{teacher?.subject ?? '—'} 教师</div>
                  <Upload showUploadList={false} style={{ marginTop: 6 }}>
                    <Button size="small" icon={<UploadOutlined />}>更换头像</Button>
                  </Upload>
                </div>
              </div>
              <Form layout="vertical" initialValues={{ name: teacherName, email: teacher?.email ?? '', subject: teacher?.subject ?? '' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="姓名" name="name">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="邮箱" name="email">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="任教科目" name="subject">
                      <Select>
                        <Select.Option value="数学">数学</Select.Option>
                        <Select.Option value="语文">语文</Select.Option>
                        <Select.Option value="英语">英语</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" loading={saving} onClick={handleSave}>保存个人信息</Button>
              </Form>
            </>
          )}
        </Card>

        {/* Notifications */}
        <Card title={<><BellOutlined style={{ marginRight: 8 }} />通知设置</>} style={{ marginBottom: 16 }}>
          {[
            { label: '作业批改完成通知', desc: '当 AI 完成作业批改时通知我', defaultChecked: true },
            { label: '学生异常提醒', desc: '当学生成绩大幅下滑时提醒', defaultChecked: true },
            { label: '出题建议推送', desc: '根据班级薄弱知识点推送出题建议', defaultChecked: false },
            { label: '系统维护通知', desc: '系统维护和更新通知', defaultChecked: true },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Divider style={{ margin: '12px 0' }} />}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{item.label}</div>
                  <div style={{ color: '#999', fontSize: 12 }}>{item.desc}</div>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            </div>
          ))}
        </Card>

        {/* Security */}
        <Card title={<><LockOutlined style={{ marginRight: 8 }} />安全设置</>}>
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="当前密码">
                  <Input.Password placeholder="请输入当前密码" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="新密码">
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="确认新密码">
                  <Input.Password placeholder="请再次输入新密码" />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" ghost onClick={handleSave}>修改密码</Button>
          </Form>
        </Card>
      </Col>

      {/* Right: System Info */}
      <Col span={8}>
        <Card title={<><DatabaseOutlined style={{ marginRight: 8 }} />系统信息</>} style={{ marginBottom: 16 }}>
          {monthlyLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            [
              { label: '系统版本', value: 'v1.0.0' },
              { label: 'AI 模型', value: 'Claude Sonnet 4.6' },
              { label: '存储空间', value: '—' },
              { label: '本月批改量', value: `${monthly?.submissions ?? 0} 份` },
              { label: '本月出题量', value: `${monthly?.assignments ?? 0} 题` },
            ].map((item, i) => (
              <div key={i}>
                {i > 0 && <Divider style={{ margin: '10px 0' }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666', fontSize: 13 }}>{item.label}</span>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{item.value}</span>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card title="AI 偏好设置">
          <Form layout="vertical" initialValues={{ language: 'zh', responseStyle: 'detailed', autoGrade: true }}>
            <Form.Item label="回复语言" name="language">
              <Select>
                <Select.Option value="zh">中文</Select.Option>
                <Select.Option value="en">English</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="批改详细程度" name="responseStyle">
              <Select>
                <Select.Option value="brief">简洁</Select.Option>
                <Select.Option value="detailed">详细</Select.Option>
                <Select.Option value="comprehensive">全面</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="自动开始批改" name="autoGrade" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Button type="primary" block loading={saving} onClick={handleSave}>保存 AI 设置</Button>
          </Form>
        </Card>
      </Col>
    </Row>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/hong/John/ai/edu-agent && pnpm tsc --noEmit 2>&1 | grep "settings"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx
git commit -m "feat: settings page — replace hardcoded teacher profile and stats with real API data"
```

---

### Task 7: Update layout.tsx

Fetch teacher name for drawer greeting and header avatar. Add `useSWR` call, replace "王老师" and "王" avatar.

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Apply targeted changes to layout.tsx**

Add `useSWR` import and fetch, then replace the two hardcoded spots.

At the top of the file, add the import and fetcher (after existing imports):

```typescript
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
```

Inside `DashboardLayout`, add the SWR call right after the existing `useState` declarations:

```typescript
const { data: teacher } = useSWR('/api/teacher', fetcher)
const teacherName: string = teacher?.name ?? ''
const avatarChar = teacherName?.[0] ?? '?'
```

Replace the `INIT_DRAWER_MESSAGES` constant with a computed initial message:

```typescript
// Remove the INIT_DRAWER_MESSAGES constant entirely.
// Replace the useState initializer:
const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => [
  { role: 'ai', text: `您好！有什么我可以帮您的吗？` },
])
```

Then use `useEffect` to update the greeting once `teacherName` is known (add `useEffect` to the React import):

```typescript
import { useState, useEffect } from 'react'

// Inside component, after teacherName:
useEffect(() => {
  if (teacherName) {
    setChatHistory([{ role: 'ai', text: `您好，${teacherName}！有什么我可以帮您的吗？` }])
  }
}, [teacherName])
```

Replace the hardcoded avatar character (line ~147):
```typescript
// Before:
<Avatar size={32} style={{ background: '#1677ff', cursor: 'pointer', fontSize: 14 }}>王</Avatar>
// After:
<Avatar size={32} style={{ background: '#1677ff', cursor: 'pointer', fontSize: 14 }}>{avatarChar}</Avatar>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/hong/John/ai/edu-agent && pnpm tsc --noEmit 2>&1 | grep "layout"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/layout.tsx
git commit -m "feat: layout — replace hardcoded 王老师 with real teacher name from /api/teacher"
```

---

### Task 8: Update page.tsx (home)

Replace `INIT_MESSAGES` hardcoded content with dynamic greeting using teacher name + real counts.

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Replace INIT_MESSAGES and greeting**

Remove the `INIT_MESSAGES` constant entirely (lines 40-45).

Add SWR call for teacher and risk students (add after existing SWR calls):

```typescript
const { data: teacher } = useSWR('/api/teacher', fetcher)
const { data: riskStudents } = useSWR('/api/students?riskLevel=high&limit=100', fetcher)
```

Replace the `useState` initializer for `chatHistory`:

```typescript
// Before:
const [chatHistory, setChatHistory] = useState<ChatMessage[]>(INIT_MESSAGES)
// After:
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
```

Add a `useEffect` to set the greeting once data loads (add `useEffect` to the React import):

```typescript
useEffect(() => {
  const name = teacher?.name ?? ''
  const pendingCount = chipValues.pending
  const riskCount = riskStudents?.total ?? 0
  const greeting = name ? `您好，${name}！` : '您好！'
  const detail = pendingCount > 0 || riskCount > 0
    ? `今天有${pendingCount}份作业待批改，${riskCount}名学生需要关注。`
    : '今天暂无待处理事项，一切正常。'
  setChatHistory([{ role: 'ai', text: `${greeting}${detail}` }])
}, [teacher, riskStudents, chipValues.pending])
```

Replace the greeting banner (line ~108):

```typescript
// Before:
{greeting}，王老师！ 👋
// After:
{greeting}{teacher?.name ? `，${teacher.name}` : ''}！ 👋
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/hong/John/ai/edu-agent && pnpm tsc --noEmit 2>&1 | grep "page"
```

Expected: no output (or only unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/page.tsx
git commit -m "feat: home page — replace INIT_MESSAGES and 王老师 with real teacher data and counts"
```

---

### Task 9: Full build verification (AC-007)

- [ ] **Step 1: Run typecheck**

```bash
cd /Users/hong/John/ai/edu-agent && pnpm tsc --noEmit 2>&1
```

Expected: exit 0, no errors.

- [ ] **Step 2: Run build**

```bash
cd /Users/hong/John/ai/edu-agent && pnpm build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 3: Manual AC checklist**

Open http://localhost:3000 with dev server running and verify:
- AC-001: /knowledge/points — table shows real KPs or empty state
- AC-002: /class-dashboard — trend chart shows real data or "暂无批改数据"
- AC-003: /class-dashboard — stat cards show real values or "—"
- AC-004: /settings — avatar and name show real teacher or empty
- AC-004: /layout — drawer greeting uses real teacher name
- AC-005: home page — greeting counts are real
- AC-006: /settings — 本月批改量/出题量 real; 存储空间 shows "—"

---

## Self-Review

**Spec coverage check:**
- FR-001 ✓ Task 4
- FR-002 ✓ Task 5
- FR-003 ✓ Task 5
- FR-004 ✓ Task 2
- FR-005 ✓ Task 1
- FR-006 ✓ Task 3
- FR-007 ✓ Tasks 6, 7, 8
- FR-008 ✓ Task 8
- FR-009 ✓ Task 6
- NFR-001 ✓ Tasks 1-3 (all return Response.json, no try/catch needed — Prisma errors surface as 500 naturally)
- NFR-002 ✓ Tasks 4, 5, 6 use `isLoading` with Skeleton/loading prop

**Placeholder scan:** No TBDs. All code blocks complete.

**Type consistency:** `KnowledgePoint`, `Teacher`, `MonthlyStats` types defined inline in the files that use them. API response shapes match what the routes return.
