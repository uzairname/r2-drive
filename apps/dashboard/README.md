````markdown
# R2 Drive

A modern file explorer for Cloudflare R2 storage, built with Next.js, shadcn/ui, and OpenNext.js.

## Features

- Clean and minimal user interface
- Direct R2 integration via Cloudflare Workers
- File/folder navigation with breadcrumbs
- Upload, download, preview and delete operations
- Responsive design with light/dark mode support

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Cloudflare

To deploy on Cloudflare Workers:

```bash
pnpm deploy
```

This will build the app with OpenNext.js and deploy it to Cloudflare Workers. You'll need to have your Cloudflare credentials configured in wrangler.

## R2 Configuration

The app requires binding to an R2 bucket. Configure your wrangler.jsonc with:

```json
"r2_buckets": [
  {
    "binding": "R2_STORAGE",
    "bucket_name": "your-bucket-name"
  }
]
```

Then update your OpenNext.js configuration accordingly.
