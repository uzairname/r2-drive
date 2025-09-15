# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server (uses Turbo for parallel execution across workspace)
- `pnpm install` - Install all dependencies in the monorepo

### Building and Deployment
- `pnpm build` - Build all apps and packages
- `pnpm deploy` - Deploy dashboard app to Cloudflare Workers
- `pnpm run deploy --filter=dashboard` - Deploy only the dashboard app

### Code Quality
- `pnpm lint` - Run linting across all workspaces
- `pnpm run format` - Format code using Prettier (dashboard only)

### Cloudflare Types
- `npx wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts` - Regenerate Cloudflare Worker types after changing bindings

## Architecture Overview

This is a monorepo for an R2 Drive file explorer built with:

### Workspaces Structure
- `apps/dashboard/` - Main Next.js application for R2 file management
- `packages/ui/` - Shared React UI components library
- `packages/eslint-config/` - Shared ESLint configurations
- `packages/typescript-config/` - Shared TypeScript configurations

### Core Technologies
- **Next.js 15** with App Router for the main dashboard
- **Cloudflare Workers** deployment via OpenNext.js
- **Cloudflare R2** for object storage with direct bindings
- **pnpm workspaces** for monorepo management
- **Turbo** for build orchestration
- **shadcn/ui** for UI components
- **TailwindCSS v4** for styling

### Key Files and Patterns
- `apps/dashboard/src/lib/actions.ts` - Server actions for R2 operations
- `apps/dashboard/src/lib/r2-client.ts` - R2 client configuration
- `apps/dashboard/src/lib/multipart-uploader.ts` - Multi-part upload handling
- `apps/dashboard/wrangler.jsonc` - Cloudflare Worker configuration with R2 bindings

### File Upload Architecture
The application supports multi-chunk uploads to R2 using presigned URLs:
- Client-side chunking and parallel uploads
- Presigned URL generation for direct R2 uploads
- Multi-part upload completion handling

## Important Conventions

### UI Components
- Always use shadcn/ui components: `pnpm dlx shadcn@latest add <component>`
- Import shared components via `@workspace/ui` alias
- Place custom hooks in `packages/ui/src/hooks`

### TypeScript Configuration
- Apps extend configurations: `../../packages/typescript-config/nextjs.json`
- Regenerate Cloudflare types after changing `wrangler.jsonc`

### Environment Setup
- Environment files are per-app (see `apps/dashboard/.env`)
- Cloudflare bindings provide direct R2 access in production

### Development Workflow
1. Install dependencies: `pnpm install`
2. Start development: `pnpm dev`
3. After R2 config changes, regenerate types in `apps/dashboard/`
4. Deploy: `pnpm run deploy`

## Deployment Notes

The application deploys to Cloudflare Workers via OpenNext.js, providing:
- Global edge deployment
- Direct R2 binding access (no API layer needed)
- Worker execution constraints (time limits, memory, cold starts)