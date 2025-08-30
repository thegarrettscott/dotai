'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WebsiteGenerator } from '@/components/WebsiteGenerator'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Dot AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Generate interactive websites by describing your vision and clicking where you want changes. 
            Watch your website evolve with each interaction.
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
        
        <WebsiteGenerator />
      </div>
    </main>
  )
}

