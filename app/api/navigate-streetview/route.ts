import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { originalImage, currentPanorama, targetLocation, currentLocation } = await request.json()

    console.log('Navigation API received:')
    console.log('- originalImage length:', originalImage?.length)
    console.log('- originalImage starts with:', originalImage?.substring(0, 50))
    console.log('- currentPanorama length:', currentPanorama?.length)
    console.log('- currentPanorama starts with:', currentPanorama?.substring(0, 50))
    console.log('- targetLocation:', targetLocation)

    if (!originalImage || !currentPanorama || !targetLocation) {
      return NextResponse.json(
        { success: false, error: 'Original image, current panorama, and target location are required' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Convert base64 images to the format Gemini expects
    const originalBase64 = originalImage.replace(/^data:image\/[a-z]+;base64,/, '')
    
    // Handle panorama - it might be a blob URL or base64
    let panoramaBase64 = currentPanorama
    if (currentPanorama.startsWith('blob:')) {
      console.error('Received blob URL instead of base64 for panorama:', currentPanorama)
      return NextResponse.json(
        { success: false, error: 'Invalid panorama format - expected base64, got blob URL' },
        { status: 400 }
      )
    }
    panoramaBase64 = currentPanorama.replace(/^data:image\/[a-z]+;base64,/, '')
    
    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    }
    
    const model = 'gemini-2.5-flash-image-preview'

    // Create a prompt for navigation-based panorama generation
    const prompt = `Generate a new 180-degree panoramic view for Street View navigation.

CONTEXT: 
- First image: Original scene with initial viewpoint
- Second image: Current 180° panorama with a RED DOT showing where the user wants to navigate
- Target: The RED DOT marks the exact location where the user wants to "walk" to

NAVIGATION TASK:
Generate a NEW 180° panoramic view as if the user has moved/walked to the RED DOT location. This should simulate moving through the environment like Google Street View.

REQUIREMENTS:
🚶 MOVEMENT SIMULATION:
- The RED DOT shows exactly where the user wants to move to
- Generate a new viewpoint as if walking/moving to that red dot location
- The new panorama should show the environment from that new position
- Maintain spatial consistency with the original scene

📐 PANORAMA SPECS:
- 180-degree panoramic image with 2:1 aspect ratio (2048x1024 pixels)
- Show what would be visible looking around from the new position
- Center: What's directly ahead from the new location
- Left/Right edges: 90° field of view in each direction
- Natural perspective with realistic depth

🌍 ENVIRONMENTAL CONTINUITY:
- Keep consistent lighting, time of day, and weather
- Maintain the same architectural style and environment type
- Objects and features should appear from the new perspective
- If moving closer to something, it should appear larger
- If moving away, things should appear smaller/more distant

🎯 SPATIAL LOGIC:
- If target was a doorway → show view from inside/through the doorway
- If target was a path → show view from further along the path  
- If target was an object → show view from closer to that object
- If target was empty space → show view from that position in the scene

Generate a realistic new 180° panoramic view that creates the illusion of having moved to the target location within the scene.`

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              data: originalBase64,
              mimeType: 'image/jpeg'
            }
          },
          {
            inlineData: {
              data: panoramaBase64,
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
      console.error('Gemini API failed to generate navigation panorama. Text response:', textResponse.substring(0, 200))
      throw new Error('No navigation panorama generated')
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
    console.error('Error generating navigation panorama:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate navigation panorama' 
      },
      { status: 500 }
    )
  }
}
