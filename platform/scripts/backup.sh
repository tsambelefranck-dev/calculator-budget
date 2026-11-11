#!/usr/bin/env bash
# Sauvegarde chiffrée de la base PostgreSQL (auto-hébergement).
# Usage : BACKUP_PASSPHRASE=... DATABASE_URL=... ./scripts/backup.sh /chemin/sauvegardes
# Restauration : gpg -d nexafi-YYYY-MM-DD.sql.gz.gpg | gunzip | psql "$DATABASE_URL"
set -euo pipefail
DIR="${1:-./backups}"
: "${DATABASE_URL:?DATABASE_URL requise}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE requise}"
mkdir -p "$DIR"
FILE="$DIR/nexafi-$(date -u +%Y-%m-%d-%H%M).sql.gz.gpg"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" -o "$FILE"
find "$DIR" -name 'nexafi-*.sql.gz.gpg' -mtime +30 -delete
echo "✔ $FILE"
