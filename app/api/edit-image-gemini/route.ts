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

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: editPrompt,
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
