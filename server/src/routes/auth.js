import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import db from '../db/connection.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import { parseCookies, setSessionCookie, clearSessionCookie } from '../auth/cookies.js'
import requireAuth from '../middleware/requireAuth.js'

const router = Router()

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 dias, em segundos

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const failedAttempts = new Map() // username -> { count, lockedUntil }

function isLocked(username) {
  const entry = failedAttempts.get(username)
  return !!(entry && entry.lockedUntil && entry.lockedUntil > Date.now())
}

function registerFailure(username) {
  const entry = failedAttempts.get(username) || { count: 0, lockedUntil: null }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS
    entry.count = 0
  }
  failedAttempts.set(username, entry)
}

function clearFailures(username) {
  failedAttempts.delete(username)
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' })
  }

  if (isLocked(username)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !verifyPassword(password, user.password_hash)) {
    registerFailure(username)
    return res.status(401).json({ error: 'Usuário ou senha inválidos' })
  }

  clearFailures(username)

  // Limpeza oportunista de sessões expiradas
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()

  const token = randomBytes(32).toString('hex')
  db.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_MAX_AGE} seconds'))`
  ).run(token, user.id)

  setSessionCookie(req, res, token, SESSION_MAX_AGE)
  res.json({ id: user.id, username: user.username, must_change_password: !!user.must_change_password })
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { sid } = parseCookies(req.headers.cookie)
  if (sid) db.prepare('DELETE FROM sessions WHERE token = ?').run(sid)
  clearSessionCookie(req, res)
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user)
})

// POST /api/auth/change-password
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres' })
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user || !verifyPassword(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' })
  }

  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(hashPassword(newPassword), req.user.id)

  res.json({ ok: true })
})

export default router
