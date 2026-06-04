# Etapa 1: Construcción
FROM node:18-alpine AS builder

# Instalar librerías de compatibilidad y herramientas de compilación
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY frontend/package.json frontend/package-lock.json* ./

# Instalar dependencias Y forzar la recompilación de binarios
RUN npm install && npm rebuild

# Copiar el resto del código
COPY frontend/ .

# Ejecutar el build
RUN npm run build

# Etapa 2: Servidor (se mantiene igual)
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]