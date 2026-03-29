import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// PUT /api/conteudos/:id
router.put('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM conteudos WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Conteúdo não encontrado' })
  const { nome, url, concluido } = req.body
  db.prepare('UPDATE conteudos SET nome = ?, url = ?, concluido = ? WHERE id = ?').run(
    nome?.trim() ?? c.nome,
    url !== undefined ? (url?.trim() || null) : c.url,
    concluido !== undefined ? (concluido ? 1 : 0) : c.concluido,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM conteudos WHERE id = ?').get(req.params.id))
})

// DELETE /api/conteudos/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM conteudos WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Conteúdo não encontrado' })
  res.json({ ok: true })
})

// PATCH /api/conteudos/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  const c = db.prepare('SELECT * FROM conteudos WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Conteúdo não encontrado' })
  db.prepare('UPDATE conteudos SET concluido = ? WHERE id = ?').run(c.concluido ? 0 : 1, req.params.id)
  res.json(db.prepare('SELECT * FROM conteudos WHERE id = ?').get(req.params.id))
})

export default router
