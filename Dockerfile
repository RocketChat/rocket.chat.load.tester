FROM node:10 as builder

ADD . /app

WORKDIR /app

RUN npm install \
 && npm run build \
 && cp package.json /app/build/

ENV NODE_ENV=production

RUN cd /app/build && npm install

FROM node:10-alpine

COPY --from=builder /app/build/ /app

WORKDIR /app

ENV PORT=3000 \
    NODE_ENV=production \
    DEBUG=app:server

EXPOSE 3000

CMD ["node", "server.js"]
