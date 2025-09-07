import { useState } from 'react'

interface ClickDetectionResult {
  clickType: 'button' | 'input'
  willNavigate?: boolean
  newUrl?: string | null
  pageName?: string | null
  confidence: 'high' | 'low'
}

export function useClickDetection() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectClickType = async (
    imageData: string,
    clickPosition: { x: number; y: number },
    originalPrompt: string,
    currentUrl?: string,
    clickDescription?: string
  ): Promise<ClickDetectionResult | null> => {
    try {
      setIsDetecting(true)
      setError(null)

      const response = await fetch('/api/detect-click-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          clickPosition,
          originalPrompt,
          currentUrl,
          clickDescription
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect click type'
      setError(errorMessage)
      console.error('Click detection error:', err)
      // Return default button type on error
      return { clickType: 'button', willNavigate: false, newUrl: null, pageName: null, confidence: 'low' }
    } finally {
      setIsDetecting(false)
    }
  }

  return {
    detectClickType,
    isDetecting,
    error
  }
}


