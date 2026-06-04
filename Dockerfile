# Etapa 1: Construcción
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para compilar binarios
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 1. Copiar los archivos de dependencias
COPY frontend/package.json frontend/package-lock.json* ./

# 2. INSTALAR DEPENDENCIAS PRIMERO (Esto es lo que faltaba)
RUN npm install

# 3. Copiar el resto del código fuente del frontend
COPY frontend/ .

# 4. AHORA SÍ: Ejecutar el build
RUN npm run build

# Etapa 2: Servidor
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
# Copiamos solo la carpeta de producción generada en la etapa anterior
COPY --from=builder /app/dist /app/dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]