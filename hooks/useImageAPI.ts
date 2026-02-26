'use client'

import { useCallback } from 'react'

// Helper function to convert blob to data URL
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Get current screen dimensions
function getScreenDimensions() {
  if (typeof window === 'undefined') return { screenWidth: 1920, screenHeight: 1080 }
  return {
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  }
}

// AI API integration for OpenAI, Gemini, and Flux
export function useImageAPI() {
  // Pre-search: call Gemini Flash to optionally gather web info for a URL
  const preSearch = useCallback(async (url: string, prompt: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/pre-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt }),
        signal: AbortSignal.timeout(15000), // 15 second timeout for pre-search
      })
      
      if (!response.ok) return null
      
      const data = await response.json()
      return data.context || null
    } catch (error) {
      console.warn('Pre-search failed (non-critical):', error)
      return null
    }
  }, [])

  const generateImage = useCallback(async (
    prompt: string,
    provider?: 'openai' | 'gemini' | 'flux',
    options?: { context?: string | null; screenWidth?: number; screenHeight?: number }
  ): Promise<string> => {
    try {
      const dims = getScreenDimensions()
      const screenWidth = options?.screenWidth || dims.screenWidth
      const screenHeight = options?.screenHeight || dims.screenHeight
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider,
          context: options?.context || null,
          screenWidth,
          screenHeight,
        }),
        signal: AbortSignal.timeout(120000),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Image generation failed:', response.status, errorText)
        throw new Error(`Failed to generate image: ${response.status} ${errorText}`)
      }
      
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        return data.imageUrl
      } else {
        const blob = await response.blob()
        return await blobToDataURL(blob)
      }
      
    } catch (error) {
      console.error('Error generating image:', error)
      throw new Error('Failed to generate image. Please try again.')
    }
  }, [])

  const editImage = useCallback(async (
    currentImageUrl: string,
    editPrompt: string,
    provider?: 'openai' | 'gemini' | 'flux',
    options?: { context?: string | null; screenWidth?: number; screenHeight?: number }
  ): Promise<string> => {
    try {
      let imageData = currentImageUrl
      
      if (currentImageUrl.startsWith('blob:')) {
        const response = await fetch(currentImageUrl)
        const blob = await response.blob()
        imageData = await blobToDataURL(blob)
      }

      const dims = getScreenDimensions()
      const screenWidth = options?.screenWidth || dims.screenWidth
      const screenHeight = options?.screenHeight || dims.screenHeight
      
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentImage: imageData, 
          editPrompt,
          provider,
          context: options?.context || null,
          screenWidth,
          screenHeight,
        }),
        signal: AbortSignal.timeout(120000),
      })
      
      if (!response.ok) {
        throw new Error('Failed to edit image')
      }
      
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        return data.imageUrl
      } else {
        const blob = await response.blob()
        return await blobToDataURL(blob)
      }
      
    } catch (error) {
      console.error('Error editing image:', error)
      throw new Error('Failed to edit image. Please try again.')
    }
  }, [])

  return {
    generateImage,
    editImage,
    preSearch,
  }
}
