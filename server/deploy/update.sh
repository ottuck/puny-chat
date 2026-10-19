#!/bin/sh
# Pulls the latest server image and recreates the container only if it changed. Run every minute by
# puny-chat-update.timer, so a deploy is just a push of the image (no inbound SSH from CI).
set -eu
cd /opt/puny-chat
mkdir -p public # Caddy mounts it; Docker would make a missing one root-owned
mkdir -p photos && chown 1001:1001 photos # the server writes photos as its own user
docker compose pull --quiet server || exit 0 # registry unreachable: try again next minute
docker compose up -d --remove-orphans
docker image prune --force > /dev/null
# Which release is running, for CI to wait on (served by Caddy at /_revision).
docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$(docker compose ps -q server)" > public/revision.tmp
mv public/revision.tmp public/revision
