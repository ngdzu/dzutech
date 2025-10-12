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

### Configure environment (.env)

Before running the app or the server helpers you should create a local `.env` from the provided example. This keeps secrets and environment-specific settings out of the repo while making local overrides easy.

```bash
# copy the example to a local .env file
# There are two example files you may need to copy depending on what you run:
# - root `.env.example` (frontend / repo-level settings)
# - `server/.env.example` (server-specific settings like DATABASE_URL)

# copy both examples to local .env files
cp .env.example .env
cp server/.env.example server/.env

```

Note: After cloning, you can use the provided password hash in .env.example for development. However, for production, you must generate and use a secure, unique password hash.

Quick commands to generate secrets and directories:

```bash
# Create uploads dir
mkdir -p server/uploads

# Generate a session secret (macOS / Linux):
openssl rand -base64 32

# Generate a bcrypt password hash (from the server folder):
cd server
npm run hash-password -- "My$tr0ngP@ssw0rd!"
```

Security reminder: do not commit `.env` files containing real secrets. Keep `*.example` files in the repo and copy them to `.env` only on trusted machines.

Important variables you may want to update:

- `DATABASE_URL` — connection string for Postgres (for local Docker setups this may be `postgres://user:pass@db:5432/dbname`).
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` — if you run local MinIO for S3-compatible storage.
- `S3_REGION`, `S3_ENDPOINT` — if you use a cloud S3 provider or an alternate endpoint.
- `BCRYPT_SALT_ROUNDS` — controls bcrypt hashing rounds for `npm run hash-password` (default 12).
- `UPLOAD_DIR` — local filesystem fallback directory for uploads when S3/MinIO is unavailable.

Note: update both `./.env` and `./server/.env` as needed — some variables are consumed by the frontend/app at repo root and others are server-only. Keep values consistent (for example DB host/port, minio endpoint) when running locally with Docker.

Security note: never commit `.env` to git. The repo includes `.env.example` for reference only.


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



## Creating password hashes

The server includes a small helper script to generate bcrypt password hashes for seeding the database or creating an initial admin user. Use this locally (do not share plaintext passwords in public chat or logs).

1. Change into the `server` folder:

```bash
cd server
```

2. Create a bcrypt hash from a plaintext password (default 12 salt rounds):

```bash
npm run hash-password -- "My$tr0ngP@ssw0rd!"
```

The script prints the generated hash to stdout. Copy that hash into your database or seed file as needed.

3. (Optional) Control bcrypt salt rounds using `BCRYPT_SALT_ROUNDS` environment variable:

```bash
BCRYPT_SALT_ROUNDS=14 npm run hash-password -- "My$tr0ngP@ssw0rd!"
```

The script will validate the provided rounds (must be a number >= 4) and fall back to 12 if the value is invalid.

4. Verify a plaintext password against an existing hash (quick one-liner):

```bash
node -e "const b=require('bcryptjs'); console.log(b.compareSync('My$tr0ngP@ssw0rd!', '<PASTED_HASH>'))"
# prints true or false
```

Security notes
- Do not paste real production passwords into public logs, issue trackers, or chat.
- Generate hashes on a trusted machine and copy only the hash into the database.
- Prefer using at least 12 salt rounds; increase rounds if you require higher CPU-based protection (but expect slower hashing).
