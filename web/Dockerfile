FROM node:current-alpine AS build

RUN apk --update upgrade && \
    apk add curl ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/cache/apk/* &&\
    apk add --no-cache bash git openssh

WORKDIR /home/node/fuzion-web
COPY babel ./babel
COPY src ./src
COPY package.json webpack.config.js tsconfig.json ./

RUN npm install && \
    npm run build:release

FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY conf/nginx.conf.docker /etc/nginx/conf.d/default.conf.docker

COPY --from=build /home/node/fuzion-web/build/release/. /usr/share/nginx/html/
COPY conf/app.properties.js.docker /usr/share/nginx/html/

COPY ./docker-entrypoint.sh /
RUN USER=root chmod +wx /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

STOPSIGNAL SIGTERM

CMD ["nginx", "-g", "daemon off;"]
