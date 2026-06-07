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
        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
          支持拍照、扫描、文件上传多种方式，AI 自动批改
        </div>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card bodyStyle={{ padding: '20px 24px' }}>
            <UploadWizard />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title={<span><QuestionCircleOutlined style={{ marginRight: 6, color: '#1677ff' }} />帮助指引</span>}
            style={{ marginBottom: 12 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            {HELP_TIPS.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: 12, color: '#555', alignItems: 'flex-start' }}>
                <span style={{ color: '#1677ff', flexShrink: 0, marginTop: 1 }}>{tip.icon}</span>
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
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: '#555', alignItems: 'flex-start' }}>
                <span style={{ color: '#faad14', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{note}</span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
