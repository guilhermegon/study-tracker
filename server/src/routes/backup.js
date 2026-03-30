import { Router } from 'express'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../../../')
const DB_PATH = join(__dirname, '../../data/study.db')
const DB_INCOMING = join(__dirname, '../../data/study.db.incoming')

const router = Router()

// GET /api/backup/download — envia o arquivo do banco para download
router.get('/download', (req, res) => {
  if (!existsSync(DB_PATH)) {
    return res.status(404).json({ error: 'Banco de dados não encontrado.' })
  }

  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const filename = `study-tracker-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.db`

  res.download(DB_PATH, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Erro ao enviar arquivo.' })
    }
  })
})

// POST /api/backup/restore — recebe o arquivo .db como binário e reinicia o servidor
// Espera Content-Type: application/octet-stream com o corpo sendo os bytes do arquivo .db
router.post('/restore', (req, res) => {
  const body = req.body

  if (!body || !Buffer.isBuffer(body) || body.length === 0) {
    return res.status(400).json({ error: 'Arquivo de backup inválido ou vazio.' })
  }

  // Valida assinatura do SQLite: primeiros 16 bytes devem ser "SQLite format 3\000"
  const signature = body.slice(0, 15).toString('ascii')
  if (signature !== 'SQLite format 3') {
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
