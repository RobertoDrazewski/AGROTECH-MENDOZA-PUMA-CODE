# Etapa 1: Construcción
FROM node:18-alpine AS builder

# Instalar herramientas necesarias para compilar binarios nativos
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY frontend/package.json frontend/package-lock.json* ./

# INSTALAR Y LIMPIAR
# Forzamos la instalación limpia ignorando scripts que puedan fallar en Linux
RUN npm ci --prefer-offline --no-audit

# Copiar el resto del código
COPY frontend/ .

# Ejecutar el build forzando la reconstrucción de módulos
RUN npm rebuild && npm run build

# Etapa 2: Servidor
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]