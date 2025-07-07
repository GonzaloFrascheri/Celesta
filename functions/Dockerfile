# functions/Dockerfile
FROM node:18-alpine

# donde copiará todo el código
WORKDIR /workspace

# copiamos sólo package.json para aprovechar cache
COPY package*.json ./

# instalamos sólo prod
RUN npm install --production

# copiamos el resto
COPY . .

# expone el puerto (aunque Cloud Run lo ignora)
EXPOSE 8080

# arrancamos tu servidor Express
CMD ["node", "index.js"]
