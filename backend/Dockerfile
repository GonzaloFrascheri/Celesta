FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
# Cloud Run inyecta $PORT=8080 por defecto
EXPOSE 8080
CMD ["npm","start"]
