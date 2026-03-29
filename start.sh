#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

OS="$(uname -s)"

echo ""
echo -e "${BOLD}========================================"
echo "   Study Tracker"
echo -e "========================================${NC}"
echo ""

# Verificar Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}[ERRO]${NC} Node.js não encontrado. Execute install.sh primeiro."
    exit 1
fi

# Verificar se o build existe
if [ ! -f "client/dist/index.html" ]; then
    echo -e "${YELLOW}[!]${NC} Interface não compilada. Compilando..."
    npm install --prefix client --silent
    npm run build --prefix client
    echo ""
fi

# Encerrar processo anterior na porta 3001 se existir
if command -v lsof &>/dev/null && lsof -ti:3001 &>/dev/null; then
    echo -e "${YELLOW}[!]${NC} Encerrando instância anterior na porta 3001..."
    kill "$(lsof -ti:3001)" 2>/dev/null || true
    sleep 1
fi

echo -e "${GREEN}Servidor iniciando em http://localhost:3001${NC}"
echo "Pressione Ctrl+C para encerrar."
echo ""

# Abrir navegador após 3 segundos em background
(sleep 3 && {
    if [[ "$OS" == "Darwin" ]]; then
        open "http://localhost:3001"
    elif command -v xdg-open &>/dev/null; then
        xdg-open "http://localhost:3001" &>/dev/null
    fi
}) &

# Iniciar servidor em foreground
node --experimental-sqlite server/src/index.js
