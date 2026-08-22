import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import db from '../db/connection.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/study.db')

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.BACKUP_EMAIL_FROM || 'onboarding@resend.dev'
const EMAIL_TO = process.env.BACKUP_EMAIL_TO || 'paulaayres@hotmail.com'
const TARGET_HOUR = Number(process.env.BACKUP_EMAIL_HOUR ?? 23)

function getMeta(key) {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key)
  return row ? row.value : null
}

function setMeta(key, value) {
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value)
}

function backupFilename(now) {
  const pad = n => String(n).padStart(2, '0')
  return `study-tracker-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.db`
}

async function sendBackupEmail() {
  if (!RESEND_API_KEY) {
    console.error('[backup-email] RESEND_API_KEY não configurada, pulando envio.')
    return false
  }

  // Garante que o arquivo .db no disco reflita todas as escritas do WAL,
  // igual ao download manual em /api/backup/download
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch {}

  const now = new Date()
  const fileBuffer = readFileSync(DB_PATH)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: `Backup diário - Study Tracker (${now.toLocaleDateString('pt-BR')})`,
      text: 'Segue em anexo o backup do banco de dados do Study Tracker de hoje. Pode ser restaurado direto pela tela de Backup do app.',
      attachments: [{ filename: backupFilename(now), content: fileBuffer.toString('base64') }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[backup-email] Falha ao enviar e-mail:', res.status, body)
    return false
  }

  console.log('[backup-email] Backup enviado com sucesso para', EMAIL_TO)
  return true
}

// Roda uma vez por dia (marcado por data, não por horário exato): só envia
// se houve alguma alteração de dados desde o último envio.
export async function checkAndSendDailyBackup() {
  const today = new Date().toISOString().slice(0, 10)
  if (getMeta('last_daily_check_date') === today) return
  setMeta('last_daily_check_date', today)

  const lastChange = getMeta('last_data_change_at')
  const lastSent = getMeta('last_backup_sent_at')
  if (!lastChange) return // nunca houve alteração de dados
  if (lastSent && lastSent >= lastChange) return // já foi enviado depois da última alteração

  const sent = await sendBackupEmail()
  if (sent) setMeta('last_backup_sent_at', new Date().toISOString())
}

export function startDailyBackupScheduler() {
  const CHECK_INTERVAL_MS = 5 * 60 * 1000

  setInterval(() => {
    if (new Date().getHours() === TARGET_HOUR) {
      checkAndSendDailyBackup().catch(err => console.error('[backup-email] erro:', err))
    }
  }, CHECK_INTERVAL_MS)

  // Roda uma checagem no boot também, caso o processo suba depois do
  // horário-alvo no mesmo dia (ex: deploy tarde da noite)
  if (new Date().getHours() >= TARGET_HOUR) {
    checkAndSendDailyBackup().catch(err => console.error('[backup-email] erro:', err))
  }
}
