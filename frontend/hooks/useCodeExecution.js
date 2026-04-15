'use client'
import { useState, useCallback } from 'react'
import { executeCode } from '@/lib/api'

export default function useCodeExecution() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

  const run = useCallback(async (code, languageId, stdin, languageName) => {
    if (!code.trim()) return
    setLoading(true)
    setResult(null)

    const startTime = Date.now()
    try {
      const data = await executeCode(code, languageId, stdin)
      const duration = Date.now() - startTime

      // Standardize response
      const executionResult = {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        compile_output: data.compile_output || '',
        message: data.message || '',
        status: data.status || { id: data.exit_code === 0 ? 3 : 11, description: data.status_description },
        time: data.time || data.execution_time || (duration / 1000).toFixed(3),
        memory: data.memory,
        exit_code: data.exit_code,
      }

      setResult(executionResult)
      
      const newHistoryItem = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        language: languageName,
        status: executionResult.status.id,
        duration: executionResult.time,
      }

      setHistory(h => [newHistoryItem, ...h.slice(0, 19)])
      return executionResult
    } catch (err) {
      const errorResult = {
        stderr: err.message,
        status: { id: 13, description: 'Execution Error' }
      }
      setResult(errorResult)
      return errorResult
    } finally {
      setLoading(false)
    }
  }, [])

  return { run, result, loading, history, setHistory }
}
