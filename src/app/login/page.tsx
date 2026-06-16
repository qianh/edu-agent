'use client'
import { Form, Input, Button, Card, Alert } from 'antd'
import { LockOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onFinish(values: { emailOrPhone: string; password: string }) {
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      emailOrPhone: values.emailOrPhone,
      password: values.password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('账号或密码错误')
    } else {
      router.push('/')
    }
  }

  function validateEmailOrPhone(_: unknown, value: string) {
    if (!value) return Promise.reject(new Error('请输入邮箱或手机号'))
    if (value.includes('@')) return Promise.resolve()
    if (/^\d{11}$/.test(value)) return Promise.resolve()
    return Promise.reject(new Error('请输入有效的邮箱或11位手机号'))
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e6f0ff 0%, #f0f5ff 100%)',
    }}>
      <Card
        style={{ width: 380, borderRadius: 12, boxShadow: '0 8px 32px rgba(22,119,255,0.12)' }}
        styles={{ body: { padding: '40px 36px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 24 }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>教师教学智能体</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>登录或首次使用自动注册</div>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />
        )}

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="emailOrPhone"
            rules={[{ validator: validateEmailOrPhone }]}
          >
            <Input prefix={<UserOutlined />} placeholder="邮箱或手机号" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录 / 注册
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
