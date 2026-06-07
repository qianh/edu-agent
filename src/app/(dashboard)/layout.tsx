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
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1677ff', lineHeight: 1.3 }}>
            教师教学<br />智能体
          </span>
        </div>

        {/* Menu */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ border: 0, padding: '8px 0' }}
            items={MENU_ITEMS.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: <Link href={item.href}>{item.label}</Link>,
            }))}
          />
        </div>

        {/* AI Chat Widget */}
        <div style={{
          borderTop: '1px solid #f0f0f0',
          padding: 12,
          background: '#fafafa',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar size={28} style={{ background: '#1677ff', flexShrink: 0 }}>
              <RobotOutlined style={{ fontSize: 13 }} />
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 12, lineHeight: 1.2 }}>教学助手</div>
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
          lineHeight: '56px',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <Breadcrumb
            items={breadcrumbs.map((label, i) => ({
              title: i === breadcrumbs.length - 1
                ? <span style={{ color: '#1677ff', fontSize: 13 }}>{label}</span>
                : <span style={{ color: '#666', fontSize: 13 }}>{label}</span>,
            }))}
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
            <Avatar size={32} style={{ background: '#1677ff', cursor: 'pointer', fontSize: 14 }}>王</Avatar>
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
