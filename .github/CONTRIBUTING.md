# Contributing to CoreBudget

Thanks for taking a look at this project. A few pointers before you dive in.

## Getting set up

See the [README](../README.md#local-development) for local development setup (requires a running
Postgres instance) and the [Docker guide](../docker/README.md) if you'd rather test against the
self-hosted image instead.

## Filing an issue

Use the [bug report](ISSUE_TEMPLATE/bug_report.yml) or
[feature request](ISSUE_TEMPLATE/feature_request.yml) template. For a bug, include how you're
running CoreBudget (Docker image vs. local dev), the version/tag, and any relevant logs.

## Opening a pull request

- Fill out the [pull request template](PULL_REQUEST_TEMPLATE.md); the checklist at the bottom
  covers what should pass locally before you open it.
- See [CODE_REVIEW_GUIDELINES.md](CODE_REVIEW_GUIDELINES.md) for the project-specific things a
  review will check for (server-side authorization, mobile viewport support, and a few
  established code patterns).
- [CODEOWNERS](CODEOWNERS) lists who gets requested for review.

## Commit messages

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): subject`, e.g. `fix(accounts): correct running balance after a split edit`. A
commit-msg hook enforces this; the allowed types are `feat`, `fix`, `docs`, `style`, `refactor`,
`perf`, `test`, `build`, `ci`, `chore`, and `revert`. `feat`/`fix` (and anything marked as a
breaking change) directly drive the project's semantic version bump, so getting the type right
matters, not just the format.

## Code style

Formatting is Prettier-enforced and linting is ESLint; both run automatically on commit via a
pre-commit hook (`lint-staged`). Run `npm run lint` and `npm run typecheck` yourself before
opening a PR either way.
