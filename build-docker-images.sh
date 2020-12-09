#!/bin/bash -e

docker build . -t docker.fzn.im/stream-overlay-svc
docker build web/ -t docker.fzn.im/stream-overlay-web
