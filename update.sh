#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "========================================"
echo "  Study Tracker - Atualização"
echo "========================================"
echo ""

echo "Aguardando servidor encerrar..."
sleep 4

# Backup do banco de dados
echo "Fazendo backup do banco de dados..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TMP_BASE="${TMPDIR:-/tmp}"
BACKUP_FILE="$TMP_BASE/study-tracker-backup-$TIMESTAMP.db"
if [ -f "server/data/study.db" ]; then
  cp "server/data/study.db" "$BACKUP_FILE"
  echo "Backup salvo em: $BACKUP_FILE"
else
  echo "[AVISO] Banco de dados não encontrado, ignorando backup."
fi

# Download da nova versão
echo ""
echo "Baixando versão $UPDATE_VERSION..."
ZIPFILE="$TMP_BASE/study-tracker-update.zip"
if command -v curl &>/dev/null; then
  curl -L -o "$ZIPFILE" "$UPDATE_URL" || { echo "[ERRO] Falha ao baixar atualização."; exit 1; }
elif command -v wget &>/dev/null; then
  wget -O "$ZIPFILE" "$UPDATE_URL" || { echo "[ERRO] Falha ao baixar atualização."; exit 1; }
else
  echo "[ERRO] curl ou wget não encontrado."
  exit 1
fi

# Extrair zip
echo "Extraindo arquivos..."
TMPDIR_UPDATE="$TMP_BASE/study-tracker-update"
rm -rf "$TMPDIR_UPDATE"
mkdir -p "$TMPDIR_UPDATE"
unzip -q "$ZIPFILE" -d "$TMPDIR_UPDATE"

# Encontrar pasta extraída (GitHub cria subpasta com nome do repo)
SRCDIR=$(find "$TMPDIR_UPDATE" -maxdepth 1 -mindepth 1 -type d | head -1)
if [ -z "$SRCDIR" ]; then
  echo "[ERRO] Pasta extraída não encontrada."
  exit 1
fi

# Copiar arquivos excluindo server/data
echo "Copiando arquivos (exceto dados)..."
if command -v rsync &>/dev/null; then
  rsync -a --exclude='server/data' "$SRCDIR/" ./
else
  # Fallback sem rsync
  find "$SRCDIR" -mindepth 1 -maxdepth 1 | while read -r item; do
    name=$(basename "$item")
    if [ "$name" = "server" ]; then
      find "$item" -mindepth 1 -maxdepth 1 | while read -r subitem; do
        subname=$(basename "$subitem")
        if [ "$subname" != "data" ]; then
          cp -rf "$subitem" "server/"
        fi
      done
    else
      cp -rf "$item" ./
    fi
  done
fi

# Corrigir permissões dos scripts (zip do Windows não preserva bits de execução)
chmod +x start.sh update.sh restore.sh install.sh 2>/dev/null || true
# Remover atributo de quarentena do macOS para evitar bloqueio do Gatekeeper
xattr -d com.apple.quarantine start.sh update.sh restore.sh install.sh 2>/dev/null || true

# Restaurar banco de dados
echo "Restaurando banco de dados..."
if [ -f "$BACKUP_FILE" ]; then
  mkdir -p server/data
  cp -f "$BACKUP_FILE" server/data/study.db
  echo "Banco de dados restaurado."
fi

# Executar migrações no banco restaurado
echo "Executando migrações no banco de dados..."
cd server
node -e "import('./src/db/migrations.js').then(m => m.runMigrations()).then(() => console.log('Migrações executadas com sucesso.')).catch(err => { console.error('Erro nas migrações:', err); process.exit(1); })"
cd ..
echo "Migrações concluídas."

# Instalar dependências e compilar
echo ""
echo "Instalando dependências..."
npm install > /dev/null 2>&1
npm install --prefix server > /dev/null 2>&1
npm install --prefix client > /dev/null 2>&1
echo "Compilando interface..."
npm run build --prefix client > /dev/null 2>&1

# Corrigir permissões dos scripts
chmod +x start.sh update.sh restore.sh install.sh 2>/dev/null || true
xattr -d com.apple.quarantine start.sh update.sh restore.sh install.sh 2>/dev/null || true

# Atualizar atalho do macOS para usar bash (não depende do bit de execução)
if [[ "$(uname -s)" == "Darwin" ]]; then
  for SHORTCUT in "$HOME/Desktop/Study Tracker.command" "$HOME/Applications/Study Tracker.command" "/Applications/Study Tracker.command"; do
    if [ -f "$SHORTCUT" ]; then
      INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
      printf '#!/usr/bin/env bash\ncd "%s"\nbash start.sh\n' "$INSTALL_DIR" > "$SHORTCUT"
      chmod +x "$SHORTCUT"
      xattr -d com.apple.quarantine "$SHORTCUT" 2>/dev/null || true
    fi
  done
fi

# Reiniciar servidor
echo ""
echo "Reiniciando servidor..."
nohup node --experimental-sqlite server/src/index.js > /tmp/study-tracker.log 2>&1 &

echo ""
echo "========================================"
echo "  Atualização concluída!"
echo "  Recarregue o navegador em instantes."
echo "========================================"
