import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { url, prompt } = await request.json()
    
    if (!url && !prompt) {
      return NextResponse.json({ context: null })
    }

    const searchPrompt = `You are helping generate a realistic screenshot image of the website "${url || prompt}".

Decide if you need to search the web for current, real information about this website, company, or service to make the generated image more accurate and realistic.

Rules:
- If this is a very well-known, iconic website (Google, YouTube, Amazon, Netflix, Wikipedia, Reddit, Twitter/X, Facebook, Instagram) you likely know enough. Respond with exactly: NONE
- For everything else, search the web to find: what the site actually looks like, what it does, its brand colors, layout style, key features, products, pricing, and any distinctive design elements.
- Focus on VISUAL and CONTENT details that would help recreate the website as an image.

If no search is needed, respond with exactly: NONE

If you searched, provide a concise summary (2-4 sentences max) of the key visual and content details that would help create an accurate website screenshot. Include: brand colors, layout style, main content sections, navigation items, and any distinctive visual elements.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    })

    const text = response?.text?.trim()
    
    console.log('Pre-search result for', url || prompt, ':', text?.substring(0, 200))
    
    if (!text || text === 'NONE' || text.toUpperCase().startsWith('NONE')) {
      return NextResponse.json({ context: null })
    }
    
    return NextResponse.json({ context: text })
  } catch (error) {
    console.error('Pre-search error:', error)
    // Non-critical - return null context so image generation still works
    return NextResponse.json({ context: null })
  }
}
