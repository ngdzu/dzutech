#!/usr/bin/env bash
set -euo pipefail

# setup-staging.sh
# Automated staging environment setup for a Namecheap VPS (Ubuntu/Debian).
# What it does:
#  - Installs Docker, docker-compose, nginx, certbot, and utilities
#  - Creates an app directory and clones (or updates) your git repo
#  - Creates a staging env file placeholder at server/.env.staging
#  - Runs docker-compose on the server using the staging env file
#  - Installs an nginx reverse-proxy site for the staging domain
#  - Optionally enables HTTP basic auth and obtains a Let's Encrypt cert
#
# Usage (run as root or with sudo):
#   sudo ./scripts/setup-staging.sh --domain staging.dzutech.com \
#       --repo git@github.com:ngdzu/dzutech.git --branch staging
#
# Notes:
#  - This assumes an Ubuntu/Debian-based VPS. Adapt package manager commands for other distros.
#  - You must provide a git repo URL and have SSH deploy keys configured on the VPS (or use https and credentials).
#  - The script will create /var/www/dzutech-staging by default; change with --deploy-dir.
#  - The script will run docker-compose from the repo root. Ensure the repo contains a docker-compose.yml or adjust manually.

DOMAIN="staging.dzutech.com"
REPO=""
BRANCH="staging"
DEPLOY_DIR="/var/www/dzutech-staging"
APP_USER="www-data"
PROXY_PORT=3000
ENABLE_BASIC_AUTH=false
BASIC_AUTH_USER="staging"

print_usage() {
  cat <<EOF
Usage: $0 --domain staging.example.com --repo git@github.com:your/repo.git [options]

Options:
  --domain DOMAIN           Staging FQDN to configure (default: $DOMAIN)
  --repo REPO_URL           Git repo URL to clone (required)
  --branch BRANCH           Git branch to checkout (default: $BRANCH)
  --deploy-dir PATH         Deploy directory on VPS (default: $DEPLOY_DIR)
  --proxy-port PORT         Port your app listens on inside the host (default: $PROXY_PORT)
  --app-user USER           System user to own files (default: $APP_USER)
  --enable-basic-auth       Enable nginx Basic Auth for staging
  --basic-auth-user USER    Basic auth username (default: $BASIC_AUTH_USER)
  -h, --help                Show this help and exit

Examples:
  sudo $0 --domain staging.dzutech.com --repo git@github.com:ngdzu/dzutech.git
  sudo $0 --domain staging.dzutech.com --repo https://github.com/ngdzu/dzutech.git --enable-basic-auth
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --deploy-dir) DEPLOY_DIR="$2"; shift 2 ;;
    --proxy-port) PROXY_PORT="$2"; shift 2 ;;
    --app-user) APP_USER="$2"; shift 2 ;;
    --enable-basic-auth) ENABLE_BASIC_AUTH=true; shift 1 ;;
    --basic-auth-user) BASIC_AUTH_USER="$2"; shift 2 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Unknown argument: $1"; print_usage; exit 1 ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "ERROR: --repo is required"
  print_usage
  exit 2
fi

echo "Setting up staging for: $DOMAIN"
echo "Repo: $REPO (branch: $BRANCH)"
echo "Deploy dir: $DEPLOY_DIR"

ensure_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (or with sudo)." >&2
    exit 3
  fi
}

ensure_root

apt_install_if_missing() {
  local pkg="$1"
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y "$pkg"
  fi
}

install_prereqs() {
  echo "Installing Docker, docker-compose-plugin, nginx, certbot and utilities..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg lsb-release git

  # Docker repo
  if ! command -v docker >/dev/null 2>&1; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    echo "Docker already installed"
  fi

  apt_install_if_missing nginx
  apt_install_if_missing certbot
  apt_install_if_missing python3-certbot-nginx
  apt_install_if_missing apache2-utils

  # Add APP_USER if doesn't exist
  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    useradd -m -s /bin/bash "$APP_USER" || true
  fi
}

clone_or_update_repo() {
  echo "Cloning/updating repo to $DEPLOY_DIR"
  mkdir -p "$DEPLOY_DIR"
  chown "$APP_USER":"$APP_USER" "$DEPLOY_DIR"

  if [[ -d "$DEPLOY_DIR/.git" ]]; then
    echo "Repo already exists, fetching latest..."
    pushd "$DEPLOY_DIR" >/dev/null
    git fetch --all --prune
    git checkout "$BRANCH" || git checkout -b "$BRANCH" origin/$BRANCH || true
    git pull --rebase origin "$BRANCH" || true
    popd >/dev/null
  else
    sudo -u "$APP_USER" git clone --branch "$BRANCH" "$REPO" "$DEPLOY_DIR"
  fi
}

