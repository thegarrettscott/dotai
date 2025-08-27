import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json()
    
    if (!provider || !['openai', 'gemini'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "openai" or "gemini"' },
        { status: 400 }
      )
    }

    // In a real app, you'd update the environment variable or database
    // For now, we'll just return success
    console.log('Provider switched to:', provider)
    
    return NextResponse.json({ 
      success: true, 
      provider: provider,
      message: `Switched to ${provider.toUpperCase()} provider`
    })

  } catch (error) {
    console.error('Error setting provider:', error)
    return NextResponse.json(
      { error: 'Failed to set provider' },
      { status: 500 }
    )
  }
}
