# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-09-12

Initial release. Everything below was built before per-commit changelog entries existed, so
this release groups the full feature set by area rather than reproducing raw commit history.

### Added

**Budgeting**

- Zero-based, rolling-envelope monthly budgeting with persisted carryover, recalculated when a
  month's Budget view is opened.
- Budget categories organized into groups (sections), with add/rename/hide/reorder and
  drag-free up/down reordering.
- Category savings goals: target amount, target date, monthly funding goal, and quarterly/yearly
  savings-rate math.
- Bulk assignment actions: assign underfunded, reset available to zero, reset assigned to zero,
  across a checked set of categories.
- Repeating transactions with weekly/biweekly/monthly/custom cadences, auto-posting to Needs
  Review when due.
- Subscriptions and memberships tracking, linked to (but distinct from) their underlying
  repeating transaction.
- A default budget template applied to new budgets.

**Accounts & transactions**

- Cash and credit account types, with website, payment-due-day, and card-expiration fields for
  credit accounts.
- Full transaction ledger: add/edit/delete, multi-category splits, cleared/reconciled state,
  running balance, sortable columns, and saved per-account view preferences (date range,
  reconciled visibility, sort).
- CSV import with column mapping, duplicate detection, and a pending-approval (Needs Review)
  gate for imported and auto-posted rows, excluded from every balance/activity/report aggregate
  until approved.
- Bulk transaction actions: approve/reject pending rows, categorize, delete, duplicate, mark
  cleared, and convert a transaction into a repeating one.
- Payee auto-categorization rules, applied on payee entry.
- Reconciliation flow with a locked cleared-state on reconciled rows.
- Record Payment flow for paying down a credit account from a cash account.

**Net worth**

- Manually tracked assets and liabilities, each with a full historical value/balance change log
  (not overwritten in place).
- Amortization schedules and payoff projections for loans and mortgages, including escrow
  tracking and disbursements for mortgage accounts.
- CSV import for liability payment history.
- Net worth ordering/reordering alongside cash and credit accounts in Budget Settings.

**Income & taxes**

- Per-job paycheck calculator: gross income, income items, pre/post-tax withholdings, employer
  contributions, and computed net pay.
- Paycheck logging with history, quick-add from the mobile FAB and navbar.
- Jobs management (pay period type, active/inactive).
- Tax & Retirement: filing status, withholding tracker, retirement goal tracking, and retirement
  account balances.

**Reports**

- All eight report types: Income vs. Expenses, Cash Flow, Budget vs. Actual, Spending by Payee,
  Net Worth Over Time, Debt Payoff Timeline, Category Goal Progress, and Paychecks.

**Multi-user, households & permissions**

- Invite-only account creation (no open self-signup); admin-issued, time-limited invite links.
- TOTP two-factor authentication, required for every account, with QR-code enrollment.
- Three-layer tenancy: Household -> Budget -> per-(user, budget, feature) FeaturePermission,
  fail-closed (`no_access`) by default, enforced server-side.
- Per-user personal settings: profile, password & 2FA management with active-session list and
  revoke, localization (timezone, locale, date format, currency display), and a Preferences page
  for personal UI defaults (default ledger sort/filter, sidebar group state, page sizes).
- Read-only, budget-scoped API tokens with a documented `/api/v1/...` surface and admin-facing
  API reference docs.
- In-app notification system: bell with unread count, notification history page, configurable
  per-type in-app/push settings, and real Web Push delivery.

**Admin dashboard**

- User management: invite, deactivate/reactivate, force password reset, reset 2FA, active
  sessions, and login history (with browser/OS parsing and city-level IP geolocation).
- Household & access management: create households, grant/revoke household and budget access,
  per-(user, budget, feature) permission matrix.
- Platform-wide payee management: search, merge, renaming rules, auto-category defaults.
- Instance-wide feature kill switches.
- Platform settings: SMTP configuration, currency, session timeout.
- System Health: database latency, scheduled job history and status, and an error log capturing
  React error boundary and process-level uncaught exceptions.
- Encrypted, schedulable database backups with history, manual "run now," and failure-reason
  surfacing; a companion `backup:decrypt` script for restoring onto another instance.
- Audit log for budget-scoped mutations, with its own feature-gated visibility.

**Platform, self-hosting & PWA**

- Installable PWA (manifest, icons, service worker), light/dark theme with dark as the default,
  and a full mobile-responsive layout (bottom tab bar, mobile "More" sheet, card-based tables and
  stacked forms) across every non-admin feature.
- Single Docker image bundling the app and an embedded PostgreSQL server, supervised by
  s6-overlay, with an external-Postgres alternate mode and a documented setup/upgrade guide.
- `robots.txt`, `noindex`/`nofollow` metadata, and an `X-Robots-Tag` header so the app is
  reachable by URL but not crawled or indexed.
- HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` security
  headers.
- i18n scaffolding via `next-intl`, with UI chrome strings translated and user-entered content
  deliberately left untranslated.
- CI (lint/typecheck/test/build) and a Docker image publish workflow (semver + latest tags on
  release), issue/PR templates, CODEOWNERS, EditorConfig/`.gitattributes`, a pre-commit
  lint-staged hook, `knip` for unused-code detection, and Conventional Commits enforcement with
  automated semantic version bumping.
