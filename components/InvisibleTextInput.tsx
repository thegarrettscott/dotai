'use client'

import { useState, useRef, useEffect } from 'react'

interface InvisibleTextInputProps {
  isVisible: boolean
  clickPosition: { x: number; y: number } | null
  onTextSubmit: (text: string) => void
  onCancel: () => void
  placeholder?: string
}

export function InvisibleTextInput({ 
  isVisible, 
  clickPosition,
  onTextSubmit, 
  onCancel,
  placeholder = "Type your text here..."
}: InvisibleTextInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isVisible])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onTextSubmit(text.trim())
      setText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
      setText('')
    }
  }

  if (!isVisible || !clickPosition) return null

  return (
    <div 
      className="fixed z-50 pointer-events-auto"
      style={{
        left: `${clickPosition.x}px`,
        top: `${clickPosition.y + 20}px`, // Small offset below the click point
        transform: 'translate(-50%, 0)'
      }}
    >
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-white/90 backdrop-blur-sm border-2 border-blue-500 rounded-lg px-3 py-2 text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-600 min-w-[200px] max-w-[300px] transition-all duration-200"
          autoFocus
        />
      </form>
    </div>
  )
}
