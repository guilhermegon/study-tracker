# Study Tracker

Aplicação local para organização e acompanhamento de estudos para concursos públicos. Permite planejar semanas de estudo, registrar aulas, páginas e exercícios por disciplina, e acompanhar o progresso ao longo do tempo.

---

## Funcionalidades

### Visão Semanal
- Registro diário de estudos por disciplina
- Campos: aula/conteúdo, páginas (início/fim), exercícios, acertos e dificuldade
- Indicador de percentual de acerto com destaque visual (verde ≥ 70%)
- Reordenação de disciplinas por **drag and drop** (ordem persistida no banco)
- Mover linha de um dia da semana para outro arrastando
- Duplicar um dia inteiro para outros dias da semana
- Exportar semana em **PDF**

### Semanas
- Criar, editar e excluir semanas com datas de início e fim
- Associar disciplinas planejadas a cada semana
- **Duplicar semana** (copia todas as disciplinas e entradas para uma nova semana)

### Dashboard
- Progresso por disciplina (páginas e aulas estudadas vs. total planejado)
- Gráficos de acurácia por disciplina
- Comparação entre semanas
- Estudado vs. planejado
- Resumo geral de totais

### Relatório
- Visão consolidada de todas as semanas
- Exportação para PDF

### Concursos
- Cadastro de concursos com banca e data de prova
- Vinculação de disciplinas existentes a cada concurso
- Gerenciamento de matérias e conteúdos por disciplina
- Marcação de conteúdos como concluídos com barra de progresso
- Ocultar/exibir conteúdos por disciplina
- Reordenação de concursos por drag and drop

### Disciplinas
- Cadastro central de disciplinas reutilizadas em semanas e concursos
- Definição de total de aulas por disciplina

### Notas
- Bloco de notas livre com título e conteúdo
- Criação e edição inline

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 |
| Estilização | Tailwind CSS |
| Roteamento | React Router DOM 6 |
| Gráficos | Recharts |
| PDF | jsPDF + html2canvas |
| Backend | Node.js + Express |
| Banco de dados | SQLite (nativo `node:sqlite`) |

---

## Requisitos

- **Node.js v22 ou superior** — necessário para o módulo nativo `node:sqlite`
  - Verificar versão instalada: `node -v`
  - Download: https://nodejs.org

---

## Instalação

### Windows

```bat
install.bat
```

### Linux / macOS

```bash
chmod +x install.sh
./install.sh
```

O instalador irá:
1. Verificar se o Node.js v22+ está instalado
2. Instalar as dependências do servidor e do cliente
3. Compilar o frontend
4. Criar um atalho na Área de Trabalho para iniciar o app

---

## Como iniciar

### Via atalho
Após a instalação, clique duas vezes no atalho criado na Área de Trabalho:
- **Windows:** `Study Tracker.lnk`
- **macOS:** `Study Tracker.command`
- **Linux:** `study-tracker.desktop`

### Via terminal

**Windows:**
```bat
start.bat
```

**Linux / macOS:**
```bash
./start.sh
```

O app abrirá automaticamente em **http://localhost:3001** no navegador padrão.

---

## Desenvolvimento

### Pré-requisitos
Instalar dependências uma vez:
```bash
npm install --prefix server
npm install --prefix client
```

### Iniciar em modo desenvolvimento
```bash
npm run dev
```
Sobe o servidor Express na porta `3001` e o Vite dev server na porta `5173` simultaneamente.

| Serviço | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| API (Express) | http://localhost:3001 |

### Compilar para produção
```bash
npm run build --prefix client
```
Gera os arquivos em `client/dist/`. Em produção, o próprio servidor Express serve o frontend.

---

## Estrutura do projeto

```
study-tracker/
├── client/                  # Frontend React
│   ├── src/
│   │   ├── api/             # Comunicação com a API
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Páginas da aplicação
│   │   └── store/           # Contexto global (semana selecionada)
│   └── dist/                # Build de produção (gerado)
│
├── server/                  # Backend Express
│   ├── src/
│   │   ├── db/              # Conexão e migrations SQLite
│   │   └── routes/          # Endpoints da API REST
│   └── data/
│       └── study.db         # Banco de dados (gerado automaticamente)
│
├── install.bat              # Instalador Windows
├── install.sh               # Instalador Linux/macOS
├── start.bat                # Iniciador Windows
└── start.sh                 # Iniciador Linux/macOS
```

---

## API

Todas as rotas são prefixadas com `/api`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/weeks` | Listar e criar semanas |
| GET/PUT/DELETE | `/weeks/:id` | Detalhes, editar e excluir semana |
| POST | `/weeks/:id/duplicate` | Duplicar semana |
| GET/POST | `/weeks/:id/subjects` | Disciplinas da semana |
| GET/PUT | `/weeks/:id/order/:dia` | Ordem drag-and-drop por dia |
| GET/POST | `/weeks/:id/entries` | Entradas de estudo da semana |
| PUT/DELETE | `/entries/:id` | Editar e excluir entrada |
| GET/POST | `/subjects` | Listar e criar disciplinas |
| PUT/DELETE | `/subjects/:id` | Editar e excluir disciplina |
| GET/POST | `/concursos` | Listar e criar concursos |
| PUT/DELETE | `/concursos/:id` | Editar e excluir concurso |
| GET/POST | `/concursos/:id/materias` | Disciplinas vinculadas ao concurso |
| DELETE | `/materias/:id` | Desvincular disciplina do concurso |
| POST | `/materias/:id/conteudos` | Adicionar conteúdo |
| PUT/DELETE | `/conteudos/:id` | Editar e excluir conteúdo |
| PATCH | `/conteudos/:id/toggle` | Marcar/desmarcar conteúdo |
| GET/POST | `/notes` | Listar e criar notas |
| PUT/DELETE | `/notes/:id` | Editar e excluir nota |
| GET | `/dashboard/progress` | Progresso por disciplina |
| GET | `/dashboard/accuracy` | Acurácia por disciplina |
| GET | `/dashboard/comparison` | Comparação entre semanas |

---

## Banco de dados

O arquivo `server/data/study.db` é criado automaticamente na primeira execução. As migrations rodam automaticamente ao iniciar o servidor — não é necessária nenhuma configuração manual.

> Para fazer backup dos dados, basta copiar o arquivo `server/data/study.db`.
