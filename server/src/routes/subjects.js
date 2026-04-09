import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// GET /api/subjects
router.get('/', (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY name').all()
  res.json(subjects)
})

// POST /api/subjects
router.post('/', (req, res) => {
  const { name, total_aulas, color } = req.body
  if (!name) return res.status(400).json({ error: 'name é obrigatório' })

  try {
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO subjects (name, total_aulas, color) VALUES (?, ?, ?)'
    ).run(name.trim(), total_aulas ?? null, color ?? null)
    res.status(201).json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(lastInsertRowid))
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Disciplina já existe' })
    }
    throw e
  }
})

// PUT /api/subjects/:id
router.put('/:id', (req, res) => {
  const { name, total_aulas, color } = req.body
  const sub = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id)
  if (!sub) return res.status(404).json({ error: 'Disciplina não encontrada' })

  db.prepare('UPDATE subjects SET name = ?, total_aulas = ?, color = ? WHERE id = ?').run(
    name ?? sub.name,
    total_aulas !== undefined ? total_aulas : sub.total_aulas,
    color !== undefined ? color : sub.color,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id))
})

// DELETE /api/subjects/:id
router.delete('/:id', (req, res) => {
  const inUse = db.prepare('SELECT 1 FROM entries WHERE subject_id = ? LIMIT 1').get(req.params.id)
  if (inUse) {
    return res.status(409).json({ error: 'Disciplina possui registros e não pode ser excluída' })
  }
  const result = db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Disciplina não encontrada' })
  res.json({ ok: true })
})

export default router
