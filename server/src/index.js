import express from 'express'
import cors from 'cors'
import { runMigrations } from './db/migrations.js'
import weeksRouter from './routes/weeks.js'
import subjectsRouter from './routes/subjects.js'
import entriesRouter from './routes/entries.js'
import entriesByIdRouter from './routes/entriesById.js'
import dashboardRouter from './routes/dashboard.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Run migrations on startup
runMigrations()

// Routes
app.use('/api/weeks', weeksRouter)
app.use('/api/weeks/:id/entries', entriesRouter)
app.use('/api/subjects', subjectsRouter)
app.use('/api/entries', entriesByIdRouter)
app.use('/api/dashboard', dashboardRouter)

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server rodando em http://localhost:${PORT}`)
})
