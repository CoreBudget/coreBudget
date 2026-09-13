<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md - Guide for AI Agents Working with CoreBudget

This guide provides comprehensive information for AI agents working with the CoreBudget codebase.

## Project Overview

**CoreBudget** is a self-hosted, multi-user personal finance app: zero-based envelope budgeting
plus manual net worth tracking. It is a rebuild of a single-user Electron app
(`chiefpansancolt/budget-tracker-app`), not a migration, so most domain logic carries forward but
the app becomes multi-tenant with a real backend.

- **Repository**: https://github.com/chiefpansancolt/coreBudget
- **Design docs**: the sibling `../plans` repo holds `Architecture Spec.md`, `Design Brief.md`,
  and `schema/ERD.md`. Those are the source of truth for domain decisions; read them before
  implementing any feature area, not just this file.
- **License**: MIT
- **Primary language**: TypeScript (React)
- **Build system**: npm, single package (not a monorepo)
- **No external integrations**: no bank sync, no Plaid, no market data. All entry is manual.

## Quick Start Commands

```bash
# Type checking (ALWAYS run before committing)
npm run typecheck

# Linting
npm run lint

# Formatting
npm run format         # write
npm run format:check   # check only

# Unit tests
npm run test

# Development server
npm run dev

# Production build
npm run build

# Production server (matches the Docker image's runtime path)
npm run start
```

### Important rules

- This is a **single Next.js app**, not a monorepo. Run every command from the repository root.
- Requires a running Postgres instance for local development (this project targets Postgres.app
  locally). `npx prisma migrate dev` applies migrations; `npx prisma generate` regenerates the
  client into `src/generated/prisma` (gitignored, never edit it directly).
- Prisma is pinned to `7.10.0`. `prisma@latest` currently resolves to an `8.0.0-rc` with
  vulnerable bundled tooling; do not upgrade without checking that has been resolved.

## Architecture & Directory Structure

### Stack (check versions before assuming APIs)

- **Framework**: Next.js 16 (Turbopack, App Router). Middleware is `src/proxy.ts`/`proxy()` in
  this version, not `middleware.ts`. `params`/`searchParams`/`cookies()`/`headers()` are all
  async.
- **UI**: MUI v9 (`@mui/material`), dark mode is the default (`src/theme.ts`), both modes
  supported via `colorSchemes`. v9 removed system props (`alignItems`, `spacing`, etc. as direct
  props on `Box`/`Stack`/`Grid`); use `sx` instead. `@mui/material-nextjs/v16-appRouter`'s
  `AppRouterCacheProvider` wraps the root layout.
- **Database**: PostgreSQL via Prisma 7, using driver adapters (`@prisma/adapter-pg`) rather than
  a bundled query-engine binary. The datasource `url` lives in `prisma7.config.ts`, not
  `schema.prisma`. `PrismaClient` is constructed with the adapter in `src/lib/prisma.ts`, never a
  bare `new PrismaClient()`.
- **PWA**: `@serwist/next` / `@serwist/turbopack` (not `next-pwa`, which is unmaintained and
  webpack-only). Shell-caching only for v1, no offline transaction entry or background sync yet.
- **2FA**: TOTP only (`otplib` + `qrcode`), no SMS.
- **Scheduled jobs**: `node-cron`, registered in-process via `src/instrumentation.ts`'s
  `register()` hook. No separate worker process or container.
- **Backups**: `pg_dump`-based, admin-configurable schedule/retention, encrypted at rest with
  `APP_ENCRYPTION_KEY`.
- **Self-hosting**: a single Docker image with an embedded PostgreSQL server, supervised by
  s6-overlay. See `docker/README.md` and the `Dockerfile`.

### Directory layout

```
src/
  app/
    (app)/          # authenticated end-user app: budget, accounts, net worth, reports, settings
    admin/           # separate admin dashboard: users, households, payees, health, backups
    api/             # public read-only API (/api/v1/*) plus /api/health
    _shared/         # shared UI components used across (app) and admin
    login/, setup/, invite/, reset-password/   # unauthenticated flows
    proxy.ts         # route-level auth gate (this version's middleware)
    robots.ts        # disallow-all: this app is never meant to be crawled/indexed
  lib/               # domain/business logic, one file per concern (auth/, prisma.ts, backup.ts, ...)
  generated/prisma/  # generated Prisma client (gitignored, don't edit)
  theme.ts           # MUI theme, dark-mode-default token system
prisma/
  schema.prisma      # data model
  migrations/        # applied migrations (never edit an already-applied migration file)
docker/
  s6-rc.d/           # process supervision: postgres -> migrate -> app, in dependency order
messages/en.json     # all user-facing translated strings (i18n)
```

