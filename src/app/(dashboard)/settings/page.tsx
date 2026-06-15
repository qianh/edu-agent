'use client'
import { Card, Form, Input, Select, Switch, Button, Divider, Avatar, Upload, Row, Col, message } from 'antd'
import { UserOutlined, UploadOutlined, BellOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useState } from 'react'

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    message.success('设置已保存')
  }

  return (
    <Row gutter={16}>
      <Col span={16}>
        {/* Profile */}
        <Card title={<><UserOutlined style={{ marginRight: 8 }} />个人信息</>} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <Avatar size={64} style={{ background: '#1677ff', fontSize: 24 }}>王</Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>王老师</div>
              <div style={{ color: '#999', fontSize: 13 }}>数学教师 · 八年级2班</div>
              <Upload showUploadList={false} style={{ marginTop: 6 }}>
                <Button size="small" icon={<UploadOutlined />}>更换头像</Button>
              </Upload>
            </div>
          </div>
          <Form layout="vertical" initialValues={{ name: '王老师', subject: '数学', grade: '八年级', class: '2班', email: 'wang@school.edu.cn' }}>
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
              <Col span={8}>
                <Form.Item label="年级" name="grade">
                  <Select>
                    {['七年级','八年级','九年级'].map(g => <Select.Option key={g} value={g}>{g}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="班级" name="class">
                  <Select>
                    {['1班','2班','3班','4班'].map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" loading={saving} onClick={handleSave}>保存个人信息</Button>
          </Form>
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
          {[
            { label: '系统版本', value: 'v1.0.0' },
            { label: 'AI 模型', value: 'Claude Sonnet 4.6' },
            { label: '存储空间', value: '2.3 GB / 10 GB' },
            { label: '本月批改量', value: '128 份' },
            { label: '本月出题量', value: '56 题' },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Divider style={{ margin: '10px 0' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666', fontSize: 13 }}>{item.label}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{item.value}</span>
              </div>
            </div>
          ))}
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
