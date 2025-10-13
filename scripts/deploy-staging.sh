#!/usr/bin/env bash
set -euo pipefail

# deploy-staging.sh
# Pull latest from git and deploy staging stack using docker compose
# Usage:
#   sudo ./scripts/deploy-staging.sh --dir /srv/dzutech --branch staging --domain staging.dzutech.com
#
BRANCH="staging"
DEPLOY_DIR="$(pwd)"
DOMAIN="staging.dzutech.com"
ENV_FILE="server/.env.staging"
COMPOSE_FILES=(docker-compose.yml docker-compose.staging.yml)
HEALTH_PATH="/api/health"
RETRIES=30
SLEEP=5

print_usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --dir PATH         Path to repository on the VPS (default: current dir)
  --branch BRANCH    Git branch to deploy (default: staging)
  --domain HOSTNAME  Staging domain (default: staging.dzutech.com)
  --env-file PATH    Path to staging env file relative to repo root (default: $ENV_FILE)
  -h, --help         Show this help and exit

This script will:
  - fetch latest from origin/$BRANCH
  - ensure $ENV_FILE exists (will copy from .env.example or .env if missing)
  - run docker compose with the staging override
  - wait for the site to report healthy at $DOMAIN$HEALTH_PATH

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --dir) DEPLOY_DIR="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Unknown arg: $1"; print_usage; exit 2 ;;
  esac
done

echo "Deploying branch '$BRANCH' in $DEPLOY_DIR to domain $DOMAIN"

cd "$DEPLOY_DIR"

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found. Attempting to install Docker Engine and compose plugin (requires apt on Ubuntu/Debian)."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  fi
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    echo "Found env file: $ENV_FILE"
    return
  fi

  echo "Env file $ENV_FILE not found. Attempting to create from server/.env.example or server/.env"
  if [[ -f "server/.env.example" ]]; then
    cp server/.env.example "$ENV_FILE"
  elif [[ -f "server/.env" ]]; then
    cp server/.env "$ENV_FILE"
  else
    cat > "$ENV_FILE" <<EOL
# Placeholder .env.staging — edit values before running
NODE_ENV=staging
PORT=4000
DB_HOST=db
DB_PORT=5432
DB_USER=staging_user
DB_PASSWORD=change_me
DB_NAME=staging_db
S3_ENDPOINT=http://minio:9000
S3_BUCKET=dzutech-staging
S3_KEY=change_me
S3_SECRET=change_me
JWT_SECRET=change-me-staging
EOL
  fi

  echo "Created $ENV_FILE — please edit it now with staging credentials (do not use production secrets)."
  ls -l "$ENV_FILE"
}

git_pull() {
  echo "Fetching and checking out $BRANCH"
  # Ensure we have origin
  git remote get-url origin >/dev/null 2>&1 || { echo "No origin remote configured; aborting."; exit 4; }
  git fetch --all --prune
  # Create branch if not present locally
  if git show-ref --verify --quiet refs/heads/$BRANCH; then
    git checkout "$BRANCH"
  else
    git checkout -b "$BRANCH" "origin/$BRANCH" || git checkout -b "$BRANCH"
  fi
  git reset --hard "origin/$BRANCH"
}

deploy_compose() {
  echo "Deploying docker compose stack"
  export COMPOSE_PROJECT_NAME=dzutech_staging
  # Build and bring up services. Use --pull to update images if images are used instead of build.
  docker compose --env-file "$ENV_FILE" -f ${COMPOSE_FILES[0]} -f ${COMPOSE_FILES[1]} pull --ignore-pull-failures || true
  docker compose --env-file "$ENV_FILE" -f ${COMPOSE_FILES[0]} -f ${COMPOSE_FILES[1]} up -d --build
}

wait_for_health() {
  echo "Waiting for $DOMAIN$HEALTH_PATH to return HTTP 200 (tries: $RETRIES)"
  local i=0
  local url
  # Prefer https
  url="https://$DOMAIN$HEALTH_PATH"
  while [[ $i -lt $RETRIES ]]; do
    i=$((i+1))
    echo "Attempt $i: curl -sSf --max-time 5 $url"
    if curl -sSf --max-time 5 "$url" >/dev/null 2>&1; then
      echo "Health check passed ($url)"
      return 0
    fi
    sleep $SLEEP
  done
  echo "Health check did not pass after $RETRIES attempts. Check containers and logs."
  docker compose --env-file "$ENV_FILE" -f ${COMPOSE_FILES[0]} -f ${COMPOSE_FILES[1]} ps
  docker compose --env-file "$ENV_FILE" -f ${COMPOSE_FILES[0]} -f ${COMPOSE_FILES[1]} logs --tail 200
  return 1
}

### Main
ensure_docker
git_pull
ensure_env_file
deploy_compose
if wait_for_health; then
  echo "Staging deployed and healthy at https://$DOMAIN"
else
  echo "Staging deployed but health checks failed. Inspect logs."
fi

echo "Done. To redeploy later: cd $DEPLOY_DIR && git pull origin $BRANCH && docker compose --env-file $ENV_FILE -f ${COMPOSE_FILES[0]} -f ${COMPOSE_FILES[1]} up -d --build"

exit 0
