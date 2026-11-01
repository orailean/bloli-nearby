#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
lock=backups/.backup.lock
started=$(date +%s)
# Outcome lines go to stderr; stdout stays the backup path for callers.
if ! mkdir "$lock" 2>/dev/null; then
  echo "BACKUP_LOCKED: another backup may be running ($lock)" >&2
  echo "[backup] result=failed stage=lock exit=1" >&2
  exit 1
fi
stage=dump
finish() {
  status=$?
  rmdir "$lock"
  if [ "$status" -ne 0 ]; then
    echo "[backup] result=failed stage=$stage exit=$status" >&2
  fi
}
trap finish 0
trap 'exit 1' HUP INT TERM
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="backups/bloli-nearby-$stamp.dump"
./scripts/compose.sh exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup.part"
stage=verify
./scripts/compose.sh exec -T db pg_restore --list < "$backup.part" > /dev/null
stage=publish
mv "$backup.part" "$backup"
# Keep the newest verified generated dump. Never prune on dump/verification failure,
# or remove a newer backup completed by another invocation.
for previous in backups/bloli-nearby-????????T??????Z.dump; do
  [ -f "$previous" ] || continue
  [ "$previous" != "$backup" ] || continue
  oldest=$(printf '%s\n%s\n' "$previous" "$backup" | LC_ALL=C sort | head -n 1)
  if [ "$oldest" = "$previous" ]; then
    rm -- "$previous"
  fi
done
echo "[backup] result=success bytes=$(wc -c < "$backup" | tr -d ' ') duration_s=$(($(date +%s) - started))" >&2
printf '%s\n' "$backup"
