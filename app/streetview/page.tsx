'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ClickPoint } from '../../components/WebsiteGenerator'

interface PanoramaViewerProps {
  panoramaUrl: string
  originalImage: string
  currentLocation: { x: number, y: number }
  onClose: () => void
  onNavigate: (targetX: number, targetY: number) => void
}

function PanoramaViewer({ panoramaUrl, originalImage, currentLocation, onClose, onNavigate }: PanoramaViewerProps) {
  const [rotation, setRotation] = useState({ yaw: 0, pitch: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationTarget, setNavigationTarget] = useState<{ x: number, y: number } | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setLastMouse({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - lastMouse.x
    const deltaY = e.clientY - lastMouse.y

    setRotation(prev => ({
      yaw: Math.max(-90, Math.min(90, prev.yaw + deltaX * 0.5)), // Limit to 180° (-90° to +90°)
      pitch: Math.max(-45, Math.min(45, prev.pitch + deltaY * 0.5)) // Limit vertical movement
    }))

    setLastMouse({ x: e.clientX, y: e.clientY })
  }, [isDragging, lastMouse])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)))
  }, [])

  const resetView = useCallback(() => {
    setRotation({ yaw: 0, pitch: 0 }) // Center the 180° view
    setZoom(1)
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    console.log('Double-click detected!', { isNavigating })
    
    if (isNavigating) {
      console.log('Navigation in progress, ignoring double-click')
      return
    }
    
    const rect = viewerRef.current?.getBoundingClientRect()
    if (!rect) {
      console.log('No viewer rect found')
      return
    }
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert to percentage coordinates
    const percentX = (x / rect.width) * 100
    const percentY = (y / rect.height) * 100
    
    console.log('Setting navigation target:', { percentX, percentY })
    setNavigationTarget({ x: percentX, y: percentY })
  }, [isNavigating])

  const navigateToLocation = useCallback(async (targetX: number, targetY: number) => {
    console.log('Starting navigation to:', { targetX, targetY })
    setIsNavigating(true)
    
    try {
      // Call the parent's navigation handler
      console.log('Calling onNavigate...')
      await onNavigate(targetX, targetY)
      console.log('Navigation completed successfully')
    } catch (error) {
      console.error('Navigation failed:', error)
    } finally {
      setNavigationTarget(null)
      setIsNavigating(false)
    }
  }, [onNavigate])

  // Handle navigation when target is set
  useEffect(() => {
    if (navigationTarget) {
      navigateToLocation(navigationTarget.x, navigationTarget.y)
    }
  }, [navigationTarget, navigateToLocation])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">🌍 AI Street View</h1>
          <div className="text-sm opacity-75">
            Drag to look around • Scroll to zoom
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetView}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
          >
            Reset View
          </button>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* 180° Panorama Viewer */}
      <div 
        ref={viewerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        {/* Panorama Container - 180° view with boundaries */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${panoramaUrl})`,
            backgroundSize: `${180 * zoom}% auto`, // 180° coverage instead of 360°
            backgroundPosition: `${50 + rotation.yaw * 0.5}% ${50 + rotation.pitch * 0.3}%`, // Center at 50% with movement
            backgroundRepeat: 'no-repeat', // Don't repeat - show boundaries
            transition: isDragging ? 'none' : 'background-position 0.1s ease-out',
            filter: 'brightness(1.05) contrast(1.02)',
            imageRendering: 'crisp-edges'
          }}
        />

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-4 h-4 border-2 border-white rounded-full opacity-50"></div>
        </div>

        {/* Navigation target indicator */}
        {navigationTarget && (
          <div 
            className="absolute w-8 h-8 pointer-events-none animate-pulse"
            style={{
              left: `${navigationTarget.x}%`,
              top: `${navigationTarget.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-full h-full bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        )}

        {/* Street View Navigation Arrows */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center gap-4 pointer-events-none">
          {/* Forward Arrow */}
          <div className="pointer-events-auto">
            <button
              className="w-16 h-16 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
              onClick={() => {
                // Move forward in the current direction
                const forwardX = 50 + Math.sin((rotation.yaw * Math.PI) / 180) * 30
                const forwardY = 50
                setNavigationTarget({ x: forwardX, y: forwardY })
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                <path d="M12 2L22 12L12 22L10.59 20.59L18.17 13H2V11H18.17L10.59 3.41L12 2Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Directional Navigation Arrows */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          {/* Left Arrow */}
          <div className="pointer-events-auto">
            <button
              className="w-12 h-12 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105"
              onClick={() => {
                const leftX = 25
                const leftY = 50
                setNavigationTarget({ x: leftX, y: leftY })
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {/* Right Arrow */}
          <div className="pointer-events-auto">
            <button
              className="w-12 h-12 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105"
              onClick={() => {
                const rightX = 75
                const rightY = 50
                setNavigationTarget({ x: rightX, y: rightY })
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                <path d="M8.59 16.59L10 18L16 12L10 6L8.59 7.41L13.17 12L8.59 16.59Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isNavigating ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
            {isNavigating ? 'Navigating...' : '180° Street View'}
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm">
          <div className="text-right">
            <div className="font-semibold mb-1">Navigation</div>
            <div className="text-xs opacity-75">Double-click to travel</div>
            <div className="text-xs opacity-75">Use arrows to move</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="opacity-75">View:</span>
              <span className="font-mono">
                Yaw: {Math.round(rotation.yaw)}° Pitch: {Math.round(rotation.pitch)}°
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-75">Zoom:</span>
              <span className="font-mono">{(zoom * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm opacity-75">
            <span>🖱️ Drag to look around</span>
            <span>🔍 Scroll to zoom</span>
            <span>🎯 Click reset to center</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StreetViewPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [clickHistory, setClickHistory] = useState<ClickPoint[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ x: number, y: number }>({ x: 50, y: 50 })
  const [navigationHistory, setNavigationHistory] = useState<Array<{ image: string, location: { x: number, y: number }, panorama: string }>>([])
  const imageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string)
      setClickHistory([])
      setPanoramaUrl(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleImageClick = useCallback((x: number, y: number, absoluteX: number, absoluteY: number) => {
    if (isGenerating) return
    
    const newClick: ClickPoint = { 
      x, 
      y, 
      absoluteX, 
      absoluteY, 
      timestamp: new Date(),
      description: 'Street view click',
      imageWithDot: ''
    }
    setClickHistory([newClick]) // Only keep the latest click for street view
  }, [isGenerating])

  // Helper function to add red dot to image
  const addRedDotToImage = useCallback((imageUrl: string, clickPoint: ClickPoint): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = document.createElement('img') // Use document.createElement instead of new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw the original image
        ctx?.drawImage(img, 0, 0)
        
        if (ctx) {
          // Calculate red dot position
          const dotX = (clickPoint.x / 100) * canvas.width
          const dotY = (clickPoint.y / 100) * canvas.height
          const dotRadius = Math.max(12, Math.min(canvas.width, canvas.height) * 0.015)
          
          // Draw red dot with white border (more visible)
          ctx.beginPath()
          ctx.arc(dotX, dotY, dotRadius + 3, 0, 2 * Math.PI)
          ctx.fillStyle = 'white'
          ctx.fill()
          
          ctx.beginPath()
          ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI)
          ctx.fillStyle = '#ff0000'
          ctx.fill()
          
          // Add a subtle shadow for better visibility
          ctx.beginPath()
          ctx.arc(dotX + 1, dotY + 1, dotRadius, 0, 2 * Math.PI)
          ctx.fillStyle = 'rgba(0,0,0,0.3)'
          ctx.globalCompositeOperation = 'destination-over'
          ctx.fill()
          ctx.globalCompositeOperation = 'source-over'
        }
        
        // Convert to base64
        const modifiedImageUrl = canvas.toDataURL('image/jpeg', 0.9)
        resolve(modifiedImageUrl)
      }
      
      img.crossOrigin = 'anonymous'
      img.src = imageUrl
    })
  }, [])

  const generatePanorama = useCallback(async () => {
    if (!uploadedImage || clickHistory.length === 0) return

    setIsGenerating(true)
    setError(null)

    try {
      // Add red dot to the image before sending
      const imageWithDot = await addRedDotToImage(uploadedImage, clickHistory[0])
      
      const response = await fetch('/api/generate-panorama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageWithDot,
          clickPoint: clickHistory[0]
        }),
      })

      if (!response.ok) {
        // Try to get error message from JSON response
        try {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      // Check if response is JSON (error) or binary (image)
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        // Error response
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate panorama')
      } else {
        // Success - convert blob to base64 immediately and store that
        const blob = await response.blob()
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        console.log('Initial panorama generated as base64, length:', base64Data.length)
        setPanoramaUrl(base64Data) // Store as base64, not blob URL
      }
    } catch (error) {
      console.error('Error generating panorama:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate panorama')
    } finally {
      setIsGenerating(false)
    }
  }, [uploadedImage, clickHistory, addRedDotToImage])

  // Helper function to convert blob URL to base64
  const blobToBase64 = useCallback((blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      fetch(blobUrl)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        .catch(reject)
    })
  }, [])

  const handleNavigation = useCallback(async (targetX: number, targetY: number) => {
    console.log('handleNavigation called with:', { targetX, targetY })
    console.log('Current state:', { uploadedImage: !!uploadedImage, panoramaUrl: !!panoramaUrl })
    
    if (!uploadedImage || !panoramaUrl) {
      console.log('Missing required data for navigation')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // panoramaUrl should now be base64 since we store it that way
      console.log('Panorama data length:', panoramaUrl.length)
      console.log('Panorama starts with:', panoramaUrl.substring(0, 50))

      // Add a red dot to the panorama to show where user wants to navigate
      console.log('Adding navigation target dot to panorama...')
      const panoramaWithDot = await addRedDotToImage(panoramaUrl, { 
        x: targetX, 
        y: targetY, 
        absoluteX: 0, 
        absoluteY: 0,
        timestamp: new Date(),
        description: 'Navigation target',
        imageWithDot: ''
      })
      console.log('Navigation dot added to panorama, length:', panoramaWithDot.length)
      console.log('Final data starts with:', panoramaWithDot.substring(0, 50))
      
      const response = await fetch('/api/navigate-streetview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalImage: uploadedImage,
          currentPanorama: panoramaWithDot,
          targetLocation: { x: targetX, y: targetY },
          currentLocation: currentLocation
        }),
      })

      if (!response.ok) {
        try {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to navigate')
      } else {
        // Success - new panorama, convert to base64 immediately
        const blob = await response.blob()
        const newPanoramaBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        console.log('New panorama generated as base64, length:', newPanoramaBase64.length)
        
        // Save current state to history
        if (panoramaUrl) {
          setNavigationHistory(prev => [...prev, {
            image: uploadedImage,
            location: currentLocation,
            panorama: panoramaUrl
          }])
        }
        
        // Update to new location - this should immediately update the viewer
        setPanoramaUrl(newPanoramaBase64)
        setCurrentLocation({ x: targetX, y: targetY })
      }
    } catch (error) {
      console.error('Error navigating:', error)
      setError(error instanceof Error ? error.message : 'Failed to navigate')
    } finally {
      setIsGenerating(false)
    }
  }, [uploadedImage, panoramaUrl, currentLocation, addRedDotToImage])

  const closePanorama = useCallback(() => {
    setPanoramaUrl(null)
    setNavigationHistory([])
  }, [])

  if (panoramaUrl && uploadedImage) {
    return (
      <PanoramaViewer 
        panoramaUrl={panoramaUrl} 
        originalImage={uploadedImage}
        currentLocation={currentLocation}
        onClose={closePanorama} 
        onNavigate={handleNavigation}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🌍 AI Street View
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Upload any image and click on a location to generate a 360° panoramic view using AI. 
            Experience any place as if you were standing there!
          </p>
          
          {/* Navigation */}
          <div className="flex justify-center gap-4 mb-8">
            <Link 
              href="/"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              🌐 Website Generator
            </Link>
            <Link 
              href="/streetview"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              🌍 AI Street View
            </Link>
          </div>
        </div>

        {/* Upload Section */}
        {!uploadedImage && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                📸 Upload Image
              </button>
              <p className="text-gray-500 mt-4">
                Choose any image to start exploring in 360°
              </p>
            </div>
          </div>
        )}

        {/* Interactive Image Section */}
        {uploadedImage && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Click on the image to explore that location
              </h2>
              <p className="text-gray-600">
                Click anywhere on the image to generate a 360° panoramic view of that spot
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div
                  ref={imageRef}
                  className="image-container cursor-pointer relative"
                  onClick={(e) => {
                    const rect = imageRef.current?.getBoundingClientRect()
                    if (!rect) return
                    
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    
                    const percentX = (x / rect.width) * 100
                    const percentY = (y / rect.height) * 100
                    
                    const absoluteX = e.clientX
                    const absoluteY = e.clientY
                    
                    handleImageClick(percentX, percentY, absoluteX, absoluteY)
                  }}
                >
                  <Image
                    src={uploadedImage}
                    alt="Uploaded image"
                    width={800}
                    height={600}
                    className="max-w-full h-auto rounded-lg shadow-lg border-4 border-white"
                    style={{ maxHeight: '600px', width: 'auto' }}
                  />
                  
                  {/* Display red dot for click */}
                  {clickHistory.map((click, index) => (
                    <div
                      key={index}
                      className="absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg animate-pulse"
                      style={{
                        left: `${click.x}%`,
                        top: `${click.y}%`,
                      }}
                      title={`Selected location at (${Math.round(click.x)}, ${Math.round(click.y)})`}
                    />
                  ))}
                  
                  {/* Loading overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="text-lg font-semibold">Generating 360° panorama...</p>
                        <p className="text-sm opacity-90">This may take a few moments</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Click instruction overlay */}
                {!isGenerating && clickHistory.length === 0 && (
                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                    <p className="text-sm font-medium">
                      🎯 Click anywhere on the image to explore that location in 360°
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            {clickHistory.length > 0 && !isGenerating && (
              <div className="text-center mt-6">
                <button
                  onClick={generatePanorama}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center gap-2"
                >
                  🌍 Generate 360° View
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}

            {/* Upload New Image Button */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setUploadedImage(null)
                  setClickHistory([])
                  setPanoramaUrl(null)
                  setError(null)
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                📸 Upload Different Image
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">How it works:</h3>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="text-3xl mb-2">📸</div>
              <h4 className="font-semibold mb-2">1. Upload Image</h4>
              <p className="text-gray-600 text-sm">
                Choose any image - a photo, artwork, or scene you want to explore
              </p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold mb-2">2. Click Location</h4>
              <p className="text-gray-600 text-sm">
                Click on any point in the image to select where you want to "stand"
              </p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🌍</div>
              <h4 className="font-semibold mb-2">3. Explore 360°</h4>
              <p className="text-gray-600 text-sm">
                AI generates a full panoramic view that you can drag to look around
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
