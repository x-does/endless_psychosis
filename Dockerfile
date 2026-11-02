FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

ENV PORT=80
EXPOSE 80

CMD ["node", "app.js"]
