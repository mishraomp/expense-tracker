FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY nest-cli.json tsconfig*.json ./
COPY prisma ./prisma/

RUN npm i
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
