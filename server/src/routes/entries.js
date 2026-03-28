import { Router } from 'express'
import db from '../db/connection.js'

const router = Router({ mergeParams: true })

function computeFields(body) {
  let { num_pags_inicio, num_pags_fim, qtd_pags_estudadas, num_exercicios, num_acertos, percentual_acerto } = body

  num_pags_inicio = num_pags_inicio != null ? Number(num_pags_inicio) : null
  num_pags_fim    = num_pags_fim    != null ? Number(num_pags_fim)    : null
  num_exercicios  = num_exercicios  != null ? Number(num_exercicios)  : 0
  num_acertos     = num_acertos     != null ? Number(num_acertos)     : 0

  if (qtd_pags_estudadas == null && num_pags_inicio != null && num_pags_fim != null) {
    qtd_pags_estudadas = num_pags_fim - num_pags_inicio + 1
  }
  qtd_pags_estudadas = qtd_pags_estudadas != null ? Number(qtd_pags_estudadas) : null

  if (percentual_acerto == null && num_exercicios > 0) {
    percentual_acerto = Math.round((num_acertos / num_exercicios) * 1000) / 10
  }
  percentual_acerto = percentual_acerto != null ? Number(percentual_acerto) : null

  return { num_pags_inicio, num_pags_fim, qtd_pags_estudadas, num_exercicios, num_acertos, percentual_acerto }
}

// GET /api/weeks/:id/entries
router.get('/', (req, res) => {
  const { dia, subject_id } = req.query
  let query = `
    SELECT e.*, s.name as subject_name
    FROM entries e
    JOIN subjects s ON s.id = e.subject_id
    WHERE e.week_id = ?
  `
  const params = [req.params.id]
  if (dia)        { query += ' AND e.dia = ?';        params.push(dia) }
  if (subject_id) { query += ' AND e.subject_id = ?'; params.push(subject_id) }
  query += ' ORDER BY e.dia, s.name, e.id'

  const entries = db.prepare(query).all(...params).map(e => ({
    ...e,
    estudado: e.estudado === 1
  }))
  res.json(entries)
})

// POST /api/weeks/:id/entries
router.post('/', (req, res) => {
  const { subject_id, dia, estudado, aula_estudada, dificuldade, total_aulas } = req.body
  if (!subject_id || !dia) {
    return res.status(400).json({ error: 'subject_id e dia são obrigatórios' })
  }

  const computed = computeFields(req.body)

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO entries (
      week_id, subject_id, dia, estudado, aula_estudada,
      num_pags_inicio, num_pags_fim, qtd_pags_estudadas,
      num_exercicios, num_acertos, percentual_acerto, dificuldade, total_aulas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    subject_id,
    dia,
    estudado ? 1 : 0,
    aula_estudada || null,
    computed.num_pags_inicio,
    computed.num_pags_fim,
    computed.qtd_pags_estudadas,
    computed.num_exercicios,
    computed.num_acertos,
    computed.percentual_acerto,
    dificuldade || null,
    total_aulas != null ? Number(total_aulas) : null
  )

  const entry = db.prepare(`
    SELECT e.*, s.name as subject_name FROM entries e
    JOIN subjects s ON s.id = e.subject_id WHERE e.id = ?
  `).get(lastInsertRowid)

  res.status(201).json({ ...entry, estudado: entry.estudado === 1 })
})

export default router
