'use client'

import { useState } from 'react'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isLoading: boolean
}

export function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState('')
  const [isValid, setIsValid] = useState(false)

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setPrompt(value)
    setIsValid(value.trim().length >= 10)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && !isLoading) {
      onSubmit(prompt.trim())
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Describe Your Website
        </h2>
        <p className="text-gray-600">
          Tell us what kind of website you want to create. Be specific about the design, 
          purpose, and style you're looking for.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Website Description
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="e.g., A modern e-commerce website for handmade jewelry with a minimalist design, featuring a hero section with product showcase, navigation menu, and footer with contact information. Use a warm color palette with gold accents."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black placeholder-gray-500"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-sm ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
              {prompt.length}/500 characters
            </span>
            {!isValid && prompt.length > 0 && (
              <span className="text-sm text-red-500">
                Please enter at least 10 characters
              </span>
            )}
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
            isValid && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating Website...
            </div>
          ) : (
            'Generate Website'
          )}
        </button>
      </form>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Better Results</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Be specific about the type of website (e.g., portfolio, blog, e-commerce)</li>
          <li>• Mention design preferences (modern, minimalist, colorful, etc.)</li>
          <li>• Include key sections you want (header, hero, features, contact)</li>
          <li>• Specify color schemes or visual styles</li>
        </ul>
      </div>
    </div>
  )
}