### Core architectural decisions (do not relitigate these)

- **Tenancy is three layers**: `Household` -> `Budget` -> per-`(user, budget, feature)`
  `FeaturePermission`. Household membership does not imply budget visibility; budget access does
  not imply any permission level. Every layer is an explicit admin grant. Default when no
  `FeaturePermission` row exists: `no_access` (fail closed), enforced at both API and UI layers.
- **Budget rollover has no locking.** Any month, any time, is editable. `carryover`/`available`
  on `CategoryAssignment` are persisted fields, recalculated when the Budget view (or the
  Dashboard's Current Month Budget widget) is opened for that month, not on every write, not
  frozen. Other consumers (API tokens, reports, dashboards) read the stored values as-is and
  never trigger their own recalculation. There is no "start new month" / lock / unlock concept;
  do not reintroduce one. Concurrency is handled with a Postgres advisory lock keyed on
  `(budgetId, month)`.
- **Payees are platform-wide**, not budget/household-scoped. `Transaction`/`TransactionSplit`/
  `RepeatingTransaction` reference `payeeId` (a foreign key), never a plain-text payee string, so
  renames propagate to history.
- **Pending approval gate**: transactions from CSV import or an arrived scheduled occurrence get
  `pendingApproval = true` and must be excluded from every balance/activity/report aggregate
  until approved. This is a cross-cutting filter
  (`WHERE pendingApproval = false OR pendingApproval IS NULL`); apply it everywhere a transaction
  sum is computed, not as a one-off.
- **Delete vs. hide/close, consistently**: categories, accounts, and budgets can only be
  hard-deleted with zero history; otherwise they are archived/hidden/closed, never soft-deleted
  via a status flag pretending to be a delete. Enforce server-side (409 on a delete-with-history
  attempt), not just a disabled button.
- **API tokens are unconditionally read-only** (`GET`-only, versioned `/api/v1/...`), capped at
  `min(read_only, owner's actual FeaturePermission)` per feature, even if the owning user has
  edit access. Never add write or webhook endpoints to this surface without a deliberate new
  decision; that was proposed once and explicitly rejected.
- **Currency is platform-wide** (`PlatformSettings.currencyCode`), decoupled from per-user
  `locale`. Use `Intl.NumberFormat(user.locale, { style: 'currency', currency:
platformSettings.currencyCode })`; never let locale drive currency symbol/rules.
- **No per-budget SMTP/email-summary feature.** Platform SMTP exists only for transactional auth
  email (invites, password resets); do not wire it to any other feature without a new explicit
  decision.
- **Inline math in amount fields** (`12.50+7.25-3`) is evaluated client-side on blur; the backend
  only ever receives a resolved number. Never let a formula string reach the API.
- **Explicitly rejected, do not build**: per-budget currency, per-budget notification settings,
  per-budget rollover-strategy config, self-service signup, user-initiated password reset,
  write/webhook token endpoints.

## Development Workflow

### 1. Making changes

1. Read relevant files to understand the current implementation before changing it.
2. Make focused, incremental changes.
3. Check `../plans/Architecture Spec.md` and `../plans/Design Brief.md` when a requirement seems
   surprising or arbitrary; most non-obvious decisions in this app have an explicit rationale
   documented there, not just a preference.

### 2. Testing strategy

```bash
npm run test       # vitest, unit/integration
npm run test:e2e    # playwright (not yet configured: no playwright.config.ts exists)
```

- Unit tests live alongside source as `*.test.ts`, matched by `src/**/*.test.ts` in
  `vitest.config.ts`. There are no tests written yet; `passWithNoTests` keeps `npm run test`
  green until there are.
- Playwright is a confirmed dependency but has no config file yet. Do not assume `npm run
test:e2e` works without checking first.

### 3. Type checking

```bash
npm run typecheck   # next typegen && tsc --noEmit
```

- Strict TypeScript throughout. No `binaryTargets`/engine-matching concerns for Prisma, since
  driver adapters mode does not use a native query-engine binary.

### 4. Internationalization (i18n)

UI chrome strings only, via `messages/en.json` and `next-intl`. User-entered content (category
names, memos, payee names) is never translated. Dynamic keys resolved at runtime go through
`src/lib/i18n/translateDynamicKey.ts` (`td()`), not a raw `t()` call.

## Code Style & Conventions

- Enforce authorization (feature permissions, no-access hiding, token read-only cap) server-side
  first. UI-level hiding is a UX nicety, never the actual gate.
- Every entity that should be tenant-scoped needs `budgetId`; confirm scoping explicitly for
  anything new rather than assuming it.
- History-preserving pattern for anything with a "current value" that changes over time
  (`Asset.value`, `Liability.balance`): append a change row (`AssetValueChange`,
  `LiabilityBalanceChange`), don't overwrite in place.
- New enums/lists that the admin UI iterates over (e.g. the `FeaturePermission` feature list)
  should live as config, not be hardcoded per-screen.
- No hover-only interactions anywhere; every hover-revealed action needs a tap-accessible
  equivalent (mobile/PWA requirement, check per-component).
- Icons: MUI icons only (`@mui/icons-material`), never a literal Unicode glyph standing in for an
  icon in JSX. Plain punctuation in copy (middle dot, curly quotes) is fine; this is about
  icon-shaped characters specifically, not punctuation.
- No em dashes in committed text: comments, docs, or user-facing strings. Use a comma, colon,
  period, or semicolon instead, whichever reads most naturally in context.
- Formatting is Prettier-enforced (`.prettierrc.json`: double quotes, trailing commas,
  100-character print width). Run `npm run format` rather than hand-formatting.

## Commits & Versioning

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): subject`. A `commit-msg` hook (`commitlint`, `commitlint.config.js`) rejects
anything else. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

- `feat` -> minor version bump. `fix`/`perf` -> patch bump. A breaking change (footer
  `BREAKING CHANGE: ...` or `!` after the type/scope, e.g. `feat!: ...`) -> major bump. Every
  other type does not affect the version.
- The project's version is cut with `npm run release` (`commit-and-tag-version`), which reads
  commit history since the last tag, bumps `package.json`'s version accordingly, updates
  `CHANGELOG.md`, and creates the git tag. Push that tag to trigger `docker-publish.yml`. Use
  `npm run release -- --first-release` for the very first tag in a repo's history (skips trying
  to diff against a nonexistent previous tag).
- Don't hand-edit the version in `package.json` outside of a release; let the tool derive it
  from commit types so the number stays meaningful.

## Mobile

Every non-admin feature must work on a phone-width screen; this is a standing requirement, not a
follow-up task. A feature is not done until it has been checked at a phone viewport
(~375-428px), not just verified on desktop.

- **Breakpoint**: `useIsMobile()` (`src/app/(app)/useIsMobile.ts`, wraps MUI's
  `useMediaQuery(theme.breakpoints.down("sm"))`, 600px) is the one shared convention; branch a
  client component's mobile rendering off this hook, not an ad-hoc width check. A server
  component (no hook available) uses plain CSS breakpoint `sx` objects instead (e.g.
  `sx={{ width: { xs: "100%", sm: 220 } }}`).
- **Shell**: `AppShell.tsx` branches its entire chrome on `useIsMobile()`. Desktop gets a
  persistent sidebar and horizontal top nav; mobile gets a compact top bar plus a bottom tab bar
  and a full-screen "More" sheet, gated by the same `canSee()` per-feature permissions as
  desktop.
- **Tabular data**: a CSS-grid ledger-style table does not fit a phone. Render a card per row on
  mobile instead, reusing the same state/handlers/validation as desktop; only the JSX layout
  differs.
- **Forms**: stack fields full-width, one per row, on mobile instead of the desktop's inline grid
  row. Reuse the exact same state and save/validation logic; build a mobile-specific renderer for
  the JSX only, not a parallel data flow.
- Forms and flex-wrap-based layouts built with relative widths often need no mobile-specific code
  at all; verify at a phone viewport before assuming a fix is needed.

## Self-Hosting & Docker

- The production image is a single container: the built Next.js app plus an embedded PostgreSQL
  server, supervised by s6-overlay. See `docker/README.md` for the operator-facing setup guide
  and `Dockerfile` / `docker/s6-rc.d/` for the implementation.
- Boot order: `postgres` -> `postgres-ready` -> `migrate` (`prisma migrate deploy`) -> `app`.
  Embedded Postgres is skipped entirely when the operator supplies their own `DATABASE_URL`.
- `docker-publish.yml` only builds on `v*.*.*` tags, not on every push to `main`; a full
  multi-arch build (`linux/amd64` + emulated `linux/arm64`) takes 20+ minutes.

## Important Directories & Files

- `/prisma/schema.prisma` - data model, the single source of truth for the database shape
- `/prisma/migrations/` - applied migrations; never edit one that has already shipped, since
  Prisma checksums migration files to detect tampering
- `/prisma7.config.ts` - Prisma 7's config file (datasource URL, migration path)
- `/src/proxy.ts` - the auth/setup-gate middleware equivalent for this Next.js version
- `/src/instrumentation.ts` - in-process cron job registration, runs once at server boot
- `/src/generated/prisma/` - generated Prisma client (gitignored, don't edit)
- `/messages/en.json` - every user-facing translated string
- `/docker/`, `/Dockerfile`, `/docker-compose.yml` - self-hosting image
- `/.github/workflows/` - CI (`ci.yml`) and Docker publish (`docker-publish.yml`)
- `/.env.example` - the full list of required environment variables
- `/commitlint.config.js` - enforced commit message format (see Commits & Versioning above)
- `/knip.json` - unused code/dependency detection config

## Common Development Tasks

```bash
# Apply a new migration during development
npx prisma migrate dev

