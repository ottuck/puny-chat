#!/bin/sh
# Pulls the latest server image and recreates the container only if it changed. Run every minute by
# puny-chat-update.timer, so a deploy is just a push of the image (no inbound SSH from CI).
# It also brings compose.yaml, Caddyfile, backup.sh and health.sh in line with the image's copy of
# server/deploy. This file and the systemd units are copied by hand (health.sh reports a difference):
# an update that broke the updater could not repair itself.
set -eu
cd /opt/puny-chat
mkdir -p public # Caddy mounts it; Docker would make a missing one root-owned
mkdir -p photos && chown 1001:1001 photos # the server writes photos as its own user
docker compose pull --quiet server || exit 0 # registry unreachable: try again next minute
running() { docker inspect --format '{{.Image}}' "$(docker compose ps -q server)" 2> /dev/null || true; }
before=$(running)
docker compose up -d --remove-orphans
# When a new image started, remove the one it replaced, and only that one. Other services on this
# instance clean up their own images: a docker image prune here also deleted what their updaters were
# pulling in the same second (containerd image store, 2026-11-06).
after=$(running)
[ -z "$before" ] || [ "$after" = "$before" ] || docker rmi "$before" > /dev/null 2>&1 || true
# Which release is running, for CI to wait on (served by Caddy at /_revision).
docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$(docker compose ps -q server)" > public/revision.tmp
mv public/revision.tmp public/revision

git=$(mktemp -d)
trap 'rm -rf "$git"' EXIT
docker cp "$(docker compose ps -q server):/app/deploy/." "$git" 2> /dev/null || exit 0

# Scripts: a new file moved into place, so a run in progress keeps reading the old one.
for name in backup.sh health.sh; do
	if [ -f "$git/$name" ] && ! cmp -s "$git/$name" "$name" && sh -n "$git/$name"; then
		cp "$git/$name" "$name.new"
		chmod 755 "$name.new"
		chown --reference="$name" "$name.new" 2> /dev/null || true
		mv "$name.new" "$name"
		echo "updated $name"
	fi
done

if [ -f "$git/compose.yaml" ] && ! cmp -s "$git/compose.yaml" compose.yaml \
	&& docker compose -f "$git/compose.yaml" --project-directory . config --quiet; then
	cp "$git/compose.yaml" compose.yaml
	docker compose up -d --remove-orphans
	echo "updated compose.yaml"
fi

# Caddy reads its file through a bind mount of this inode: written in place, then reloaded. Caddy keeps
# the old configuration when the new one does not load, and so does this file.
if [ -f "$git/Caddyfile" ] && ! cmp -s "$git/Caddyfile" Caddyfile; then
	cp Caddyfile "$git/Caddyfile.old"
	cat "$git/Caddyfile" > Caddyfile
	if docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
		echo "updated Caddyfile"
	else
		cat "$git/Caddyfile.old" > Caddyfile
		echo "the new Caddyfile did not load; kept the old one"
	fi
fi
