import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, currentImage, clickPosition } = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    let systemPrompt = ''
    let userPrompt = ''

    if (type === 'initial') {
      // For initial website generation
      systemPrompt = `You are a UX/UI expert who analyzes user intentions and suggests ideal website designs. Your job is to:

1. Understand what the user is trying to accomplish
2. Think about what the ideal UI would be for their use case
3. Suggest key design elements and layout considerations
4. DO NOT make specific design decisions - leave that to the image generation AI

Keep your response under 2 paragraphs. Focus on user intent and ideal UI structure, not visual design details.`

      userPrompt = `User wants to create: "${prompt}"

Analyze what they're trying to accomplish and what the ideal UI structure would be for this use case. Consider:
- What is the primary user goal?
- What key sections/elements would be most important?
- What would make this website most effective for its purpose?

Respond with a brief analysis (under 2 paragraphs) that explains the user's intent and suggests the ideal UI approach.`

    } else if (type === 'edit') {
      // For image editing after user clicks
      systemPrompt = `You are a UX/UI expert who analyzes user interactions and predicts what should happen next. Your job is to:

1. Analyze what the user clicked on based on the red dot position
2. Explain what should logically happen next in the user journey
3. Suggest the ideal next state or page for this interaction
4. DO NOT make specific design decisions - leave that to the image generation AI

Keep your response under 2 paragraphs. Focus on user intent and logical next steps.`

      userPrompt = `The user clicked on a website at position (${clickPosition?.x || 'unknown'}, ${clickPosition?.y || 'unknown'}) marked by a red dot.

Original website concept: "${prompt}"

Analyze what the user likely clicked on and what should happen next. Consider:
- What UI element was probably at that click position?
- What would be the logical next step in the user journey?
- What page, section, or interaction should follow?

Respond with a brief analysis (under 2 paragraphs) explaining what was clicked and what should happen next.`
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    })

    const analysis = response.choices[0]?.message?.content

    if (!analysis) {
      throw new Error('No analysis generated')
    }

    return NextResponse.json({ 
      analysis,
      originalPrompt: prompt,
      type 
    })

  } catch (error) {
    console.error('Error analyzing prompt with GPT-4o:', error)
    return NextResponse.json(
      { error: 'Failed to analyze prompt' },
      { status: 500 }
    )
  }
}
