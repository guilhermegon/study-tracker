import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'
import Modal from '../components/shared/Modal'
import { exportPdf } from '../utils/exportPdf'

const EMPTY_PROVA = { nome: '', tipo: 'prova', anula: false, concurso_ids: [] }
const EMPTY_QUESTAO = { subject_id: '', nome: '', marcada: '', gabarito: '', acertou: false, branco: false, observacoes: '' }

function pctOf(n, total) {
  if (!total || total === 0) return '0%'
  return Math.round((n / total) * 100) + '%'
}
function pctDecimal(n, total) {
  if (!total || total === 0) return '0,00%'
  return ((n / total) * 100).toFixed(2).replace('.', ',') + '%'
}

function StatCard({ label, value, percent, border }) {
  return (
    <div className={`p-4 rounded-xl border-l-4 bg-white border border-gray-200 ${border}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-800">{value}</span>
        <span className="text-sm font-medium text-gray-400">{percent}</span>
      </div>
    </div>
  )
}

// ── Prova Form Modal ──────────────────────────────────────────────────────────
function ProvaModal({ open, onClose, editing, concursos, onSaved }) {
  const toast = useAppToast()
  const [form, setForm] = useState({ ...EMPTY_PROVA })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { nome: editing.nome, tipo: editing.tipo, anula: editing.anula, concurso_ids: [...editing.concurso_ids] }
        : { ...EMPTY_PROVA }
      )
    }
  }, [open, editing])

  function toggleConcurso(id) {
    setForm(prev => ({
      ...prev,
      concurso_ids: prev.concurso_ids.includes(id)
        ? prev.concurso_ids.filter(x => x !== id)
        : [...prev.concurso_ids, id],
    }))
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const result = editing
        ? await api.updateProva(editing.id, form)
        : await api.createProva(form)
      onSaved(result, !!editing)
      onClose()
    } catch (err) {
      toast(err.message || 'Erro ao salvar prova', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar Prova' : 'Nova Prova'} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input
            autoFocus
            className="input w-full"
            placeholder="Nome da prova ou simulado..."
            value={form.nome}
            onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            className="input w-full"
            value={form.tipo}
            onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
          >
            <option value="prova">Prova</option>
            <option value="simulado">Simulado</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 accent-teal-600"
            checked={form.anula}
            onChange={e => setForm(p => ({ ...p, anula: e.target.checked }))}
          />
          <span className="text-sm text-gray-700">Uma questão errada anula uma questão certa</span>
        </label>

        {concursos.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Concursos</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {concursos.map(c => {
                const sel = form.concurso_ids.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleConcurso(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      sel
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                    }`}
                  >
                    {sel ? '✓ ' : ''}{c.nome}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.nome.trim()}
            className="btn-primary"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Questão Row (view) ────────────────────────────────────────────────────────
function QuestaoViewRow({ q, idx, onEdit, onDelete, anula }) {
  return (
    <tr className="group hover:bg-gray-50 transition-colors">
      <td className="px-2 py-1.5 text-center text-xs text-gray-400 w-8">{idx}</td>
      <td className="px-3 py-1.5 text-sm text-gray-700 break-words">{q.subject_name || <span className="text-gray-300">—</span>}</td>
      <td className="px-3 py-1.5 text-sm text-gray-700">{q.nome || <span className="text-gray-300">—</span>}</td>
      <td className="px-2 py-1.5 text-center w-16">
        <span className="font-mono text-sm font-bold text-gray-800">{q.marcada || <span className="text-gray-300">—</span>}</span>
      </td>
      <td className="px-2 py-1.5 text-center w-16">
        <span className="font-mono text-sm font-bold text-gray-800">{q.gabarito || <span className="text-gray-300">—</span>}</span>
      </td>
      {anula && (
        <td className="px-2 py-1.5 text-center w-16">
          {q.branco
            ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Branco</span>
            : <span className="text-gray-200 text-xs">—</span>
          }
        </td>
      )}
      <td className="px-2 py-1.5 text-center w-16">
        {!q.branco && (
          q.acertou
            ? <span className="text-green-600 font-bold text-base">✓</span>
            : <span className="text-red-500 font-bold text-base">✗</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-xs text-gray-500 break-words">
        {q.observacoes || <span className="text-gray-200">—</span>}
      </td>
      <td className="px-2 py-1.5 text-right w-16 no-print">
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(q)} className="text-gray-400 hover:text-teal-600 px-1.5 py-1 rounded text-xs transition-colors" title="Editar">✏️</button>
          <button onClick={() => onDelete(q.id)} className="text-gray-400 hover:text-red-600 px-1.5 py-1 rounded text-xs transition-colors" title="Excluir">🗑</button>
        </div>
      </td>
    </tr>
  )
}

// ── Questão Row (edit / add) ──────────────────────────────────────────────────
function QuestaoEditRow({ form, onChange, subjects, onSave, onCancel, isNew, idx, anula }) {
  const inputRef   = useRef(null)
  const marcadaRef = useRef(null)
  useEffect(() => {
    const ref = form.nome.trim() !== '' ? marcadaRef : inputRef
    setTimeout(() => ref.current?.focus(), 0)
  }, [])

  function set(field, value) {
    onChange(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'branco' && value) next.acertou = false
      // auto-acerto quando marcada === gabarito (ambos preenchidos, não branco)
      const m = field === 'marcada' ? value : next.marcada
      const g = field === 'gabarito' ? value : next.gabarito
      if ((field === 'marcada' || field === 'gabarito') && !next.branco) {
        next.acertou = m.length > 0 && g.length > 0 && m === g
      }
      return next
    })
  }

  const handleKeyDown = e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }

  return (
    <tr className="bg-teal-50">
      <td className="px-2 py-1.5 text-center text-xs text-gray-400 w-8">{idx}</td>
      <td className="px-2 py-1.5 w-[140px]">
        <select
          className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
          value={form.subject_id}
          onChange={e => set('subject_id', e.target.value)}
          onKeyDown={handleKeyDown}
        >
          <option value="">— Disciplina —</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          ref={inputRef}
          className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
          placeholder="Q1..."
          maxLength={5}
          value={form.nome}
          onChange={e => set('nome', e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </td>
      <td className="px-2 py-1.5 w-16">
        <input
          className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 text-center font-mono uppercase focus:outline-none focus:ring-1 focus:ring-teal-400"
          ref={marcadaRef}
          maxLength={1}
          placeholder="A"
          value={form.marcada}
          onChange={e => set('marcada', e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
        />
      </td>
      <td className="px-2 py-1.5 w-16">
        <input
          className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 text-center font-mono uppercase focus:outline-none focus:ring-1 focus:ring-teal-400"
          maxLength={1}
          placeholder="A"
          value={form.gabarito}
          onChange={e => set('gabarito', e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
        />
      </td>
      {anula && (
        <td className="px-2 py-1.5 text-center w-16">
          <input
            type="checkbox"
            className="w-4 h-4 accent-gray-500"
            checked={form.branco}
            onChange={e => set('branco', e.target.checked)}
            onKeyDown={handleKeyDown}
            title="Branco"
          />
        </td>
      )}
      <td className="px-2 py-1.5 text-center w-16">
        <input
          type="checkbox"
          className="w-4 h-4 accent-green-600"
          checked={form.acertou}
          disabled={anula && form.branco}
          onChange={e => set('acertou', e.target.checked)}
          onKeyDown={handleKeyDown}
          title="Acertou"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
          placeholder="Observações..."
          value={form.observacoes}
          onChange={e => set('observacoes', e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </td>
      <td className="px-2 py-1.5 w-16">
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={onSave} className="text-green-600 hover:text-green-700 font-bold px-1.5 py-1 rounded text-sm transition-colors" title="Salvar (Enter)">✓</button>
          <button onClick={onCancel} className="text-gray-400 hover:text-red-500 px-1.5 py-1 rounded text-xs transition-colors" title="Cancelar (Esc)">✕</button>
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProvasPage() {
  const toast = useAppToast()
  const printRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  const [provas, setProvas]         = useState([])
  const [selectedProvaId, setSelectedProvaId] = useState(null)
  const [questoes, setQuestoes]     = useState([])
  const [concursos, setConcursos]   = useState([])
  const [subjects, setSubjects]     = useState([])
  const [loading, setLoading]       = useState(true)

  // Prova modal
  const [provaModal, setProvaModal] = useState(false)
  const [editingProva, setEditingProva] = useState(null)

  // Questao inline
  const [editingQId, setEditingQId] = useState(null)
  const [editQForm, setEditQForm]   = useState({ ...EMPTY_QUESTAO })
  const [addingQ, setAddingQ]       = useState(false)
  const [newQForm, setNewQForm]     = useState({ ...EMPTY_QUESTAO })
  const [sortBy, setSortBy]         = useState('nome')
  const [sortDir, setSortDir]       = useState('asc')

  // Load
  useEffect(() => {
    Promise.all([api.getProvas(), api.getConcursos(), api.getSubjects()])
      .then(([p, c, s]) => {
        setProvas(p); setConcursos(c); setSubjects(s)
        if (p.length > 0) setSelectedProvaId(p[0].id)
      })
      .catch(() => toast('Erro ao carregar dados', 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProvaId) { setQuestoes([]); return }
    setEditingQId(null); setAddingQ(false)
    api.getProvaQuestoes(selectedProvaId)
      .then(setQuestoes)
      .catch(() => toast('Erro ao carregar questões', 'error'))
  }, [selectedProvaId])

  // ── Stats computed ──────────────────────────────────────────────────────────
  const selectedProva = provas.find(p => p.id === selectedProvaId)
  const totalQ = questoes.length
  const acertosArr = questoes.filter(q => !q.branco && q.acertou)
  const errosArr   = questoes.filter(q => !q.branco && !q.acertou)
  const brancosArr = questoes.filter(q => q.branco)
  const resultado  = selectedProva?.anula
    ? Math.max(0, acertosArr.length - errosArr.length)
    : acertosArr.length

  const bySubject = subjects
    .map(s => {
      const qs = questoes.filter(q => q.subject_id === s.id)
      if (!qs.length) return null
      const a = qs.filter(q => !q.branco && q.acertou).length
      const e = qs.filter(q => !q.branco && !q.acertou).length
      const b = qs.filter(q => q.branco).length
      const pct = qs.length ? a / qs.length : 0
      return { id: s.id, nome: s.name, qtd: qs.length, acertos: a, erros: e, brancos: b, pct }
    })
    .filter(Boolean)

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const sortedBySubject = [...bySubject].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortBy === 'nome') return mul * a.nome.localeCompare(b.nome, 'pt-BR')
    return mul * (a[sortBy] - b[sortBy])
  })

  // ── Prova CRUD ──────────────────────────────────────────────────────────────
  function handleProvaSaved(result, isEdit) {
    if (isEdit) {
      setProvas(prev => prev.map(p => p.id === result.id ? result : p))
    } else {
      setProvas(prev => [...prev, result])
      setSelectedProvaId(result.id)
    }
    toast(isEdit ? 'Prova atualizada!' : 'Prova criada!', 'success')
  }

  async function handleExportPdf() {
    if (!printRef.current) return
    setExporting(true)
    try {
      const filename = selectedProva ? `${selectedProva.nome.replace(/\s+/g, '-')}.pdf` : 'prova.pdf'
      await exportPdf(printRef.current, filename)
      toast('PDF exportado com sucesso!', 'success')
    } catch {
      toast('Erro ao exportar PDF', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteProva(id, e) {
    e.stopPropagation()
    const p = provas.find(x => x.id === id)
    if (!confirm(`Excluir "${p?.nome}"?\n\nTodas as questões serão removidas permanentemente.`)) return
    try {
      await api.deleteProva(id)
      const remaining = provas.filter(x => x.id !== id)
      setProvas(remaining)
      if (selectedProvaId === id) setSelectedProvaId(remaining[0]?.id ?? null)
      toast('Prova excluída', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao excluir', 'error')
    }
  }

  // ── Questao CRUD ────────────────────────────────────────────────────────────
  function startEditQ(q) {
    setAddingQ(false)
    setEditingQId(q.id)
    setEditQForm({
      subject_id: q.subject_id ?? '',
      nome: q.nome ?? '',
      marcada: q.marcada ?? '',
      gabarito: q.gabarito ?? '',
      acertou: q.acertou,
      branco: q.branco,
      observacoes: q.observacoes ?? '',
    })
  }

  async function handleUpdateQ(id) {
    try {
      const updated = await api.updateQuestao(selectedProvaId, id, {
        ...editQForm, subject_id: editQForm.subject_id || null,
      })
      setQuestoes(prev => prev.map(q => q.id === id ? updated : q))
      setEditingQId(null)
    } catch (err) { toast(err.message || 'Erro ao atualizar questão', 'error') }
  }

  async function handleAddQ() {
    try {
      const created = await api.createQuestao(selectedProvaId, {
        ...newQForm, subject_id: newQForm.subject_id || null,
      })
      setQuestoes(prev => [...prev, created])
      // keep discipline; if nome is numeric, pre-fill next sequential number
      setNewQForm(prev => {
        const num = Number(prev.nome)
        const nextNome = prev.nome.trim() !== '' && Number.isInteger(num) && num > 0
          ? String(num + 1)
          : ''
        return { ...EMPTY_QUESTAO, subject_id: prev.subject_id, nome: nextNome }
      })
    } catch (err) { toast(err.message || 'Erro ao adicionar questão', 'error') }
  }

  async function handleDeleteQ(id) {
    if (!confirm('Excluir esta questão?')) return
    try {
      await api.deleteQuestao(selectedProvaId, id)
      setQuestoes(prev => prev.filter(q => q.id !== id))
    } catch (err) { toast(err.message || 'Erro ao excluir questão', 'error') }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style>{`.printing .no-print { display: none !important; }`}</style>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Provas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie provas e simulados com gabarito e resultado por disciplina.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exporting || !selectedProva}
            className="btn-secondary disabled:opacity-40"
          >
            {exporting ? 'Exportando...' : '⬇ Exportar PDF'}
          </button>
          <button
            onClick={() => { setEditingProva(null); setProvaModal(true) }}
            className="btn-primary"
          >
            + Nova Prova
          </button>
        </div>
      </div>

      {/* Prova chips */}
      {provas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-medium mb-1">Nenhuma prova cadastrada</p>
          <p className="text-sm">Clique em "+ Nova Prova" para começar.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap mb-6 no-print">
            {[...provas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })).map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProvaId(p.id)}
                className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border text-sm font-medium cursor-pointer transition-colors select-none ${
                  selectedProvaId === p.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                }`}
              >
                <span className="mr-0.5">{p.tipo === 'simulado' ? '📝' : '📋'}</span>
                <span>{p.nome}</span>
                {p.anula && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ml-1 ${selectedProvaId === p.id ? 'bg-teal-500 text-teal-100' : 'bg-amber-100 text-amber-700'}`}>
                    anula
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setEditingProva(p); setProvaModal(true) }}
                  className={`ml-1 px-1 py-0.5 rounded transition-colors text-xs ${selectedProvaId === p.id ? 'hover:bg-teal-500' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Editar"
                >✏️</button>
                <button
                  onClick={e => handleDeleteProva(p.id, e)}
                  className={`px-1 py-0.5 rounded transition-colors text-xs ${selectedProvaId === p.id ? 'hover:bg-teal-500' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Excluir"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Content */}
          {selectedProva && (
            <div ref={printRef}>
              {/* Prova title */}
              <h2 className="text-lg font-bold text-gray-800 mb-4">{selectedProva.nome}</h2>
              {/* Stats + Discipline table */}
              <div className="grid grid-cols-[220px_1fr] gap-5 mb-6">
                {/* Stat cards */}
                <div className="space-y-3">
                  <StatCard
                    label="Total de Acertos"
                    value={acertosArr.length}
                    percent={pctOf(acertosArr.length, totalQ)}
                    border="border-l-green-500"
                  />
                  <StatCard
                    label="Total de Erros"
                    value={errosArr.length}
                    percent={pctOf(errosArr.length, totalQ)}
                    border="border-l-red-500"
                  />
                  <StatCard
                    label="Total de Brancos"
                    value={brancosArr.length}
                    percent={pctOf(brancosArr.length, totalQ)}
                    border="border-l-gray-400"
                  />
                  <StatCard
                    label={selectedProva.anula ? 'Resultado (c/ anulação)' : 'Resultado'}
                    value={resultado}
                    percent={pctOf(resultado, totalQ)}
                    border="border-l-teal-500"
                  />
                  {totalQ > 0 && (
                    <div className="px-4 pt-1 text-xs text-gray-400">
                      Total: {totalQ} questões
                    </div>
                  )}
                </div>

                {/* Discipline table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden self-start">
                  {bySubject.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">
                      Nenhuma disciplina nas questões ainda.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {[
                            { col: 'nome',    label: 'Disciplina',  cls: 'text-left  px-4 py-2.5' },
                            { col: 'qtd',     label: 'Qtd',         cls: 'text-center px-3 py-2.5' },
                            { col: 'acertos', label: 'Acertos',     cls: 'text-center px-3 py-2.5' },
                            { col: 'erros',   label: 'Erros',       cls: 'text-center px-3 py-2.5' },
                            { col: 'brancos', label: 'Brancos',     cls: 'text-center px-3 py-2.5' },
                            { col: 'pct',     label: 'Porcentagem', cls: 'text-center px-3 py-2.5' },
                          ].map(({ col, label, cls }) => (
                            <th
                              key={col}
                              className={`${cls} cursor-pointer select-none hover:text-gray-700 whitespace-nowrap`}
                              onClick={() => handleSort(col)}
                            >
                              {label}
                              <span className="ml-1 inline-block w-3 text-gray-400">
                                {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedBySubject.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-800">{s.nome}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{s.qtd}</td>
                            <td className="px-3 py-2 text-center text-green-600 font-medium">{s.acertos}</td>
                            <td className="px-3 py-2 text-center text-red-500 font-medium">{s.erros}</td>
                            <td className="px-3 py-2 text-center text-gray-400">{s.brancos}</td>
                            <td className="px-3 py-2 text-center font-medium text-gray-700">
                              {pctDecimal(s.acertos, s.qtd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Questões section */}
              <div className="rounded-xl border border-gray-200">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Questões <span className="text-gray-400 font-normal">({questoes.length})</span>
                  </h2>
                  <button
                    onClick={() => { setEditingQId(null); setAddingQ(true); setNewQForm({ ...EMPTY_QUESTAO }) }}
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors no-print"
                  >
                    + Adicionar
                  </button>
                </div>

                <div className="overflow-x-auto rounded-b-xl">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-2 py-2 text-center w-10 whitespace-nowrap">#</th>
                      <th className="px-3 py-2 text-left w-48 whitespace-nowrap">Disciplina</th>
                      <th className="px-3 py-2 text-left w-20 whitespace-nowrap">Questão</th>
                      <th className="px-2 py-2 text-center w-16 whitespace-nowrap">Marcada</th>
                      <th className="px-2 py-2 text-center w-16 whitespace-nowrap">Gabarito</th>
                      {selectedProva?.anula && <th className="px-2 py-2 text-center w-16 whitespace-nowrap">Branco</th>}
                      <th className="px-2 py-2 text-center w-16 whitespace-nowrap">Acertou</th>
                      <th className="px-3 py-2 text-left w-32 whitespace-nowrap">Observações</th>
                      <th className="px-2 py-2 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {questoes.map((q, idx) =>
                      editingQId === q.id ? (
                        <QuestaoEditRow
                          key={q.id}
                          idx={idx + 1}
                          form={editQForm}
                          onChange={setEditQForm}
                          subjects={subjects}
                          onSave={() => handleUpdateQ(q.id)}
                          onCancel={() => setEditingQId(null)}
                          anula={selectedProva?.anula}
                        />
                      ) : (
                        <QuestaoViewRow
                          key={q.id}
                          q={q}
                          idx={idx + 1}
                          onEdit={startEditQ}
                          onDelete={handleDeleteQ}
                          anula={selectedProva?.anula}
                        />
                      )
                    )}
                    {addingQ && (
                      <QuestaoEditRow
                        key={questoes.length}
                        idx={questoes.length + 1}
                        form={newQForm}
                        onChange={setNewQForm}
                        subjects={subjects}
                        onSave={handleAddQ}
                        onCancel={() => setAddingQ(false)}
                        anula={selectedProva?.anula}
                        isNew
                      />
                    )}
                    {questoes.length === 0 && !addingQ && (
                      <tr>
                        <td colSpan={selectedProva?.anula ? 8 : 9} className="py-10 text-center text-gray-400 text-sm">
                          Nenhuma questão cadastrada. Clique em "+ Adicionar" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ProvaModal
        open={provaModal}
        onClose={() => setProvaModal(false)}
        editing={editingProva}
        concursos={concursos}
        onSaved={handleProvaSaved}
      />
    </div>
  )
}
