# Etapa 1: Construir la aplicación
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servir la aplicación de producción
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
