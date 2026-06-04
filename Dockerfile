# Etapa 1: Construcción
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para compilar binarios de C++ (requerido por PostCSS)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar archivos de configuración primero para aprovechar el caché
COPY frontend/package.json frontend/package-lock.json* ./

# Instalar dependencias puras en el contenedor
RUN npm install

# Copiar el resto del código
COPY frontend/ .

# Ejecutar el build
RUN npm run build

# Etapa 2: Servidor
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]