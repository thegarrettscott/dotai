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
    
    // Use Flux Dev for high-quality text-to-image generation
    const output = await replicate.run(
      "black-forest-labs/flux-dev",
      {
        input: {
          prompt: prompt,
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
