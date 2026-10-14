#!/bin/sh
# Pulls the latest server image and recreates the container only if it changed. Run every minute by
# puny-chat-update.timer, so a deploy is just a push of the image (no inbound SSH from CI).
set -eu
cd /opt/puny-chat
docker compose pull --quiet server || exit 0 # registry unreachable: try again next minute
docker compose up -d --remove-orphans
docker image prune --force > /dev/null
