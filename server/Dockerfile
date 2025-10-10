# syntax=docker/dockerfile:1

#############################################
# Install dependencies
#############################################
FROM node:20-slim AS deps

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci
# Optionally install a platform-specific sharp binary during build. Don't hardcode
# the architecture — instead allow passing build args when you need to force a
# specific target (useful for cross-building with buildx). If no args are
# provided, npm ci will run sharp's postinstall and fetch the correct binary for
# the current build environment.
ARG SHARP_OS=""
ARG SHARP_ARCH=""
RUN if [ -n "$SHARP_OS" ] && [ -n "$SHARP_ARCH" ]; then \
			npm install --platform="$SHARP_OS" --arch="$SHARP_ARCH" sharp || true; \
		else \
			echo "No SHARP_OS/SHARP_ARCH specified; skipping forced sharp install"; \
		fi

#############################################
# Build TypeScript sources
#############################################
FROM node:20-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY server/package.json server/tsconfig.json ./
COPY server/src ./src
COPY server/scripts ./scripts

RUN npm run build

#############################################
# Production runtime
#############################################
FROM node:20-slim AS production

WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./
# Install only production dependencies for the API runtime. Allow lifecycle scripts so native
# modules can run postinstall where necessary.
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["sh", "-c", "node dist/scripts/prepare-db.js && node dist/src/index.js"]
