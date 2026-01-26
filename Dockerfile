<<<<<<< HEAD
# Multi-stage build for FashionStore

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astro

# Copy built application
=======
# Multi-stage build optimizado para Coolify
# FashionStore - E-commerce de Moda Premium

# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci --only=production=false

# ===== Stage 2: Build =====
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependencias del stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de build (necesarias para el build de Astro)
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG PUBLIC_SITE_URL

ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL

# Build de la aplicación
RUN npm run build

# ===== Stage 3: Production =====
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Crear usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 astro

# Copiar solo lo necesario para producción
>>>>>>> 290b5f2fa892799bda82ecf1e2975f11eeeb97a8
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

<<<<<<< HEAD
# Set user
USER astro

# Expose port
EXPOSE 4321

# Set environment
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

# Start the server
=======
# Cambiar a usuario no-root
USER astro

# Variables de entorno de producción
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Puerto expuesto
EXPOSE 4321

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:4321 || exit 1

# Comando de inicio
>>>>>>> 290b5f2fa892799bda82ecf1e2975f11eeeb97a8
CMD ["node", "./dist/server/entry.mjs"]
