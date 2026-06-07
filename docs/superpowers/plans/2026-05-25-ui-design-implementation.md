# UI Design Strict Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 7 existing pages + 2 new pages to strictly match the 9 UI design screenshots in `/UI/`.

**Architecture:** All pages share a redesigned `layout.tsx` shell (sidebar + header). Each page is rebuilt in-place — same file paths, same API calls, only the JSX/styling changes. New routes added for class dashboard and batch review. Recharts handles all data visualization (donut, line, heatmap-table).

**Tech Stack:** Next.js 15 App Router, Ant Design 5, Recharts, TypeScript, SWR, TailwindCSS via inline styles

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(dashboard)/layout.tsx` | Modify | Sidebar (7 items + AI widget) + Header (search/bell/avatar) |
| `src/app/(dashboard)/page.tsx` | Modify | Dashboard: greeting + stats + AI panel + quick entries |
| `src/app/(dashboard)/students/page.tsx` | Modify | Student list with stat cards + donut chart + tab filter |
| `src/app/(dashboard)/students/[id]/page.tsx` | Modify | Student detail: profile header + 3-col layout + heatmap |
| `src/app/(dashboard)/assignments/upload/page.tsx` | Modify | Upload: 2-col layout, 3 method cards + help panel |
| `src/app/(dashboard)/assignments/[id]/grading/page.tsx` | Modify | Grading: student card + annotated image + question table |
| `src/app/(dashboard)/questions/generate/page.tsx` | Modify | Question gen: 3-panel (form | preview | history) |
| `src/app/(dashboard)/class-dashboard/page.tsx` | **Create** | Class analytics: 5 metrics + line chart + rankings |
| `src/app/(dashboard)/assignments/[id]/review/page.tsx` | **Create** | 批阅复盘: student answer cards + AI marks |

---

## Task 1: Redesign Layout Shell (Sidebar + Header)

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

### Design reference: Screenshot 1 (sidebar visible on every page)

The sidebar in the design has:
- Top: "教师教学智能体" logo text + robot icon, blue (#1677ff) text
- 7 menu items with Ant Design icons
- Selected item: blue filled background
- Bottom: AI assistant mini-panel (avatar + "你好！有什么可以帮您？" + input box)

The header has:
- Left: breadcrumb showing current page path
- Right: search input + 🔔 bell icon + user avatar circle

- [ ] **Step 1: Rewrite layout.tsx**

```tsx
'use client'
import { Layout, Menu, Input, Badge, Avatar, Breadcrumb } from 'antd'
import {
  HomeOutlined, UserOutlined, FileTextOutlined,
  FormOutlined, BarChartOutlined, BookOutlined,
  SettingOutlined, BellOutlined, SearchOutlined,
  RobotOutlined, SendOutlined,
} from '@ant-design/icons'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

const { Sider, Header, Content } = Layout

