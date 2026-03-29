import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// GET /api/weeks
router.get('/', (req, res) => {
  const weeks = db.prepare(`
    SELECT w.*, COUNT(ws.id) as subject_count
    FROM weeks w
    LEFT JOIN week_subjects ws ON ws.week_id = w.id
    GROUP BY w.id
    ORDER BY w.date_start ASC
  `).all()
  res.json(weeks)
})

// GET /api/weeks/:id
router.get('/:id', (req, res) => {
  const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(req.params.id)
  if (!week) return res.status(404).json({ error: 'Semana não encontrada' })

  const subjects = db.prepare(`
    SELECT ws.id as ws_id, ws.total_aulas as ws_total_aulas, s.*
    FROM week_subjects ws
    JOIN subjects s ON s.id = ws.subject_id
    WHERE ws.week_id = ?
    ORDER BY s.name
  `).all(req.params.id)

  res.json({ ...week, subjects })
})

// POST /api/weeks
router.post('/', (req, res) => {
  const { name, context, date_start, date_end, subject_ids = [] } = req.body
  if (!name || !date_start || !date_end) {
    return res.status(400).json({ error: 'name, date_start e date_end são obrigatórios' })
  }

  const insertWeek = db.prepare(
    'INSERT INTO weeks (name, context, date_start, date_end) VALUES (?, ?, ?, ?)'
  )
  const insertWeekSubject = db.prepare(
    'INSERT OR IGNORE INTO week_subjects (week_id, subject_id, total_aulas) VALUES (?, ?, ?)'
  )
  const getSubject = db.prepare('SELECT total_aulas FROM subjects WHERE id = ?')

  let result
  db.exec('BEGIN')
  try {
    const { lastInsertRowid } = insertWeek.run(name, context || null, date_start, date_end)
    for (const sid of subject_ids) {
      const sub = getSubject.get(sid)
      insertWeekSubject.run(lastInsertRowid, sid, sub?.total_aulas ?? null)
    }
    result = db.prepare('SELECT * FROM weeks WHERE id = ?').get(lastInsertRowid)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }

  res.status(201).json(result)
})

// PUT /api/weeks/:id
router.put('/:id', (req, res) => {
  const { name, context, date_start, date_end } = req.body
  const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(req.params.id)
  if (!week) return res.status(404).json({ error: 'Semana não encontrada' })

  db.prepare(`
    UPDATE weeks SET
      name = ?, context = ?, date_start = ?, date_end = ?
    WHERE id = ?
  `).run(
    name ?? week.name,
    context !== undefined ? context : week.context,
    date_start ?? week.date_start,
    date_end ?? week.date_end,
    req.params.id
  )

  res.json(db.prepare('SELECT * FROM weeks WHERE id = ?').get(req.params.id))
})

// DELETE /api/weeks/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM weeks WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Semana não encontrada' })
  res.json({ ok: true })
})

// POST /api/weeks/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const { name, context, date_start, date_end } = req.body
  if (!name || !date_start || !date_end) {
    return res.status(400).json({ error: 'name, date_start e date_end são obrigatórios' })
  }

  const original = db.prepare('SELECT * FROM weeks WHERE id = ?').get(req.params.id)
  if (!original) return res.status(404).json({ error: 'Semana não encontrada' })

  let result
  db.exec('BEGIN')
  try {
    const { lastInsertRowid: newWeekId } = db.prepare(
      'INSERT INTO weeks (name, context, date_start, date_end) VALUES (?, ?, ?, ?)'
    ).run(name, context ?? original.context, date_start, date_end)

    db.prepare(`
      INSERT INTO week_subjects (week_id, subject_id, total_aulas)
      SELECT ?, subject_id, total_aulas FROM week_subjects WHERE week_id = ?
    `).run(newWeekId, req.params.id)

    db.prepare(`
      INSERT INTO entries (week_id, subject_id, dia, estudado, total_aulas, aula_estudada,
        num_pags_inicio, num_pags_fim, qtd_pags_estudadas,
        num_exercicios, num_acertos, percentual_acerto, dificuldade)
      SELECT ?, subject_id, dia, estudado, total_aulas, aula_estudada,
        num_pags_inicio, num_pags_fim, qtd_pags_estudadas,
        num_exercicios, num_acertos, percentual_acerto, dificuldade
      FROM entries WHERE week_id = ?
    `).run(newWeekId, req.params.id)

    db.prepare(`
      INSERT INTO week_day_orders (week_id, dia, subject_ids)
      SELECT ?, dia, subject_ids FROM week_day_orders WHERE week_id = ?
    `).run(newWeekId, req.params.id)

    result = db.prepare('SELECT * FROM weeks WHERE id = ?').get(newWeekId)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }

  res.status(201).json(result)
})

// GET /api/weeks/:id/subjects
router.get('/:id/subjects', (req, res) => {
  const subjects = db.prepare(`
    SELECT ws.id as ws_id, ws.total_aulas as ws_total_aulas, s.*
    FROM week_subjects ws
    JOIN subjects s ON s.id = ws.subject_id
    WHERE ws.week_id = ?
    ORDER BY s.name
  `).all(req.params.id)
  res.json(subjects)
})

// POST /api/weeks/:id/subjects
router.post('/:id/subjects', (req, res) => {
  const { subject_id, total_aulas } = req.body
  if (!subject_id) return res.status(400).json({ error: 'subject_id é obrigatório' })

  const week = db.prepare('SELECT id FROM weeks WHERE id = ?').get(req.params.id)
  if (!week) return res.status(404).json({ error: 'Semana não encontrada' })

  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subject_id)
  if (!subject) return res.status(404).json({ error: 'Disciplina não encontrada' })

  db.prepare(
    'INSERT OR IGNORE INTO week_subjects (week_id, subject_id, total_aulas) VALUES (?, ?, ?)'
  ).run(req.params.id, subject_id, total_aulas ?? subject.total_aulas ?? null)

  res.status(201).json({ ok: true })
})

// DELETE /api/weeks/:weekId/subjects/:subjectId
router.delete('/:weekId/subjects/:subjectId', (req, res) => {
  const result = db.prepare(
    'DELETE FROM week_subjects WHERE week_id = ? AND subject_id = ?'
  ).run(req.params.weekId, req.params.subjectId)
  if (result.changes === 0) return res.status(404).json({ error: 'Não encontrado' })
  res.json({ ok: true })
})

// GET /api/weeks/:id/order
router.get('/:id/order', (req, res) => {
  const rows = db.prepare(
    'SELECT dia, subject_ids FROM week_day_orders WHERE week_id = ?'
  ).all(req.params.id)
  const order = {}
  rows.forEach(r => { order[r.dia] = JSON.parse(r.subject_ids) })
  res.json(order)
})

// PUT /api/weeks/:id/order/:dia
router.put('/:id/order/:dia', (req, res) => {
  const { subject_ids } = req.body
  if (!Array.isArray(subject_ids)) return res.status(400).json({ error: 'subject_ids deve ser um array' })
  db.prepare(`
    INSERT INTO week_day_orders (week_id, dia, subject_ids)
    VALUES (?, ?, ?)
    ON CONFLICT(week_id, dia) DO UPDATE SET subject_ids = excluded.subject_ids
  `).run(req.params.id, req.params.dia, JSON.stringify(subject_ids))
  res.json({ ok: true })
})

export default router
