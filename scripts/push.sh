#!/bin/sh

# build and push the image
docker-compose -f ./docker-compose.build.yml build && \
  docker-compose -f ./docker-compose.build.yml push
