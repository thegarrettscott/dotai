import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json()
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Convert image data to base64 if it's a data URL
    let base64Image = imageData
    if (imageData.startsWith('data:image/')) {
      base64Image = imageData.split(',')[1]
    }

    const config = {
      responseModalities: ['TEXT'],
    }
    
    const model = 'gemini-2.5-flash-image-preview'
    
    const prompt = `Analyze this website screenshot and identify all text input fields, search boxes, text areas, and form inputs. 

For each input field you find, provide the exact bounding box coordinates in this JSON format:
{
  "inputs": [
    {
      "x": 0.25,
      "y": 0.15,
      "width": 0.5,
      "height": 0.08,
      "label": "Search box",
      "type": "search"
    }
  ]
}

Coordinates should be normalized (0.0 to 1.0) where:
- x, y = top-left corner position
- width, height = dimensions
- label = descriptive name for the input
- type = "search", "text", "email", "password", "textarea", etc.

Only include actual input fields that users can type into. Do not include buttons, labels, or other UI elements.

Respond with ONLY the JSON, no other text.`

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image,
            },
          },
        ],
      },
    ]

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    })

    let responseText = ''
    for await (const chunk of response) {
      if (chunk.text) {
        responseText += chunk.text
      }
    }
    
    try {
      // Remove markdown code blocks if present
      let cleanResponse = responseText.trim()
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const parsed = JSON.parse(cleanResponse)
      
      if (parsed.inputs && Array.isArray(parsed.inputs)) {
        return NextResponse.json({
          inputs: parsed.inputs.map((input: any) => ({
            x: input.x || 0,
            y: input.y || 0,
            width: input.width || 0.1,
            height: input.height || 0.05,
            label: input.label || 'Input field',
            type: input.type || 'text'
          }))
        })
      }
    } catch (error) {
      console.log('Failed to parse JSON response:', responseText)
    }

    // Fallback: return empty inputs array
    return NextResponse.json({ inputs: [] })

  } catch (error) {
    console.error('Error detecting inputs with Gemini:', error)
    return NextResponse.json({ 
      inputs: [],
      error: 'Failed to detect inputs'
    })
  }
}
