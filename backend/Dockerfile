FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Cloud Run fija PORT=8080, expónlo
EXPOSE 8080

CMD ["node", "index.js"]
