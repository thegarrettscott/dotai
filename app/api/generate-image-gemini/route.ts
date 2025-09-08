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
    
    // ULTRA-AGGRESSIVE prompt for edge-to-edge website generation
    const enhancedPrompt = `CRITICAL: Generate a FULL-SCREEN website that fills EVERY PIXEL of the 1024x1024 image. ${prompt}

    MANDATORY EDGE-TO-EDGE REQUIREMENTS:
    - ABSOLUTELY NO WHITE SPACE, NO MARGINS, NO PADDING, NO BORDERS
    - WEBSITE CONTENT MUST START AT PIXEL (0,0) AND END AT PIXEL (1024,1024)
    - NO BROWSER CHROME, NO ADDRESS BAR, NO SCROLLBARS, NO UI ELEMENTS
    - NO MOCKUP FRAMES, NO DEVICE FRAMES, NO SHADOWS, NO BACKGROUNDS
    - THE WEBSITE MUST OCCUPY THE ENTIRE IMAGE CANVAS
    - EVERY SINGLE PIXEL MUST BE PART OF THE WEBSITE CONTENT
    - NO EMPTY SPACE ANYWHERE - FILL EVERY CORNER, EVERY EDGE
    - WEBSITE HEADER STARTS AT THE VERY TOP (Y=0)
    - WEBSITE FOOTER ENDS AT THE VERY BOTTOM (Y=1024)
    - CONTENT EXTENDS TO THE LEFT EDGE (X=0) AND RIGHT EDGE (X=1024)
    - NO GAPS, NO SPACING, NO MARGINS - PURE WEBSITE CONTENT ONLY
    - MAKE IT LOOK LIKE A REAL WEBSITE SCREENSHOT, NOT A DESIGN MOCKUP
    - ASSUME THE USER WANTS A COMPLETE, FUNCTIONAL WEBSITE EXPERIENCE
    - BE CREATIVE AND INTERESTING - MAKE IT COMPELLING AND PROFESSIONAL
    - INCLUDE ALL TYPICAL WEBSITE ELEMENTS: HEADER, NAVIGATION, HERO, CONTENT, FOOTER
    - USE MODERN DESIGN PRINCIPLES BUT FILL THE ENTIRE SPACE
    - NO PLACEHOLDER TEXT - USE REALISTIC, ENGAGING CONTENT
    - MAKE IT LOOK LIKE A LIVE, FUNCTIONAL WEBSITE
    - DO NOT CREATE DEMO SITES OR PLACEHOLDER CONTENT
    - CREATE REAL, FUNCTIONAL WEBSITES THAT ACTUALLY EXIST
    - BE BOLD AND CREATIVE - DON'T HOLD BACK ON FEATURES
    - MAKE IT LOOK LIKE A REAL BUSINESS OR SERVICE WEBSITE
    - INCLUDE REALISTIC PRICING, CONTACT INFO, AND FUNCTIONAL ELEMENTS
    - NO "LOREM IPSUM" OR PLACEHOLDER TEXT - USE REAL CONTENT`

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
