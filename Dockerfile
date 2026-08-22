# ── Build do client ──────────────────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /build/client
# Sidebar.jsx importa o package.json da raiz do repo (exibição de versão)
COPY package.json /build/package.json
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ── Imagem final ─────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

COPY server/package*.json ./server/
RUN npm install --prefix server --omit=dev

COPY server/ ./server/
COPY --from=client-build /build/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "--experimental-sqlite", "server/src/index.js"]
