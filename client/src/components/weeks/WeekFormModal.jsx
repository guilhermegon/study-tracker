import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import { api } from '../../api/client'

export default function WeekFormModal({ open, onClose, onSaved, week = null }) {
  const isEdit = !!week
  const [form, setForm] = useState({ name: '', context: '', date_start: '', date_end: '' })
  const [subjects, setSubjects] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editSubjectId, setEditSubjectId] = useState(null)
  const [editSubjectName, setEditSubjectName] = useState('')

  useEffect(() => {
    if (!open) return
    api.getSubjects().then(setAllSubjects).catch(console.error)
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

  async function handleRenameSubject(id) {
    const name = editSubjectName.trim()
    if (!name) return
    try {
      const updated = await api.updateSubject(id, { name })
      setAllSubjects(prev => prev.map(s => s.id === id ? { ...s, name: updated.name } : s))
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, name: updated.name } : s))
      setEditSubjectId(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeleteSubject(id) {
    if (!confirm('Excluir esta disciplina permanentemente? Ela será removida de todas as semanas.')) return
    try {
      await api.deleteSubject(id)
      setAllSubjects(prev => prev.filter(s => s.id !== id))
      setSubjects(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      setError(e.message)
    }
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
          <div className="flex gap-2 mb-2">
            <input className="input" value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewSubject() } }}
              placeholder="Nova disciplina..." />
            <button type="button" onClick={addNewSubject} className="btn-secondary whitespace-nowrap">
              + Adicionar
            </button>
          </div>
          {allSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {allSubjects.map(s => {
                const selected = subjects.some(x => x.id === s.id)
                const isEditing = editSubjectId === s.id
                return (
                  <div key={s.id}
                    className={`flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-sm font-medium border transition-colors
                      ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {isEditing ? (
                      <>
                        <input
                          autoFocus
                          value={editSubjectName}
                          onChange={e => setEditSubjectName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleRenameSubject(s.id) }
                            if (e.key === 'Escape') setEditSubjectId(null)
                          }}
                          className="w-28 bg-transparent border-b border-current focus:outline-none text-sm"
                        />
                        <button type="button" onClick={() => handleRenameSubject(s.id)}
                          className="font-bold px-1 opacity-80 hover:opacity-100">✓</button>
                        <button type="button" onClick={() => setEditSubjectId(null)}
                          className="px-1 opacity-60 hover:opacity-100">✕</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => toggle(s)} className="hover:opacity-80">
                          {s.name}
                        </button>
                        <button type="button"
                          onClick={() => { setEditSubjectId(s.id); setEditSubjectName(s.name) }}
                          className={`px-1 text-xs opacity-50 hover:opacity-100 transition-opacity ${selected ? 'text-white' : 'text-gray-500'}`}
                          title="Renomear">✏️</button>
                        <button type="button" onClick={() => handleDeleteSubject(s.id)}
                          className={`px-1 text-xs opacity-50 hover:opacity-100 transition-opacity ${selected ? 'text-white' : 'text-gray-500'}`}
                          title="Excluir disciplina">🗑</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
