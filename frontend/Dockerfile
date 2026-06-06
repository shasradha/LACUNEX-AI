# ─────────────────────────────────────────────────────────
# LACUNEX AI — Frontend Dockerfile
# Next.js 16 with multi-stage build
# ─────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build the application ───────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The API URL is baked in at build time for Next.js static export
# In Docker Compose, the frontend talks to the backend via Docker network
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ── Stage 3: Production server ───────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary files from the builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Since the project uses `output: 'export'` (static), we serve with `next start`
# However, static export doesn't support `next start`. We'll use a lightweight
# static file server instead. Let's install `serve` for production.
RUN npm install -g serve

# Copy the static export output
COPY --from=builder /app/out ./out

USER nextjs

EXPOSE 3000

# Serve the static export
CMD ["serve", "out", "-l", "3000", "-s"]
