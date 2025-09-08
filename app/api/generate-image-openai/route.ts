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

    // ULTRA-AGGRESSIVE prompt for edge-to-edge website generation
    const enhancedPrompt = `CRITICAL: Generate a FULL-SCREEN website that fills EVERY PIXEL of the 1920x1080 laptop screen. ${prompt}

    MANDATORY EDGE-TO-EDGE REQUIREMENTS:
    - ABSOLUTELY NO WHITE SPACE, NO MARGINS, NO PADDING, NO BORDERS
    - WEBSITE CONTENT MUST START AT PIXEL (0,0) AND END AT PIXEL (1920,1080)
    - NO BROWSER CHROME, NO ADDRESS BAR, NO SCROLLBARS, NO UI ELEMENTS
    - NO MOCKUP FRAMES, NO DEVICE FRAMES, NO SHADOWS, NO BACKGROUNDS
    - THE WEBSITE MUST OCCUPY THE ENTIRE IMAGE CANVAS
    - EVERY SINGLE PIXEL MUST BE PART OF THE WEBSITE CONTENT
    - NO EMPTY SPACE ANYWHERE - FILL EVERY CORNER, EVERY EDGE
    - WEBSITE HEADER STARTS AT THE VERY TOP (Y=0)
    - WEBSITE FOOTER ENDS AT THE VERY BOTTOM (Y=1080)
    - CONTENT EXTENDS TO THE LEFT EDGE (X=0) AND RIGHT EDGE (X=1920)
    - VERTICAL FILL: Ensure content spans the FULL HEIGHT from top to bottom
    - NO GAPS, NO SPACING, NO MARGINS - PURE WEBSITE CONTENT ONLY
    - FILL THE ENTIRE VERTICAL SPACE - NO EMPTY AREAS TOP OR BOTTOM
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

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      n: 1,
      size: "1792x1024",
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
