import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function NotasPage() {
  const toast = useAppToast()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const titleRef = useRef(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getNotes()
      setNotes(data)
    } finally {
      setLoading(false)
    }
  }

  function selectNote(note) {
    if (dirty && !confirm('Descartar alterações não salvas?')) return
    setSelectedId(note.id)
    setTitle(note.title)
    setContent(note.content || '')
    setDirty(false)
    setEditMode(false)
  }

  function toggleLine(lineIndex) {
    const lines = content.split('\n')
    const line = lines[lineIndex]
    if (line.startsWith('[ ] ')) lines[lineIndex] = '[x] ' + line.slice(4)
    else if (line.startsWith('[x] ')) lines[lineIndex] = '[ ] ' + line.slice(4)
    const newContent = lines.join('\n')
    setContent(newContent)
    setDirty(true)
  }

  function handleTitleChange(e) {
    setTitle(e.target.value)
    setDirty(true)
  }

  function handleContentChange(e) {
    setContent(e.target.value)
    setDirty(true)
  }

  async function handleNew() {
    if (dirty && !confirm('Descartar alterações não salvas?')) return
    try {
      const note = await api.createNote({ title: 'Sem título', content: '' })
      setNotes(prev => [note, ...prev])
      setSelectedId(note.id)
      setTitle(note.title)
      setContent('')
      setDirty(false)
      setTimeout(() => titleRef.current?.select(), 50)
    } catch {
      toast('Erro ao criar nota', 'error')
    }
  }

  async function handleSave() {
    if (!selectedId) return
    setSaving(true)
    try {
      const updated = await api.updateNote(selectedId, { title, content })
      setNotes(prev => prev.map(n => n.id === selectedId ? updated : n))
      setDirty(false)
      toast('Nota salva!', 'success')
    } catch {
      toast('Erro ao salvar nota', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Excluir esta nota?')) return
    try {
      await api.deleteNote(id)
      setNotes(prev => prev.filter(n => n.id !== id))
      if (selectedId === id) {
        setSelectedId(null)
        setTitle('')
        setContent('')
        setDirty(false)
      }
      toast('Nota excluída', 'success')
    } catch {
      toast('Erro ao excluir nota', 'error')
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  const selectedNote = notes.find(n => n.id === selectedId)

  return (
    <div className="flex h-full">
      {/* Lista de notas */}
      <div className="w-72 border-r border-gray-200 flex flex-col bg-gray-50 shrink-0">
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Notas</h2>
          <button
            onClick={handleNew}
            className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nova
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-8">Carregando...</p>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm text-gray-400">Nenhuma nota ainda.</p>
              <p className="text-xs text-gray-300 mt-1">Clique em "+ Nova" para começar.</p>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer group transition-colors ${
                  selectedId === note.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${selectedId === note.id ? 'text-blue-700' : 'text-gray-800'}`}>
                    {note.title || 'Sem título'}
                  </p>
                  <button
                    onClick={(e) => handleDelete(note.id, e)}
                    className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Excluir nota"
                  >
                    🗑
                  </button>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {note.content ? note.content.slice(0, 60) : <span className="italic">Sem conteúdo</span>}
                </p>
                <p className="text-xs text-gray-300 mt-1">{formatDate(note.updated_at)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0" onKeyDown={handleKeyDown}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-base font-medium">Selecione ou crie uma nota</p>
            <p className="text-sm mt-1">Suas anotações aparecem aqui</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {selectedNote && `Atualizado em ${formatDate(selectedNote.updated_at)}`}
                {dirty && <span className="ml-2 text-amber-500 font-medium">● não salvo</span>}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(v => !v)}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                  title={editMode ? 'Visualizar' : 'Editar texto bruto'}
                >
                  {editMode ? '👁 Visualizar' : '✏️ Editar'}
                </button>
                <button
                  onClick={() => {
                    if (dirty && !confirm('Descartar alterações?')) return
                    const note = notes.find(n => n.id === selectedId)
                    if (note) { setTitle(note.title); setContent(note.content || ''); setDirty(false) }
                  }}
                  disabled={!dirty}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Descartar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>

            {/* Título */}
            <input
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              placeholder="Título"
              className="px-6 pt-6 pb-2 text-2xl font-bold text-gray-800 focus:outline-none bg-transparent border-none w-full placeholder-gray-300"
            />

            {/* Conteúdo */}
            {editMode ? (
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder={'Use [ ] para criar itens marcáveis\nExemplo:\n[ ] Estudar direito administrativo\n[ ] Revisar anotações'}
                className="flex-1 px-6 py-2 text-sm text-gray-700 leading-relaxed focus:outline-none bg-transparent border-none resize-none placeholder-gray-300 font-mono"
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-2">
                {content ? (
                  content.split('\n').map((line, i) => {
                    if (line.startsWith('[ ] ') || line.startsWith('[x] ')) {
                      const checked = line.startsWith('[x] ')
                      const text = line.slice(4)
                      return (
                        <div key={i} className="flex items-start gap-2.5 py-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLine(i)}
                            className="mt-0.5 w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                          />
                          <span className={`text-sm leading-relaxed ${checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {text || '\u00A0'}
                          </span>
                        </div>
                      )
                    }
                    return (
                      <div key={i} className="py-1 text-sm text-gray-700 leading-relaxed min-h-[1.75rem]">
                        {line || '\u00A0'}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray-300 italic mt-1">
                    Clique em "✏️ Editar" para escrever. Use <code className="bg-gray-100 px-1 rounded">[ ] texto</code> para criar itens marcáveis.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
