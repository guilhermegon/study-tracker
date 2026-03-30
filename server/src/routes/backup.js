import { Router } from 'express'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, writeFileSync, createReadStream, statSync } from 'fs'
import db from '../db/connection.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../../../')
const DB_PATH = join(__dirname, '../../data/study.db')
const DB_INCOMING = join(__dirname, '../../data/study.db.incoming')

// Assinatura SQLite: primeiros 16 bytes do arquivo são "SQLite format 3\x00"
const SQLITE_MAGIC = Buffer.from('SQLite format 3\x00')

const router = Router()

// GET /api/backup/download — faz checkpoint do WAL e envia o arquivo
router.get('/download', (req, res) => {
  if (!existsSync(DB_PATH)) {
    return res.status(404).json({ error: 'Banco de dados não encontrado.' })
  }

  try {
    // Força o flush de todas as escritas pendentes do WAL para o arquivo principal
    // Garante que o arquivo .db baixado esteja completo e consistente
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch {
    // Continua mesmo se o checkpoint falhar (ex: nenhum WAL ativo)
  }

  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const filename = `study-tracker-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.db`

  const stat = statSync(DB_PATH)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', stat.size)

  const stream = createReadStream(DB_PATH)
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao enviar arquivo.' })
    }
  })
  stream.pipe(res)
})

// POST /api/backup/restore — recebe o arquivo .db como binário e reinicia o servidor
router.post('/restore', (req, res) => {
  const body = req.body

  if (!body || !Buffer.isBuffer(body) || body.length === 0) {
    return res.status(400).json({ error: 'Arquivo de backup inválido ou vazio.' })
  }

  // Valida assinatura SQLite comparando os primeiros 16 bytes diretamente como Buffer
  const fileHeader = body.slice(0, 16)
  if (!fileHeader.equals(SQLITE_MAGIC)) {
    return res.status(400).json({ error: 'O arquivo enviado não é um banco SQLite válido.' })
  }

  // Salva em arquivo temporário — o script de restauração vai mover para o lugar certo
  try {
    writeFileSync(DB_INCOMING, body)
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar arquivo de backup.', details: err.message })
  }

  const isWin = process.platform === 'win32'
  const scriptName = isWin ? 'restore.bat' : 'restore.sh'
  const scriptPath = join(PROJECT_ROOT, scriptName)

  const child = isWin
    ? spawn('cmd.exe', ['/c', scriptPath], {
        detached: true,
        stdio: 'ignore',
        cwd: PROJECT_ROOT,
        env: { ...process.env, RESTORE_FILE: DB_INCOMING }
      })
    : spawn('/bin/bash', [scriptPath], {
        detached: true,
        stdio: 'ignore',
        cwd: PROJECT_ROOT,
        env: { ...process.env, RESTORE_FILE: DB_INCOMING }
      })

  child.unref()
  res.json({ ok: true, message: 'Backup restaurado. O servidor está reiniciando.' })
  setTimeout(() => process.exit(0), 1500)
})

export default router
