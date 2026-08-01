FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src /app/
RUN npm i

EXPOSE 3400

CMD ["npx", "tsx", "src/httpServer.ts"]
