import { Router } from 'express'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, writeFileSync, createReadStream, statSync, mkdirSync } from 'fs'
import db from '../db/connection.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../../../')
const DB_PATH = join(__dirname, '../../data/study.db')
const DATA_DIR = join(__dirname, '../../data')

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

// POST /api/backup/restore — substitui o banco imediatamente e reinicia o servidor
router.post('/restore', (req, res) => {
  const body = req.body

  if (!body || body.length === 0) {
    return res.status(400).json({ error: 'Arquivo de backup vazio ou não recebido.' })
  }

  try {
    // 1. Garante que a pasta de dados existe
    mkdirSync(DATA_DIR, { recursive: true })

    // 2. Fecha a conexão com o banco atual para liberar o arquivo
    db.close()

    // 3. Grava o novo banco diretamente no lugar do atual
    //    Feito aqui mesmo, antes de sair, sem depender de script externo
    writeFileSync(DB_PATH, body)
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao restaurar banco de dados.', details: err.message })
  }

  // 4. Responde ao cliente
  res.json({ ok: true, message: 'Backup restaurado. O servidor está reiniciando.' })

  // 5. Spawna apenas o restart do servidor (banco já está no lugar)
  const isWin = process.platform === 'win32'
  const restartCmd = isWin
    ? spawn('cmd.exe', ['/c', `timeout /t 2 /nobreak >nul && start "Study Tracker" node --experimental-sqlite server\\src\\index.js`], {
        detached: true,
        stdio: 'ignore',
        cwd: PROJECT_ROOT,
        shell: false
      })
    : spawn('/bin/bash', ['-c', 'sleep 2 && nohup node --experimental-sqlite server/src/index.js > /tmp/study-tracker.log 2>&1 &'], {
        detached: true,
        stdio: 'ignore',
        cwd: PROJECT_ROOT
      })

  restartCmd.unref()

  // 6. Encerra o processo atual
  setTimeout(() => process.exit(0), 1000)
})

export default router
