# Production Dockerfile for Next.js Frontend
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy all necessary files (build context is /frontend when root dir is set in Railway)
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY src ./src
COPY public ./public

# Install dependencies
RUN npm ci

# NEXT_PUBLIC_* variables are embedded at build time by Next.js.
# Railway passes environment variables as build args when using Dockerfile builder.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy standalone build output (minimal server + traced deps, no full node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Bind to all interfaces so Railway can reach the standalone server
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start Next.js standalone server
CMD ["node", "server.js"]
