import { Router } from 'express'
import db from '../db/connection.js'
import { hashPassword } from '../auth/password.js'

const router = Router()

// GET /api/users
router.get('/', (req, res) => {
  const users = db.prepare(
    'SELECT id, username, must_change_password, created_at FROM users ORDER BY created_at ASC'
  ).all()
  res.json(users)
})

// POST /api/users
router.post('/', (req, res) => {
  const { username, password } = req.body || {}
  if (!username?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Usuário é obrigatório e senha deve ter ao menos 6 caracteres' })
  }

  try {
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    ).run(username.trim(), hashPassword(password))
    const user = db.prepare('SELECT id, username, must_change_password, created_at FROM users WHERE id = ?').get(lastInsertRowid)
    res.status(201).json(user)
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Usuário já existe' })
    throw e
  }
})

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const { username, password } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  if (password !== undefined && password.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres' })
  }

  try {
    db.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?').run(
      username?.trim() || user.username,
      password ? hashPassword(password) : user.password_hash,
      req.params.id
    )
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Usuário já existe' })
    throw e
  }

  const updated = db.prepare('SELECT id, username, must_change_password, created_at FROM users WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
  if (total <= 1) {
    return res.status(400).json({ error: 'Não é possível excluir o único usuário do sistema' })
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json({ ok: true })
})

export default router
