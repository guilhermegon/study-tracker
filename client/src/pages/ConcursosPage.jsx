import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'

const ORDER_KEY = 'concursos-chip-order'

function applyOrder(list, order) {
  if (!order || order.length === 0) return list
  const ordered = order.map(id => list.find(c => c.id === id)).filter(Boolean)
  const rest = list.filter(c => !order.includes(c.id))
  return [...ordered, ...rest]
}

function formatDate(d) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function ConcursosPage() {
  const toast = useAppToast()
  const [concursos, setConcursos] = useState([])
  const [chipOrder, setChipOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || [] } catch { return [] }
  })
  const [selectedId, setSelectedId] = useState(null)
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  // Concurso form
  const [showConcursoForm, setShowConcursoForm] = useState(false)
  const [editingConcursoId, setEditingConcursoId] = useState(null)
  const [concursoForm, setConcursoForm] = useState({ nome: '', banca: '', cargo: '', link: '', data_prova: '' })

  // Disciplina picker
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [allSubjects, setAllSubjects] = useState([])

  // Collapse por disciplina
  const [collapsed, setCollapsed] = useState(new Set())
  const toggleCollapse = id => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Conteúdo
  const [addConteudoFor, setAddConteudoFor] = useState(null)
  const [newConteudo, setNewConteudo] = useState({ nome: '', url: '' })
  const [editConteudo, setEditConteudo] = useState(null)

  useEffect(() => {
    loadConcursos()
    api.getSubjects().then(setAllSubjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (selectedId) loadMaterias(selectedId)
    else setMaterias([])
  }, [selectedId])

  async function loadConcursos() {
    try {
      const data = await api.getConcursos()
      setConcursos(data)
      if (data.length > 0) setSelectedId(prev => prev ?? applyOrder(data, chipOrder)[0].id)
    } catch { toast('Erro ao carregar concursos', 'error') }
  }

  async function loadMaterias(id) {
    setLoading(true)
    try {
      const data = await api.getMaterias(id)
      setMaterias(data)
      setCollapsed(new Set(data.map(m => m.id)))
    }
    catch { toast('Erro ao carregar matérias', 'error') }
    finally { setLoading(false) }
  }

  // ── Drag and drop chips ────────────────────────────────────────────────────
  function handleChipDragStart(idx) {
    dragItem.current = idx
  }

  function handleChipDragEnter(idx) {
    dragOverItem.current = idx
    setDragOverIdx(idx)
  }

  function handleChipDragEnd() {
    setDragOverIdx(null)
    const from = dragItem.current
    const to = dragOverItem.current
    dragItem.current = null
    dragOverItem.current = null
    if (from === null || to === null || from === to) return
    const ordered = applyOrder(concursos, chipOrder)
    const ids = ordered.map(c => c.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    setChipOrder(ids)
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
  }

  // ── Concurso CRUD ──────────────────────────────────────────────────────────
  function openNewConcurso() {
    setEditingConcursoId(null)
    setConcursoForm({ nome: '', banca: '', cargo: '', link: '', data_prova: '' })
    setShowConcursoForm(true)
  }

  function openEditConcurso(c, e) {
    e.stopPropagation()
    setEditingConcursoId(c.id)
    setConcursoForm({ nome: c.nome, banca: c.banca || '', cargo: c.cargo || '', link: c.link || '', data_prova: c.data_prova || '' })
    setShowConcursoForm(true)
  }

  async function handleSaveConcurso() {
    if (!concursoForm.nome.trim()) return
    try {
      if (editingConcursoId) {
        const updated = await api.updateConcurso(editingConcursoId, concursoForm)
        setConcursos(prev => prev.map(c => c.id === editingConcursoId ? updated : c))
        toast('Concurso atualizado!', 'success')
      } else {
        const created = await api.createConcurso(concursoForm)
        setConcursos(prev => [...prev, created])
        setSelectedId(created.id)
        toast('Concurso criado!', 'success')
      }
      setShowConcursoForm(false)
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleDeleteConcurso(id, e) {
    e.stopPropagation()
    if (!confirm('Excluir este concurso? Todas as matérias e conteúdos serão removidos.')) return
    try {
      await api.deleteConcurso(id)
      const remaining = concursos.filter(c => c.id !== id)
      setConcursos(remaining)
      if (selectedId === id) setSelectedId(remaining[0]?.id ?? null)
      toast('Concurso excluído', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Disciplina CRUD ────────────────────────────────────────────────────────
  async function handleAddSubject(subject) {
    try {
      const added = await api.addConcursoSubject(selectedId, subject.id)
      setMaterias(prev => [...prev, added])
      setShowSubjectPicker(false)
      setSubjectSearch('')
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleRemoveSubject(id) {
    if (!confirm('Desvincular esta disciplina? Todos os seus conteúdos serão removidos.')) return
    try {
      await api.removeConcursoSubject(id)
      setMaterias(prev => prev.filter(m => m.id !== id))
      toast('Disciplina desvinculada', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Conteúdo CRUD ──────────────────────────────────────────────────────────
  async function handleAddConteudo(materiaId) {
    if (!newConteudo.nome.trim()) return
    try {
      const created = await api.createConteudo(materiaId, newConteudo)
      setMaterias(prev => prev.map(m =>
        m.id === materiaId ? { ...m, conteudos: [...m.conteudos, created] } : m
      ))
      setNewConteudo({ nome: '', url: '' })
      // mantém a linha aberta para o próximo conteúdo
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleUpdateConteudo(id) {
    if (!editConteudo?.nome.trim()) return
    try {
      const updated = await api.updateConteudo(id, { nome: editConteudo.nome, url: editConteudo.url })
      const materiaId = editConteudo.materia_id
      setMaterias(prev => prev.map(m => ({
        ...m, conteudos: m.conteudos.map(c => c.id === id ? updated : c),
      })))
      setEditConteudo(null)
      setNewConteudo({ nome: '', url: '' })
      setAddConteudoFor(materiaId)
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleDeleteConteudo(id) {
    if (!confirm('Excluir este conteúdo?')) return
    try {
      await api.deleteConteudo(id)
      setMaterias(prev => prev.map(m => ({ ...m, conteudos: m.conteudos.filter(c => c.id !== id) })))
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleToggle(id) {
    try {
      const updated = await api.toggleConteudo(id)
      setMaterias(prev => prev.map(m => ({
        ...m, conteudos: m.conteudos.map(c => c.id === id ? updated : c),
      })))
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const selectedConcurso = concursos.find(c => c.id === selectedId)
  const totalConteudos = materias.reduce((s, m) => s + m.conteudos.length, 0)
  const totalConcluidos = materias.reduce((s, m) => s + m.conteudos.filter(c => c.concluido).length, 0)
  const progress = totalConteudos > 0 ? Math.round((totalConcluidos / totalConteudos) * 100) : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Concursos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie matérias e conteúdos por concurso</p>
        </div>
        <button onClick={openNewConcurso} className="btn-primary">+ Novo Concurso</button>
      </div>

      {/* Formulário de concurso */}
      {showConcursoForm && (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-6 py-5">
          <h3 className="text-sm font-semibold text-teal-700 mb-4">
            {editingConcursoId ? 'Editar Concurso' : 'Novo Concurso'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={concursoForm.nome}
                onChange={e => setConcursoForm(f => ({ ...f, nome: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSaveConcurso()}
                placeholder="ex: ANPD 2025" autoFocus />
            </div>
            <div>
              <label className="label">Banca</label>
              <input className="input" value={concursoForm.banca}
                onChange={e => setConcursoForm(f => ({ ...f, banca: e.target.value }))}
                placeholder="ex: CESPE" />
            </div>
            <div>
              <label className="label">Cargo</label>
              <input className="input" value={concursoForm.cargo}
                onChange={e => setConcursoForm(f => ({ ...f, cargo: e.target.value }))}
                placeholder="ex: Analista" />
            </div>
            <div>
              <label className="label">Data da prova</label>
              <input type="date" className="input" value={concursoForm.data_prova}
                onChange={e => setConcursoForm(f => ({ ...f, data_prova: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Link do edital / inscrição</label>
            <input className="input w-full" value={concursoForm.link}
              onChange={e => setConcursoForm(f => ({ ...f, link: e.target.value }))}
              placeholder="https://..." />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveConcurso} className="btn-primary"
              disabled={!concursoForm.nome.trim()}>
              {editingConcursoId ? 'Salvar alterações' : 'Criar concurso'}
            </button>
            <button onClick={() => setShowConcursoForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {concursos.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-lg font-medium">Nenhum concurso cadastrado</p>
          <p className="text-sm mt-1">Clique em "+ Novo Concurso" para começar.</p>
        </div>
      ) : (
        <>
          {/* Filtro de concursos */}
          <div className="flex flex-wrap gap-2 mb-6">
            {applyOrder(concursos, chipOrder).map((c, idx) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => handleChipDragStart(idx)}
                onDragEnter={() => handleChipDragEnter(idx)}
                onDragEnd={handleChipDragEnd}
                onDragOver={e => e.preventDefault()}
                onClick={() => setSelectedId(c.id)}
                className={`flex items-center gap-1 rounded-full border text-sm font-medium cursor-pointer select-none transition-colors
                  ${dragOverIdx === idx ? 'ring-2 ring-teal-400 ring-offset-1' : ''}
                  ${selectedId === c.id
                    ? 'bg-teal-600 text-white border-teal-600 pl-3 pr-2 py-1.5'
                    : 'bg-white text-gray-600 border-gray-300 px-3 py-1.5 hover:border-teal-400'}`}
              >
                <span className={`text-xs mr-0.5 cursor-grab active:cursor-grabbing ${selectedId === c.id ? 'text-white/50' : 'text-gray-300'}`}>⠿</span>
                <span>{c.nome}</span>
                {selectedId === c.id && (
                  <>
                    <button onClick={e => openEditConcurso(c, e)}
                      className="text-white/60 hover:text-white text-xs px-1 transition-opacity" title="Editar">✏️</button>
                    <button onClick={e => handleDeleteConcurso(c.id, e)}
                      className="text-white/60 hover:text-white text-xs px-1 transition-opacity" title="Excluir">🗑</button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Conteúdo do concurso selecionado */}
          {selectedConcurso && (
            <>
              {/* Info + barra de progresso */}
              <div className="flex flex-wrap items-center gap-6 mb-6 px-5 py-4 bg-white rounded-xl border border-gray-200">
                {selectedConcurso.banca && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Banca</p>
                    <p className="text-sm font-semibold text-gray-700">{selectedConcurso.banca}</p>
                  </div>
                )}
                {selectedConcurso.cargo && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Cargo</p>
                    <p className="text-sm font-semibold text-gray-700">{selectedConcurso.cargo}</p>
                  </div>
                )}
                {selectedConcurso.data_prova && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Data da prova</p>
                    <p className="text-sm font-semibold text-gray-700">{formatDate(selectedConcurso.data_prova)}</p>
                  </div>
                )}
                {selectedConcurso.link && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Link</p>
                    <a
                      href={selectedConcurso.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1"
                      title={selectedConcurso.link}
                    >
                      🔗 <span className="max-w-[200px] truncate">{selectedConcurso.link}</span>
                    </a>
                  </div>
                )}
                <div className="flex-1 min-w-48">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progresso geral</span>
                    <span className="font-medium text-gray-600">{totalConcluidos}/{totalConteudos} conteúdos · {progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Matérias e conteúdos */}
              {loading ? (
                <div className="text-center py-16 text-gray-400">Carregando...</div>
              ) : (
                <div className="space-y-3">
                  {materias.length > 0 && (
                    <div className="flex justify-end gap-2 mb-1">
                      <button
                        onClick={() => setCollapsed(new Set())}
                        className="text-xs text-gray-500 hover:text-teal-600 transition-colors"
                      >
                        ↕ Expandir todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setCollapsed(new Set(materias.map(m => m.id)))}
                        className="text-xs text-gray-500 hover:text-teal-600 transition-colors"
                      >
                        ↕ Recolher todos
                      </button>
                    </div>
                  )}
                  {materias.map(materia => {
                    const concluidos = materia.conteudos.filter(c => c.concluido).length
                    return (
                      <div key={materia.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

                        {/* Cabeçalho da disciplina */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer select-none"
                          onClick={() => toggleCollapse(materia.id)}
                        >
                          <span className={`text-gray-400 text-xs transition-transform duration-200 ${collapsed.has(materia.id) ? '-rotate-90' : ''}`}>▾</span>
                          <h3 className="text-sm font-semibold text-gray-700 flex-1">{materia.nome}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                            ${concluidos === materia.conteudos.length && materia.conteudos.length > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'}`}>
                            {concluidos}/{materia.conteudos.length}
                          </span>
                          <button onClick={e => { e.stopPropagation(); handleRemoveSubject(materia.id) }}
                            className="text-gray-300 hover:text-red-600 text-xs transition-colors" title="Desvincular disciplina">🗑</button>
                          <button
                            onClick={e => { e.stopPropagation(); setAddConteudoFor(materia.id); setNewConteudo({ nome: '', url: '' }); setCollapsed(prev => { const next = new Set(prev); next.delete(materia.id); return next }) }}
                            className="text-xs px-3 py-1 bg-teal-50 text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors">
                            + Conteúdo
                          </button>
                        </div>

                        {/* Tabela de conteúdos */}
                        {!collapsed.has(materia.id) && (materia.conteudos.length > 0 || addConteudoFor === materia.id) ? (
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-50">
                              {materia.conteudos.map(c => (
                                <tr key={c.id}
                                  className={`group hover:bg-gray-50 transition-colors ${c.concluido ? 'opacity-55' : ''}`}>
                                  {/* Checkbox */}
                                  <td className="w-10 px-4 py-2.5 text-center">
                                    <input type="checkbox" checked={!!c.concluido}
                                      onChange={() => handleToggle(c.id)}
                                      className="w-4 h-4 rounded accent-green-600 cursor-pointer" />
                                  </td>
                                  {/* Nome */}
                                  <td className="px-3 py-2.5">
                                    {editConteudo?.id === c.id ? (
                                      <input autoFocus value={editConteudo.nome}
                                        onChange={e => setEditConteudo(x => ({ ...x, nome: e.target.value }))}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleUpdateConteudo(c.id)
                                          if (e.key === 'Escape') setEditConteudo(null)
                                        }}
                                        className="input py-0.5 text-sm" />
                                    ) : (
                                      <span className={c.concluido ? 'line-through text-gray-400' : 'text-gray-700'}>
                                        {c.nome}
                                      </span>
                                    )}
                                  </td>
                                  {/* URL */}
                                  <td className="px-3 py-2.5 w-56">
                                    {editConteudo?.id === c.id ? (
                                      <input value={editConteudo.url}
                                        onChange={e => setEditConteudo(x => ({ ...x, url: e.target.value }))}
                                        placeholder="URL (opcional)"
                                        className="input py-0.5 text-sm" />
                                    ) : c.url ? (
                                      <a href={c.url} target="_blank" rel="noopener noreferrer"
                                        className="text-teal-500 hover:text-teal-700 text-xs flex items-center gap-1 truncate max-w-xs">
                                        <span>🔗</span>
                                        <span className="truncate">{c.url}</span>
                                      </a>
                                    ) : (
                                      <span className="text-gray-200 text-xs">—</span>
                                    )}
                                  </td>
                                  {/* Ações */}
                                  <td className="px-3 py-2.5 w-20 text-right">
                                    {editConteudo?.id === c.id ? (
                                      <div className="flex gap-2 justify-end">
                                        <button onClick={() => handleUpdateConteudo(c.id)}
                                          className="text-green-600 hover:text-green-700 font-bold">✓</button>
                                        <button onClick={() => setEditConteudo(null)}
                                          className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => setEditConteudo({ id: c.id, nome: c.nome, url: c.url || '', materia_id: materia.id })}
                                          className="text-gray-400 hover:text-teal-600 text-xs transition-colors">✏️</button>
                                        <button onClick={() => handleDeleteConteudo(c.id)}
                                          className="text-gray-400 hover:text-red-600 text-xs transition-colors">🗑</button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}

                              {/* Linha de adicionar conteúdo */}
                              {addConteudoFor === materia.id && (
                                <tr className="bg-teal-50">
                                  <td className="w-10 px-4 py-2.5" />
                                  <td className="px-3 py-2.5">
                                    <input autoFocus value={newConteudo.nome}
                                      onChange={e => setNewConteudo(f => ({ ...f, nome: e.target.value }))}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddConteudo(materia.id)
                                        if (e.key === 'Escape') setAddConteudoFor(null)
                                      }}
                                      placeholder="Nome do conteúdo *"
                                      className="input py-0.5 text-sm" />
                                  </td>
                                  <td className="px-3 py-2.5 w-56">
                                    <input value={newConteudo.url}
                                      onChange={e => setNewConteudo(f => ({ ...f, url: e.target.value }))}
                                      placeholder="URL (opcional)"
                                      className="input py-0.5 text-sm" />
                                  </td>
                                  <td className="px-3 py-2.5 w-20 text-right">
                                    <div className="flex gap-2 justify-end">
                                      <button onClick={() => handleAddConteudo(materia.id)}
                                        disabled={!newConteudo.nome.trim()}
                                        className="text-green-600 hover:text-green-700 font-bold disabled:opacity-40">✓</button>
                                      <button onClick={() => setAddConteudoFor(null)}
                                        className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        ) : (!collapsed.has(materia.id) && (
                          <p className="text-xs text-gray-400 text-center py-4 italic">
                            Nenhum conteúdo cadastrado — clique em "+ Conteúdo" para adicionar.
                          </p>
                        ))}
                      </div>
                    )
                  })}

                  {/* Vincular disciplina */}
                  {showSubjectPicker ? (() => {
                    const linkedIds = new Set(materias.map(m => m.subject_id))
                    const available = allSubjects.filter(s =>
                      !linkedIds.has(s.id) &&
                      (!subjectSearch || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
                    )
                    return (
                      <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <input
                            autoFocus
                            className="w-full bg-transparent text-sm outline-none placeholder-gray-400"
                            placeholder="🔍 Buscar disciplina..."
                            value={subjectSearch}
                            onChange={e => setSubjectSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {available.map(s => (
                            <button key={s.id} type="button"
                              onClick={() => handleAddSubject(s)}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 border-b border-gray-50 last:border-0 transition-colors">
                              {s.name}
                            </button>
                          ))}
                          {available.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-5">
                              {subjectSearch ? 'Nenhuma disciplina encontrada' : 'Todas as disciplinas já estão vinculadas'}
                            </p>
                          )}
                        </div>
                        <div className="px-3 py-2 border-t border-gray-100 text-right">
                          <button onClick={() => { setShowSubjectPicker(false); setSubjectSearch('') }}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )
                  })() : (
                    <button onClick={() => setShowSubjectPicker(true)}
                      className="w-full py-3 text-sm text-teal-600 hover:text-teal-700 font-medium border-2 border-dashed border-teal-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-colors">
                      + Vincular Disciplina
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
