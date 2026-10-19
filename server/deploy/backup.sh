#!/bin/sh
# Dumps the database into /opt/puny-chat/backups once a day (puny-chat-backup.timer). Keeps 7 daily and 3 weekly
# (Sunday) dumps, so none is older than 21 days. The instance's daily snapshots (kept 7 days) also hold them, so no
# copy outlives 30 days, as the privacy policy says. Restore: docs/PROJECT.md, 인프라.
set -eu
cd /opt/puny-chat
# healthchecks.io hears when it starts and how it ends, and alerts when a day passes without a success
# (docs/PROJECT.md, 감시). HC_BACKUP is in healthchecks.env (not in Git); without it nothing is reported.
HC_BACKUP=
[ -f healthchecks.env ] && . ./healthchecks.env
report() {
	[ -n "$HC_BACKUP" ] || return 0
	curl -fsS --max-time 10 --retry 3 -o /dev/null "$HC_BACKUP$1" || true
}
trap 'status=$?; [ "$status" -eq 0 ] && report "" || report /fail' EXIT
report /start
mkdir -p backups/daily backups/weekly
chmod 700 backups # conversations
day=$(date -u +%F)
docker compose run --rm -T backup # writes backups/dump.archive.gz
mv backups/dump.archive.gz "backups/daily/$day.archive.gz"
if [ "$(date -u +%u)" = 7 ]; then
	cp "backups/daily/$day.archive.gz" "backups/weekly/$day.archive.gz"
fi
ls -1 backups/daily/*.archive.gz 2> /dev/null | head -n -7 | xargs -r rm --
ls -1 backups/weekly/*.archive.gz 2> /dev/null | head -n -3 | xargs -r rm --
