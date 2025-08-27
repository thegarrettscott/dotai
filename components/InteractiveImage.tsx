'use client'

import { useRef, useCallback } from 'react'
import Image from 'next/image'
import { ClickPoint } from './WebsiteGenerator'

interface InteractiveImageProps {
  imageUrl: string
  onClick: (x: number, y: number) => void
  clickHistory: ClickPoint[]
  isLoading: boolean
}

export function InteractiveImage({ 
  imageUrl, 
  onClick, 
  clickHistory, 
  isLoading 
}: InteractiveImageProps) {
  const imageRef = useRef<HTMLDivElement>(null)

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoading) return
    
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert to percentage coordinates for consistency
    const percentX = (x / rect.width) * 100
    const percentY = (y / rect.height) * 100
    
    onClick(percentX, percentY)
  }, [onClick, isLoading])

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div
          ref={imageRef}
          className="image-container cursor-pointer relative"
          onClick={handleImageClick}
        >
          <Image
            src={imageUrl}
            alt="Generated website"
            width={1024}
            height={1024}
            className="max-w-full h-auto rounded-lg shadow-lg border-4 border-white"
            priority
          />
          
          {/* Display red dots for click history */}
          {clickHistory.map((click, index) => (
            <div
              key={index}
              className="red-dot"
              style={{
                left: `${click.x}%`,
                top: `${click.y}%`,
              }}
              title={`Click ${index + 1} at (${Math.round(click.x)}, ${Math.round(click.y)})`}
            />
          ))}
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Generating next evolution...</p>
                <p className="text-sm opacity-90">This may take a few moments</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Click instruction overlay */}
        {!isLoading && clickHistory.length === 0 && (
          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium">
              💡 Click anywhere on the image to evolve your website
            </p>
          </div>
        )}
      </div>
      
      {/* Image dimensions info */}
      <div className="text-center text-sm text-gray-500">
        <p>Generated at 1024×1024 resolution</p>
        <p>Click anywhere to continue evolving your design</p>
      </div>
    </div>
  )
}
