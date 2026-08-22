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

## Como rodar (Docker)

A forma mais simples de rodar o Study Tracker com HTTPS é via Docker. O `docker-compose.yml` sobe dois containers: o app (Node + client já buildado) e um [Caddy](https://caddyserver.com/) na frente cuidando do certificado — automático via Let's Encrypt quando há um domínio real, ou autoassinado quando não há (ex: rodando local).

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) e Docker Compose instalados (`docker compose version` pra conferir).

### Rodando localmente

Sem nenhuma configuração extra — sem precisar criar `.env` — o compose usa `localhost` e o Caddy sobe com certificado HTTPS autoassinado:

```bash
docker compose up -d --build
```

Acesse **https://localhost** (o navegador vai avisar que o certificado não é confiável — é esperado nesse modo, é autoassinado; pode seguir em frente).

Ver logs / parar:
```bash
docker compose logs -f
docker compose down
```

Os dados ficam em `server/data/` no host (montado como volume), sobrevivem a rebuilds e restarts.

### Rodando em produção (VM com domínio)

Sem domínio próprio, um subdomínio gratuito do [DuckDNS](https://www.duckdns.org/) apontando pro IP da VM já é suficiente para o Let's Encrypt emitir certificado real (não é possível emitir certificado para IP puro).

```bash
cp .env.example .env
# edite o .env e defina DOMAIN=seusubdominio.duckdns.org
docker compose up -d --build
```

O Caddy detecta que `DOMAIN` é um domínio público de verdade e obtém o certificado Let's Encrypt automaticamente (renovação também é automática).

### Atualizando

Na VM, o deploy é automático: todo push na `main` (ou PR mergeado) dispara o workflow do GitHub Actions, que já cuida de versionar e atualizar o servidor sozinho (veja `.github/workflows/deploy.yml`). Pra atualizar manualmente por SSH, se precisar:
```bash
git pull && docker compose up -d --build
```

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
│   │   ├── auth/             # Hash de senha e cookies de sessão
│   │   ├── db/               # Conexão e migrations SQLite
│   │   ├── middleware/       # Autenticação
│   │   └── routes/           # Endpoints da API REST
│   └── data/
│       └── study.db         # Banco de dados (gerado automaticamente)
│
├── Dockerfile               # Build da imagem (client + server)
├── docker-compose.yml       # Orquestra app + Caddy (proxy reverso/HTTPS)
└── Caddyfile                # Configuração do Caddy
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
