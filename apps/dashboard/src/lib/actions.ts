'use server'

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { safeAsync } from '@r2-drive/utils/result'

export async function putObject(key: string, data: File, httpMetadata?: { contentType?: string }) {
  return safeAsync(async () => {
    const { env } = getCloudflareContext()

    console.log('Uploading to R2:', { key, httpMetadata })
    await env.FILES.put(key, data, {
      httpMetadata,
    })
  })
}
