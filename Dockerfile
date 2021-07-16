FROM node:10 as builder

ADD . /app

WORKDIR /app

RUN npm install \
 && npm run build \
 && cp package.json /app/dist/cjs

ENV NODE_ENV=production

RUN cd /app/dist/cjs && npm install

FROM node:16-alpine

COPY --from=builder /app/dist/cjs /app

WORKDIR /app

ENV PORT=3000 \
    NODE_ENV=production \
    DEBUG=app:server

EXPOSE 3000

CMD ["node", "index.js"]
