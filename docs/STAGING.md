## Staging with docker-compose

This repository includes:

- `docker-compose.yml` — core services (db, api, minio, website)
- `docker-compose.staging.yml` — staging helpers (adds `caddy` service, volumes, etc.)
- `docker-compose.staging.override.yml` — host-specific overrides (non-conflicting host port mappings)
- `caddy/Caddyfile.staging` — Caddy reverse-proxy configuration for the staging domain
- `scripts/deploy-staging.sh` — pull & deploy helper script (run on the VPS)
- `scripts/setup-staging.sh` — optional provisioning helper (installs packages, clones repo)

Goal: run a full-stack staging environment on your Namecheap VPS while keeping production running on the same machine.

High-level changes you should be aware of
- We do NOT bind host ports 80/443 inside `docker-compose.staging.yml` by default to avoid colliding with an existing production reverse-proxy on the same VPS.
- Use `docker-compose.staging.override.yml` to remap host ports for staging (example: website -> 5173, api -> 4001, minio -> 9002/9003). This keeps the canonical staging definition untouched and lets staging run side-by-side with production.
- `server/.env.staging` is used for staging-specific environment variables. It's ignored by git (see `.gitignore`) — do not commit secrets.

Prerequisites on the VPS
- Ubuntu/Debian (apt) or another distro with Docker installed
- Docker Engine & Compose plugin installed (if missing, `scripts/setup-staging.sh` can install them)
- DNS: `staging.dzutech.com` should point to the VPS IP when you want Caddy to obtain real TLS certificates

How to bring up staging (recommended safe approach)

1) Prepare the staging env file on the VPS (do not copy production secrets):

```bash
# from repo root on VPS
cp server/.env.example server/.env.staging   # or create/edit server/.env.staging manually
nano server/.env.staging
```

2) Start staging using the override so host ports don't collide with prod:

```bash
export COMPOSE_PROJECT_NAME=dzutech_staging
docker compose --env-file server/.env.staging \
   -f docker-compose.yml \
   -f docker-compose.staging.yml \
   -f docker-compose.staging.override.yml \
   up -d --build
```

Notes:
- The override file remaps the host-facing ports so the staging stack can run without stopping production.
- If you prefer Caddy inside the staging compose to manage TLS (bind 80/443), only do that on a host that is not already using those ports — `docker-compose.staging.yml` contains a commented ports block and `docker-compose.staging.override.yml` includes a commented example for Caddy ports.

Inspect status & logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml -f docker-compose.staging.override.yml ps
docker compose logs -f --tail 200
docker compose logs -f caddy
```

Deploy helper script (recommended for repeatable deploys)

Use `scripts/deploy-staging.sh` on the VPS to pull the `staging` branch and run compose. Example:

```bash
# from repo root on VPS
chmod +x scripts/deploy-staging.sh
sudo ./scripts/deploy-staging.sh --branch staging --domain staging.dzutech.com
```

What the deploy script does:
- Ensures Docker is present (attempts apt-based install if missing)
- Fetches `origin/staging`, resets the local branch to remote
- Ensures `server/.env.staging` exists (copies from example or creates a placeholder)
- Runs `docker compose` with the staging compose and override (see command above)
- Waits for a health endpoint (default `/api/health`) and prints logs if the service doesn't become healthy

If you still need to provision the VPS from scratch

`scripts/setup-staging.sh` is an optional one-shot helper to install Docker, nginx/certbot, clone the repo into `/var/www/dzutech-staging` (or the path you specify), create a staging env file, start compose, and (optionally) configure an nginx site for the staging domain. Use it only on hosts you control and review it before running.

Access control & TLS recommendations
- By default Caddy in the repo is configured for TLS but doesn't bind host 80/443 (to avoid collisions). You have two choices:
   1) Use the host reverse-proxy (recommended when production already terminates TLS): keep Caddy unbound and configure your host proxy to forward `staging.dzutech.com` to the ports the override exposes (example nginx snippet below).
   2) Let the Caddy inside the staging compose bind to host 80/443 and obtain certs itself — only do this on a host where production is not binding 80/443.

Protect staging from public indexing and access
- The `caddy/Caddyfile.staging` sets `X-Robots-Tag: noindex, nofollow` to discourage indexing.
- Add Basic Auth for staging (recommended) either at the host proxy or by enabling Caddy `basicauth` in `caddy/Caddyfile.staging`.

Example host proxy (nginx) to forward to the override ports

Replace cert paths and adjust upstream ports if you changed them in `docker-compose.staging.override.yml`:

```nginx
server {
   listen 80;
   server_name staging.dzutech.com;
   return 301 https://$host$request_uri;
}
server {
   listen 443 ssl;
   server_name staging.dzutech.com;

   ssl_certificate /etc/letsencrypt/live/dzutech.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/dzutech.com/privkey.pem;

   location /api/ {
      proxy_pass http://127.0.0.1:4001;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
   }

   location / {
      proxy_pass http://127.0.0.1:5173;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
   }

   add_header X-Robots-Tag "noindex, nofollow" always;
}
```

CI/CD recommendation
- Add a `staging` branch and a GitHub Actions workflow that runs your repository checks (`npm run ci:local`) on PRs/merges and deploys to the staging VPS (either by SSHing and running `scripts/deploy-staging.sh` or by pushing images to a registry and pulling on the VPS).

Troubleshooting
- If Caddy inside the compose fails to obtain certs, verify DNS for `staging.dzutech.com` points to the VPS and that ports 80/443 are reachable.
- If the `api` cannot connect to `db`, confirm `server/.env.staging` values: `DATABASE_URL` should reference `db:5432` when services are in the same compose network.

Security reminder
- Never commit `server/.env.staging` or other files that contain secrets. `.gitignore` already contains entries to prevent this. Keep secrets in a vault or only on the VPS.

That's it — use the override file to safely run staging alongside production and the deploy script to make deployments repeatable.