create_env_staging() {
  echo "Preparing staging env file under server/.env.staging"
  if [[ -f "$DEPLOY_DIR/server/.env.staging" ]]; then
    echo "Found existing .env.staging — leaving in place (edit if needed): $DEPLOY_DIR/server/.env.staging"
    return
  fi

  # Try to copy from server/.env.example or server/.env if present
  if [[ -f "$DEPLOY_DIR/server/.env.example" ]]; then
    cp "$DEPLOY_DIR/server/.env.example" "$DEPLOY_DIR/server/.env.staging"
  elif [[ -f "$DEPLOY_DIR/server/.env" ]]; then
    echo "A server/.env exists. Creating .env.staging from it but you MUST edit secrets."
    cp "$DEPLOY_DIR/server/.env" "$DEPLOY_DIR/server/.env.staging"
  else
    cat > "$DEPLOY_DIR/server/.env.staging" <<EOL
# .env.staging - staging environment variables
# Replace placeholders with staging credentials. Do NOT use production secrets.
NODE_ENV=staging
PORT=$PROXY_PORT
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=staging_user
DB_PASS=staging_password
DB_NAME=staging_db

# Storage (S3 or MinIO)
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=dzutech-staging
S3_KEY=change_me
S3_SECRET=change_me

# Other secrets — change these
JWT_SECRET=change-me-staging
ADMIN_PASSWORD=change-me
EOL
  fi

  chown "$APP_USER":"$APP_USER" "$DEPLOY_DIR/server/.env.staging"
  chmod 640 "$DEPLOY_DIR/server/.env.staging"
  echo "Created: $DEPLOY_DIR/server/.env.staging — edit values before running the app."
}

run_compose() {
  echo "Starting docker-compose with staging env..."
  pushd "$DEPLOY_DIR" >/dev/null
  # Use docker compose plugin via 'docker compose' to avoid dependency on legacy python-compose
  if command -v docker >/dev/null 2>&1; then
    export COMPOSE_PROJECT_NAME=dzutech_staging
    # docker compose will pick up docker-compose.yml by default in repo root
    docker compose --env-file "server/.env.staging" up -d --build
  else
    echo "Docker not found in PATH after install. Aborting."
    exit 10
  fi
  popd >/dev/null
}

setup_nginx() {
  echo "Configuring nginx for $DOMAIN"
  local conf="/etc/nginx/sites-available/$DOMAIN"
  local enabled="/etc/nginx/sites-enabled/$DOMAIN"

  cat > "$conf" <<NGCONF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Prevent search engines from indexing staging
    add_header X-Robots-Tag "noindex, nofollow" always;

    location / {
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://127.0.0.1:$PROXY_PORT;
    }
}
NGCONF

  ln -sf "$conf" "$enabled"
  nginx -t
  systemctl reload nginx || true

  if [[ "$ENABLE_BASIC_AUTH" == true ]]; then
    echo "Creating basic auth credentials for user $BASIC_AUTH_USER"
    read -s -p "Enter password for Basic Auth user $BASIC_AUTH_USER: " BAPASS
    echo
    htpasswd -cb "/etc/nginx/.htpasswd" "$BASIC_AUTH_USER" "$BAPASS"
    # Insert auth directives into the nginx site
    sed -i "/location \/ {/a \        auth_basic \"Staging\";\n        auth_basic_user_file /etc/nginx/.htpasswd;" "$conf"
    nginx -t
    systemctl reload nginx || true
  fi

  echo "Obtaining TLS cert for $DOMAIN with certbot (this requires the domain to point to this VPS)..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN || true
}

open_firewall() {
  echo "Opening firewall ports 80 and 443 (ufw) if present"
  if command -v ufw >/dev/null 2>&1; then
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
  fi
}

final_notes() {
  cat <<EOF

STAGING SETUP COMPLETE (basic run).

Next steps (important):
  - Edit secrets: $DEPLOY_DIR/server/.env.staging and replace placeholder secrets (DB, S3, JWT, etc.)
  - Ensure DNS for $DOMAIN points to this VPS IP before certbot can obtain certs.
  - If your app listens on a different port than $PROXY_PORT, re-run the script with --proxy-port or edit the nginx config at /etc/nginx/sites-available/$DOMAIN
  - To redeploy after code changes: in $DEPLOY_DIR run:
      git checkout $BRANCH && git pull origin $BRANCH
      docker compose --env-file server/.env.staging up -d --build

  - Protect staging from public access: use --enable-basic-auth when running this script or edit nginx to add auth/allow rules.

If something failed, inspect logs:
  docker compose --env-file server/.env.staging ps
  docker compose --env-file server/.env.staging logs --tail 200
  journalctl -u nginx -n 200

EOF
}

### Main flow
install_prereqs
clone_or_update_repo
create_env_staging
open_firewall
run_compose
setup_nginx
final_notes

exit 0
