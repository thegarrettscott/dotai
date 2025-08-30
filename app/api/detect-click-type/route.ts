import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { imageData, clickPosition, originalPrompt } = await request.json()
    
    if (!imageData || !clickPosition) {
      return NextResponse.json(
        { error: 'Image data and click position are required' },
        { status: 400 }
      )
    }

    // Convert image data to base64 if it's a data URL
    let base64Image = imageData
    if (imageData.startsWith('data:image/')) {
      base64Image = imageData.split(',')[1]
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a UI/UX expert who analyzes website screenshots to identify interactive elements. Your job is to determine if a clicked area is a button or an input field.

IMPORTANT: Be VERY conservative. Default to "button" unless you are absolutely certain the clicked area is a text input field.

Respond with ONLY one word:
- "button" for buttons, links, navigation items, icons, images, or any clickable element (DEFAULT)
- "input" ONLY if you can clearly see a text input field, search box, or text area with visible input borders/placeholder text

When in doubt, always respond with "button". Only use "input" for obvious text input fields.

Do not provide explanations or additional text. Just respond with "button" or "input".`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this website screenshot. The user clicked at position (${clickPosition.x}, ${clickPosition.y}) marked by a red dot. 

Original website concept: "${originalPrompt || 'website'}"

Determine if the clicked area is a button or input field. Respond with only "button" or "input".`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 5,
      temperature: 0.0
    })

    const clickType = response.choices[0]?.message?.content?.toLowerCase().trim()
    const confidence = response.choices[0]?.finish_reason === 'stop' ? 'high' : 'low'

    if (!clickType || (clickType !== 'button' && clickType !== 'input')) {
      // Default to button if detection fails
      return NextResponse.json({ 
        clickType: 'button',
        confidence: 'low'
      })
    }

    // If it detected "input" but with low confidence, default to button
    if (clickType === 'input' && confidence === 'low') {
      return NextResponse.json({ 
        clickType: 'button',
        confidence: 'low'
      })
    }

    return NextResponse.json({ 
      clickType,
      confidence
    })

  } catch (error) {
    console.error('Error detecting click type with GPT-4o:', error)
    // Default to button on error
    return NextResponse.json({ 
      clickType: 'button',
      confidence: 'low'
    })
  }
}
