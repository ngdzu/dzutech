# syntax=docker/dockerfile:1

#############################################
# Install dependencies
#############################################
FROM node:20-slim AS deps

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci

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
# Install only production dependencies for the API runtime
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["sh", "-c", "node dist/scripts/prepare-db.js && node dist/src/index.js"]
