import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// GET /api/dashboard/progress?week_id=1
router.get('/progress', (req, res) => {
  const { week_id } = req.query
  if (!week_id) return res.status(400).json({ error: 'week_id é obrigatório' })

  const rows = db.prepare(`
    SELECT
      s.name AS subject_name,
      ws.total_aulas,
      COUNT(CASE WHEN e.estudado = 1 THEN 1 END) AS sessions_studied,
      COALESCE(SUM(e.qtd_pags_estudadas), 0) AS total_pages,
      COUNT(DISTINCT CASE WHEN e.estudado = 1 THEN e.aula_estudada END) AS aulas_studied
    FROM week_subjects ws
    JOIN subjects s ON s.id = ws.subject_id
    LEFT JOIN entries e ON e.subject_id = ws.subject_id AND e.week_id = ws.week_id
    WHERE ws.week_id = ?
    GROUP BY s.id, s.name, ws.total_aulas
    ORDER BY s.name
  `).all(week_id)

  res.json(rows)
})

// GET /api/dashboard/accuracy?week_id=1
router.get('/accuracy', (req, res) => {
  const { week_id } = req.query
  if (!week_id) return res.status(400).json({ error: 'week_id é obrigatório' })

  const rows = db.prepare(`
    SELECT
      s.name AS subject_name,
      SUM(e.num_exercicios) AS total_exercicios,
      SUM(e.num_acertos) AS total_acertos,
      ROUND(
        CAST(SUM(e.num_acertos) AS REAL) / NULLIF(SUM(e.num_exercicios), 0) * 100,
        1
      ) AS avg_accuracy
    FROM entries e
    JOIN subjects s ON s.id = e.subject_id
    WHERE e.week_id = ? AND e.estudado = 1 AND e.num_exercicios > 0
    GROUP BY s.id, s.name
    ORDER BY avg_accuracy DESC
  `).all(week_id)

  res.json(rows)
})

// GET /api/dashboard/comparison?week_ids=1,2,3
router.get('/comparison', (req, res) => {
  const { week_ids } = req.query
  if (!week_ids) return res.status(400).json({ error: 'week_ids é obrigatório' })

  const ids = week_ids.split(',').map(Number).filter(Boolean)
  if (ids.length === 0) return res.status(400).json({ error: 'week_ids inválido' })

  const placeholders = ids.map(() => '?').join(',')

  const rows = db.prepare(`
    SELECT
      w.id AS week_id,
      w.name AS week_name,
      s.name AS subject_name,
      COUNT(CASE WHEN e.estudado = 1 THEN 1 END) AS sessions_studied,
      COALESCE(SUM(e.qtd_pags_estudadas), 0) AS total_pages
    FROM week_subjects ws
    JOIN weeks w ON w.id = ws.week_id
    JOIN subjects s ON s.id = ws.subject_id
    LEFT JOIN entries e ON e.subject_id = ws.subject_id AND e.week_id = ws.week_id
    WHERE ws.week_id IN (${placeholders})
    GROUP BY w.id, w.name, s.id, s.name
    ORDER BY w.date_start, s.name
  `).all(...ids)

  res.json(rows)
})

// GET /api/dashboard/studied-vs-planned?week_id=1
router.get('/studied-vs-planned', (req, res) => {
  const { week_id } = req.query
  if (!week_id) return res.status(400).json({ error: 'week_id é obrigatório' })

  const rows = db.prepare(`
    SELECT
      s.name AS subject_name,
      e.dia,
      COUNT(e.id) AS total,
      COALESCE(SUM(e.estudado), 0) AS studied
    FROM week_subjects ws
    JOIN subjects s ON s.id = ws.subject_id
    LEFT JOIN entries e ON e.subject_id = ws.subject_id AND e.week_id = ws.week_id
    WHERE ws.week_id = ?
    GROUP BY s.name, e.dia
    ORDER BY s.name, e.dia
  `).all(week_id)

  // pivot into {subject_name, Seg: {studied, total}|null, ...}
  const map = {}
  for (const row of rows) {
    if (!map[row.subject_name]) {
      map[row.subject_name] = { subject_name: row.subject_name }
      for (const d of DAYS) map[row.subject_name][d] = null
    }
    if (row.dia) {
      map[row.subject_name][row.dia] = { studied: row.studied, total: row.total }
    }
  }

  res.json(Object.values(map))
})

