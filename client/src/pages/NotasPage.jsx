import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Convert stored text ([ ] / [x] format) → editor HTML
function contentToHTML(text) {
  if (!text) return ''
  return text.split('\n').map(line => {
    if (line.startsWith('[ ] ') || line.startsWith('[x] ')) {
      const checked = line.startsWith('[x] ')
      const txt = escapeHTML(line.slice(4))
      return `<div data-cb="1"><input type="checkbox" contenteditable="false"${checked ? ' checked' : ''}><span>${txt}</span></div>`
    }
    return `<div>${escapeHTML(line) || '<br>'}</div>`
  }).join('')
}

// Convert editor DOM → stored text
function htmlToContent(el) {
  if (!el) return ''
  const lines = []
  for (const node of el.childNodes) {
    if (node.nodeType === 3) {
      if (node.textContent) lines.push(node.textContent)
      continue
    }
    if (node.nodeType !== 1) continue
    if (node.tagName === 'BR') { lines.push(''); continue }
    if (node.tagName === 'DIV' || node.tagName === 'P') {
      if (node.dataset.cb) {
        const cb = node.querySelector('input[type="checkbox"]')
        // Collect all text content from the line, excluding the checkbox input itself
        const text = Array.from(node.childNodes)
          .filter(n => !(n.nodeType === 1 && n.tagName === 'INPUT'))
          .map(n => n.textContent)
          .join('')
        lines.push((cb?.checked ? '[x] ' : '[ ] ') + text)
      } else {
        lines.push(node.textContent)
      }
    }
  }
  return lines.join('\n')
}

