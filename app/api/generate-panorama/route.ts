import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})



export async function POST(request: NextRequest) {
  try {
    const { image, clickPoint } = await request.json()

    if (!image || !clickPoint) {
      return NextResponse.json(
        { success: false, error: 'Image and click point are required' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Convert base64 image to the format Gemini expects
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '')
    
    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    }
    
    const model = 'gemini-2.5-flash-image-preview'

    // Create a prompt for 180° panorama generation
    const prompt = `Generate a 180-degree panoramic image with 2:1 aspect ratio (2048x1024 pixels) suitable for immersive viewing.

VIEWPOINT: The uploaded image shows a RED DOT - this is where the camera is positioned. Generate the panorama as if standing at that exact red dot location, looking forward.

180° PANORAMA REQUIREMENTS:
🔄 HORIZONTAL COVERAGE: Show a 180-degree field of view from the red dot position:
- Center: What's directly ahead from the red dot
- Left edge: 90° to the left of center
- Right edge: 90° to the right of center
- This creates a natural wide-angle view without wrapping around

🔄 VERTICAL COVERAGE:
- TOP of image: Sky/ceiling above the red dot
- MIDDLE of image: Horizon level view from the red dot  
- BOTTOM of image: Ground/floor below the red dot

PANORAMIC PROJECTION:
- Width represents 180° horizontal field of view
- Height represents vertical field of view (up/down)
- Natural perspective with slight wide-angle distortion
- Horizon should appear as a gentle curve or straight line across the middle
- ASPECT RATIO: 2:1 (width = 2 × height)

SCENE GENERATION:
- Analyze the environment around the red dot
- Generate what would logically exist in the 180° forward view
- Maintain consistent lighting, style, and atmosphere from the original image
- Include realistic environmental details (walls, furniture, landscape, etc.)
- Create immersive depth and realistic spatial relationships
- Ensure high detail and photorealistic quality

Generate a stunning 180° panoramic view that creates an immersive experience of standing at the red dot location and looking around in a natural 180-degree field of view.`

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
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
      console.error('Gemini API failed to generate panorama. Text response:', textResponse.substring(0, 200))
      throw new Error('No panorama image generated')
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
    console.error('Error generating panorama:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate panorama' 
      },
      { status: 500 }
    )
  }
}
