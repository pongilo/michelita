# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Development server (port 3000)
pnpm build        # Build + type-check (vite build && tsc --noEmit)
pnpm preview      # Preview production build
pnpm start        # Start production server (.output/server/index.mjs)
```

There are no test commands — this project has no test suite.

## Architecture

**TanStack React Start** is the full-stack framework (SSR + file-based routing via TanStack Router). Vite + Nitro handle the build. All text is in **Portuguese (pt-BR)**.

### Data Flow

```
Route (createFileRoute) → React Query hook → Server function (createServerFn) → Prisma → PostgreSQL
```

**Server functions** live in `src/lib/api/` and follow this pattern:
1. Define a Zod schema for input
2. `createServerFn({ method: "POST" }).inputValidator(schema).handler(async ({ data }) => { ... })`
3. Export a typed async wrapper that calls the server fn

**React Query hooks** in `src/hooks/tanstack/` wrap server functions:
- Queries use `queryKey: [resource, organizationId, ...]` 
- Mutations invalidate related query keys on success (e.g., creating an order invalidates `["orders", orgId]` and `["dashboard", orgId, "daily"]`)

### Route Layout

- `src/routes/__root.tsx` — Root layout (QueryClient, NuqsAdapter, GA, Toaster)
- `src/routes/_site/` — Public marketing pages
- `src/routes/_auth/` — Login, register, org setup
- `src/routes/app/` — Protected routes; the `app` layout has a `beforeLoad` auth guard and sidebar navigation

The file `src/routeTree.gen.ts` is **auto-generated** by TanStack Router — never edit it manually.

### Styling

Tailwind CSS v4 + DaisyUI 5. Custom theme variables in `src/styles.css`:
- Brand purple: `--color-michelita-purple: #593A93`
- Brand yellow: `--color-michelita-yellow: #FFCE50`
- Fonts: Poetsen One (display), Nunito (body)

shadcn/ui components (style: `base-maia`) are in `src/components/ui/`. Icon library is **hugeicons** (`@hugeicons/react`), with Lucide React also available.

### Path Alias

`@/*` maps to `src/*` — use it for all internal imports.

### Auth & Multi-tenancy

Auth is handled by Supabase (`src/lib/supabase/`). Every protected resource is scoped to an **Organization**. The `organizationId` is obtained from route context and passed to every query/mutation. One user owns exactly one organization.

### Prisma

Client instance: `src/lib/prisma.ts`. Generated client: `generated/prisma/`. Schema: `prisma/schema.prisma`.

Decimal fields (prices) from Prisma must be converted to `Number` before returning from server functions, since `Decimal` is not serializable across the server/client boundary.
