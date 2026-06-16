export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface TeacherMarkRaw {
  question_no: string
  mark_type: 'tick' | 'cross' | 'half' | 'deduct' | 'score' | 'comment' | 'circle'
  mark_text: string | null
  score_value: number | null
  bbox: BBox
  confidence: number
}

export interface ImageAnalysisResult {
  total_score: number | null
  marks: TeacherMarkRaw[]
  questions?: QuestionRaw[]
  raw_text?: string
}

export interface QuestionRaw {
  question_no: string
  content: string
  student_answer: string
  bbox: BBox
  confidence?: number
}

export interface AIOptions {
  temperature?: number
  maxTokens?: number
  timeout?: number
}

export interface NamedAIProvider {
  name: string
  model: string
  analyzeImage(imageUrl: string, prompt: string, opts?: AIOptions): Promise<ImageAnalysisResult>
  generateText(prompt: string, opts?: AIOptions): Promise<string>
  generateEmbedding(text: string): Promise<number[]>
}
