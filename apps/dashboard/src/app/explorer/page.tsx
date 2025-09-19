'use client'

import { R2BucketNavigator } from '@/components/file-navigator'
import { Header } from '@/components/header'
import { Suspense } from 'react'

export default function ExplorerPage() {
  return (
    <div className="p-6  max-w-4xl mx-auto flex flex-col h-screen">
      <Suspense fallback={<div className="animate-pulse text-center">Loading...</div>}>
        <Header />
        <R2BucketNavigator />
      </Suspense>
    </div>
  )
}
