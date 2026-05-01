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

# Build
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./

# Install only production dependencies
RUN npm ci --only=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start Next.js
CMD ["npm", "start"]
