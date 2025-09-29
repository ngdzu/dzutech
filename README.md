# Personal Website · dzutech.com

A modern, animated personal website for showcasing software engineering work. Built with React, TypeScript, Tailwind CSS, and Vite, packaged for production with Docker.

## ✨ Highlights

- Dark, professional theme with subtle gradients and motion cues
- Hero, about, experience, resources, and writing sections
- Contact panel with direct email + social links (LinkedIn, GitHub, X)
- Content delivered through an API-backed context layer with PostgreSQL persistence
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

## 🐳 Docker

Build and run the entire stack (database, API, frontend) with Docker Compose:

```bash
docker compose up --build
```

By default the site is served at <https://dzutech.com> with the API proxied at <https://dzutech.com/api>. Override the origins or point everything back to localhost for development by editing the `.env` file in the project root. PostgreSQL remains exposed on port 5432 inside Docker.

To stop and clean up the container:

```bash
docker compose down
```

## 📁 Project structure

- `src/App.tsx` – router definition for the marketing site and admin dashboard
- `src/pages/LandingPage.tsx` – public-facing sections (hero, experience, resources, writing, contact)
- `src/pages/AdminDashboard.tsx` – content editor surfaced at `/admin`
- `src/context/ContentContext.tsx` – API-driven content provider with loading/error state
- `src/content.ts` – default profile, experience, links, and writing data
- `src/lib/api.ts` – thin client for calling the backend REST endpoints
- `src/index.css` – global Tailwind layer and base styling
- `server/` – Express + TypeScript API wired to PostgreSQL (see `server/package.json` for scripts)
- `Dockerfile` / `docker-compose.yml` – containerized runtime

## 🛠️ Customization tips

- Update default names, headlines, or contact info in `src/content.ts`
- Use the `/admin` dashboard to publish profile changes directly to the database (no redeploy needed)
- Adjust theme colors and animations in `tailwind.config.js`
- Extend sections or add new cards by following the component patterns in `src/pages/LandingPage.tsx`

## 🔐 Admin dashboard notes

- Navigate to `https://dzutech.com/admin` (or `http://localhost:5173/admin` if you override the origin for local work) to edit core profile fields
- Changes persist in PostgreSQL via the API and immediately update the public landing page
- Use the **Restore defaults** button to repopulate the seeded profile data across the stack

## 📄 License

This project is currently unlicensed. Add your preferred license before publishing.
