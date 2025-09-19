import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'

export default defineCloudflareConfig({
  // Enable R2 incremental cache for better performance
  incrementalCache: r2IncrementalCache,

  // R2 binding will be defined in wrangler.jsonc
  // This enables us to use the R2 client in server components and API routes
})
