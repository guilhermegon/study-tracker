import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// ── helpers ───────────────────────────────────────────────────────────────────
const getConcursoIds = db.prepare(
  'SELECT concurso_id FROM prova_concursos WHERE prova_id = ?'
)
function withLinks(prova) {
  return {
    ...prova,
    anula: !!prova.anula,
    concurso_ids: getConcursoIds.all(prova.id).map(r => r.concurso_id),
  }
}
function withBool(q) {
  return { ...q, acertou: !!q.acertou, branco: !!q.branco }
}

// ── Provas CRUD ───────────────────────────────────────────────────────────────

// GET /api/provas
router.get('/', (req, res) => {
  const provas = db.prepare('SELECT * FROM provas ORDER BY created_at DESC').all()
  res.json(provas.map(withLinks))
})

// POST /api/provas
router.post('/', (req, res) => {
  const { nome, tipo = 'prova', anula = false, concurso_ids = [] } = req.body
  if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' })

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO provas (nome, tipo, anula) VALUES (?, ?, ?)'
  ).run(nome.trim(), tipo, anula ? 1 : 0)

  const ins = db.prepare('INSERT OR IGNORE INTO prova_concursos (prova_id, concurso_id) VALUES (?, ?)')
  for (const cid of concurso_ids) ins.run(lastInsertRowid, cid)

  res.status(201).json(withLinks(db.prepare('SELECT * FROM provas WHERE id = ?').get(lastInsertRowid)))
})

// PUT /api/provas/:id
router.put('/:id', (req, res) => {
  const { nome, tipo, anula, concurso_ids } = req.body
  const prova = db.prepare('SELECT * FROM provas WHERE id = ?').get(req.params.id)
  if (!prova) return res.status(404).json({ error: 'Prova não encontrada' })

  db.prepare('UPDATE provas SET nome = ?, tipo = ?, anula = ? WHERE id = ?').run(
    nome?.trim() ?? prova.nome,
    tipo ?? prova.tipo,
    anula !== undefined ? (anula ? 1 : 0) : prova.anula,
    req.params.id
  )

  if (concurso_ids !== undefined) {
    db.prepare('DELETE FROM prova_concursos WHERE prova_id = ?').run(req.params.id)
    const ins = db.prepare('INSERT OR IGNORE INTO prova_concursos (prova_id, concurso_id) VALUES (?, ?)')
    for (const cid of concurso_ids) ins.run(req.params.id, cid)
  }

  res.json(withLinks(db.prepare('SELECT * FROM provas WHERE id = ?').get(req.params.id)))
})

// DELETE /api/provas/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM provas WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Prova não encontrada' })
  res.json({ ok: true })
})

// ── Questões CRUD (nested) ────────────────────────────────────────────────────

// GET /api/provas/:id/questoes
router.get('/:id/questoes', (req, res) => {
  const rows = db.prepare(`
    SELECT q.*, s.name AS subject_name
    FROM questoes q
    LEFT JOIN subjects s ON s.id = q.subject_id
    WHERE q.prova_id = ?
    ORDER BY q.id
  `).all(req.params.id)
  res.json(rows.map(withBool))
})

// POST /api/provas/:id/questoes
router.post('/:id/questoes', (req, res) => {
  const {
    subject_id = null,
    nome = '',
    marcada = '',
    gabarito = '',
    acertou = false,
    branco = false,
  } = req.body

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO questoes (prova_id, subject_id, nome, marcada, gabarito, acertou, branco) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.params.id,
    subject_id || null,
    nome,
    String(marcada).slice(0, 1).toUpperCase(),
    String(gabarito).slice(0, 1).toUpperCase(),
    branco ? 0 : (acertou ? 1 : 0),
    branco ? 1 : 0
  )

  const q = db.prepare(`
    SELECT q.*, s.name AS subject_name
    FROM questoes q LEFT JOIN subjects s ON s.id = q.subject_id
    WHERE q.id = ?
  `).get(lastInsertRowid)
  res.status(201).json(withBool(q))
})

// PUT /api/provas/:provaId/questoes/:questaoId
router.put('/:provaId/questoes/:questaoId', (req, res) => {
  const q = db.prepare('SELECT * FROM questoes WHERE id = ? AND prova_id = ?')
    .get(req.params.questaoId, req.params.provaId)
  if (!q) return res.status(404).json({ error: 'Questão não encontrada' })

  const {
    subject_id = q.subject_id,
    nome = q.nome,
    marcada = q.marcada,
    gabarito = q.gabarito,
    acertou = q.acertou,
    branco = q.branco,
  } = req.body

  const blancoVal = branco ? 1 : 0
  const acertouVal = blancoVal ? 0 : (acertou ? 1 : 0)

  db.prepare(
    'UPDATE questoes SET subject_id=?, nome=?, marcada=?, gabarito=?, acertou=?, branco=? WHERE id=?'
  ).run(
    subject_id || null,
    nome,
    String(marcada).slice(0, 1).toUpperCase(),
    String(gabarito).slice(0, 1).toUpperCase(),
    acertouVal,
    blancoVal,
    req.params.questaoId
  )

  const updated = db.prepare(`
    SELECT q.*, s.name AS subject_name
    FROM questoes q LEFT JOIN subjects s ON s.id = q.subject_id
    WHERE q.id = ?
  `).get(req.params.questaoId)
  res.json(withBool(updated))
})

// DELETE /api/provas/:provaId/questoes/:questaoId
router.delete('/:provaId/questoes/:questaoId', (req, res) => {
  const result = db.prepare(
    'DELETE FROM questoes WHERE id = ? AND prova_id = ?'
  ).run(req.params.questaoId, req.params.provaId)
  if (result.changes === 0) return res.status(404).json({ error: 'Questão não encontrada' })
  res.json({ ok: true })
})

export default router