export default function NotasPage() {
  const toast = useAppToast()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [title, setTitle] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'pending' | 'saving'

  const titleInputRef = useRef(null)
  const editorRef = useRef(null)
  const saveTimerRef = useRef(null)
  const selectedIdRef = useRef(null)
  const titleRef_ = useRef('')
  const contentRef_ = useRef('')
  const saveStatusRef = useRef('saved')

  function setSave(s) { saveStatusRef.current = s; setSaveStatus(s) }

  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { titleRef_.current = title }, [title])

  useEffect(() => {
    load()
    return () => clearTimeout(saveTimerRef.current)
  }, [])

  async function load() {
    setLoading(true)
    try { setNotes(await api.getNotes()) } finally { setLoading(false) }
  }

  const doSave = useCallback(async (id, t, c) => {
    if (!id) return
    setSave('saving')
    try {
      const updated = await api.updateNote(id, { title: t, content: c })
      setNotes(prev => prev.map(n => n.id === id ? updated : n))
      setSave('saved')
    } catch {
      setSave('pending')
      toast('Erro ao salvar nota', 'error')
    }
  }, [toast])

  function scheduleAutoSave(t, c) {
    setSave('pending')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() =>
      doSave(selectedIdRef.current, titleRef_.current, contentRef_.current), 1500)
  }

  async function flushSave() {
    clearTimeout(saveTimerRef.current)
    if (saveStatusRef.current === 'pending' && selectedIdRef.current) {
      await doSave(selectedIdRef.current, titleRef_.current, contentRef_.current)
    }
  }

  function setEditorContent(c) {
    contentRef_.current = c
    if (editorRef.current) {
      editorRef.current.innerHTML = contentToHTML(c)
      editorRef.current.dataset.empty = c.trim() === '' ? 'true' : 'false'
      applyCheckboxStyles(editorRef.current)
    }
  }

  async function selectNote(note) {
    await flushSave()
    setSelectedId(note.id)
    selectedIdRef.current = note.id
    setTitle(note.title)
    titleRef_.current = note.title
    setSave('saved')
    setEditorContent(note.content || '')
    setTimeout(() => editorRef.current?.focus(), 50)
  }

  function handleTitleChange(e) {
    setTitle(e.target.value)
    titleRef_.current = e.target.value
    scheduleAutoSave(e.target.value, contentRef_.current)
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); editorRef.current?.focus() }
  }

  function handleEditorInput() {
    const newContent = htmlToContent(editorRef.current)
    contentRef_.current = newContent
    editorRef.current.dataset.empty = newContent.trim() === '' ? 'true' : 'false'
    scheduleAutoSave(titleRef_.current, newContent)
  }

  function applyCheckboxStyles(editor) {
    for (const lineDiv of editor.querySelectorAll('[data-cb]')) {
      const cb = lineDiv.querySelector('input[type="checkbox"]')
      if (!cb) continue
      styleCheckboxLine(lineDiv, cb.checked)
    }
  }

  function styleCheckboxLine(lineDiv, checked) {
    for (const child of lineDiv.childNodes) {
      if (child.nodeType === 1 && child.tagName !== 'INPUT') {
        child.style.textDecoration = checked ? 'line-through' : ''
        child.style.color = checked ? '#9ca3af' : ''
      } else if (child.nodeType === 3 /* text node */) {
        // wrap orphan text nodes in a span so we can style them
        if (child.textContent.trim()) {
          const s = document.createElement('span')
          s.style.textDecoration = checked ? 'line-through' : ''
          s.style.color = checked ? '#9ca3af' : ''
          lineDiv.replaceChild(s, child)
          s.appendChild(child)
        }
      }
    }
  }

  function handleEditorClick(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
      setTimeout(() => {
        styleCheckboxLine(e.target.parentElement, e.target.checked)
        const newContent = htmlToContent(editorRef.current)
        contentRef_.current = newContent
        scheduleAutoSave(titleRef_.current, newContent)
      }, 0)
    }
  }

  function handleEditorKeyDown(e) {
    const editor = editorRef.current
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    // Find the line <div> that is a direct child of the editor
    let lineDiv = range.startContainer
    while (lineDiv && lineDiv.parentNode !== editor) lineDiv = lineDiv.parentNode
    if (!lineDiv || lineDiv === editor) return

    // Enter inside a checkbox line
    if (e.key === 'Enter' && lineDiv.dataset?.cb) {
      e.preventDefault()
      // textContent of the div minus the checkbox input (which has no textContent)
      const isEmpty = !lineDiv.textContent.trim()

      if (isEmpty) {
        // Double-enter on empty checkbox line → convert to plain line
        lineDiv.removeAttribute('data-cb')
        lineDiv.innerHTML = '<br>'
        const r = document.createRange()
        r.setStart(lineDiv, 0); r.collapse(true)
        sel.removeAllRanges(); sel.addRange(r)
      } else {
        // Create a new checkbox line after
        const newDiv = document.createElement('div')
        newDiv.dataset.cb = '1'
        const newCb = document.createElement('input')
        newCb.type = 'checkbox'
        newCb.contentEditable = 'false'
        const newSpan = document.createElement('span')
        newDiv.appendChild(newCb)
        newDiv.appendChild(newSpan)
        lineDiv.after(newDiv)
        const textNode = newSpan.appendChild(document.createTextNode(''))
        const r = document.createRange()
        r.setStart(textNode, 0); r.collapse(true)
        sel.removeAllRanges(); sel.addRange(r)
      }

      const nc = htmlToContent(editor)
      contentRef_.current = nc
      editor.dataset.empty = nc.trim() === '' ? 'true' : 'false'
      scheduleAutoSave(titleRef_.current, nc)
      return
    }

    // Backspace at start of checkbox text → remove checkbox, keep text
    if (e.key === 'Backspace' && range.collapsed && lineDiv.dataset?.cb) {
      const span = lineDiv.querySelector('span')
      const container = range.startContainer
      const atStart =
        (container === span && range.startOffset === 0) ||
        (span?.firstChild && container === span.firstChild && range.startOffset === 0)
      if (atStart) {
        e.preventDefault()
        const text = span?.textContent ?? ''
        const newDiv = document.createElement('div')
        if (text) newDiv.textContent = text; else newDiv.innerHTML = '<br>'
        editor.replaceChild(newDiv, lineDiv)
        const r = document.createRange()
        r.setStart(newDiv.firstChild ?? newDiv, 0); r.collapse(true)
        sel.removeAllRanges(); sel.addRange(r)
        const nc = htmlToContent(editor)
        contentRef_.current = nc
        editor.dataset.empty = nc.trim() === '' ? 'true' : 'false'
        scheduleAutoSave(titleRef_.current, nc)
      }
    }
  }

  function insertCheckbox() {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    let lineDiv = range.startContainer
    while (lineDiv && lineDiv.parentNode !== editor) lineDiv = lineDiv.parentNode
    if (!lineDiv || lineDiv === editor) return

    if (lineDiv.dataset?.cb) {
      // Already a checkbox line → remove the checkbox, keep the text
      const existingSpan = lineDiv.querySelector('span')
      const text = existingSpan?.textContent ?? ''
      lineDiv.removeAttribute('data-cb')
      if (text) lineDiv.textContent = text; else lineDiv.innerHTML = '<br>'
      const textNode = lineDiv.firstChild ?? lineDiv
      const r = document.createRange()
      r.setStart(textNode, typeof textNode.length === 'number' ? textNode.length : 0)
      r.collapse(true)
      sel.removeAllRanges(); sel.addRange(r)
      const nc = htmlToContent(editor)
      contentRef_.current = nc
      editor.dataset.empty = nc.trim() === '' ? 'true' : 'false'
      scheduleAutoSave(titleRef_.current, nc)
      return
    }

    const existingText = lineDiv.textContent

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.contentEditable = 'false'

    const span = document.createElement('span')
    span.textContent = existingText

    lineDiv.dataset.cb = '1'
    lineDiv.innerHTML = ''
    lineDiv.appendChild(cb)
    lineDiv.appendChild(span)

    // Place cursor at end of span text
    const textNode = span.firstChild ?? span.appendChild(document.createTextNode(''))
    const r = document.createRange()
    r.setStart(textNode, textNode.textContent?.length ?? 0); r.collapse(true)
    sel.removeAllRanges(); sel.addRange(r)

    const nc = htmlToContent(editor)
    contentRef_.current = nc
    editor.dataset.empty = nc.trim() === '' ? 'true' : 'false'
    scheduleAutoSave(titleRef_.current, nc)
  }

  async function handleNew() {
    await flushSave()
    try {
      const note = await api.createNote({ title: 'Sem título', content: '' })
      setNotes(prev => [note, ...prev])
      setSelectedId(note.id)
      selectedIdRef.current = note.id
      setTitle(note.title)
      titleRef_.current = note.title
      setSave('saved')
      setEditorContent('')
      setTimeout(() => titleInputRef.current?.select(), 50)
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
        selectedIdRef.current = null
        setTitle('')
        setSave('saved')
        if (editorRef.current) { editorRef.current.innerHTML = ''; editorRef.current.dataset.empty = 'false' }
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
            className="text-xs px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
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
                  selectedId === note.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${selectedId === note.id ? 'text-teal-700' : 'text-gray-800'}`}>
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
                  {note.content
                    ? note.content.replace(/\[[ x]\] /g, '').slice(0, 60)
                    : <span className="italic">Sem conteúdo</span>}
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
              {/* onMouseDown + preventDefault keeps cursor position in editor */}
              <button
                onMouseDown={(e) => { e.preventDefault(); insertCheckbox() }}
                title="Inserir checkbox na linha atual"
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                ☑ Checkbox
              </button>
            </div>

            {/* Título */}
            <input
              ref={titleInputRef}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Título"
              className="px-6 pt-6 pb-2 text-2xl font-bold text-gray-800 focus:outline-none bg-transparent border-none w-full placeholder-gray-300"
            />

            {/* Conteúdo — contenteditable */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onClick={handleEditorClick}
              onKeyDown={handleEditorKeyDown}
              data-placeholder="Comece a escrever..."
              className="note-editor flex-1 px-6 py-2 text-sm text-gray-700 overflow-y-auto"
            />
          </>
        )}
      </div>
    </div>
  )
}
