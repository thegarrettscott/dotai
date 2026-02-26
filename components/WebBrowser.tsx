'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useImageAPI } from '@/hooks/useImageAPI'
import { useTextAnalysis } from '@/hooks/useTextAnalysis'
import { useClickDetection } from '@/hooks/useClickDetection'
import { useInputDetection } from '@/hooks/useInputDetection'
import { InvisibleTextInput } from './InvisibleTextInput'

interface BrowserSession {
  id: string
  url: string
  imageUrl: string
  timestamp: Date
  clickHistory: ClickPoint[]
  initialPrompt: string
  inputFields: InputField[]
}

interface InputField {
  x: number
  y: number
  width: number
  height: number
  label: string
  type: string
}

interface ClickPoint {
  x: number
  y: number
  timestamp: Date
  description: string
  imageWithDot: string // The image with the red dot that was sent to the API
  textAnalysis?: string // GPT-4o analysis of what was clicked
  clickType?: 'button' | 'input' // Type of element clicked
  userText?: string // Text entered by user if input field was clicked
}

export function WebBrowser() {
  const [currentSession, setCurrentSession] = useState<BrowserSession | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [history, setHistory] = useState<BrowserSession[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'flux'>('gemini')
  const [textAssisted, setTextAssisted] = useState(false)
  const [inputDetectionEnabled, setInputDetectionEnabled] = useState(true)
  const [showTextInput, setShowTextInput] = useState(false)
  const [pendingClick, setPendingClick] = useState<{x: number, y: number, imageWithDot: string} | null>(null)
  const [clickPosition, setClickPosition] = useState<{x: number, y: number} | null>(null)
  const [inputValues, setInputValues] = useState<{ [key: number]: string }>({})
  const [showHistory, setShowHistory] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const { generateImage, editImage, preSearch } = useImageAPI()
  const { analyzePrompt, isAnalyzing } = useTextAnalysis()
  const { detectClickType, isDetecting } = useClickDetection()
  const { detectInputs, isDetectingInputs } = useInputDetection()

  // Helper function to create an image with text overlaid in input field positions
  const createImageWithTextOverlay = useCallback(async (imageUrl: string, x: number, y: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw the original image
        ctx?.drawImage(img, 0, 0)
        
        // Calculate actual pixel position
        const actualX = (x / 100) * img.width
        const actualY = (y / 100) * img.height
        
        // Draw red dot
        if (ctx) {
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.arc(actualX, actualY, 10, 0, 2 * Math.PI)
          ctx.fill()
          
          // Add white border
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 3
          ctx.stroke()
          
          // Overlay text directly on input field positions
          if (currentSession && Object.keys(inputValues).length > 0) {
            Object.entries(inputValues).forEach(([index, value]) => {
              if (value && value.trim()) {
                const input = currentSession.inputFields[parseInt(index)]
                if (input) {
                  // Calculate input field position on the image
                  const inputX = (input.x * img.width) + 5 // Small padding from edge
                  const inputY = (input.y * img.height) + (input.height * img.height * 0.7) // Center vertically in field
                  
                  // Set text style - scale font size to input field height
                  ctx.fillStyle = 'black'
                  const fontSize = Math.max(8, input.height * img.height * 0.6) // Scale to 60% of input height
                  ctx.font = `bold ${fontSize}px Arial`
                  ctx.textAlign = 'left'
                  ctx.textBaseline = 'middle'
                  
                  // Add white background for text readability
                  const textWidth = ctx.measureText(value).width
                  const textHeight = fontSize * 1.2
                  
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
                  ctx.fillRect(inputX - 2, inputY - textHeight/2 - 2, textWidth + 4, textHeight + 4)
                  
                  // Draw the text
                  ctx.fillStyle = 'black'
                  ctx.fillText(value, inputX, inputY)
                }
              }
            })
          }
        }
        
        // Convert to data URL
        resolve(canvas.toDataURL('image/png'))
      }
      
      img.src = imageUrl
    })
  }, [inputValues, currentSession])
  
  // Start the loading progress bar animation
  const startLoadingProgress = useCallback(() => {
    setLoadingProgress(0)
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
    
    let progress = 0
    loadingIntervalRef.current = setInterval(() => {
      progress += Math.random() * 8 + 2 // Random increment between 2-10
      if (progress >= 90) {
        progress = 90 // Cap at 90% until actually done
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
      }
      setLoadingProgress(progress)
    }, 300)
  }, [])

  // Complete the loading progress bar
  const completeLoadingProgress = useCallback(() => {
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
    setLoadingProgress(100)
    setTimeout(() => setLoadingProgress(0), 400) // Hide after completion animation
  }, [])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
    }
  }, [])

  // Initialize with blank state - no automatic Google homepage generation
  useEffect(() => {
    // Start with empty state - user will type URL to begin
    setCurrentSession(null)
    setHistory([])
    setHistoryIndex(-1)
    setUrlInput('')
  }, [])

  const navigateToUrl = async (url: string) => {
    if (!url.trim()) return
    
    try {
      setIsLoading(true)
      setError(null)
      startLoadingProgress()
      
      // Create a prompt based on the URL
      let prompt = ''
      if (url.toLowerCase().includes('google.com')) {
        prompt = 'Google homepage with search bar and Google logo'
      } else {
        // Extract domain and create a descriptive prompt
        const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        prompt = `Professional website for ${domain}. Create a modern, clean homepage design`
      }
      
      // Pre-search: let Gemini Flash decide if web search is needed for context
      const context = await preSearch(url, prompt)
      
      // Generate image with context and screen dimensions
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const imageData = await generateImage(prompt, provider, { context, screenWidth, screenHeight })
      
      // Detect input fields in the generated image
      const inputDetection = await detectInputs(imageData)
      
      const newSession: BrowserSession = {
        id: Date.now().toString(),
        url: url,
        imageUrl: imageData,
        timestamp: new Date(),
        clickHistory: [],
        initialPrompt: prompt,
        inputFields: inputDetection.inputs || []
      }
      
      // Add to history and update current session
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newSession)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      setCurrentSession(newSession)
      setInputValues({}) // Clear input values for new page
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to navigate to URL')
    } finally {
      completeLoadingProgress()
      setIsLoading(false)
    }
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (urlInput.trim()) {
      navigateToUrl(urlInput.trim())
    }
  }

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentSession(history[newIndex])
      setUrlInput(history[newIndex].url)
      setInputValues({}) // Clear input values when navigating
    }
  }

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentSession(history[newIndex])
      setUrlInput(history[newIndex].url)
      setInputValues({}) // Clear input values when navigating
    }
  }

  const refresh = async () => {
    if (currentSession) {
      await navigateToUrl(currentSession.url)
    }
  }

  const handleImageClick = async (x: number, y: number, absoluteX: number, absoluteY: number) => {
    if (!currentSession) return
    
    try {
      setIsLoading(true)
      setError(null)
      startLoadingProgress()
      
      // Create image with text overlay
      const imageWithDot = await createImageWithTextOverlay(currentSession.imageUrl, x, y)
      
      // Check if click is on an input field
      const clickedInput = currentSession.inputFields.find(input => {
        const inputLeft = input.x * 100
        const inputRight = inputLeft + (input.width * 100)
        const inputTop = input.y * 100
        const inputBottom = inputTop + (input.height * 100)
        
        return x >= inputLeft && x <= inputRight && y >= inputTop && y <= inputBottom
      })
      
      if (clickedInput) {
        // Input fields are now interactive, so just focus them
        // The actual input handling is done by the input elements themselves
        setIsLoading(false)
        return
      }
      
      // If not an input field, proceed with normal image generation
      await processClickAsButton(x, y, imageWithDot)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process click')
      completeLoadingProgress()
      setIsLoading(false)
    }
  }

  const processClickAsButton = async (x: number, y: number, imageWithDot: string, userText?: string) => {
    if (!currentSession) return
    
    try {
      let textAnalysis = ''
      
      // If text-assisted mode is enabled, get GPT-4o analysis of the click
      if (textAssisted) {
        const analysis = await analyzePrompt(currentSession.initialPrompt, 'edit', { x, y })
        if (analysis) {
          textAnalysis = analysis.analysis
        }
      }
      
      const clickPoint: ClickPoint = {
        x,
        y,
        timestamp: new Date(),
        description: `User clicked at position (${x}, ${y})`,
        imageWithDot: imageWithDot,
        textAnalysis: textAnalysis,
        clickType: 'button',
        userText: userText
      }
      
      // Create system prompt for the edit with specific coordinates
      let editPrompt = `The user clicked at position notated by the red dot on this website image. 
      
      CRITICAL REQUIREMENTS:
      - DO NOT MAKE IT A MOCKUP, THERE SHOULD BE NOTHING ON THE IMAGE OTHER THAN THE SITE ALL THE WAY TO THE EDGES
      - DO NOT INCLUDE THE BROWSER HEADER, JUST THE SITES
      - NO BUFFER, NO BORDER, NO PADDING AROUND THE SITE CONTENT
      - FILL THE ENTIRE 1024x1024 IMAGE EDGE TO EDGE WITH WEBSITE CONTENT ONLY
      - DO A VERY GOOD JOB, DO NOT BE AFRAID TO BE CREATIVE
      - ASSUME EVERYTHING THE USER ASKS FOR OR CLICKS ON EXISTS IN THE MOST INTERESTING WAY POSSIBLE
      
      IMPORTANT: Make DRAMATIC and OBVIOUS changes to this website. Either:
      1. Navigate to a completely different page (like product page, cart, contact page, etc.)
      2. Add significant new content sections, menus, or elements
      3. Change the layout substantially 
      4. Show a modal, popup, or overlay
      
      Think about what would normally happen to a website if the user clicked on the element shown via the red dot. Make the change VERY obvious and dramatic.
      
      Original prompt: "${currentSession.initialPrompt}"`
      
      // Add user text if provided
      if (userText) {
        editPrompt += `\n\nUser entered text: "${userText}"`
      }
      
      editPrompt += `\n\nGenerate a completely new and visibly different 1024x1024 website image that shows major evolution. Fill the entire image edge to edge with website content only.`
      
      // If text-assisted mode is enabled, enhance the prompt with GPT-4o analysis
      if (textAssisted && textAnalysis) {
        editPrompt = `${editPrompt}\n\nClick Analysis: ${textAnalysis}`
      }
      
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const newImageData = await editImage(imageWithDot, editPrompt, provider, { screenWidth, screenHeight })
      
      // Detect input fields in the new image
      const inputDetection = await detectInputs(newImageData)
      
      const updatedSession: BrowserSession = {
        ...currentSession,
        imageUrl: newImageData,
        clickHistory: [...currentSession.clickHistory, clickPoint],
        inputFields: inputDetection.inputs || [],
        timestamp: new Date()
      }
      
      setCurrentSession(updatedSession)
      
      // Update history with the new session
      const newHistory = [...history]
      newHistory[historyIndex] = updatedSession
      setHistory(newHistory)
      
      // Clear input values for new page
      setInputValues({})
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit image')
    } finally {
      completeLoadingProgress()
      setIsLoading(false)
    }
  }

  const handleTextSubmit = async (text: string) => {
    if (!pendingClick) return
    
    setShowTextInput(false)
    setClickPosition(null)
    
    // Process the click with the user's text
    await processClickAsButton(pendingClick.x, pendingClick.y, pendingClick.imageWithDot, text)
    
    setPendingClick(null)
  }

  const handleTextCancel = () => {
    setShowTextInput(false)
    setClickPosition(null)
    setPendingClick(null)
    setIsLoading(false)
  }

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-screen flex flex-col">
      {/* Browser Toolbar */}
      <div className="bg-gray-200 border-b border-gray-300 p-2 flex-shrink-0">
        {/* Title Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <h2 className="text-sm font-semibold text-black">This Internet Does Not Exist</h2>
          <div className="w-12"></div>
        </div>
        
        {/* Navigation Bar */}
        <div className="flex items-center space-x-2">
          {/* Back/Forward Buttons */}
          <button
            onClick={goBack}
            disabled={!canGoBack || isLoading}
            className={`p-2 rounded ${
              canGoBack && !isLoading
                ? 'bg-gray-300 hover:bg-gray-400 text-black'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Go back"
          >
            ←
          </button>
          
          <button
            onClick={goForward}
            disabled={!canGoForward || isLoading}
            className={`p-2 rounded ${
              canGoForward && !isLoading
                ? 'bg-gray-300 hover:bg-gray-400 text-black'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Go forward"
          >
            →
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className={`p-2 rounded ${
              !isLoading
                ? 'bg-gray-300 hover:bg-gray-400 text-black'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Refresh"
          >
            ⟳
          </button>
          
          {/* URL Bar */}
          <form onSubmit={handleUrlSubmit} className="flex-1 flex">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL or search term..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-black"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </form>
          
          

        </div>
      </div>
      
      {/* Network Loading Progress Bar */}
      <div className="relative flex-shrink-0" style={{ height: loadingProgress > 0 ? '3px' : '0px' }}>
        {loadingProgress > 0 && (
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600"
            style={{
              width: `${loadingProgress}%`,
              transition: loadingProgress === 100 ? 'width 0.2s ease-out, opacity 0.3s ease-out' : 'width 0.4s ease-out',
              opacity: loadingProgress === 100 ? 0 : 1,
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.6), 0 0 4px rgba(59, 130, 246, 0.4)',
            }}
          />
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-sm">⚠️ {error}</span>
          </div>
        </div>
      )}
      
      {/* Website Display */}
      <div className="flex-1 bg-white overflow-auto">
        {currentSession ? (
          <div className="relative w-full aspect-[16/9] overflow-hidden">
            <img
              src={currentSession.imageUrl}
              alt={`Website: ${currentSession.url}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={(e) => {
                if (isLoading) return // Prevent clicks while loading
                // Check if click is on an input field
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                
                const clickedInput = currentSession.inputFields.find(input => {
                  const inputLeft = input.x * 100
                  const inputRight = inputLeft + (input.width * 100)
                  const inputTop = input.y * 100
                  const inputBottom = inputTop + (input.height * 100)
                  
                  return x >= inputLeft && x <= inputRight && y >= inputTop && y <= inputBottom
                })
                
                // Only handle image clicks if not on an input field
                if (!clickedInput) {
                  handleImageClick(x, y, e.clientX, e.clientY)
                }
              }}
              style={{ 
                minHeight: '100%',
                objectFit: 'contain',
                filter: isLoading ? 'blur(6px) brightness(0.85)' : 'none',
                transition: 'filter 0.4s ease-in-out',
                pointerEvents: isLoading ? 'none' : 'auto',
              }}
            />
            
            {/* Loading overlay with spinner */}
            {isLoading && (
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ pointerEvents: 'none' }}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-5 shadow-xl flex items-center space-x-4">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }}></div>
                  <span className="text-gray-700 font-medium text-sm">Loading page...</span>
                </div>
              </div>
            )}
            
            {/* Interactive Input Fields */}
            {currentSession.inputFields.map((input, index) => (
              <div
                key={index}
                className="absolute"
                style={{
                  left: `${input.x * 100}%`,
                  top: `${input.y * 100}%`,
                  width: `${input.width * 100}%`,
                  height: `${input.height * 100}%`,
                }}
              >
                <input
                  type={input.type}
                  placeholder={input.label}
                  value={inputValues[index] || ''}
                  className="w-full h-full text-black text-sm px-2 py-1 rounded-none focus:outline-none placeholder-transparent"
                  style={{
                    fontSize: `${Math.max(8, input.height * 400)}px`, // Scale to input field height
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'black',
                    textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8)',
                    fontWeight: '500',
                  }}
                  onFocus={(e) => {
                    e.target.select()
                  }}
                  onChange={(e) => {
                    setInputValues(prev => ({
                      ...prev,
                      [index]: e.target.value
                    }))
                  }}
                />
              </div>
            ))}
            
            {/* Click History Overlay */}
            {currentSession.clickHistory.map((click, index) => (
              <div
                key={index}
                className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none"
                style={{
                  left: `${click.x}%`,
                  top: `${click.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                title={`Click ${index + 1}: ${click.description}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-black">
            Enter a URL to browse the AI web
          </div>
        )}
      </div>
      
      {/* Click History Section */}
      {showHistory && currentSession && currentSession.clickHistory.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-300 p-4 flex-shrink-0">
          <h3 className="font-semibold text-black mb-3">Click History</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentSession.clickHistory.map((click, index) => (
              <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                <div className="mb-2">
                  <h4 className="font-medium text-black">Click {index + 1}</h4>
                  <p className="text-xs text-gray-600">
                    Position: ({Math.round(click.x)}, {Math.round(click.y)})
                  </p>
                  <p className="text-xs text-gray-600">
                    Time: {click.timestamp.toLocaleTimeString()}
                  </p>
                  {click.clickType && (
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        click.clickType === 'input' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {click.clickType === 'input' ? '📝 Input Field' : '🔘 Button'}
                      </span>
                    </div>
                  )}
                  {click.userText && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                      <p className="text-xs font-medium text-blue-800 mb-1">User Text:</p>
                      <p className="text-xs text-blue-700">"{click.userText}"</p>
                    </div>
                  )}
                  {click.textAnalysis && (
                    <div className="mt-2 p-2 bg-green-50 rounded border-l-2 border-green-400">
                      <p className="text-xs font-medium text-green-800 mb-1">AI Analysis:</p>
                      <p className="text-xs text-green-700">{click.textAnalysis}</p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <img
                    src={click.imageWithDot}
                    alt={`Website with dot at click ${index + 1}`}
                    className="w-full h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    title={`Click to view full size - ${click.description}`}
                    style={{ maxWidth: '150px', height: 'auto' }}
                  />
                  <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                    #{index + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Status Bar */}
      <div className="bg-gray-100 border-t border-gray-300 px-4 py-2 text-xs text-black flex-shrink-0">
        <div className="flex justify-between items-center">
          <span>
            {currentSession ? `Loaded: ${currentSession.url}` : 'Ready'}
            {currentSession && currentSession.inputFields.length > 0 && (
              <span className="ml-2 text-blue-600">
                | Inputs: {currentSession.inputFields.length}
              </span>
            )}
          </span>
          <div className="flex items-center space-x-4">
            <span>
              History: {historyIndex + 1} / {history.length} | Clicks: {currentSession?.clickHistory.length || 0}
            </span>
            {currentSession && currentSession.clickHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  showHistory 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
                title={showHistory ? 'Hide click history' : 'Show click history'}
              >
                {showHistory ? 'Hide History' : 'Show History'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Invisible Text Input Modal */}
      <InvisibleTextInput
        isVisible={showTextInput}
        clickPosition={clickPosition}
        onTextSubmit={handleTextSubmit}
        onCancel={handleTextCancel}
        placeholder="Enter the text you want to add to the input field..."
      />
    </div>
  )
}
