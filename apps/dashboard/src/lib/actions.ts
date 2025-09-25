'use server'

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { safeAsync } from '@r2-drive/utils/result'

export async function putObject(
  key: string,
  data: File,
  metadata?: {
    contentType?: string
    lastModified?: Date
  }
) {
  return safeAsync(async () => {
    const { env } = getCloudflareContext()

    await env.FILES.put(key, data, {
      httpMetadata: {
        contentType: metadata?.contentType,
        // lastModified is not a valid httpMetadata property
      },
      customMetadata: metadata?.lastModified
        ? { lastModified: metadata.lastModified.getTime().toString() }
        : undefined,
    })
  })
}
