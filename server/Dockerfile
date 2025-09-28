# syntax=docker/dockerfile:1

#############################################
# Install dependencies
#############################################
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

#############################################
# Build TypeScript sources
#############################################
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

#############################################
# Production runtime
#############################################
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["sh", "-c", "node dist/scripts/prepare-db.js && node dist/src/index.js"]
