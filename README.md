# Personal Website · dzutech.com

A modern, animated personal website for showcasing software engineering work. Built with React, TypeScript, Tailwind CSS, and Vite, packaged for production with Docker.

## ✨ Highlights

- Dark, professional theme with subtle gradients and motion cues
- Hero, about, experience, and blogs sections
- Contact panel with direct email + social links (LinkedIn, GitHub, X)
- Content delivered through an API-backed context layer with PostgreSQL persistence
- Configurable site branding with optional logo-based home button and accessible alt text requirements
- Lightweight admin dashboard at `/admin` for updating headline details without touching code
- Full-stack Docker Compose setup (frontend, Node API, PostgreSQL)

## 🚀 Local development

Install dependencies once (frontend + API):

```bash
npm install
cd server && npm install
```

Copy the sample environment files and adjust as needed:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

### Security-critical environment variables

- `DATABASE_URL` **must** be supplied in production with a strong password; the code now refuses to boot in production without it.
- `DB_SSL=true` is recommended for any remote database. You can also provide `DB_SSL_CA` (PEM content) and toggle `DB_SSL_REJECT_UNAUTHORIZED` when working with managed certificates.
- `SESSION_SECRET` has to be at least 32 characters in production. Generate one with `openssl rand -hex 32` or your secret manager of choice.
- `ALLOWED_ORIGIN` needs to list every domain that will reach the API (comma separated). In production the server will abort if this variable is missing to avoid falling back to a permissive wildcard configuration.

For local development make the following edits before starting the services:

- In `.env`, set `VITE_API_URL=http://localhost:4000` so the Vite dev server talks to the locally running API.
- In both `.env` and `server/.env`, add `http://localhost:5173` to `ALLOWED_ORIGIN` (and `http://localhost:4173` if you use the Docker dev override) to satisfy CORS while iterating locally.
- Optionally keep the production domains in the list so a single file works for both local testing and deployment.

Ensure PostgreSQL is running locally (or use `docker compose up db` to boot the bundled instance). Then, in one terminal, run the API in watch mode:

```bash
cd server
npm run dev
```

In a second terminal, start the Vite dev server with hot reload:

```bash
npm run dev
```

Build a production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## ✅ Quality checks & Git hooks

- Run `npm run lint` to execute ESLint across the project.
- Run `npm run test` for the client/shared Vitest suite and `npm run test:server` for the API; `npm run test:all` wraps both.

Use `npm run verify:env` to make sure all security-critical environment variables are populated before deploying. This command enforces:

- Strong, non-default `DATABASE_URL` credentials
- `SESSION_SECRET` length (>= 32 chars) and non-placeholder values
- Explicit `ALLOWED_ORIGIN` domains (no wildcards)
- Populated `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`
- `DB_SSL=true` for any non-local database

Locally, export `FORCE_ENV_CHECK=true` if you want to run the verification outside of `NODE_ENV=production`/CI.

> The repo includes a Husky-powered pre-commit hook (`.husky/pre-commit`). Whenever you commit, it automatically:
>
> 1. Runs `npx lint-staged` so only the staged TypeScript/JavaScript files get linted first.
> 2. Runs the full `npm run lint` command.
> 3. Runs `npm run test:all` to ensure client and server tests pass.

### Before you commit

1. Stage your changes (`git add …` or use your editor UI).
2. Optionally run `npm run lint` and `npm run test:all` yourself for faster feedback.
3. Commit as usual. If any step fails, Husky will abort the commit and surface the error output so you can fix issues before retrying.

## 🧪 Continuous integration

GitHub Actions workflow `.github/workflows/ci.yml` installs dependencies, verifies the deployment environment, and runs lint/tests on every push and pull request. To enable it:

