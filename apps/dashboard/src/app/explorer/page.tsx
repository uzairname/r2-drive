import { BucketNavigator } from '@/components/bucket-navigator'
import { Header } from '@/components/header'
import type { Metadata } from 'next'
import { Suspense } from 'react'

type Props = {
  searchParams: Promise<{ path?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { path } = await searchParams
  if (!path) {
    return { title: 'Home' }
  }
  // Get the last segment of the path as the folder name
  const segments = path.split('/').filter(Boolean)
  const folderName = segments[segments.length - 1] || 'Home'
  return { title: folderName }
}

export default function ExplorerPage() {
  return (
    <div className="p-6  max-w-5xl mx-auto flex flex-col h-screen">
      <Suspense fallback={<div className="animate-pulse text-center">Loading...</div>}>
        <Header />
        <BucketNavigator />
      </Suspense>
    </div>
  )
}
