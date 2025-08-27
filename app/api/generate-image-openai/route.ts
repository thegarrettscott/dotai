import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    
    console.log('OpenAI image generation request:', prompt)
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Enhanced prompt for website generation
    const enhancedPrompt = `Generate a modern, professional website design as a single webpage screenshot. ${prompt}. 
    The design should be clean, modern, and look like a real website with:
    - A header with navigation
    - Hero section with compelling content
    - Well-organized sections
    - Professional typography and spacing
    - Modern color scheme and layout
    - Responsive design elements
    - High-quality, polished appearance
    Make it look like a screenshot of an actual website, not a mockup or wireframe.`

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    })

    console.log('OpenAI response structure:', JSON.stringify(response, null, 2))
    
    // gpt-image-1 returns base64 data directly in the response
    if (response.data && response.data[0] && response.data[0].b64_json) {
      const base64Image = response.data[0].b64_json
      const imageUrl = `data:image/png;base64,${base64Image}`
      console.log('✅ Successfully extracted base64 image from gpt-image-1')
      return NextResponse.json({ imageUrl })
    }
    
    // Fallback to URL if available
    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      console.error('No image data found. Full response:', response)
      throw new Error('No image data returned from OpenAI')
    }

    console.log('Image URL found:', imageUrl)

    // Fetch the image and return it as a blob
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    
    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Error generating image with OpenAI:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
