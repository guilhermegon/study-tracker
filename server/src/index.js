import express from 'express'
import cors from 'cors'
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
import updateRouter from './routes/update.js'
import backupRouter from './routes/backup.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/api/backup/restore', express.raw({ type: 'application/octet-stream', limit: '100mb' }))

// Run migrations on startup
runMigrations()

// Routes
app.use('/api/weeks', weeksRouter)
app.use('/api/weeks/:id/entries', entriesRouter)
app.use('/api/subjects', subjectsRouter)
app.use('/api/entries', entriesByIdRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/notes', notesRouter)
app.use('/api/concursos', concursosRouter)
app.use('/api/materias', materiasRouter)
app.use('/api/conteudos', conteudosRouter)
app.use('/api/update', updateRouter)
app.use('/api/backup', backupRouter)

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
