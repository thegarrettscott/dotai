import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const provider = body.provider || process.env.IMAGE_PROVIDER || 'openai'
    
    console.log('Using image provider for editing:', provider)
    
    // Route to the appropriate provider
    if (provider === 'openai') {
      // Forward to OpenAI endpoint
      const openaiResponse = await fetch(`${request.nextUrl.origin}/api/edit-image-openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json()
        return NextResponse.json(errorData, { status: openaiResponse.status })
      }
      
      // Check if response is JSON (base64 data) or blob
      const contentType = openaiResponse.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // OpenAI returns JSON with base64 imageUrl, forward as-is
        const jsonData = await openaiResponse.json()
        return NextResponse.json(jsonData)
      } else {
        // Handle blob response
        const imageBuffer = await openaiResponse.arrayBuffer()
        return new NextResponse(Buffer.from(imageBuffer), {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
        } else if (provider === 'flux') {
      // Forward to Flux endpoint
      const fluxResponse = await fetch(`${request.nextUrl.origin}/api/edit-image-flux`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (!fluxResponse.ok) {
        const errorData = await fluxResponse.json()
        return NextResponse.json(errorData, { status: fluxResponse.status })
      }
      
      const jsonData = await fluxResponse.json()
      return NextResponse.json(jsonData)
    } else {
      // Forward to Gemini endpoint
      const geminiResponse = await fetch(`${request.nextUrl.origin}/api/edit-image-gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json()
        return NextResponse.json(errorData, { status: geminiResponse.status })
      }
      
      const imageBuffer = await geminiResponse.arrayBuffer()
      return new NextResponse(Buffer.from(imageBuffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }

  } catch (error) {
    console.error('Error in image editing router:', error)
    return NextResponse.json(
      { error: 'Failed to edit image' },
      { status: 500 }
    )
  }
}
