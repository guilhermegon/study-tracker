#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Aguardando servidor encerrar..."
sleep 4

echo "Restaurando banco de dados..."
mkdir -p server/data
cp -f "$RESTORE_FILE" server/data/study.db
rm -f "$RESTORE_FILE"

echo "Reiniciando servidor..."
nohup node --experimental-sqlite server/src/index.js > /tmp/study-tracker.log 2>&1 &

echo "Backup restaurado com sucesso!"
