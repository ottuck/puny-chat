#!/bin/sh
# Watches the server every two minutes (puny-chat-health.timer) and reports to healthchecks.io, which
# alerts when the reports stop or fail (docs/PROJECT.md, 감시). The ping addresses are in healthchecks.env
# next to this file (not in Git): HC_SERVER. Without it the script checks and only logs.
set -u
cd /opt/puny-chat
HC_SERVER=
[ -f healthchecks.env ] && . ./healthchecks.env

report() { # <address> [message]
	[ -n "$1" ] || return 0
	curl -fsS --max-time 10 --retry 3 -o /dev/null --data-raw "${2:-}" "$1" || true
}

# The server, as the apps reach it: DNS, Caddy, the certificate, the server and its database.
failures_file=/run/puny-chat-health.failures
if curl -fsS --max-time 15 -o /dev/null https://api.puny-chat.com/actuator/health; then
	rm -f "$failures_file"
	report "$HC_SERVER"
else
	failures=$(($(cat "$failures_file" 2> /dev/null || echo 0) + 1))
	echo "$failures" > "$failures_file"
	echo "health check failed ($failures in a row)"
	# A deploy recreates the container in about a minute; three misses in a row are not a deploy.
	if [ "$failures" -ge 3 ]; then
		message="api.puny-chat.com/actuator/health failed $failures times in a row"
		# Restart only a server that is stuck itself. When the database is down, restarting does not help.
		if ! curl -fsS --max-time 15 -o /dev/null --resolve api.puny-chat.com:443:127.0.0.1 \
			https://api.puny-chat.com/actuator/health/liveness; then
			docker compose restart server caddy
			message="$message; liveness failed too, restarted server and caddy"
			echo 0 > "$failures_file"
		fi
		echo "$message"
		report "$HC_SERVER/fail" "$message"
	fi
fi
