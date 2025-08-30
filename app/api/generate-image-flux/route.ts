import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
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

    console.log('Flux generation request received:', prompt)
    
    // Enhanced prompt for website generation
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
    
    // Use Flux Dev for high-quality text-to-image generation
    const output = await replicate.run(
      "black-forest-labs/flux-dev",
      {
        input: {
          prompt: enhancedPrompt,
          aspect_ratio: "1:1",
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
