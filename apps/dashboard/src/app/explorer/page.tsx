'use client'

import { BucketNavigator } from '@/components/bucket-navigator'
import { Header } from '@/components/header'
import { Suspense } from 'react'
import { trpc } from '@/trpc/client'

export default function ExplorerPage() {

  return (
    <div className="p-6  max-w-4xl mx-auto flex flex-col h-screen">
      <Suspense fallback={<div className="animate-pulse text-center">Loading...</div>}>
        <Header />
        <BucketNavigator />
      </Suspense>
    </div>
  )
}