// GET /api/dashboard/summary?week_id=1  (cards da homepage)
router.get('/summary', (req, res) => {
  const { week_id } = req.query
  if (!week_id) return res.status(400).json({ error: 'week_id é obrigatório' })

  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total_registros,
      COUNT(CASE WHEN estudado = 1 THEN 1 END) AS sessoes_estudadas,
      COALESCE(SUM(qtd_pags_estudadas), 0) AS total_paginas,
      COALESCE(SUM(num_exercicios), 0) AS total_exercicios,
      COALESCE(SUM(num_acertos), 0) AS total_acertos
    FROM entries
    WHERE week_id = ?
  `).get(week_id)

  const dias = db.prepare(`
    SELECT COUNT(DISTINCT dia) AS dias_estudados
    FROM entries WHERE week_id = ? AND estudado = 1
  `).get(week_id)

  const planned = db.prepare(
    'SELECT COUNT(*) AS total FROM week_subjects WHERE week_id = ?'
  ).get(week_id)

  res.json({
    ...totals,
    dias_estudados: dias.dias_estudados,
    disciplinas_planejadas: planned.total,
    avg_accuracy: totals.total_exercicios > 0
      ? Math.round((totals.total_acertos / totals.total_exercicios) * 1000) / 10
      : null
  })
})

// GET /api/dashboard/totals?week_ids=1,2,3
router.get('/totals', (req, res) => {
  const { week_ids } = req.query
  if (!week_ids) return res.status(400).json({ error: 'week_ids é obrigatório' })

  const ids = week_ids.split(',').map(Number).filter(Boolean)
  if (ids.length === 0) return res.status(400).json({ error: 'week_ids inválido' })

  const placeholders = ids.map(() => '?').join(',')

  const summary = db.prepare(`
    SELECT
      COUNT(*)                                              AS total_registros,
      COUNT(CASE WHEN estudado = 1 THEN 1 END)             AS total_sessoes,
      COALESCE(SUM(qtd_pags_estudadas), 0)                 AS total_paginas,
      COALESCE(SUM(num_exercicios), 0)                     AS total_exercicios,
      COALESCE(SUM(num_acertos), 0)                        AS total_acertos,
      COUNT(DISTINCT week_id)                              AS total_semanas
    FROM entries
    WHERE week_id IN (${placeholders})
  `).get(...ids)

  summary.avg_accuracy = summary.total_exercicios > 0
    ? Math.round((summary.total_acertos / summary.total_exercicios) * 1000) / 10
    : null

  const by_subject = db.prepare(`
    SELECT
      s.name                                               AS subject_name,
      COUNT(*)                                             AS total_registros,
      COUNT(CASE WHEN e.estudado = 1 THEN 1 END)          AS total_sessoes,
      COALESCE(SUM(e.qtd_pags_estudadas), 0)              AS total_paginas,
      COALESCE(SUM(e.num_exercicios), 0)                  AS total_exercicios,
      COALESCE(SUM(e.num_acertos), 0)                     AS total_acertos,
      ROUND(
        CAST(SUM(e.num_acertos) AS REAL) / NULLIF(SUM(e.num_exercicios), 0) * 100, 1
      )                                                    AS avg_accuracy
    FROM entries e
    JOIN subjects s ON s.id = e.subject_id
    WHERE e.week_id IN (${placeholders})
    GROUP BY s.id, s.name
    ORDER BY total_paginas DESC
  `).all(...ids)

  res.json({ summary, by_subject })
})

export default router