# Regenerate the Prisma client after a schema change
npx prisma generate

# Inspect the database visually
npm run db:studio

# Decrypt a downloaded backup for inspection/restore
npm run backup:decrypt -- <input.sql.enc> <output.sql>
```

## Troubleshooting

### Type errors

1. Run `npm run typecheck` to see all type errors.
2. Confirm `npx prisma generate` has been run after any schema change; a stale generated client
   is a common source of type errors that look unrelated to your actual change.

### Lint errors

Run `npm run lint`. Configuration is in `eslint.config.mjs`.

### Build failures

1. Confirm `DATABASE_URL` and the other required env vars are set; module-level code (e.g.
   `src/lib/prisma.ts`) constructs a connection object at import time even though it does not
   connect until a query runs.
2. Check the Node.js version; this project has been built and tested against Node 24 (no
   `engines` field is pinned yet).

### Docker boot failures

Check `docker logs <container>` for which s6 service failed: `postgres`, `postgres-ready`,
`migrate`, or `app`, in that order. A failure in `migrate` almost always means a Prisma migration
issue, not an infrastructure issue.

## Code Review Guidelines

When reviewing changes (yours or an agent's), see
[.github/CODE_REVIEW_GUIDELINES.md](.github/CODE_REVIEW_GUIDELINES.md) for project-specific
things to check for.

## Additional Resources

- **Design docs**: `../plans/Architecture Spec.md`, `../plans/Design Brief.md`,
  `../plans/schema/ERD.md` (sibling repo)
- **GitHub Issues**: https://github.com/chiefpansancolt/coreBudget/issues

## Code Quality Checklist

Before committing changes, ensure:

- [ ] `npm run lint`, `npm run typecheck`, and `npm run build` all pass
- [ ] Verified in the browser (not just typecheck/build) for any UI-facing change
- [ ] Checked at a phone-width viewport for any non-admin page
- [ ] Added/updated a Prisma migration if the schema changed, and `prisma migrate dev` runs clean
- [ ] No em dashes introduced in comments, docs, or user-facing strings

## Environment Requirements

- **Node.js**: 24 (no `.nvmrc` or `engines` field pinned yet; matches the Docker image's base)
- **PostgreSQL**: required locally (Postgres.app is the convention for this project) and embedded
  in the Docker image
- **Environment variables**: see `.env.example` (`DATABASE_URL`, `APP_ENCRYPTION_KEY`,
  `APP_URL`, `SESSION_SECRET`)
