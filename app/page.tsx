'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to browser page
    router.push('/browser')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          This Internet Does Not Exist
        </h1>
        <p className="text-gray-600">Redirecting to AI Web Browser...</p>
      </div>
    </div>
  )
}

