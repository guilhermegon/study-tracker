import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// DELETE /api/materias/:id  (desvincula disciplina do concurso)
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM concurso_subjects WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Vínculo não encontrado' })
  res.json({ ok: true })
})

// POST /api/materias/:id/conteudos
router.post('/:id/conteudos', (req, res) => {
  const { nome, url } = req.body
  if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' })
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO conteudos (concurso_subject_id, nome, url) VALUES (?, ?, ?)'
  ).run(req.params.id, nome.trim(), url?.trim() || null)
  res.status(201).json(db.prepare('SELECT * FROM conteudos WHERE id = ?').get(lastInsertRowid))
})

export default router
