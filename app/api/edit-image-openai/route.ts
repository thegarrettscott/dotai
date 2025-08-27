import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { currentImage, editPrompt } = await request.json()
    
    console.log('OpenAI image edit request received')
    console.log('Edit prompt:', editPrompt)
    console.log('Current image type:', typeof currentImage)
    
    if (!currentImage || !editPrompt) {
      return NextResponse.json(
        { error: 'Current image and edit prompt are required' },
        { status: 400 }
      )
    }

    // Convert data URL to buffer for gpt-image-1 edits endpoint
    let imageBuffer: Buffer
    if (currentImage.startsWith('data:image/')) {
      const base64Data = currentImage.split(',')[1]
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else {
      // If it's a URL, fetch it
      const imageResponse = await fetch(currentImage)
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    }

    console.log('Edit prompt being sent to gpt-image-1:', editPrompt)
    
    // Use gpt-image-1 with the /images/edits endpoint
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: new File([imageBuffer], 'image.png', { type: 'image/png' }),
      prompt: editPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
      input_fidelity: "low", // Allow more creative changes
      background: "opaque", // Ensure solid background
    })

    console.log('OpenAI gpt-image-1 edit response structure:', JSON.stringify(response, null, 2))
    
    // gpt-image-1 returns base64 data directly in the response
    if (response.data && response.data[0] && response.data[0].b64_json) {
      const base64Image = response.data[0].b64_json
      const imageUrl = `data:image/png;base64,${base64Image}`
      console.log('✅ Successfully extracted base64 image from gpt-image-1 image-to-image')
      console.log('Original image length:', currentImage.length)
      console.log('Generated image length:', base64Image.length)
      console.log('Images are identical:', base64Image === currentImage.split(',')[1])
      return NextResponse.json({ imageUrl })
    }
    
    // Fallback to URL if available
    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      console.error('No image data found in response. Full response:', response)
      throw new Error('No image data returned from OpenAI')
    }

    // Fetch the image and convert to base64 for consistency
    const imageResponse = await fetch(imageUrl)
    const imageArrayBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageArrayBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`
    
    console.log('✅ Successfully processed OpenAI gpt-image-1 image-to-image')
    return NextResponse.json({ imageUrl: dataUrl })

  } catch (error) {
    console.error('Error editing image with OpenAI:', error)
    return NextResponse.json(
      { error: 'Failed to edit image' },
      { status: 500 }
    )
  }
}
