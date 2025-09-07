import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { currentImage, editPrompt } = await request.json()
    
    console.log('Gemini edit request received:')
    console.log('Edit prompt:', editPrompt)
    console.log('Current image type:', typeof currentImage)
    console.log('Current image starts with data:', currentImage?.startsWith('data:image/'))
    console.log('Current image length:', currentImage?.length)
    
    if (!currentImage || !editPrompt) {
      return NextResponse.json(
        { error: 'Current image and edit prompt are required' },
        { status: 400 }
      )
    }

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    }
    
    const model = 'gemini-2.5-flash-image-preview'
    
    // Convert the current image URL to base64 if it's a data URL
    let imageData = currentImage
    if (currentImage.startsWith('data:image/')) {
      imageData = currentImage.split(',')[1]
      console.log('Converted data URL to base64, length:', imageData.length)
    } else {
      console.log('Image is not a data URL, using as-is')
    }

    // Enhance the edit prompt with critical requirements
    const enhancedEditPrompt = `${editPrompt}
    
    CRITICAL REQUIREMENTS:
    - DO NOT MAKE IT A MOCKUP, THERE SHOULD BE NOTHING ON THE IMAGE OTHER THAN THE SITE ALL THE WAY TO THE EDGES
    - DO NOT INCLUDE THE BROWSER HEADER, JUST THE SITES
    - NO BUFFER, NO BORDER, NO PADDING AROUND THE SITE CONTENT
    - FILL THE ENTIRE 1024x1024 IMAGE EDGE TO EDGE WITH WEBSITE CONTENT ONLY
    - DO A VERY GOOD JOB, DO NOT BE AFRAID TO BE CREATIVE
    - ASSUME EVERYTHING THE USER ASKS FOR OR CLICKS ON EXISTS IN THE MOST INTERESTING WAY POSSIBLE
    
    Fill the entire 1024x1024 image with just the website content, edge to edge, no buffer or border around the site content.`

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: enhancedEditPrompt,
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageData
            }
          }
        ],
      },
    ]

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    })

    let generatedImageData: any = null
    let textResponse = ''

    for await (const chunk of response) {
      if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
        continue
      }
      
      if (chunk.candidates[0].content.parts[0].inlineData) {
        generatedImageData = chunk.candidates[0].content.parts[0].inlineData
      } else if (chunk.text) {
        textResponse += chunk.text
      }
    }

    if (!generatedImageData) {
      throw new Error('No edited image generated')
    }

    // Convert base64 to buffer and return
    const buffer = Buffer.from(generatedImageData.data, 'base64')
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': generatedImageData.mimeType || 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Error editing image with Gemini:', error)
    return NextResponse.json(
      { error: 'Failed to edit image' },
      { status: 500 }
    )
  }
}
