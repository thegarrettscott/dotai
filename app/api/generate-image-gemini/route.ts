import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    }
    
    const model = 'gemini-2.5-flash-image-preview'
    
    // Enhanced prompt for website generation (same as OpenAI)
    const enhancedPrompt = `Generate a modern, professional website design as a single webpage screenshot. ${prompt}. 
    
    CRITICAL REQUIREMENTS:
    - DO NOT MAKE IT A MOCKUP, THERE SHOULD BE NOTHING ON THE IMAGE OTHER THAN THE SITE ALL THE WAY TO THE EDGES
    - DO NOT INCLUDE THE BROWSER HEADER, JUST THE SITES
    - DO A VERY GOOD JOB, DO NOT BE AFRAID TO BE CREATIVE
    - ASSUME EVERYTHING THE USER ASKS FOR OR CLICKS ON EXISTS IN THE MOST INTERESTING WAY POSSIBLE
    
    The design should be clean, modern, and look like a real website with:
    - A header with navigation
    - Hero section with compelling content
    - Well-organized sections
    - Professional typography and spacing
    - Modern color scheme and layout
    - Responsive design elements
    - High-quality, polished appearance
    
    Make it look like a screenshot of an actual website, not a mockup or wireframe. Fill the entire 1024x1024 image with just the website content, edge to edge.`

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: enhancedPrompt,
          },
        ],
      },
    ]

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    })

    let imageData: any = null
    let textResponse = ''

    for await (const chunk of response) {
      if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
        continue
      }
      
      const parts = chunk.candidates[0].content.parts
      for (const part of parts) {
        if (part.inlineData) {
          imageData = part.inlineData
          break
        } else if (part.text) {
          textResponse += part.text
        }
      }
      
      if (imageData) break
    }

    if (!imageData) {
      console.error('Gemini API failed to generate image. Text response:', textResponse.substring(0, 200))
      throw new Error('No image generated')
    }

    // Convert base64 to buffer and return
    const buffer = Buffer.from(imageData.data, 'base64')
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': imageData.mimeType || 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Error generating image with Gemini:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
