import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

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

// PUT /api/entries/:id
router.put('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Registro não encontrado' })

  const { subject_id, dia, estudado, aula_estudada, dificuldade, total_aulas } = req.body
  const computed = computeFields({ ...entry, ...req.body })

  db.prepare(`
    UPDATE entries SET
      subject_id = ?, dia = ?, estudado = ?, aula_estudada = ?,
      num_pags_inicio = ?, num_pags_fim = ?, qtd_pags_estudadas = ?,
      num_exercicios = ?, num_acertos = ?, percentual_acerto = ?,
      dificuldade = ?, total_aulas = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    subject_id ?? entry.subject_id,
    dia ?? entry.dia,
    estudado !== undefined ? (estudado ? 1 : 0) : entry.estudado,
    aula_estudada !== undefined ? aula_estudada : entry.aula_estudada,
    computed.num_pags_inicio,
    computed.num_pags_fim,
    computed.qtd_pags_estudadas,
    computed.num_exercicios,
    computed.num_acertos,
    computed.percentual_acerto,
    dificuldade !== undefined ? dificuldade : entry.dificuldade,
    total_aulas !== undefined ? (total_aulas != null ? Number(total_aulas) : null) : entry.total_aulas,
    req.params.id
  )

  const updated = db.prepare(`
    SELECT e.*, s.name as subject_name FROM entries e
    JOIN subjects s ON s.id = e.subject_id WHERE e.id = ?
  `).get(req.params.id)

  res.json({ ...updated, estudado: updated.estudado === 1 })
})

// DELETE /api/entries/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' })
  res.json({ ok: true })
})

export default router
