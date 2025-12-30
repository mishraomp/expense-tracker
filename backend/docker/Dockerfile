# Dev/runtime image used by docker-compose and CI smoke tests
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
