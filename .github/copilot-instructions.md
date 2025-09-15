# Copilot Instructions for r2-drive

## Deployment & Cloudflare Workers
This project is deployed via OpenNext.js on Cloudflare Workers. This approach provides direct access to Cloudflare R2 bindings, enabling server-side file operations without extra API layers. Be aware that Cloudflare Workers have specific limitations, including execution time limits, memory constraints, and cold start considerations. Design application logic to work within these constraints while leveraging edge deployment benefits such as global distribution and low latency.

This monorepo is a file explorer for Cloudflare R2 storage, built with Next.js, OpenNext.js, and a custom UI library. Follow these guidelines to maximize productivity as an AI coding agent in this codebase.

## Architecture Overview
- **Monorepo Structure:** Uses pnpm workspaces. Main apps are in `apps/`, shared packages in `packages/`.
- **Dashboard App:** `apps/dashboard` is the main Next.js app. It handles file navigation, upload/download, preview, and delete for R2 buckets.
- **UI Library:** Shared React components live in `packages/ui/src/components`.
- **TypeScript & ESLint Configs:** Shared configs are in `packages/typescript-config` and `packages/eslint-config`.
- **Cloudflare Integration:** Uses `wrangler.jsonc` for R2 bucket bindings and type generation.

## Key Workflows
- **Install dependencies:** `pnpm install` from the repo root.
- **Dev server:** `pnpm dev` (from root or `apps/dashboard`).
- **Type generation:** Run `npx wrangler types --env-interface CloudflareEnv` in `apps/dashboard` after changing R2 config.
- **Deploy:** `pnpm run deploy` from the root.
- **Linting:** Use shared config: `pnpm lint`.


## Project Conventions
- **TypeScript config:** Apps extend via relative path: `../../packages/typescript-config/nextjs.json`.
- **UI imports:** Use `@workspace/ui` alias for shared UI components.
- **shadcn/ui:** All UI components are based on [shadcn/ui](https://ui.shadcn.com/). When adding new UI components, do not write them from scratch—use:
	```bash
	pnpm dlx shadcn@latest add <component>
	```
	and prefer customizing shadcn components over custom implementations.
- **Environment:** `.env` files are per-app (see `apps/dashboard`).
- **Cloudflare types:** Regenerate after changing `wrangler.jsonc` or R2 bindings.
- **Dark mode:** Handled via Tailwind's `dark` class, not custom at-rules.

## Code Simplification & Maintainability
- **Simplicity First:** When adding features, always prefer the most standard and transparent implementation that solves the problem. Do not add more features than needed.
- **Refactoring:** Favor code maintainability and clarity over over-engineering.


## Patterns & Examples
- **File actions:** See `apps/dashboard/src/lib/actions.ts` for file operations.
- **Providers:** App-wide context/providers in `apps/dashboard/src/components/providers.tsx`.
- **Custom hooks:** Place in `packages/ui/src/hooks`.
- **Global styles:** Use Tailwind in `packages/ui/src/styles/globals.css`.

## External Integrations
- **Cloudflare R2:** All storage actions use the R2 API via bindings in `wrangler.jsonc`.
- **OpenNext.js:** Used for deployment to Cloudflare Workers.

## Troubleshooting
- If Tailwind or PostCSS warnings appear, check for unsupported at-rules and ensure plugins are installed.
- When fixing bugs, look for opportunities to remove or simplify code rather than adding complexity. However, it is ok to add extra code if it follows conventions or improves clarity or maintainability.

---

For more, see `apps/dashboard/README.md` and package READMEs. Update this file as development workflow evolves.
