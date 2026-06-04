# Etapa 1: Construcción
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Etapa 2: Servidor para archivos estáticos
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist

# Exponemos el puerto 3000 (puerto por defecto de serve)
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]