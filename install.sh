#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

OS="$(uname -s)"

echo ""
echo -e "${BOLD}========================================"
echo "   Study Tracker - Instalador"
echo -e "========================================${NC}"
echo ""

# ── 1. Verificar Node.js ──────────────────
echo -e "${CYAN}[1/4]${NC} Verificando Node.js..."

if ! command -v node &>/dev/null; then
    echo ""
    echo -e "${RED}[!]${NC} Node.js não encontrado."
    echo ""
    echo "Instale o Node.js v22 ou superior:"
    echo ""
    if [[ "$OS" == "Darwin" ]]; then
        echo "  Via Homebrew:  brew install node@22"
        echo "  Ou acesse:     https://nodejs.org"
    else
        echo "  Via NVM (recomendado):"
        echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
        echo "    source ~/.bashrc  (ou ~/.zshrc)"
        echo "    nvm install 22 && nvm use 22"
        echo "  Ou acesse: https://nodejs.org"
    fi
    echo ""
    exit 1
fi

MAJOR=$(node -e "process.stdout.write(String(+process.version.split('.')[0].slice(1)))")
if [ "$MAJOR" -lt 22 ]; then
    echo -e "${RED}[!]${NC} Node.js v$MAJOR encontrado. É necessário v22 ou superior."
    echo "    Atualize em: https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js $(node -v)"

# ── 2. Instalar dependencias ──────────────
echo ""
echo -e "${CYAN}[2/4]${NC} Instalando dependências do servidor..."
npm install --prefix server

echo ""
echo -e "${CYAN}[3/4]${NC} Instalando dependências do cliente..."
npm install --prefix client

# ── 3. Build ──────────────────────────────
echo ""
echo -e "${CYAN}[4/4]${NC} Compilando interface..."
npm run build --prefix client

# ── 4. Permissoes ─────────────────────────
chmod +x start.sh

# ── 5. Criar atalho ───────────────────────
echo ""
echo "Criando atalho..."

if [[ "$OS" == "Darwin" ]]; then
    DESKTOP="$HOME/Desktop"
    SHORTCUT="$DESKTOP/Study Tracker.command"
    cat > "$SHORTCUT" << CMDEOF
#!/usr/bin/env bash
cd "$SCRIPT_DIR"
./start.sh
CMDEOF
    chmod +x "$SHORTCUT"
    xattr -d com.apple.quarantine "$SHORTCUT" 2>/dev/null || true
    echo -e "${GREEN}[OK]${NC} Atalho criado: ~/Desktop/Study Tracker.command"
else
    # Linux — detectar área de trabalho
    DESKTOP="$HOME/Desktop"
    [ -d "$HOME/Área de Trabalho" ] && DESKTOP="$HOME/Área de Trabalho"

    SHORTCUT="$DESKTOP/study-tracker.desktop"
    cat > "$SHORTCUT" << DESKEOF
[Desktop Entry]
Name=Study Tracker
Comment=Rastreador de estudos local
Exec=bash -c 'cd "$SCRIPT_DIR" && ./start.sh; exec bash'
Icon=accessories-text-editor
Terminal=true
Type=Application
Categories=Education;
DESKEOF
    chmod +x "$SHORTCUT"

    # Registrar no menu de aplicativos
    APP_DIR="$HOME/.local/share/applications"
    mkdir -p "$APP_DIR"
    cp "$SHORTCUT" "$APP_DIR/study-tracker.desktop"

    echo -e "${GREEN}[OK]${NC} Atalho criado: $SHORTCUT"
fi

# ── Concluido ─────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}========================================"
echo "   Instalação concluída!"
echo -e "========================================${NC}"
echo ""
echo "Para iniciar o Study Tracker:"
if [[ "$OS" == "Darwin" ]]; then
    echo "  - Clique duas vezes em 'Study Tracker.command' na Área de Trabalho"
fi
echo "  - Ou execute: ./start.sh"
echo ""
echo -e "Acesso: ${CYAN}http://localhost:3001${NC}"
echo ""

read -rp "Deseja iniciar agora? [s/N] " REPLY
if [[ "$REPLY" =~ ^[Ss]$ ]]; then
    ./start.sh
fi
