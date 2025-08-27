'use client'

import { useState, useRef, useCallback } from 'react'
import { PromptInput } from './PromptInput'
import { InteractiveImage } from './InteractiveImage'
import { useImageAPI } from '@/hooks/useImageAPI'
import { useSupabase } from '@/hooks/useSupabase'

export interface WebsiteSession {
  id: string
  initialPrompt: string
  currentImage: string
  clickHistory: ClickPoint[]
  createdAt: Date
  updatedAt: Date
}

export interface ClickPoint {
  x: number
  y: number
  timestamp: Date
  description: string
  imageWithDot: string // The image with the red dot that was sent to the API
}

export function WebsiteGenerator() {
  const [session, setSession] = useState<WebsiteSession | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'flux'>('openai')
  
  const { generateImage, editImage } = useImageAPI()
  const { saveSession, loadSession } = useSupabase()

  // Helper function to create an image with a red dot
  const createImageWithDot = useCallback(async (imageUrl: string, x: number, y: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw the original image
        ctx?.drawImage(img, 0, 0)
        
        // Calculate actual pixel position
        const actualX = (x / 100) * img.width
        const actualY = (y / 100) * img.height
        
        // Draw red dot
        if (ctx) {
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.arc(actualX, actualY, 10, 0, 2 * Math.PI)
          ctx.fill()
          
          // Add white border
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 3
          ctx.stroke()
        }
        
        // Convert to data URL
        resolve(canvas.toDataURL('image/png'))
      }
      
      img.src = imageUrl
    })
  }, [])

  const handleInitialPrompt = async (prompt: string) => {
    try {
      setIsGenerating(true)
      setError(null)
      
      const imageData = await generateImage(prompt, provider)
      
      const newSession: WebsiteSession = {
        id: Date.now().toString(),
        initialPrompt: prompt,
        currentImage: imageData,
        clickHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setSession(newSession)
      await saveSession(newSession)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImageClick = async (x: number, y: number) => {
    if (!session) return
    
    try {
      setIsGenerating(true)
      setError(null)
      
      // Create image with red dot
      const imageWithDot = await createImageWithDot(session.currentImage, x, y)
      
      const clickPoint: ClickPoint = {
        x,
        y,
        timestamp: new Date(),
        description: `User clicked at position (${x}, ${y})`,
        imageWithDot: imageWithDot
      }
      
              // Create system prompt for the edit with specific coordinates
        const editPrompt = `The user clicked at position notated by the red dot on this website image. 
        
        IMPORTANT: Make DRAMATIC and OBVIOUS changes to this website. Either:
        1. Navigate to a completely different page (like product page, cart, contact page, etc.)
        2. Add significant new content sections, menus, or elements
        3. Change the layout substantially 
        4. Show a modal, popup, or overlay
        
        Think about what would normally happen to a website if the user clicked on the element shown via the red dot. Make the change VERY obvious and dramatic.
        
        Original prompt: "${session.initialPrompt}"
        
        Generate a completely new and visibly different 1024x1024 website image that shows major evolution.`
      
      const newImageData = await editImage(imageWithDot, editPrompt, provider)
      
      const updatedSession: WebsiteSession = {
        ...session,
        currentImage: newImageData,
        clickHistory: [...session.clickHistory, clickPoint],
        updatedAt: new Date()
      }
      
      setSession(updatedSession)
      await saveSession(updatedSession)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit image')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetSession = () => {
    setSession(null)
    setError(null)
  }

  return (
    <div className="space-y-8">
      {/* Provider Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">AI Provider</h3>
            <p className="text-sm text-gray-600">Choose your image generation provider</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setProvider('openai')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                provider === 'openai'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              OpenAI GPT-Image-1
            </button>
            <button
              onClick={() => setProvider('gemini')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                provider === 'gemini'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Google Gemini
            </button>
            <button
              onClick={() => setProvider('flux')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                provider === 'flux'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Flux Dev
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {provider === 'openai' 
            ? 'Using OpenAI GPT-Image-1 for high-quality website generation'
            : provider === 'flux'
            ? 'Using Flux Dev for cutting-edge website generation and evolution'
            : 'Using Google Gemini for AI-powered image generation'
          }
        </div>
      </div>

      {!session ? (
        <PromptInput onSubmit={handleInitialPrompt} isLoading={isGenerating} />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                Your Website Evolution
              </h2>
              <p className="text-gray-600">
                Click anywhere on the image to evolve your website
              </p>
            </div>
            <button
              onClick={resetSession}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Start Over
            </button>
          </div>
          
          <InteractiveImage
            imageUrl={session.currentImage}
            onClick={handleImageClick}
            clickHistory={session.clickHistory}
            isLoading={isGenerating}
          />
          
          {session.clickHistory.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-800 mb-4">Click History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {session.clickHistory.map((click, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="mb-2">
                      <h4 className="font-medium text-gray-800">Click {index + 1}</h4>
                      <p className="text-xs text-gray-500">
                        Position: ({Math.round(click.x)}, {Math.round(click.y)})
                      </p>
                      <p className="text-xs text-gray-500">
                        Time: {click.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="relative">
                      <img
                        src={click.imageWithDot}
                        alt={`Website with dot at click ${index + 1}`}
                        className="w-full h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        title={`Click to view full size - ${click.description}`}
                        style={{ maxWidth: '200px', height: 'auto' }}
                      />
                      <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                        #{index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}

