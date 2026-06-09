# Etapa 1: Construcción (Node 20)
FROM node:20-alpine AS builder

# Librerías de sistema para binarios nativos (Tailwind v4 / oxide)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copiar configuración e instalar dependencias estrictas
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Copiar el resto del código del frontend
COPY frontend/ .

# La URL del backend se inyecta en build (Vite quema las VITE_* en el bundle)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build de producción
RUN npm run build

# Etapa 2: Servidor estático
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist

# Railway asigna el puerto por $PORT
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]