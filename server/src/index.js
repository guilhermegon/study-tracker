import express from 'express'
import helmet from 'helmet'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { runMigrations } from './db/migrations.js'
import weeksRouter from './routes/weeks.js'
import subjectsRouter from './routes/subjects.js'
import entriesRouter from './routes/entries.js'
import entriesByIdRouter from './routes/entriesById.js'
import dashboardRouter from './routes/dashboard.js'
import notesRouter from './routes/notes.js'
import concursosRouter from './routes/concursos.js'
import materiasRouter from './routes/materias.js'
import conteudosRouter from './routes/conteudos.js'
import backupRouter from './routes/backup.js'
import provasRouter from './routes/provas.js'
import gamificationRouter from './routes/gamification.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import requireAuth from './middleware/requireAuth.js'
import csrfProtection from './middleware/csrf.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Evita que um erro não tratado numa rota async derrube o processo inteiro
// (Express 4 não captura rejeições de promises automaticamente)
process.on('unhandledRejection', err => {
  console.error('Unhandled rejection:', err)
})

const app = express()
const PORT = 3001

// Confia no header X-Forwarded-Proto do Caddy/proxy reverso (necessário
// para req.secure funcionar corretamente e o cookie de sessão usar HTTPS)
app.set('trust proxy', 1)

// HSTS é setado pelo Caddy (camada de TLS); aqui ficaria duplicado
app.use(helmet({ strictTransportSecurity: false }))
app.use(express.json())
app.use('/api/backup/restore', express.raw({ type: () => true, limit: '100mb' }))
app.use(csrfProtection)

// Run migrations on startup
runMigrations()

// Routes
app.use('/api/auth', authRouter)
app.use('/api', requireAuth)
app.use('/api/weeks', weeksRouter)
app.use('/api/weeks/:id/entries', entriesRouter)
app.use('/api/subjects', subjectsRouter)
app.use('/api/entries', entriesByIdRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/notes', notesRouter)
app.use('/api/concursos', concursosRouter)
app.use('/api/materias', materiasRouter)
app.use('/api/conteudos', conteudosRouter)
app.use('/api/backup', backupRouter)
app.use('/api/provas', provasRouter)
app.use('/api/gamification', gamificationRouter)
app.use('/api/users', usersRouter)

// Servir frontend (produção)
const clientDist = join(__dirname, '../../client/dist')
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')))
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server rodando em http://localhost:${PORT}`)
})