1. Add the following repository secrets so the environment check can confirm production readiness:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `ALLOWED_ORIGIN`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD_HASH`
  - `DB_SSL` (set to `true` for remote databases)
2. Optionally provide `DB_SSL_CA` or other secrets if your infrastructure requires them; the workflow will pass through anything you add.
3. Monitor the Actions tab—deployments should only proceed once the environment check, lint, and test jobs finish successfully.

## 🐳 Docker

Build and run the entire stack (database, API, frontend) with Docker Compose:

```bash
docker compose up --build
```

Before starting the stack, populate `.env` with the same admin credentials you configured for the API (at minimum `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH`). Docker Compose injects those values into the API container so session storage and authentication succeed.

By default the site is served at <https://dzutech.com> with the API proxied at <https://dzutech.com/api>. Override the origins or point everything back to localhost for development by editing the `.env` file in the project root. PostgreSQL remains exposed on port 5432 inside Docker.

To stop and clean up the container:

```bash
docker compose down
```

## 📁 Project structure

- `src/App.tsx` – router definition for the marketing site and admin dashboard
- `src/pages/LandingPage.tsx` – public-facing sections (hero, experience, blogs, contact)
- `src/pages/AdminDashboard.tsx` – content editor surfaced at `/admin`
- `src/pages/AdminBlogsPage.tsx` – blog management hub with list and quick actions
- `src/pages/AdminBlogEditorPage.tsx` – form for creating or editing individual blog posts
- `src/pages/AdminBlogsByTagPage.tsx` – filtered view showing posts that share a selected tag
- `src/pages/LoginPage.tsx` – secure admin sign-in form backed by the session API
- `src/context/ContentContext.tsx` – API-driven content provider with loading/error state
- `src/context/AuthContext.tsx` – session-aware auth provider shared across routes
- `src/content.ts` – default profile, experience, and blog data
- `src/lib/api.ts` – thin client for calling the backend REST endpoints
- `src/components/RequireAuth.tsx` – route guard that protects admin-only screens
- `src/components/AdminSessionActions.tsx` – reusable admin header actions (signed-in badge, logout)
- `src/index.css` – global Tailwind layer and base styling
- `server/` – Express + TypeScript API wired to PostgreSQL (see `server/package.json` for scripts)
- `Dockerfile` / `docker-compose.yml` – containerized runtime

## 🛠️ Customization tips

- Update default names, headlines, or contact info in `src/content.ts`
- Use the `/admin` dashboard to publish profile changes directly to the database (no redeploy needed)
- Upload a logo and choose between text or logo home buttons from **Site metadata** to match your branding
- Adjust theme colors and animations in `tailwind.config.js`
- Extend sections or add new cards by following the component patterns in `src/pages/LandingPage.tsx`

## 🔐 Admin dashboard notes

- Manage the site title, meta description, logo upload, and home button style from the **Site metadata** card to control tabs, SEO snippets, and branding
- Navigate to `https://dzutech.com/admin` (or `http://localhost:5173/admin` if you override the origin for local work) to edit core profile fields
- Use the **Manage blogs** shortcut to review all posts, jump into edits, or create new entries
- Blog tags render as clickable chips that route to a dedicated tag view, making it easy to audit related posts
- Changes persist in PostgreSQL via the API and immediately update the public landing page
- Use the **Restore defaults** button to repopulate the seeded profile data across the stack
- When using the logo home button, supply meaningful alt text so the header stays accessible for screen readers

## 🔑 Authentication setup

- Configure the secure session cookies with `SESSION_SECRET`, `SESSION_NAME` (optional), and `SESSION_MAX_AGE_HOURS` in `server/.env`
- Cookie behaviour can be tuned with `SESSION_COOKIE_SECURE` (`auto` \| `true` \| `false`, defaults to `auto`) and `SESSION_COOKIE_SAMESITE` (`strict` \| `lax` \| `none`)
  - Keep `SESSION_COOKIE_SECURE=auto` for production and HTTPS deployments
  - If you test the Docker bundle over plain HTTP (e.g., `http://localhost:4173`), set `SESSION_COOKIE_SECURE=false` so the browser retains the session cookie
- Define a single administrator account by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`
  - Generate a bcrypt hash locally with the helper script:

    ```bash
    cd server
    npm run hash-password <your-password>
    ```

    Copy the resulting hash into `server/.env` (and optionally your production secrets manager)
- The login form lives at `/login` and redirects back to the admin tool you originally requested once authenticated
- Sessions are stored in PostgreSQL (`user_sessions` table) via `connect-pg-simple` and expire automatically after idle
- Use the **Sign out** button in any admin view to terminate the current session immediately

## 📄 License

This project is currently unlicensed. Add your preferred license before publishing.
