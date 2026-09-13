# Code Review Guidelines

Project-specific things a review (human or AI-assisted) should check for in CoreBudget, on top
of the usual correctness/readability pass.

## Linter and type-checker suppressions

Do not approve a new `eslint-disable` or `@ts-expect-error` comment without a clear reason
attached to it. Fix the underlying issue first; only suppress when there's a documented,
exceptional reason (a handful of existing `eslint-disable` comments in this codebase, e.g. around
`react-hooks/exhaustive-deps`, are the accepted precedent for what a legitimate reason looks like).

## No em dashes

No em dashes in comments, docs, or user-facing strings. Use a comma, colon, period, or semicolon
instead, whichever reads most naturally in context. This is a deliberate, project-wide style
choice, not an oversight to "fix" back to em dashes.

## Mobile support

Every non-admin feature must work at a phone-width viewport (~375-428px). A change to a
non-admin page isn't done until it's been checked there, not just on desktop. See the Mobile
section of `AGENTS.md` for the established patterns (`useIsMobile()`, card-per-row tables,
stacked forms).

## Authorization

Enforce feature permissions, no-access hiding, and the API token read-only cap server-side
first. UI-level hiding is a UX nicety, never the actual gate.

## Server-action error handling

New server-action call sites should use the `useServerAction` hook
(`src/app/_shared/useServerAction.ts`) when the control flow fits its `action -> onSuccess`
shape. Don't force an awkward fit onto a call site that doesn't, for example one that always
continues and refreshes regardless of error; leave those on their own `useTransition` instead.

## History-preserving fields

Anything with a "current value" that changes over time (`Asset.value`, `Liability.balance`)
should append a change row (`AssetValueChange`, `LiabilityBalanceChange`), never overwrite the
value in place.

## Settings proliferation

Don't add a new user-facing setting for every small UI tweak. Before introducing one, consider
whether a hardcoded value or an existing theme/design token already covers it, and whether the
setting provides meaningful value to users versus just configuration surface area.

## Icons

MUI icons only (`@mui/icons-material`). Never a literal Unicode glyph standing in for an icon in
JSX. Plain punctuation in copy is fine; this is specifically about icon-shaped characters.

## Related documentation

- [AGENTS.md](../AGENTS.md) for general development guidelines
- [CONTRIBUTING.md](CONTRIBUTING.md) for how to open a PR
