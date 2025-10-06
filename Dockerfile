# syntax=docker/dockerfile:1

#############################################
# Build phase
#############################################
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . ./

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the production artifacts
RUN npm run build

#############################################
# Runtime phase
#############################################
FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

# Copy build artifacts
COPY --from=builder /app/dist ./

# Copy nginx configuration with API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4173

CMD ["nginx", "-g", "daemon off;"]
