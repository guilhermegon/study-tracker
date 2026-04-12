import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import { api } from '../../api/client'

export default function WeekFormModal({ open, onClose, onSaved, week = null }) {
  const isEdit = !!week
  const [form, setForm] = useState({ name: '', context: '', date_start: '', date_end: '' })
  const [subjects, setSubjects] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    api.getSubjects().then(setAllSubjects).catch(console.error)
    setSearch('')
    if (isEdit) {
      setForm({
        name: week.name,
        context: week.context || '',
        date_start: week.date_start,
        date_end: week.date_end,
      })
      api.getWeekSubjects(week.id).then(subs => {
        setSubjects(subs.map(s => ({ id: s.id, name: s.name })))
      })
    } else {
      setForm({ name: '', context: '', date_start: '', date_end: '' })
      setSubjects([])
    }
  }, [open, isEdit, week?.id])

  function toggle(sub) {
    setSubjects(prev =>
      prev.find(s => s.id === sub.id)
        ? prev.filter(s => s.id !== sub.id)
        : [...prev, sub]
    )
  }

  async function addNewSubject() {
    if (!newSubject.trim()) return
    try {
      const created = await api.createSubject({ name: newSubject.trim() })
      setAllSubjects(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setSubjects(prev => [...prev, { id: created.id, name: created.name }])
      setNewSubject('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      let saved
      if (isEdit) {
        saved = await api.updateWeek(week.id, form)
        // Sync subjects: remove all then re-add
        const current = await api.getWeekSubjects(week.id)
        for (const s of current) {
          await api.removeWeekSubject(week.id, s.id)
        }
        for (const s of subjects) {
          await api.addWeekSubject(week.id, { subject_id: s.id })
        }
      } else {
        saved = await api.createWeek({ ...form, subject_ids: subjects.map(s => s.id) })
      }
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Semana' : 'Nova Semana'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nome da semana *</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: ANPD Semana 1" required />
          </div>
          <div className="col-span-2">
            <label className="label">Contexto (opcional)</label>
            <input className="input" value={form.context}
              onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
              placeholder="ex: PAULA | ANPD" />
          </div>
          <div>
            <label className="label">Data início *</label>
            <input type="date" className="input" value={form.date_start}
              onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Data fim *</label>
            <input type="date" className="input" value={form.date_end}
              onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))} required />
          </div>
        </div>

        <div>
          <label className="label">Disciplinas planejadas para esta semana</label>

          {/* Criar nova disciplina */}
          <div className="flex gap-2 mb-3">
            <input className="input" value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewSubject() } }}
              placeholder="Nova disciplina..." />
            <button type="button" onClick={addNewSubject} className="btn-secondary whitespace-nowrap">
              + Criar
            </button>
          </div>

          {allSubjects.length > 0 && (() => {
            const q = search.toLowerCase()
            const selected   = allSubjects.filter(s => subjects.some(x => x.id === s.id))
            const available  = allSubjects.filter(s => !subjects.some(x => x.id === s.id))
            const selVisible = selected.filter(s => !q || s.name.toLowerCase().includes(q))
            const avaVisible = available.filter(s => !q || s.name.toLowerCase().includes(q))
            return (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Barra de busca */}
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder-gray-400"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Buscar disciplina..."
                  />
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {/* Selecionadas */}
                  {selVisible.length > 0 && (
                    <div className="px-3 py-2 bg-teal-50">
                      <p className="text-xs font-semibold text-teal-500 uppercase tracking-wide mb-2">
                        Selecionadas ({subjects.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selVisible.map(s => (
                          <button key={s.id} type="button" onClick={() => toggle(s)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                            ✓ {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disponíveis */}
                  {avaVisible.length > 0 && (
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Disponíveis ({avaVisible.length}{q && available.length !== avaVisible.length ? ` de ${available.length}` : ''})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {avaVisible.map(s => (
                          <button key={s.id} type="button" onClick={() => toggle(s)}
                            className="px-2.5 py-1 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors">
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sem resultados */}
                  {selVisible.length === 0 && avaVisible.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Nenhuma disciplina encontrada para "{search}"
                    </p>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar semana'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
