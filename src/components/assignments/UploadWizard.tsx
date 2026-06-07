'use client'
import { useState } from 'react'
import { Steps, Form, Select, Input, Upload, Button, Radio, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

const { Dragger } = Upload
const fetcher = (url: string) => fetch(url).then((r) => r.json())

const gradingModeOptions = [
  { value: 'ai_grade', label: '未批阅，需要 AI 批改', description: 'AI 自动识别题目和答案，给出建议分' },
  { value: 'teacher_mark', label: '教师已批阅，只需识别批阅结果', description: 'AI 识别对勾、叉号、扣分、评语' },
  { value: 'ai_review', label: '教师已批阅，需要 AI 辅助复核', description: 'AI 识别批阅结果并独立验证，标记疑似不一致' },
]

export function UploadWizard() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [form] = Form.useForm()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: studentsData } = useSWR('/api/students?limit=100', fetcher)
  const students = studentsData?.students ?? []

  const steps = [
    { title: '基本信息', description: '作业名称、学科、班级' },
    { title: '批阅模式', description: '选择处理方式' },
    { title: '上传文件', description: '上传作业图片或 PDF' },
  ]

  async function handleSubmit() {
    const values = await form.validateFields()
    if (!file) { message.error('请先上传作业文件'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    Object.entries(values).forEach(([k, v]) => formData.append(k, String(v)))
    formData.append('teacherId', 'placeholder-teacher-id')

    const res = await fetch('/api/assignments/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)

    if (res.ok) {
      message.success('上传成功，AI 正在处理...')
      router.push(`/assignments/${data.submissionId}/grading?jobId=${data.jobId}`)
    } else {
      message.error(data.error?.message ?? '上传失败')
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Steps current={current} items={steps} style={{ marginBottom: 32 }} />

      <Form form={form} layout="vertical">
        {current === 0 && (
          <>
            {/* Upload method cards */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { icon: '📷', label: '拍照上传', desc: '用手机拍摄作业照片' },
                { icon: '📁', label: '文件上传', desc: '上传已有图片或PDF' },
                { icon: '🖨️', label: '扫描仪', desc: '连接扫描仪直接导入' },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    flex: 1, border: '1px dashed #d9d9d9', borderRadius: 10,
                    padding: '16px 12px', textAlign: 'center', cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1677ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#d9d9d9')}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{m.desc}</div>
                </div>
              ))}
            </div>
            <Form.Item name="title" label="作业名称" rules={[{ required: true }]}>
              <Input placeholder="例：5月20日数学作业" />
            </Form.Item>
            <Form.Item name="subject" label="学科" rules={[{ required: true }]}>
              <Select options={['数学', '语文', '英语', '物理', '化学'].map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="studentId" label="学生" rules={[{ required: true }]}>
              <Select
                showSearch
                filterOption={(input, opt) => (opt?.label as string ?? '').includes(input)}
                options={students.map((s: { id: string; name: string; studentNo: string }) => ({ value: s.id, label: `${s.name}（${s.studentNo}）` }))}
                placeholder="选择学生"
              />
            </Form.Item>
            <Form.Item name="classId" label="班级 ID" rules={[{ required: true }]}>
              <Input placeholder="班级 cuid（从 Prisma Studio 获取）" />
            </Form.Item>
          </>
        )}

        {current === 1 && (
          <Form.Item name="gradingMode" rules={[{ required: true }]}>
            <Radio.Group style={{ width: '100%' }}>
              {gradingModeOptions.map((opt) => (
                <Radio key={opt.value} value={opt.value} style={{ display: 'block', marginBottom: 16, padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>{opt.description}</div>
                  </div>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        )}

        {current === 2 && (
          <Form.Item label="作业文件">
            <Dragger
              accept=".jpg,.jpeg,.png,.pdf"
              maxCount={1}
              beforeUpload={(f) => { setFile(f); return false }}
              onRemove={() => setFile(null)}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p>点击或拖拽上传作业图片或 PDF（最大 20MB）</p>
              <p style={{ color: '#999', fontSize: 12 }}>支持 JPG、PNG、PDF 格式</p>
            </Dragger>
          </Form.Item>
        )}
      </Form>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>上一步</Button>
        {current < 2
          ? <Button type="primary" onClick={() => form.validateFields().then(() => setCurrent((c) => c + 1))}>下一步</Button>
          : <Button type="primary" loading={uploading} onClick={handleSubmit}>提交上传</Button>
        }
      </div>
    </div>
  )
}
