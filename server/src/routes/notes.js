import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// GET /api/notes
router.get('/', (req, res) => {
  const notes = db.prepare(
    'SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC'
  ).all()
  res.json(notes)
})

// POST /api/notes
router.post('/', (req, res) => {
  const { title = 'Sem título', content = '' } = req.body
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO notes (title, content) VALUES (?, ?)'
  ).run(title.trim() || 'Sem título', content)
  res.status(201).json(db.prepare('SELECT * FROM notes WHERE id = ?').get(lastInsertRowid))
})

// PUT /api/notes/:id
router.put('/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
  if (!note) return res.status(404).json({ error: 'Nota não encontrada' })

  const { title, content } = req.body
  db.prepare(
    "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    title !== undefined ? (title.trim() || 'Sem título') : note.title,
    content !== undefined ? content : note.content,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id))
})

// DELETE /api/notes/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Nota não encontrada' })
  res.json({ ok: true })
})

export default router
