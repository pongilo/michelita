# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Development server (port 3000)
pnpm build        # Build + type-check (vite build && tsc --noEmit)
pnpm preview      # Preview production build
pnpm start        # Start production server (.output/server/index.mjs)
```

Prisma (schema at `prisma/schema.prisma`, migrations connect via `DIRECT_URL`):
```bash
pnpm prisma migrate dev      # Create/apply a migration and regenerate the client
pnpm prisma generate         # Regenerate the client into generated/prisma/ only
```

There are no test or lint commands — this project has no test suite or linter configured.

## Architecture

**TanStack React Start** is the full-stack framework (SSR + file-based routing via TanStack Router). Vite + Nitro handle the build, and the app is also a PWA (`vite-plugin-pwa`, configured in `vite.config.ts`, service worker registered in `src/routes/__root.tsx`). All text is in **Portuguese (pt-BR)**.

### Data Flow

```
Route (createFileRoute) → React Query hook → Server function (createServerFn) → Prisma → PostgreSQL
```

**Server functions** live in `src/lib/api/<resource>/` (one file per action, e.g. `create-order.ts`, `list-orders.ts`) and follow this pattern:
1. Define a Zod schema for the input and export its inferred type(s)
2. `createServerFn({ method: "POST" }).inputValidator((input: unknown) => schema.parse(input)).handler(async ({ data }) => { ... })`
3. Export a typed async wrapper function that calls the server fn — this wrapper, not the server fn itself, is what hooks and routes import

**React Query hooks** in `src/hooks/tanstack/<resource>/` (e.g. `use-create-order.tsx`) wrap the server function wrappers:
- Query keys are arrays: `[resource, organizationId, ...]`
- Mutations invalidate related query keys `onSuccess` (e.g. creating/updating an order invalidates `["orders", orgId]` and `["dashboard", orgId, "daily"]`)

### Route Layout

- `src/routes/__root.tsx` — Root layout: QueryClient, AuthProvider, TooltipProvider, NuqsAdapter, GA, PWA service-worker registration, Toaster
- `src/routes/_site/` — Public marketing pages (homepage, product category page at `$itemId.tsx`)
- `src/routes/_auth/` — Login, register, org setup (`organization.new.tsx`)
- `src/routes/app/` — Protected routes: `orders/` (list, detail, form), `customers/` (list, detail), `products/` (list, categories), `account.tsx`, `settings.tsx`

The `app` layout (`src/routes/app/route.tsx`) does **not** use a router `beforeLoad` guard — auth/org checks happen at render time inside the component via `useAuth()` (from `src/contexts/auth-context.tsx`), redirecting with `<Navigate>` if there's no user or no organization.

The file `src/routeTree.gen.ts` is **auto-generated** by TanStack Router — never edit it manually.

### Styling

Tailwind CSS v4. Custom theme variables in `src/styles.css`:
- Brand purple: `--color-michelita-purple: #593A93`
- Brand yellow: `--color-michelita-yellow: #FFCE50`
- Fonts: Poetsen One (`--font-display`), Nunito (`--font-body`) for brand accents; Figtree Variable is the default `--font-sans` used by shadcn components

shadcn/ui components (style: `base-maia`, configured in `components.json`) are in `src/components/ui/`. Icon library is **hugeicons** (`@hugeicons/react`), with Lucide React also available.

### Path Alias

`@/*` maps to `src/*` — use it for all internal imports.

### Auth & Multi-tenancy

Auth is handled by Supabase (`src/lib/supabase/`). `AuthProvider` (`src/contexts/auth-context.tsx`) fetches the current user and their organization via React Query and exposes both through `useAuth()`. Every protected resource is scoped to an **Organization**; `organizationId` comes from `useAuth()` and must be passed explicitly to every query/mutation. One user owns exactly one organization.

### Prisma

Client instance: `src/lib/prisma.ts` (uses `@prisma/adapter-pg`). Generated client: `generated/prisma/`. Schema: `prisma/schema.prisma`.

Models: `User`, `Organization`, `Customer`, `Order` → `OrderItem`, `Product` → `ProductCategory`.

Decimal fields (prices, totals) from Prisma must be converted to `Number` before returning from server functions, since `Decimal` is not serializable across the server/client boundary.
