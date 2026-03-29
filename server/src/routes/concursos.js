import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// GET /api/concursos
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM concursos ORDER BY nome').all())
})

// POST /api/concursos
router.post('/', (req, res) => {
  const { nome, banca, data_prova } = req.body
  if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' })
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO concursos (nome, banca, data_prova) VALUES (?, ?, ?)'
  ).run(nome.trim(), banca?.trim() || null, data_prova || null)
  res.status(201).json(db.prepare('SELECT * FROM concursos WHERE id = ?').get(lastInsertRowid))
})

// PUT /api/concursos/:id
router.put('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM concursos WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Concurso não encontrado' })
  const { nome, banca, data_prova } = req.body
  db.prepare('UPDATE concursos SET nome = ?, banca = ?, data_prova = ? WHERE id = ?').run(
    nome?.trim() ?? c.nome,
    banca !== undefined ? (banca?.trim() || null) : c.banca,
    data_prova !== undefined ? (data_prova || null) : c.data_prova,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM concursos WHERE id = ?').get(req.params.id))
})

// DELETE /api/concursos/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM concursos WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Concurso não encontrado' })
  res.json({ ok: true })
})

// GET /api/concursos/:id/materias (disciplinas vinculadas com conteudos)
router.get('/:id/materias', (req, res) => {
  const links = db.prepare(`
    SELECT cs.id, cs.concurso_id, cs.subject_id, s.name as nome
    FROM concurso_subjects cs
    JOIN subjects s ON s.id = cs.subject_id
    WHERE cs.concurso_id = ?
    ORDER BY cs.rowid
  `).all(req.params.id)
  const result = links.map(cs => ({
    ...cs,
    conteudos: db.prepare(
      'SELECT * FROM conteudos WHERE concurso_subject_id = ? ORDER BY rowid'
    ).all(cs.id),
  }))
  res.json(result)
})

// POST /api/concursos/:id/materias (vincula uma disciplina existente)
router.post('/:id/materias', (req, res) => {
  const { subject_id } = req.body
  if (!subject_id) return res.status(400).json({ error: 'subject_id é obrigatório' })
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subject_id)
  if (!subject) return res.status(404).json({ error: 'Disciplina não encontrada' })
  try {
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO concurso_subjects (concurso_id, subject_id) VALUES (?, ?)'
    ).run(req.params.id, subject_id)
    const link = db.prepare(`
      SELECT cs.id, cs.concurso_id, cs.subject_id, s.name as nome
      FROM concurso_subjects cs
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.id = ?
    `).get(lastInsertRowid)
    res.status(201).json({ ...link, conteudos: [] })
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Disciplina já vinculada a este concurso' })
    }
    throw e
  }
})

export default router
