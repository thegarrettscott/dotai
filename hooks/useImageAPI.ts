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

// AI API integration for OpenAI, Gemini, and Flux
export function useImageAPI() {
  const generateImage = useCallback(async (prompt: string, provider?: 'openai' | 'gemini' | 'flux'): Promise<string> => {
    try {
      console.log('Generating image with prompt:', prompt, 'provider:', provider)
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider }),
        signal: AbortSignal.timeout(120000) // 120 seconds timeout
      })
      
      console.log('Image generation response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Image generation failed:', response.status, errorText)
        throw new Error(`Failed to generate image: ${response.status} ${errorText}`)
      }
      
      // Check if response is JSON (for OpenAI base64) or blob (for Gemini)
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // OpenAI returns JSON with imageUrl field
        const data = await response.json()
        console.log('Received JSON response:', data)
        return data.imageUrl
      } else {
        // Gemini returns blob
        const blob = await response.blob()
        const dataUrl = await blobToDataURL(blob)
        return dataUrl
      }
      
    } catch (error) {
      console.error('Error generating image:', error)
      throw new Error('Failed to generate image. Please try again.')
    }
  }, [])

  const editImage = useCallback(async (currentImageUrl: string, editPrompt: string, provider?: 'openai' | 'gemini' | 'flux'): Promise<string> => {
    try {
      // If we have a blob URL, we need to fetch it and convert to base64
      let imageData = currentImageUrl
      
      if (currentImageUrl.startsWith('blob:')) {
        // Fetch the blob and convert to data URL
        const response = await fetch(currentImageUrl)
        const blob = await response.blob()
        imageData = await blobToDataURL(blob)
      }
      
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentImage: imageData, 
          editPrompt,
          provider
        }),
        signal: AbortSignal.timeout(120000) // 120 seconds timeout
      })
      
      if (!response.ok) {
        throw new Error('Failed to edit image')
      }
      
      // Check if response is JSON (for OpenAI base64) or blob (for Gemini)
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // OpenAI returns JSON with imageUrl field
        const data = await response.json()
        console.log('Received JSON edit response:', data)
        return data.imageUrl
      } else {
        // Gemini returns blob
        const blob = await response.blob()
        const dataUrl = await blobToDataURL(blob)
        return dataUrl
      }
      
    } catch (error) {
      console.error('Error editing image:', error)
      throw new Error('Failed to edit image. Please try again.')
    }
  }, [])

  return {
    generateImage,
    editImage
  }
}
