import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const { currentImage, editPrompt } = await request.json()
    
    console.log('Flux Dev edit request received')
    console.log('Edit prompt:', editPrompt)
    console.log('Current image type:', typeof currentImage)
    
    if (!currentImage || !editPrompt) {
      return NextResponse.json(
        { error: 'Current image and edit prompt are required' },
        { status: 400 }
      )
    }

    // Enhance the edit prompt with critical requirements
    const enhancedEditPrompt = `${editPrompt}
    
    CRITICAL REQUIREMENTS:
    - DO NOT MAKE IT A MOCKUP, THERE SHOULD BE NOTHING ON THE IMAGE OTHER THAN THE SITE ALL THE WAY TO THE EDGES
    - DO NOT INCLUDE THE BROWSER HEADER, JUST THE SITES
    - DO A VERY GOOD JOB, DO NOT BE AFRAID TO BE CREATIVE
    - ASSUME EVERYTHING THE USER ASKS FOR OR CLICKS ON EXISTS IN THE MOST INTERESTING WAY POSSIBLE
    
    Fill the entire 1024x1024 image with just the website content, edge to edge.`

    // Use Flux Dev for high-quality image-to-image generation
    const output = await replicate.run(
      "black-forest-labs/flux-dev",
      {
        input: {
          prompt: enhancedEditPrompt,
          image: currentImage, // Use standard "image" field for Flux Dev
          aspect_ratio: "1:1",
          num_outputs: 1,
          output_format: "png",
          output_quality: 90
        }
      }
    ) as string[]

    console.log('Flux Dev response:', output)
    
    if (!output || !output[0]) {
      throw new Error('No edited image generated from Flux Dev')
    }

    // Fetch the image and convert to base64 for consistency
    const imageResponse = await fetch(output[0])
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`
    
    console.log('✅ Successfully processed Flux Dev image-to-image')
    return NextResponse.json({ imageUrl: dataUrl })

  } catch (error) {
    console.error('Error editing image with Flux Dev:', error)
    return NextResponse.json(
      { error: 'Failed to edit image' },
      { status: 500 }
    )
  }
}
