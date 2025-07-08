# ---- Etapa 1: Builder ----
# Usamos una imagen completa de Node.js para construir las dependencias de forma segura.
FROM node:18 AS builder

# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos los manifiestos de dependencias
COPY package.json package-lock.json ./

# Instalamos las dependencias de producción de forma limpia
RUN npm ci --only=production

# ---- Etapa 2: Producción ----
# Usamos una imagen ligera de Alpine para el contenedor final
FROM node:18-alpine

WORKDIR /workspace

# Copiamos las dependencias ya instaladas desde la etapa 'builder'
COPY --from=builder /app/node_modules ./node_modules

# Copiamos el código de la aplicación
COPY . .

EXPOSE 8080
CMD ["node", "index.js"]