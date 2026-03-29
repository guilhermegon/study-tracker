import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'

export default function DisciplinasPage() {
  const toast = useAppToast()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const newInputRef = useRef(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getSubjects()
      setSubjects(data)
    } catch {
      toast('Erro ao carregar disciplinas', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      const created = await api.createSubject({ name })
      setSubjects(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      newInputRef.current?.focus()
      toast('Disciplina criada!', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao criar disciplina', 'error')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(s) {
    setEditId(s.id)
    setEditName(s.name)
  }

  function cancelEdit() {
    setEditId(null)
    setEditName('')
  }

  async function handleSaveEdit(id) {
    const name = editName.trim()
    if (!name) return
    try {
      const updated = await api.updateSubject(id, { name })
      setSubjects(prev =>
        prev.map(s => s.id === id ? { ...s, name: updated.name } : s)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditId(null)
      toast('Disciplina atualizada!', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao atualizar', 'error')
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Excluir "${s.name}"?\n\nEla será removida de todas as semanas e registros permanentemente.`)) return
    try {
      await api.deleteSubject(s.id)
      setSubjects(prev => prev.filter(x => x.id !== s.id))
      toast('Disciplina excluída', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao excluir', 'error')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Disciplinas</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie todas as disciplinas disponíveis nas semanas de estudo.</p>
      </div>

      {/* Formulário de nova disciplina */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          ref={newInputRef}
          className="input flex-1"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nome da nova disciplina..."
        />
        <button type="submit" disabled={adding || !newName.trim()} className="btn-primary whitespace-nowrap">
          {adding ? 'Adicionando...' : '+ Adicionar'}
        </button>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p>Nenhuma disciplina cadastrada ainda.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {subjects.map(s => (
            <div key={s.id} className="group flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
              {editId === s.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(s.id) }
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="input flex-1 py-1"
                  />
                  <button
                    onClick={() => handleSaveEdit(s.id)}
                    className="text-green-600 hover:text-green-700 font-bold text-sm px-2 transition-colors"
                    title="Salvar (Enter)"
                  >
                    ✓
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-400 hover:text-red-500 text-xs px-1 transition-colors"
                    title="Cancelar (Esc)"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-gray-400 hover:text-blue-600 text-xs px-2 py-1 rounded transition-colors"
                      title="Renomear"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-gray-400 hover:text-red-600 text-xs px-2 py-1 rounded transition-colors"
                      title="Excluir"
                    >
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
