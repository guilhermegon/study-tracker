import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'pending' | 'saving'

  const titleRef = useRef(null)
  const contentRef = useRef(null)
  const saveTimerRef = useRef(null)
  const selectedIdRef = useRef(null)
  const titleRef_ = useRef('')
  const contentRef_ = useRef('')

  // keep refs in sync for use inside timer callbacks
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { titleRef_.current = title }, [title])
  useEffect(() => { contentRef_.current = content }, [content])

  useEffect(() => {
    load()
    return () => clearTimeout(saveTimerRef.current)
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

  const doSave = useCallback(async (id, t, c) => {
    if (!id) return
    setSaveStatus('saving')
    try {
      const updated = await api.updateNote(id, { title: t, content: c })
      setNotes(prev => prev.map(n => n.id === id ? updated : n))
      setSaveStatus('saved')
    } catch {
      setSaveStatus('pending')
      toast('Erro ao salvar nota', 'error')
    }
  }, [toast])

  function scheduleAutoSave(t, c) {
    setSaveStatus('pending')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      doSave(selectedIdRef.current, titleRef_.current, contentRef_.current)
    }, 1500)
  }

  async function flushSave() {
    clearTimeout(saveTimerRef.current)
    if (saveStatus === 'pending' && selectedIdRef.current) {
      await doSave(selectedIdRef.current, titleRef_.current, contentRef_.current)
    }
  }

  async function selectNote(note) {
    await flushSave()
    setSelectedId(note.id)
    setTitle(note.title)
    setContent(note.content || '')
    setSaveStatus('saved')
    setTimeout(() => contentRef.current?.focus(), 50)
  }

  function handleTitleChange(e) {
    setTitle(e.target.value)
    scheduleAutoSave(e.target.value, contentRef_.current)
  }

  function handleContentChange(e) {
    setContent(e.target.value)
    scheduleAutoSave(titleRef_.current, e.target.value)
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      contentRef.current?.focus()
    }
  }

  function handleContentKeyDown(e) {
    if (e.key !== 'Backspace') return
    const ta = contentRef.current
    const pos = ta.selectionStart
    if (ta.selectionStart !== ta.selectionEnd) return // has selection, let default handle
    const lines = content.split('\n')
    let offset = 0
    for (let i = 0; i < lines.length; i++) {
      const lineStart = offset
      const lineEnd = offset + lines[i].length
      if (pos >= lineStart && pos <= lineEnd) {
        const colInLine = pos - lineStart
        const line = lines[i]
        if ((line.startsWith('[ ] ') || line.startsWith('[x] ')) && colInLine === 4) {
          e.preventDefault()
          lines[i] = line.slice(4)
          const newContent = lines.join('\n')
          setContent(newContent)
          scheduleAutoSave(titleRef_.current, newContent)
          setTimeout(() => {
            ta.selectionStart = lineStart
            ta.selectionEnd = lineStart
          }, 0)
        }
        break
      }
      offset += lines[i].length + 1
    }
  }

  function insertCheckbox() {
    const ta = contentRef.current
    if (!ta) return
    ta.focus()
    const pos = ta.selectionStart
    const lines = content.split('\n')
    let offset = 0
    for (let i = 0; i < lines.length; i++) {
      const lineStart = offset
      const lineEnd = offset + lines[i].length
      if (pos >= lineStart && pos <= lineEnd) {
        if (lines[i].startsWith('[ ] ') || lines[i].startsWith('[x] ')) break
        lines[i] = '[ ] ' + lines[i]
        const newContent = lines.join('\n')
        setContent(newContent)
        scheduleAutoSave(titleRef_.current, newContent)
        const newPos = pos + 4
        setTimeout(() => {
          ta.selectionStart = newPos
          ta.selectionEnd = newPos
          ta.focus()
        }, 0)
        break
      }
      offset += lines[i].length + 1
    }
  }

  async function handleNew() {
    await flushSave()
    try {
      const note = await api.createNote({ title: 'Sem título', content: '' })
      setNotes(prev => [note, ...prev])
      setSelectedId(note.id)
      setTitle(note.title)
      setContent('')
      setSaveStatus('saved')
      setTimeout(() => {
        titleRef.current?.select()
      }, 50)
    } catch {
      toast('Erro ao criar nota', 'error')
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Excluir esta nota?')) return
    clearTimeout(saveTimerRef.current)
    try {
      await api.deleteNote(id)
      setNotes(prev => prev.filter(n => n.id !== id))
      if (selectedId === id) {
        setSelectedId(null)
        setTitle('')
        setContent('')
        setSaveStatus('saved')
      }
      toast('Nota excluída', 'success')
    } catch {
      toast('Erro ao excluir nota', 'error')
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
                  {note.content ? note.content.replace(/\[[ x]\] /g, '').slice(0, 60) : <span className="italic">Sem conteúdo</span>}
                </p>
                <p className="text-xs text-gray-300 mt-1">{formatDate(note.updated_at)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
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
                {saveStatus === 'pending' && <span className="ml-2 text-amber-500 font-medium">● não salvo</span>}
                {saveStatus === 'saving' && <span className="ml-2 text-gray-400">Salvando...</span>}
              </p>
              <button
                onClick={insertCheckbox}
                title="Inserir checkbox na linha atual"
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <span>☑</span>
                <span>Checkbox</span>
              </button>
            </div>

            {/* Título */}
            <input
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Título"
              className="px-6 pt-6 pb-2 text-2xl font-bold text-gray-800 focus:outline-none bg-transparent border-none w-full placeholder-gray-300"
            />

            {/* Conteúdo */}
            <textarea
              ref={contentRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleContentKeyDown}
              placeholder={'Comece a escrever...\nUse o botão ☑ Checkbox ou digite [ ] para criar itens marcáveis.'}
              className="flex-1 px-6 py-2 text-sm text-gray-700 leading-relaxed focus:outline-none bg-transparent border-none resize-none placeholder-gray-300"
            />
          </>
        )}
      </div>
    </div>
  )
}
