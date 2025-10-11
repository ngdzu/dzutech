# Usage & Developer Guide (container-first)

This document explains the container-first workflows for this repository: linting, testing, coverage, Git hooks, CI and Docker commands. Local dev runs are intentionally omitted — use the provided Docker helpers to get consistent results with CI.

## Quick start

After cloning:

```bash
# load aliases that define Docker helper commands
source .alias

# build/run the development container
docker_dev_build
```

## CI

Run the repository's full verification (lint + tests + coverage):

```bash
npm run ci:local
```

This runs `verify:env`, `npm run lint`, `npm run coverage:run` and `npm run coverage:run:server`.

> **Tip:** Regularly run `npm run ci:local` before committing to ensure your code passes all quality checks and validations.

## Linting and fixing

Run the full lint check:

```bash
npm run lint
```

Automatically fix lintable problems:

```bash
npm run lint:fix
```

To preview what the pre-commit hook will do:

```bash
npx lint-staged --debug
```

Notes:
- The ESLint commands include `--no-warn-ignored` to avoid failing on ignored-file warnings.
- You may see a runtime informational warning about `.eslintignore` deprecation — it's safe to ignore after migrating ignores into `eslint.config.js`.

## Coverage

Run coverage for both frontend and server and merge them into a single `coverage/merged` report.

- Run frontend coverage:

```bash
npm run coverage:run
```

- Run server coverage:

```bash
npm run coverage:run:server
```

- Merge coverage (creates `coverage/merged` with `coverage-final.json`, `lcov.info` and HTML `index.html`):

```bash
npm run coverage:merge
```

- Open the merged coverage HTML report locally (macOS example):

```bash
open coverage/merged/index.html
```

CI also uploads the merged coverage as an artifact named `coverage-merged`.

## Pre-commit and pre-push hooks (Husky)

- Pre-commit: lightweight checks only (runs `lint-staged` and `npm run lint`). This keeps commits fast.
- Pre-push: full gating — it runs frontend and server coverage, merges the coverage, and runs the staged-file coverage check. This is intentionally heavier and runs inside the developer's environment when pushing.

Run hooks manually:

```bash
# validate lint-staged
npx lint-staged --debug

# run the pre-push script directly (simulate pushing)
sh .husky/pre-push
```

If you must bypass pre-push checks temporarily (not recommended), use `--no-verify` on push.

## Docker helper commands

Commands are provided via `.alias`:

```bash
# development build
docker_dev_build

# production build
docker_prod_build
```

Adjust Docker environment variables if running in CI or on different Docker hosts.

## Coverage gating for staged files

To run the staged-file coverage check:

```bash
npm run coverage:check-staged
```

This script prefers `coverage/merged/coverage-final.json` if present; otherwise it will merge available coverage files.

## Troubleshooting

- ESLintIgnoreWarning: If you see a warning about `.eslintignore` being deprecated, ensure you migrated ignore entries into `eslint.config.js`. The warning is informational.

- Husky deprecation lines: hooks should not source `_/husky.sh` lines anymore; check `.husky/*` if you still see warnings.

- Pre-push is slow: it runs both coverage runs. Use the container to offload CPU and improve parity.

- Coverage merge failures: ensure frontend and server coverage JSONs exist before merging, or run both coverage jobs inside the container and then `coverage:merge`.

## How to contribute (container workflow)

- Create a branch off `main`.
- Make changes and run the verification steps (e.g. `npm run ci:local`).
- Commit — pre-commit runs linting on staged files.
- Push — pre-push runs merged coverage and staged-coverage check (or let CI handle heavy checks if you want to skip local pre-push).

---

If you'd like, I can update `README.md` to point to `doc/setup.md` and `doc/usage.md` (container-first) for discoverability.

Which would you prefer next?