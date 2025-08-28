import { useState } from 'react'

interface TextAnalysisResult {
  analysis: string
  originalPrompt: string
  type: 'initial' | 'edit'
}

export function useTextAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzePrompt = async (
    prompt: string, 
    type: 'initial' | 'edit',
    clickPosition?: { x: number; y: number }
  ): Promise<TextAnalysisResult | null> => {
    try {
      setIsAnalyzing(true)
      setError(null)

      const response = await fetch('/api/analyze-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          type,
          clickPosition
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze prompt'
      setError(errorMessage)
      console.error('Text analysis error:', err)
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }

  return {
    analyzePrompt,
    isAnalyzing,
    error
  }
}
