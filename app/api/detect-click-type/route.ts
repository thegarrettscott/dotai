import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { imageData, clickPosition, originalPrompt, currentUrl, clickDescription } = await request.json()
    
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
          content: `You are a UI/UX expert who analyzes website screenshots to identify interactive elements and predict navigation behavior. Your job is to:

1. Determine if a clicked area is a button or an input field
2. If it's a button, determine if clicking it would navigate to a new page
3. If it would navigate to a new page, suggest an appropriate URL for that new page

IMPORTANT: Be decently conservative. Default to "button" unless you are absolutely certain the clicked area is a text input field.

For navigation prediction, consider:
- Navigation menus, links, buttons that would take you to different sections
- "Home", "About", "Contact", "Products", "Services", "Login", "Sign Up", etc.
- Shopping cart, checkout, product pages
- Search results, category pages
- Social media links, external links

Respond in this exact JSON format:
{
  "clickType": "button" or "input",
  "willNavigate": true or false,
  "newUrl": "suggested-url-if-navigating" or null,
  "pageName": "descriptive-name-for-new-page" or null
}

Only set willNavigate to true if you're confident the click would take the user to a different page.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this website screenshot. The user clicked at position (${clickPosition.x}, ${clickPosition.y}) marked by a red dot. 

Click description: "${clickDescription || 'User clicked on an element'}"

Current URL: "${currentUrl || 'unknown'}"

Original website concept: "${originalPrompt || 'website'}"

Determine the click type and if it would navigate to a new page. Respond with the JSON format specified.`
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
      max_tokens: 200,
      temperature: 0.1
    })

    const responseText = response.choices[0]?.message?.content?.trim()
    const confidence = response.choices[0]?.finish_reason === 'stop' ? 'high' : 'low'

    if (!responseText) {
      // Default response if no content
      return NextResponse.json({ 
        clickType: 'button',
        willNavigate: false,
        newUrl: null,
        pageName: null,
        confidence: 'low'
      })
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(responseText)
      
      // Validate the response structure
      if (parsed.clickType && (parsed.clickType === 'button' || parsed.clickType === 'input')) {
        return NextResponse.json({
          clickType: parsed.clickType,
          willNavigate: parsed.willNavigate || false,
          newUrl: parsed.newUrl || null,
          pageName: parsed.pageName || null,
          confidence
        })
      }
    } catch (error) {
      console.log('Failed to parse JSON response, falling back to text parsing:', responseText)
    }

    // Fallback: try to extract clickType from text response
    const clickType = responseText.toLowerCase().includes('input') ? 'input' : 'button'
    
    return NextResponse.json({ 
      clickType,
      willNavigate: false,
      newUrl: null,
      pageName: null,
      confidence: 'low'
    })

  } catch (error) {
    console.error('Error detecting click type with GPT-4o:', error)
    // Default to button on error
    return NextResponse.json({ 
      clickType: 'button',
      willNavigate: false,
      newUrl: null,
      pageName: null,
      confidence: 'low'
    })
  }
}
