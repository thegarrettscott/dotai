import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, screenWidth, screenHeight } = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const w = screenWidth || 1920
    const h = screenHeight || 1080

    console.log('Flux generation request received:', prompt)
    
    // Build context section if pre-search returned data
    const contextSection = context
      ? `\n\nREAL WEBSITE DATA (use this to make the image accurate):\n${context}`
      : ''
    
    // ULTRA-AGGRESSIVE prompt for edge-to-edge website generation
    const enhancedPrompt = `CRITICAL: Generate a FULL-SCREEN website that fills EVERY PIXEL of the ${w}x${h} screen. ${prompt}${contextSection}

    MANDATORY EDGE-TO-EDGE REQUIREMENTS:
    - ABSOLUTELY NO WHITE SPACE, NO MARGINS, NO PADDING, NO BORDERS
    - WEBSITE CONTENT MUST START AT PIXEL (0,0) AND END AT PIXEL (${w},${h})
    - NO BROWSER CHROME, NO ADDRESS BAR, NO SCROLLBARS, NO UI ELEMENTS
    - NO MOCKUP FRAMES, NO DEVICE FRAMES, NO SHADOWS, NO BACKGROUNDS
    - THE WEBSITE MUST OCCUPY THE ENTIRE IMAGE CANVAS
    - EVERY SINGLE PIXEL MUST BE PART OF THE WEBSITE CONTENT
    - NO EMPTY SPACE ANYWHERE - FILL EVERY CORNER, EVERY EDGE
    - WEBSITE HEADER STARTS AT THE VERY TOP (Y=0)
    - WEBSITE FOOTER ENDS AT THE VERY BOTTOM (Y=${h})
    - CONTENT EXTENDS TO THE LEFT EDGE (X=0) AND RIGHT EDGE (X=${w})
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
    - NO "LOREM IPSUM" OR PLACEHOLDER TEXT - USE REAL CONTENT
    
    LOGIN PAGE HANDLING:
    - SKIP ALL LOGIN PAGES - DO NOT GENERATE LOGIN OR SIGN-IN SCREENS
    - IF THE USER REQUESTS A PAGE THAT WOULD NORMALLY REQUIRE LOGIN, SHOW THE LOGGED-IN VERSION
    - ASSUME THE USER IS ALREADY AUTHENTICATED AND LOGGED IN
    - SHOW THE MAIN CONTENT/DASHBOARD/ACCOUNT PAGE INSTEAD OF LOGIN FORMS
    - NEVER SHOW "SIGN IN", "LOG IN", OR AUTHENTICATION SCREENS`
    
    // Use Flux Dev for high-quality text-to-image generation
    const output = await replicate.run(
      "black-forest-labs/flux-dev",
      {
        input: {
          prompt: enhancedPrompt,
          aspect_ratio: "16:9",
          num_outputs: 1,
          output_format: "png",
          output_quality: 90
        }
      }
    ) as string[]

    console.log('Flux generation response:', output)
    
    if (!output || !output[0]) {
      throw new Error('No image generated from Flux')
    }

    // Fetch the image and convert to base64 for consistency
    const imageResponse = await fetch(output[0])
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`
    
    console.log('✅ Successfully processed Flux image generation')
    return NextResponse.json({ imageUrl: dataUrl })

  } catch (error) {
    console.error('Error generating image with Flux:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
