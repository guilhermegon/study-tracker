import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import { api } from '../../api/client'

function addDays(dateStr, days) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function DuplicateWeekModal({ open, onClose, onSaved, week = null }) {
  const [form, setForm] = useState({ name: '', context: '', date_start: '', date_end: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !week) return
    setError(null)
    setForm({
      name: `${week.name} (cópia)`,
      context: week.context || '',
      date_start: addDays(week.date_start, 7),
      date_end: addDays(week.date_end, 7),
    })
  }, [open, week?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const saved = await api.duplicateWeek(week.id, form)
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Duplicar Semana" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <p className="text-sm text-gray-500">
          Todas as disciplinas e entradas da semana <span className="font-medium text-gray-700">{week?.name}</span> serão copiadas para a nova semana.
        </p>

        <div>
          <label className="label">Nome da nova semana *</label>
          <input
            className="input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="ex: ANPD Semana 2"
            required
          />
        </div>

        <div>
          <label className="label">Contexto (opcional)</label>
          <input
            className="input"
            value={form.context}
            onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
            placeholder="ex: PAULA | ANPD"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data início *</label>
            <input
              type="date"
              className="input"
              value={form.date_start}
              onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Data fim *</label>
            <input
              type="date"
              className="input"
              value={form.date_end}
              onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Duplicando...' : 'Duplicar semana'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
