FROM golang:1.14.3-alpine AS build

WORKDIR /src
ENV CGO_ENABLED=0
COPY . .
RUN apk add git
RUN go build -o /out/stream-overlay ./cmd/stream-overlay

FROM alpine:3.11

RUN USER=root mkdir -p /usr/local/bin
RUN USER=root mkdir -p /usr/local/etc/stream-overlay

RUN USER=root adduser -D -u 10001 stream-overlay

COPY --chown=stream-overlay --from=build /out/stream-overlay /usr/local/bin
COPY --chown=stream-overlay ./conf/stream-overlay.config.json.docker /usr/local/etc/stream-overlay/

COPY ./docker-entrypoint.sh /
RUN USER=root chmod +wx /docker-entrypoint.sh

WORKDIR /var/local/stream-overlay
EXPOSE 31337
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/local/bin/stream-overlay", "--config", "/usr/local/etc/stream-overlay/stream-overlay.config.json"]
