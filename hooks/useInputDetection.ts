import { useState } from 'react'

interface InputField {
  x: number
  y: number
  width: number
  height: number
  label: string
  type: string
}

interface InputDetectionResult {
  inputs: InputField[]
  error?: string
}

export function useInputDetection() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectInputs = async (imageData: string): Promise<InputDetectionResult> => {
    try {
      setIsDetecting(true)
      setError(null)

      const response = await fetch('/api/detect-inputs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect inputs'
      setError(errorMessage)
      console.error('Input detection error:', err)
      return { inputs: [] }
    } finally {
      setIsDetecting(false)
    }
  }

  return {
    detectInputs,
    isDetectingInputs: isDetecting,
    error
  }
}

