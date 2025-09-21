# Copilot Instructions for r2-drive

## Deployment & Cloudflare Workers

This project is deployed via OpenNext.js on Cloudflare Workers. This approach provides direct access to Cloudflare R2 bindings, enabling server-side file operations without extra API layers. Be aware that Cloudflare Workers have specific limitations, including execution time limits, memory constraints, and cold start considerations. Design application logic to work within these constraints while leveraging edge deployment benefits such as global distribution and low latency.

Follow these guidelines to maximize productivity as an AI coding agent in this codebase. Your goal is to keep the code simple and maintainable, adhering to good conventions and patterns.

## Architecture Overview

- **Monorepo Structure:** Uses pnpm workspaces. Main apps are in `apps/`, shared packages in `packages/`.
- **Dashboard App:** `apps/dashboard` is the main Next.js app. It handles file navigation, upload/download, preview, and delete for R2 buckets.
- **UI Library:** Shared React components live in `packages/ui/src/components`.
- **TypeScript & ESLint Configs:** Shared configs are in `packages/typescript-config` and `packages/eslint-config`.
- **Cloudflare Integration:** Uses `wrangler.jsonc` for R2 bucket bindings and type generation.

## Project Conventions

- **UI imports:** Use `@r2-drive/ui` alias for shared UI components.
- **shadcn/ui:** All UI components are based on [shadcn/ui](https://ui.shadcn.com/). When adding new UI components, do not write them from scratch—use:
    `bash
  pnpm dlx shadcn@latest add <component>
  `
    and prefer customizing shadcn components over custom implementations.
- **Cloudflare types:** Regenerate after changing `wrangler.jsonc` or R2 bindings with `npx wrangler types --env-interface CloudflareEnv`.

## Patterns & Practices

- **Simplicity First:** When adding features, always prefer the most standard and transparent implementation that solves the problem. Do not add more features than needed or requested. Favor code maintainability and clarity over over-engineering.
- **File actions:** See `apps/dashboard/src/lib/actions.ts` and `apps/dashboard/src/lib/r2-client.ts` for file operations.
- **Conventions:** Most patterns follow standard Next.js and React practices.
- **Single Responsibility:** Each component or module should have a clear, singular purpose. Avoid mixing concerns. Whenever possible, abstract repeated logic into reusable functions or components.
- **Redundant Code:** If you find excessive callback nesting or redundant code, you can simplify or remove it, but ensure the functionality remains intact.
- **Maintainability:** Avoid anti-patterns like premature optimization, deep nesting, or excessive abstraction. Prioritize readability and ease of understanding.

## External Integrations

- **Cloudflare R2:** All storage actions use the R2 API via bindings in `wrangler.jsonc`.
- **OpenNext.js:** Used for deployment to Cloudflare Workers.

## Troubleshooting

- If Tailwind or PostCSS warnings appear, check for unsupported at-rules and ensure plugins are installed.
- When fixing bugs, look for opportunities to remove or simplify code rather than adding complexity. However, it is ok to add extra code if it follows conventions or improves clarity or maintainability.

---

For more, see `apps/dashboard/README.md` and package READMEs. Update this file as development workflow evolves.
