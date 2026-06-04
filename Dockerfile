# Etapa 1: Construcción (Usando Node 20)
FROM node:20-alpine AS builder

# Instalar librerías de sistema necesarias para binarios nativos (Rust/C++)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copiar archivos de configuración
COPY frontend/package.json frontend/package-lock.json* ./

# Instalar dependencias estrictas
RUN npm ci --prefer-offline --no-audit

# Copiar el resto del código
COPY frontend/ .

# Ejecutar el build
# Tailwind v4 necesita este entorno para el binario de @tailwindcss/oxide
RUN npm run build

# Etapa 2: Servidor
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]