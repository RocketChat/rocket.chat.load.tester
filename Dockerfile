FROM node:8-alpine

RUN apk --no-cache --virtual build-dependencies add \
    python \
    make \
    g++ \
    git

ADD ./build /app
ADD package.json /app

WORKDIR /app

ENV PORT=3000 \
    NODE_ENV=production

RUN set -x \
 && npm install \
 && npm cache clear --force \
 && apk del build-dependencies

EXPOSE 3000

CMD ["node", "server.js"]
