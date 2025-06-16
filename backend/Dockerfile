FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# Instalamos solo las dependencias de producción
RUN npm install --omit=dev
COPY . .
EXPOSE 3001
# El comando por defecto será iniciar la aplicación
CMD ["node", "index.js"]
