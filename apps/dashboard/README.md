# R2 Drive

A file explorer for Cloudflare R2 storage, built with Next.js and OpenNext.js.

## Features

- File/folder navigation with breadcrumbs
- Upload, download, preview and delete operations
- Light/dark mode support

## Development

### Setup Steps

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create your `.env` file in `apps/dashboard`
4. Fill in your environment variables in `.env`. You need a Cloudflare API Token with permissions:

- Account > Workers Scripts > Edit
- Account > Workers R2 Storage > Edit
- Account > Account Settings > Read

5. Generate TypeScript types for Cloudflare:
   ```bash
   npx wrangler types --env-interface CloudflareEnv
   ```
6. Start the development server:
   ```bash
   pnpm dev
   ```

## Deploy

From root directory:

```bash
pnpm run deploy
```

## R2 Configuration

Configure your wrangler.jsonc with your R2 bucket bindings:

```json
"r2_buckets": [
  {
    "binding": "binding-name",
    "bucket_name": "your-bucket-name"
  }
]
```

After updating the configuration, regenerate the TypeScript types:

```bash
npx wrangler types --env-interface CloudflareEnv
```

Make sure your `src/types/cloudflare.d.ts` file includes the bindings:

```typescript
declare module '../cloudflare-env' {
  interface CloudflareEnv {
    // R2 bucket binding
    FILES: R2Bucket

    // Environment variables
    ENABLE_AUTH: string
    ALLOWED_ORIGINS: string
  }
}
```

## Troubleshooting

- Verify API token permissions
- Check that R2 bucket exists in your Cloudflare account
- Ensure Workers and R2 services are enabled