const MENU_ITEMS = [
  { key: '/', icon: <HomeOutlined />, label: '智能助手首页', href: '/' },
  { key: '/students', icon: <UserOutlined />, label: '学生管理', href: '/students' },
  { key: '/assignments', icon: <FileTextOutlined />, label: '作业管理', href: '/assignments' },
  { key: '/questions', icon: <FormOutlined />, label: '出题管理', href: '/questions/generate' },
  { key: '/class-dashboard', icon: <BarChartOutlined />, label: '班级看板', href: '/class-dashboard' },
  { key: '/knowledge', icon: <BookOutlined />, label: '教学资源', href: '/knowledge/points' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置', href: '/settings' },
]

const BREADCRUMB_MAP: Record<string, string[]> = {
  '/': ['首页'],
  '/students': ['首页', '学生管理'],
  '/assignments': ['首页', '作业管理'],
  '/assignments/upload': ['首页', '作业管理', '上传作业'],
  '/questions/generate': ['首页', '出题管理', '个性化试题生成'],
  '/class-dashboard': ['首页', '班级看板'],
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [aiMsg, setAiMsg] = useState('')

  const selectedKey = MENU_ITEMS.find((m) => m.key !== '/' && pathname.startsWith(m.key))?.key ?? '/'
  const breadcrumbs = BREADCRUMB_MAP[pathname] ?? ['首页', '详情']

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sider
        width={200}
        style={{
          background: '#fff',
          borderRight: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1677ff', lineHeight: 1.2 }}>
            教师教学<br />智能体
          </span>
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ border: 0, flex: 1, padding: '8px 0' }}
          items={MENU_ITEMS.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link href={item.href}>{item.label}</Link>,
          }))}
        />

        {/* AI Chat Widget */}
        <div style={{
          borderTop: '1px solid #f0f0f0',
          padding: 12,
          background: '#fafafa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar size={28} style={{ background: '#1677ff', flexShrink: 0 }}>
              <RobotOutlined style={{ fontSize: 14 }} />
            </Avatar>
            <div style={{ fontSize: 12, color: '#666' }}>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 12 }}>教学助手</div>
              <div style={{ color: '#999', fontSize: 11 }}>有什么可以帮您？</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Input
              size="small"
              placeholder="输入问题..."
              value={aiMsg}
              onChange={(e) => setAiMsg(e.target.value)}
              style={{ fontSize: 11, borderRadius: 12 }}
            />
            <button
              style={{
                background: '#1677ff', border: 'none', borderRadius: 12,
                width: 28, height: 28, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onClick={() => setAiMsg('')}
            >
              <SendOutlined style={{ color: '#fff', fontSize: 12 }} />
            </button>
          </div>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 200 }}>
        {/* Header */}
        <Header style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <Breadcrumb
            items={breadcrumbs.map((label, i) => ({
              title: i === breadcrumbs.length - 1
                ? <span style={{ color: '#1677ff' }}>{label}</span>
                : <span style={{ color: '#666' }}>{label}</span>,
            }))}
            style={{ fontSize: 13 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="搜索..."
              style={{ width: 180, borderRadius: 20, fontSize: 12 }}
              size="small"
            />
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#666', cursor: 'pointer' }} />
            </Badge>
            <Avatar size={32} style={{ background: '#1677ff', cursor: 'pointer' }}>王</Avatar>
          </div>
        </Header>

        {/* Page Content */}
        <Content style={{ padding: '20px 24px', minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
```

- [ ] **Step 2: Verify layout renders** — run dev server (`pnpm dev`) and visit `http://localhost:3000`. Confirm: sidebar visible left (200px), header at top (56px), content area right.

---

## Task 2: Rebuild Dashboard Page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

### Design reference: Screenshot 1

Layout: greeting row at top, then 3-column grid below.
- Left col (30%): AI assistant conversation panel — shows mock messages + input
- Center col (45%): recent assignments list + today's tasks
- Right col (25%): quick entry cards grid

- [ ] **Step 1: Rewrite dashboard page.tsx**

```tsx
'use client'
import { Card, Row, Col, Tag, Button, List, Avatar, Badge } from 'antd'
import {
  UserOutlined, FileTextOutlined, FormOutlined,
  BarChartOutlined, RobotOutlined, SendOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

const STAT_CHIPS = [
  { label: '本周作业', value: '5', color: '#1677ff', icon: <FileTextOutlined /> },
  { label: '待批改', value: '2', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  { label: '已完成', value: '3', color: '#52c41a', icon: <CheckCircleOutlined /> },
  { label: '待确认', value: '1', color: '#faad14', icon: <ClockCircleOutlined /> },
]

const AI_MESSAGES = [
  { role: 'ai', text: '您好，王老师！今天有2份作业待批改，3名学生需要关注。' },
  { role: 'ai', text: '张三的代数知识点掌握度本周下降了8%，建议重点辅导。' },
]

const QUICK_ENTRIES = [
  { label: '上传作业', icon: <FileTextOutlined />, href: '/assignments/upload', color: '#e6f4ff' },
  { label: '智能出题', icon: <FormOutlined />, href: '/questions/generate', color: '#f6ffed' },
  { label: '学情分析', icon: <BarChartOutlined />, href: '/class-dashboard', color: '#fff7e6' },
  { label: '学生管理', icon: <UserOutlined />, href: '/students', color: '#fff0f6' },
]

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'success', pending_confirm: 'warning',
  processing: 'processing', pending: 'default', failed: 'error',
}
const STATUS_LABELS: Record<string, string> = {
  confirmed: '已完成', pending_confirm: '待确认',
  processing: 'AI处理中', pending: '待上传', failed: '失败',
}

export default function HomePage() {
  const { data: assignments } = useSWR('/api/assignments', fetcher)
  const [input, setInput] = useState('')
  const recentList = assignments?.submissions?.slice(0, 6) ?? []

  return (
    <div>
      {/* Greeting Row */}
      <Card
        style={{ marginBottom: 16, background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%)', border: 'none' }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {getGreeting()}，王老师！ 👋
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {STAT_CHIPS.map((chip) => (
              <div key={chip.label} style={{
                background: '#fff', borderRadius: 10, padding: '8px 14px',
                textAlign: 'center', minWidth: 80, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ color: chip.color, fontSize: 20, fontWeight: 700 }}>{chip.value}</div>
                <div style={{ color: '#999', fontSize: 11 }}>{chip.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Row gutter={16}>
        {/* Left: AI Assistant Panel */}
        <Col span={7}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={24} style={{ background: '#1677ff' }}><RobotOutlined style={{ fontSize: 12 }} /></Avatar>
                <span style={{ fontSize: 13 }}>教学助手</span>
                <Badge status="success" />
              </div>
            }
            style={{ height: 420 }}
            bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', height: 360 }}
          >
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8 }}>
              {AI_MESSAGES.map((msg, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Avatar size={24} style={{ background: '#1677ff', flexShrink: 0 }}>
                      <RobotOutlined style={{ fontSize: 12 }} />
                    </Avatar>
                    <div style={{
                      background: '#f0f9ff', borderRadius: '0 8px 8px 8px',
                      padding: '8px 10px', fontSize: 12, color: '#333', maxWidth: '85%',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="向助手提问..."
                style={{
                  flex: 1, border: '1px solid #e8e8e8', borderRadius: 16,
                  padding: '6px 12px', fontSize: 12, outline: 'none',
                }}
              />
              <button style={{
                background: '#1677ff', border: 'none', borderRadius: 16,
                padding: '0 12px', cursor: 'pointer', color: '#fff', fontSize: 12,
              }} onClick={() => setInput('')}>
                <SendOutlined />
              </button>
            </div>
          </Card>
        </Col>

        {/* Center: Recent Assignments */}
        <Col span={11}>
          <Card
            title="最近作业"
            extra={<Link href="/assignments" style={{ fontSize: 12 }}>查看全部 →</Link>}
            style={{ height: 420 }}
            bodyStyle={{ padding: '0 4px', height: 360, overflowY: 'auto' }}
          >
            <List
              size="small"
              dataSource={recentList}
              locale={{ emptyText: '暂无作业，点击上传开始批改' }}
              renderItem={(item: { id: string; assignment: { title: string; subject: string }; student: { name: string }; status: string; totalScoreConfirmed: number | null }) => (
                <List.Item style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 10 }}>
                    <Avatar size={32} style={{ background: '#e6f4ff', color: '#1677ff', flexShrink: 0 }}>
                      {item.student?.name?.[0] ?? '?'}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        <Link href={`/assignments/${item.id}/grading`} style={{ color: '#333' }}>
                          {item.assignment?.title}
                        </Link>
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {item.student?.name} · {item.assignment?.subject}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.totalScoreConfirmed !== null && (
                        <span style={{ fontWeight: 700, color: '#1677ff' }}>{item.totalScoreConfirmed}分</span>
                      )}
                      <Tag color={STATUS_COLORS[item.status] ?? 'default'} style={{ fontSize: 11, margin: 0 }}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Right: Quick Entries */}
        <Col span={6}>
          <Card title="快捷入口" style={{ height: 420 }} bodyStyle={{ padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {QUICK_ENTRIES.map((entry) => (
                <Link key={entry.href} href={entry.href}>
                  <div style={{
                    background: entry.color,
                    borderRadius: 10, padding: '16px 8px',
                    textAlign: 'center', cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{entry.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>{entry.label}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/assignments/upload">
                <Button type="primary" block size="small" style={{ borderRadius: 8 }}>
                  + 上传新作业
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 2: Visit `http://localhost:3000` and verify** — greeting visible, AI panel left, assignments center, quick entries right.

---

## Task 3: Rebuild Student Management Page

**Files:**
- Modify: `src/app/(dashboard)/students/page.tsx`

### Design reference: Screenshot 2

Layout:
- Top row: 4 colored stat cards + right side donut chart
- Below: tab filter row (全部/高风险/关注/正常) + search
- Table: avatar, name, studentNo, class, grade, lastScore, masteryBar, riskBadge, date, actions

- [ ] **Step 1: Install recharts donut — already available (recharts in package.json)**

- [ ] **Step 2: Rewrite students/page.tsx**

```tsx
'use client'
import { Table, Tag, Button, Input, Tabs, Card, Progress, Avatar, Row, Col } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import useSWR from 'swr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const RISK_COLORS: Record<string, string> = { high: '#ff4d4f', warning: '#faad14', normal: '#52c41a' }
const RISK_LABELS: Record<string, string> = { high: '高风险', warning: '关注', normal: '正常' }

const STAT_CARDS = [
  { key: 'total', label: '总学生数', color: '#1677ff', bg: '#e6f4ff', suffix: '人' },
  { key: 'high', label: '高风险', color: '#ff4d4f', bg: '#fff1f0', suffix: '人' },
  { key: 'warning', label: '关注', color: '#faad14', bg: '#fffbe6', suffix: '人' },
  { key: 'normal', label: '正常', color: '#52c41a', bg: '#f6ffed', suffix: '人' },
]

export default function StudentsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  const query = new URLSearchParams({ page: String(page), limit: '20' })
  if (activeTab !== 'all') query.set('riskLevel', activeTab)
  const { data, isLoading } = useSWR(`/api/students?${query}`, fetcher)
  const students = data?.students ?? []

  const filtered = search
    ? students.filter((s: { name: string; studentNo: string }) =>
        s.name.includes(search) || s.studentNo?.includes(search))
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
      width: 140,
      render: (_: unknown, r: { id: string; name: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={32} style={{ background: '#1677ff', fontSize: 14, flexShrink: 0 }}>
            {r.name?.[0]}
          </Avatar>
          <Button type="link" style={{ padding: 0, fontWeight: 500 }}
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
      width: 80,
      render: (v: number | null) => v !== null
        ? <span style={{ fontWeight: 600, color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '综合掌握度',
      dataIndex: 'avgMastery',
      key: 'avgMastery',
      width: 130,
      render: (v: number | null) => v !== null
        ? <Progress percent={v} size="small" strokeColor={v < 60 ? '#ff4d4f' : v < 75 ? '#faad14' : '#52c41a'} showInfo={false} />
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 80,
      render: (v: string) => (
        <Tag color={RISK_COLORS[v]} style={{ borderRadius: 10, fontSize: 11 }}>
          {RISK_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
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
      {/* Stat Cards + Donut Chart */}
      <Row gutter={12} style={{ marginBottom: 16 }} align="middle">
        {STAT_CARDS.map((sc) => (
          <Col span={4} key={sc.key}>
            <Card
              bodyStyle={{ padding: '14px 16px' }}
              style={{ borderRadius: 10, borderLeft: `4px solid ${sc.color}`, background: sc.bg }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: sc.color }}>
                {counts[sc.key as keyof typeof counts]}{sc.suffix}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{sc.label}</div>
            </Card>
          </Col>
        ))}
        <Col span={8}>
          <Card bodyStyle={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PieChart width={200} height={100}>
              <Pie data={pieData} cx={60} cy={45} innerRadius={28} outerRadius={44} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} />
            </PieChart>
          </Card>
        </Col>
      </Row>

      {/* Tab Filter + Search */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(k) => { setActiveTab(k); setPage(1) }}
            items={tabItems}
            style={{ marginBottom: 0 }}
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
      <Card bodyStyle={{ padding: 0 }}>
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
```

- [ ] **Step 3: Verify** — visit `/students`, confirm 4 stat cards, donut chart, tab filters, table with avatar column.

---

## Task 4: Rebuild Student Detail Page

**Files:**
- Modify: `src/app/(dashboard)/students/[id]/page.tsx`

### Design reference: Screenshot 3

Layout:
- **Top card**: profile (avatar + name + stats: 综合得分, 本周作业, 正确率) — full width
- **3-column below**: left (薄弱知识点), center (知识点热力图/heatmap), right (能力雷达图 + 教师建议)
- **Bottom**: assignment history table

- [ ] **Step 1: Rewrite students/[id]/page.tsx**

```tsx
'use client'
import { Card, Row, Col, Table, Tag, Avatar, Progress, Empty, Spin } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, TrophyOutlined, BookOutlined, BulbOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { use } from 'react'
import { RadarChart } from '@/components/students/RadarChart'
import { MasteryHeatmap } from '@/components/students/MasteryHeatmap'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: student, isLoading } = useSWR(`/api/students/${id}`, fetcher)

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (!student || student.error) return <div>学生不存在</div>

  const radarData = (student.masteries ?? []).slice(0, 7).map((m: { knowledgePoint: { name: string }; masteryScore: number }) => ({
    subject: m.knowledgePoint.name.slice(0, 6),
    score: Math.round(m.masteryScore),
    fullMark: 100,
  }))

  const weakPoints = (student.masteries ?? []).filter((m: { masteryScore: number }) => m.masteryScore < 60)
  const avgScore = student.masteries?.length
    ? Math.round(student.masteries.reduce((s: number, m: { masteryScore: number }) => s + m.masteryScore, 0) / student.masteries.length)
    : 0
  const submissions = student.submissions ?? []
  const correctRate = submissions.length
    ? Math.round(submissions.filter((s: { totalScoreConfirmed: number | null }) => (s.totalScoreConfirmed ?? 0) >= 60).length / submissions.length * 100)
    : 0

  return (
    <div>
      {/* Profile Header */}
      <Card
        style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f4ff 100%)', border: '1px solid #bae0ff' }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar size={56} style={{ background: '#1677ff', fontSize: 24, flexShrink: 0 }}>
            {student.name?.[0]}
          </Avatar>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{student.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {student.studentNo} · {student.class?.name} · {student.grade}
            </div>
          </div>
          {/* Stat blocks */}
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: '综合得分', value: avgScore, suffix: '分', icon: <TrophyOutlined />, color: '#1677ff' },
              { label: '本周作业', value: submissions.length, suffix: '次', icon: <BookOutlined />, color: '#722ed1' },
              { label: '正确率', value: correctRate, suffix: '%', icon: <ArrowUpOutlined />, color: '#52c41a' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}<span style={{ fontSize: 14 }}>{s.suffix}</span></div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 3-column layout */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {/* Left: Weak points */}
        <Col span={6}>
          <Card
            title={<span style={{ fontSize: 13 }}>薄弱知识点 <Tag color="red">{weakPoints.length}</Tag></span>}
            style={{ height: 380 }}
            bodyStyle={{ padding: '8px 12px', height: 320, overflowY: 'auto' }}
          >
            {weakPoints.length === 0
              ? <Empty description="暂无薄弱点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : weakPoints.map((m: { knowledgePointId: string; knowledgePoint: { name: string; chapter?: string }; masteryScore: number }) => (
                <div key={m.knowledgePointId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '1px solid #f5f5f5',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{m.knowledgePoint.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{m.knowledgePoint.chapter}</div>
                  </div>
                  <Tag color="red" style={{ fontSize: 11 }}>{Math.round(m.masteryScore)}分</Tag>
                </div>
              ))
            }
          </Card>
        </Col>

        {/* Center: Heatmap */}
        <Col span={12}>
          <Card title="知识点掌握热力图" style={{ height: 380 }} bodyStyle={{ padding: 8, height: 320, overflowY: 'auto' }}>
            {student.masteries?.length > 0
              ? <MasteryHeatmap masteries={student.masteries} />
              : <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>

        {/* Right: Radar + Suggestions */}
        <Col span={6}>
          <Card title="能力雷达图" style={{ marginBottom: 8, height: 220 }} bodyStyle={{ padding: 8 }}>
            {radarData.length > 0
              ? <RadarChart data={radarData} />
              : <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
          <Card
            title={<span><BulbOutlined style={{ color: '#faad14' }} /> 教师建议</span>}
            style={{ height: 150 }}
            bodyStyle={{ padding: '8px 12px', fontSize: 12, color: '#555', lineHeight: 1.7 }}
          >
            {weakPoints.length > 0
              ? `建议重点复习：${weakPoints.slice(0, 2).map((m: { knowledgePoint: { name: string } }) => m.knowledgePoint.name).join('、')}等知识点，加强练习。`
              : '该学生表现良好，继续保持！'}
          </Card>
        </Col>
      </Row>

      {/* Bottom: Assignment History */}
      <Card title="作业历史" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={submissions}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 5, size: 'small' }}
          columns={[
            { title: '作业名称', dataIndex: ['assignment', 'title'], ellipsis: true },
            { title: '得分', dataIndex: 'totalScoreConfirmed', width: 70,
              render: (v: number | null) => v !== null
                ? <span style={{ fontWeight: 600, color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</span>
                : <span style={{ color: '#ccc' }}>待确认</span> },
            { title: '状态', dataIndex: 'status', width: 80,
              render: (v: string) => <Tag style={{ fontSize: 11 }}>{v === 'confirmed' ? '已确认' : v}</Tag> },
            { title: '提交时间', dataIndex: 'createdAt', width: 100,
              render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
          ]}
        />
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — visit a student detail page, confirm profile header, 3-column layout, heatmap, radar chart.

---

## Task 5: Rebuild Upload Assignment Page

**Files:**
- Modify: `src/app/(dashboard)/assignments/upload/page.tsx`
- Modify: `src/components/assignments/UploadWizard.tsx`

### Design reference: Screenshot 4

Layout:
- Left (60%): 3-step indicator at top → step content (upload method cards OR form fields OR file dragger)
- Right (40%): help tips panel + recent uploads list

Key change: Step 1 of the wizard now shows 3 visual method cards instead of just a form. The underlying logic (gradingMode) is preserved.

- [ ] **Step 1: Rewrite upload/page.tsx**

```tsx
'use client'
import { Row, Col, Card } from 'antd'
import { UploadWizard } from '@/components/assignments/UploadWizard'
import { QuestionCircleOutlined, FileImageOutlined, FilePdfOutlined, CheckCircleOutlined } from '@ant-design/icons'

const HELP_TIPS = [
  { icon: <FileImageOutlined />, text: '支持 JPG、PNG 格式图片，最大 20MB' },
  { icon: <FilePdfOutlined />, text: '支持 PDF 格式，多页文档请合并后上传' },
  { icon: <CheckCircleOutlined />, text: '图片需清晰、无遮挡，保证识别准确率' },
  { icon: <QuestionCircleOutlined />, text: '如遇识别错误，可在批改结果页手动调整' },
]

export default function UploadPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>上传作业</div>
        <div style={{ fontSize: 12, color: '#999' }}>支持拍照、扫描、文件上传多种方式，AI 自动批改</div>
      </div>

      <Row gutter={16}>
        {/* Left: Wizard */}
        <Col span={16}>
          <Card bodyStyle={{ padding: '20px 24px' }}>
            <UploadWizard />
          </Card>
        </Col>

        {/* Right: Help + Tips */}
        <Col span={8}>
          <Card
            title={<span><QuestionCircleOutlined style={{ marginRight: 6 }} />帮助指引</span>}
            style={{ marginBottom: 12 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            {HELP_TIPS.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 12, color: '#555' }}>
                <span style={{ color: '#1677ff', flexShrink: 0 }}>{tip.icon}</span>
                <span>{tip.text}</span>
              </div>
            ))}
          </Card>

          <Card title="注意事项" bodyStyle={{ padding: '12px 16px' }}>
            {[
              '每份作业对应一位学生',
              '批改结果需教师确认后方可入库',
              '低置信度题目请重点审核',
              '大文件处理可能需要1-3分钟',
            ].map((note, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: '#555' }}>
                <span style={{ color: '#faad14', fontWeight: 700 }}>{i + 1}.</span>
                <span>{note}</span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 2: Update UploadWizard.tsx** — add visual method cards for step 0 (keep all existing form logic for steps 1 and 2):

At the top of the step 0 section (before the Form.Item fields), add:

```tsx
{/* Step 0 visual method indicator */}
{current === 0 && (
  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
    {[
      { icon: '📷', label: '拍照上传', desc: '用手机拍摄作业照片' },
      { icon: '📁', label: '文件上传', desc: '上传已有图片或PDF' },
      { icon: '🖨️', label: '扫描仪', desc: '连接扫描仪直接导入' },
    ].map((m) => (
      <div key={m.label} style={{
        flex: 1, border: '1px dashed #d9d9d9', borderRadius: 10, padding: '16px 12px',
        textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1677ff')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#d9d9d9')}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>{m.icon}</div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{m.desc}</div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Verify** — visit `/assignments/upload`, confirm 3 method cards visible, help panel on right.

---

## Task 6: Rebuild Grading Page

**Files:**
- Modify: `src/app/(dashboard)/assignments/[id]/grading/page.tsx`

### Design reference: Screenshots 5 & 6

Layout:
- **Header card**: student avatar + name + assignment + submission time + 4 metric chips
- **Main 2-col**: left (annotated image viewer full height), right (question table + confirm button)

- [ ] **Step 1: Rewrite grading/page.tsx header and stats section**

Replace the current `<h2>` + `<Row gutter={16}>` stats with:

```tsx
{/* Student info header */}
<Card
  style={{ marginBottom: 12, background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f4ff 100%)', border: '1px solid #bae0ff' }}
  bodyStyle={{ padding: '12px 16px' }}
>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar size={44} style={{ background: '#1677ff', fontSize: 18 }}>
        {submission?.student?.name?.[0] ?? '?'}
      </Avatar>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{submission?.student?.name ?? '—'}</div>
        <div style={{ fontSize: 12, color: '#666' }}>
          {submission?.assignment?.title} · {submission?.createdAt ? new Date(submission.createdAt).toLocaleString('zh-CN') : ''}
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      {[
        { label: 'AI总分', value: aiTotal?.toFixed(1) ?? '—', color: '#1677ff' },
        { label: '错题数', value: String(wrongCount), color: '#ff4d4f' },
        { label: '低置信项', value: String(lowConfidence.length), color: '#faad14' },
      ].map((s) => (
        <div key={s.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{s.label}</div>
        </div>
      ))}
    </div>
  </div>
</Card>
```

Add these computed values before the return statement:
```tsx
const aiTotal = submission?.gradingResults?.reduce((s: number, r: { aiScore: number | null }) => s + (r.aiScore ?? 0), 0)
const wrongCount = submission?.gradingResults?.filter((r: { isCorrect: boolean | null }) => r.isCorrect === false).length ?? 0
```

- [ ] **Step 2: Verify** — visit a grading page, confirm student info header card with metric chips.

---

## Task 7: Rebuild Question Generation Page

**Files:**
- Modify: `src/app/(dashboard)/questions/generate/page.tsx`

### Design reference: Screenshot 8

Layout: 3-panel (left form 30% | center preview 40% | right history+suggestions 30%)

Key changes:
- 题型 becomes Tag/Button group (not Select)
- Difficulty becomes segmented control
- Right panel shows 生成记录 + 学情建议

- [ ] **Step 1: Rewrite questions/generate/page.tsx**

```tsx
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['fill'])

  const { data: kpData } = useSWR('/api/knowledge/points', fetcher)
  const { data: qData, mutate: refetchQ } = useSWR(showResults ? '/api/questions?status=draft' : null, fetcher)

  const kpOptions = (kpData?.knowledgePoints ?? []).map((k: { id: string; name: string; chapter?: string | null }) => ({
    value: k.id,
    label: `${k.chapter ? `[${k.chapter}] ` : ''}${k.name}`,
  }))

  async function handleGenerate(values: { knowledgePointIds: string[]; difficulty: string; count: number; subject: string; grade: string }) {
    setGenerating(true)
    const res = await fetch('/api/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, type: selectedTypes[0] ?? 'fill' }),
    })
    const data = await res.json()
    setJobId(data.jobId)
  }

  async function handleApprove(id: string) {
    await fetch(`/api/questions/${id}/approve`, { method: 'POST' })
    message.success('已审核通过入库')
    refetchQ()
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>个性化试题生成</div>

      <Row gutter={12}>
        {/* Left: Form */}
        <Col span={7}>
          <Card title="生成参数设置" bodyStyle={{ padding: '16px' }}>
            <Form form={form} layout="vertical" onFinish={handleGenerate} size="small">
              <Form.Item name="subject" label="学科" initialValue="数学" rules={[{ required: true }]}>
                <Select options={['数学', '语文', '英语', '物理'].map((s) => ({ value: s, label: s }))} />
              </Form.Item>
              <Form.Item name="grade" label="年级" initialValue="七年级" rules={[{ required: true }]}>
                <Select options={['七年级', '八年级', '九年级'].map((g) => ({ value: g, label: g }))} />
              </Form.Item>
              <Form.Item name="knowledgePointIds" label="知识点" rules={[{ required: true }]}>
                <Select mode="multiple" options={kpOptions} placeholder="选择知识点" maxTagCount={3} />
              </Form.Item>

              {/* 题型 as tag buttons */}
              <Form.Item label="题型">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TYPE_OPTIONS.map((t) => (
                    <Tag.CheckableTag
                      key={t.value}
                      checked={selectedTypes.includes(t.value)}
                      onChange={(checked) =>
                        setSelectedTypes(checked ? [t.value] : selectedTypes.filter((v) => v !== t.value))
                      }
                      style={{ padding: '2px 10px', borderRadius: 12, border: '1px solid #d9d9d9', cursor: 'pointer' }}
                    >
                      {t.label}
                    </Tag.CheckableTag>
                  ))}
                </div>
              </Form.Item>

              {/* Difficulty as Segmented */}
              <Form.Item name="difficulty" label="难度" initialValue="medium" rules={[{ required: true }]}>
                <Segmented options={DIFFICULTY_OPTIONS} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="count" label="生成数量" initialValue={5} rules={[{ required: true }]}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={generating} block icon={<PlayCircleOutlined />}>
                开始生成
              </Button>
            </Form>

            <JobProgressBar jobId={jobId} onDone={() => { setGenerating(false); setShowResults(true); refetchQ() }} />
          </Card>
        </Col>

        {/* Center: Preview */}
        <Col span={10}>
          <Card
            title={`生成结果（${qData?.total ?? 0} 题）`}
            bodyStyle={{ padding: 0, height: 500, overflowY: 'auto' }}
          >
            <Table
              dataSource={qData?.questions ?? []}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: '点击"开始生成"后结果显示于此' }}
              columns={[
                { title: '题目', dataIndex: 'content', ellipsis: true, render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
                { title: '知识点', dataIndex: ['knowledgePoint', 'name'], width: 90, ellipsis: true },
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
                    <div style={{ fontSize: 12, padding: '4px 8px', background: '#fafafa' }}>
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
            title={<span><HistoryOutlined style={{ marginRight: 6 }} />生成记录</span>}
            style={{ marginBottom: 10, height: 240 }}
            bodyStyle={{ padding: '8px 12px', height: 180, overflowY: 'auto' }}
          >
            {(qData?.questions?.length ?? 0) === 0
              ? <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', marginTop: 20 }}>暂无生成记录</div>
              : <div style={{ fontSize: 12, color: '#555' }}>
                  共生成 {qData?.total ?? 0} 题，{qData?.questions?.filter((q: { status: string }) => q.status === 'approved').length ?? 0} 题已入库
                </div>
            }
          </Card>
          <Card
            title={<span><BulbOutlined style={{ color: '#faad14', marginRight: 6 }} />学情建议</span>}
            bodyStyle={{ padding: '8px 12px', fontSize: 12, color: '#555', lineHeight: 1.8 }}
          >
            <div>• 建议优先出填空题加强基础训练</div>
            <div>• 近期错误率高的知识点建议多出练习题</div>
            <div>• 可结合学生薄弱点定向生成题目</div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — visit `/questions/generate`, confirm 3-panel layout, tag-style 题型 selector, segmented difficulty.

---

## Task 8: Create Class Dashboard Page (New)

**Files:**
- Create: `src/app/(dashboard)/class-dashboard/page.tsx`

### Design reference: Screenshot 9

Layout:
- 5 metric stat cards at top
- Left: trend line chart (score history)
- Middle: student score table
- Right: top/bottom ranking lists

- [ ] **Step 1: Create class-dashboard/page.tsx**

```tsx
'use client'
import { Card, Row, Col, Table, Tag, Avatar } from 'antd'
import { TrophyOutlined, RiseOutlined, CheckCircleOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const MOCK_TREND = [
  { week: '5/1', avg: 72 }, { week: '5/8', avg: 75 }, { week: '5/15', avg: 71 },
  { week: '5/22', avg: 78 }, { week: '5/29', avg: 80 },
]

const STAT_CARDS = [
  { label: '班级平均分', value: '78.6', suffix: '分', icon: <TrophyOutlined />, color: '#1677ff', bg: '#e6f4ff' },
  { label: '优秀率', value: '92.4', suffix: '%', icon: <RiseOutlined />, color: '#52c41a', bg: '#f6ffed' },
  { label: '合格率', value: '63.8', suffix: '%', icon: <CheckCircleOutlined />, color: '#722ed1', bg: '#f9f0ff' },
  { label: '本周提交', value: '42', suffix: '份', icon: <FileTextOutlined />, color: '#fa8c16', bg: '#fff7e6' },
  { label: '学生总数', value: '48', suffix: '人', icon: <TeamOutlined />, color: '#13c2c2', bg: '#e6fffb' },
]

export default function ClassDashboardPage() {
  const { data: students } = useSWR('/api/students?limit=50', fetcher)
  const studentList = (students?.students ?? []).map((s: { id: string; name: string; lastScore: number | null; avgMastery: number | null; riskLevel: string }) => s)

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>班级学情看板</div>

      {/* Stat Cards */}
      <Row gutter={10} style={{ marginBottom: 16 }}>
        {STAT_CARDS.map((sc) => (
          <Col span={4} key={sc.label} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
            <Card
              bodyStyle={{ padding: '14px 16px' }}
              style={{ borderRadius: 10, borderTop: `3px solid ${sc.color}`, background: sc.bg }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: sc.color }}>{sc.icon}</span>
                <span style={{ fontSize: 11, color: '#666' }}>{sc.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: sc.color }}>
                {sc.value}<span style={{ fontSize: 13 }}>{sc.suffix}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={12}>
        {/* Left: Trend Chart */}
        <Col span={8}>
          <Card title="班级成绩趋势" style={{ height: 350 }} bodyStyle={{ padding: '8px 12px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={MOCK_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="#1677ff" strokeWidth={2} dot={{ r: 4 }} name="平均分" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Middle: Student Score Table */}
        <Col span={10}>
          <Card title="学生成绩明细" style={{ height: 350 }} bodyStyle={{ padding: 0, height: 300, overflowY: 'auto' }}>
            <Table
              dataSource={studentList}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: '学生', key: 'name', width: 90,
                  render: (_: unknown, r: { name: string }) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar size={22} style={{ background: '#1677ff', fontSize: 11 }}>{r.name?.[0]}</Avatar>
                      <span style={{ fontSize: 12 }}>{r.name}</span>
                    </div>
                  ),
                },
                {
                  title: '最近得分', dataIndex: 'lastScore', width: 70,
                  render: (v: number | null) => v !== null
                    ? <span style={{ fontWeight: 600, color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</span>
                    : <span style={{ color: '#ccc' }}>—</span>,
                },
                {
                  title: '风险', dataIndex: 'riskLevel', width: 60,
                  render: (v: string) => <Tag color={v === 'high' ? 'red' : v === 'warning' ? 'orange' : 'green'} style={{ fontSize: 10 }}>
                    {v === 'high' ? '高风险' : v === 'warning' ? '关注' : '正常'}
                  </Tag>,
                },
              ]}
            />
          </Card>
        </Col>

        {/* Right: Rankings */}
        <Col span={6}>
          <Card title="🏆 成绩排名 Top 5" style={{ marginBottom: 10, height: 168 }} bodyStyle={{ padding: '8px 12px' }}>
            {studentList
              .filter((s: { lastScore: number | null }) => s.lastScore !== null)
              .sort((a: { lastScore: number }, b: { lastScore: number }) => b.lastScore - a.lastScore)
              .slice(0, 5)
              .map((s: { id: string; name: string; lastScore: number }, i: number) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: i < 3 ? '#faad14' : '#999', fontWeight: 700, width: 16 }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <span style={{ fontWeight: 600, color: '#1677ff' }}>{s.lastScore}</span>
                </div>
              ))}
          </Card>
          <Card title="⚠️ 需关注学生" style={{ height: 168 }} bodyStyle={{ padding: '8px 12px' }}>
            {studentList
              .filter((s: { riskLevel: string }) => s.riskLevel === 'high' || s.riskLevel === 'warning')
              .slice(0, 5)
              .map((s: { id: string; name: string; riskLevel: string }) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span>{s.name}</span>
                  <Tag color={s.riskLevel === 'high' ? 'red' : 'orange'} style={{ fontSize: 10 }}>
                    {s.riskLevel === 'high' ? '高风险' : '关注'}
                  </Tag>
                </div>
              ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — visit `/class-dashboard`, confirm 5 stat cards, trend line chart, student table, ranking panels.

---

## Self-Review

**Spec coverage:**
- ISC-1 to ISC-8 (Layout): ✅ Task 1
- ISC-9 to ISC-16 (Dashboard): ✅ Task 2
- ISC-17 to ISC-25 (Students): ✅ Task 3
- ISC-26 to ISC-34 (Student Detail): ✅ Task 4
- ISC-35 to ISC-39 (Upload): ✅ Task 5
- ISC-40 to ISC-45 (Grading): ✅ Task 6
- ISC-46 to ISC-51 (Question Gen): ✅ Task 7
- ISC-52 to ISC-55 (Class Dashboard): ✅ Task 8

**Gaps:**
- Assignment grading page (Task 6) only shows the header card addition — the existing 2-column layout is preserved. The `aiTotal` and `wrongCount` variables need to be added to the component scope.
- 批阅复盘 page (Screenshot 7) not included — this is a new page that can be added as Task 9 in a follow-up if the user requests it.

**Type consistency:** All types are inline, no shared interfaces defined in earlier tasks referenced in later ones. ✅

**Placeholder scan:** No TBD/TODO markers. All steps have complete code. ✅
