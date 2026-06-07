import { useState, useEffect } from 'react'

type JobStatus = 'processing' | 'completed' | 'failed' | 'timeout'

interface JobStreamState {
  status: JobStatus | null
  done: boolean
  error: string | null
}

export function useJobStream(jobId: string | null): JobStreamState {
  const [state, setState] = useState<JobStreamState>({ status: null, done: false, error: null })

  useEffect(() => {
    if (!jobId) return
    const es = new EventSource(`/api/jobs/${jobId}/stream`)

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'progress') {
        setState((s) => ({ ...s, status: data.status }))
      } else if (data.type === 'done') {
        setState({ status: 'completed', done: true, error: null })
        es.close()
      } else if (data.type === 'error') {
        setState({ status: 'failed', done: true, error: data.message })
        es.close()
      } else if (data.type === 'timeout') {
        setState({ status: 'timeout', done: true, error: data.message })
        es.close()
      }
    }

    es.onerror = () => {
      setState((s) => ({ ...s, error: 'SSE 连接断开', done: true }))
      es.close()
    }

    return () => es.close()
  }, [jobId])

  return state
}
