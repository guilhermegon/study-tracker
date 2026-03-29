import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useWeekContext } from '../store/weekContext'
import { useEntries } from '../hooks/useEntries'
import EntryForm from '../components/entries/EntryForm'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const toForm = (e) => ({
  subject_id: String(e.subject_id),
  estudado: e.estudado,
  total_aulas: e.total_aulas ?? '',
  aula_estudada: e.aula_estudada || '',
  num_pags_inicio: e.num_pags_inicio ?? '',
  num_pags_fim: e.num_pags_fim ?? '',
  qtd_pags_estudadas: e.qtd_pags_estudadas ?? '',
  num_exercicios: e.num_exercicios ?? '',
  num_acertos: e.num_acertos ?? '',
  percentual_acerto: e.percentual_acerto ?? '',
  dificuldade: e.dificuldade || '',
})

export default function WeeklyViewPage() {
  const { selectedWeekId, selectedWeek } = useWeekContext()
  const toast = useAppToast()
  const { entries, loading, reload } = useEntries(selectedWeekId)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormDia, setAddFormDia] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [weekSubjects, setWeekSubjects] = useState([])
  const [exporting, setExporting] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState(null)
  const [duplicateTargets, setDuplicateTargets] = useState([])
  const [customOrder, setCustomOrder] = useState({})
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [dragOverDia, setDragOverDia] = useState(null)
  const [dragSourceDia, setDragSourceDia] = useState(null)
  const printRef = useRef(null)
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)
  const savedScrollY = useRef(null)      // casos imediatos (abrir/cancelar edição)
  const reloadScrollY = useRef(null)     // casos com reload (salvar/excluir)

  useEffect(() => {
    if (!selectedWeekId) return
    // Carrega localStorage imediatamente (sem flicker)
    const localOrder = {}
    DIAS.forEach(dia => {
      const saved = localStorage.getItem(`study-order-${selectedWeekId}-${dia}`)
      if (saved) {
        try { localOrder[dia] = JSON.parse(saved) } catch {}
      }
    })
    setCustomOrder(localOrder)
    // Sincroniza com o banco (fonte de verdade)
    api.getWeekOrder(selectedWeekId).then(dbOrder => {
      if (Object.keys(dbOrder).length === 0) return
      setCustomOrder(prev => {
        const merged = { ...prev }
        Object.entries(dbOrder).forEach(([dia, ids]) => {
          merged[dia] = ids
          localStorage.setItem(`study-order-${selectedWeekId}-${dia}`, JSON.stringify(ids))
        })
        return merged
      })
    }).catch(console.error)
  }, [selectedWeekId])

  useEffect(() => {
    if (!selectedWeekId) return
    api.getWeekSubjects(selectedWeekId).then(setWeekSubjects).catch(console.error)
  }, [selectedWeekId])

  function getOrderedEntries(dia, list) {
    const order = customOrder[dia]
    if (!order) return list
    const ordered = order.map(sid => list.find(e => e.subject_id === sid)).filter(Boolean)
    const rest = list.filter(e => !order.includes(e.subject_id))
    return [...ordered, ...rest]
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────
  function handleDragStart(dia, idx) {
    dragItem.current = { dia, idx }
    setDragSourceDia(dia)
  }

  function handleDragEnter(dia, idx) {
    dragOverItem.current = { dia, idx }
    setDragOverIdx(`${dia}-${idx}`)
    setDragOverDia(dia)
  }

  async function handleDragEnd(dia, orderedList) {
    setDragOverIdx(null)
    setDragOverDia(null)
    setDragSourceDia(null)
    if (!dragItem.current || !dragOverItem.current) return
    if (dragItem.current.dia !== dia) return

    const targetDia = dragOverItem.current.dia
    const from = dragItem.current.idx
    const to = dragOverItem.current.idx
    const movedEntry = orderedList[from]
    dragItem.current = null
    dragOverItem.current = null

    if (targetDia === dia) {
      // Same day: reorder
      if (from === to) return
      const ids = orderedList.map(e => e.subject_id)
      const [moved] = ids.splice(from, 1)
      ids.splice(to, 0, moved)
      setCustomOrder(prev => ({ ...prev, [dia]: ids }))
      localStorage.setItem(`study-order-${selectedWeekId}-${dia}`, JSON.stringify(ids))
      api.saveWeekDayOrder(selectedWeekId, dia, ids).catch(console.error)
    } else {
      // Different day: move entry via API
      if (!movedEntry) return
      setSaving(true)
      try {
        await api.updateEntry(movedEntry.id, { dia: targetDia })
        const sourceIds = orderedList.map(e => e.subject_id).filter(sid => sid !== movedEntry.subject_id)
        const targetOrdered = getOrderedEntries(targetDia, grouped[targetDia] || [])
        const targetIds = targetOrdered.map(e => e.subject_id)
        targetIds.splice(to, 0, movedEntry.subject_id)
        setCustomOrder(prev => ({ ...prev, [dia]: sourceIds, [targetDia]: targetIds }))
        localStorage.setItem(`study-order-${selectedWeekId}-${dia}`, JSON.stringify(sourceIds))
        localStorage.setItem(`study-order-${selectedWeekId}-${targetDia}`, JSON.stringify(targetIds))
        api.saveWeekDayOrder(selectedWeekId, dia, sourceIds).catch(console.error)
        api.saveWeekDayOrder(selectedWeekId, targetDia, targetIds).catch(console.error)
        toast(`Disciplina movida para ${targetDia}`, 'success')
        reload()
      } catch {
        toast('Erro ao mover disciplina', 'error')
      } finally {
        setSaving(false)
      }
    }
  }

  // ── Edição inline ──────────────────────────────────────────────────────────
  const getMain = () => document.querySelector('main')

  // Restaura scroll imediato (abrir/cancelar edição — sem reload)
  useLayoutEffect(() => {
    if (savedScrollY.current !== null) {
      getMain()?.scrollTo(0, savedScrollY.current)
      savedScrollY.current = null
    }
  })

  // Restaura scroll após reload (salvar/excluir) — só dispara quando loading vira false
  useLayoutEffect(() => {
    if (!loading && reloadScrollY.current !== null) {
      getMain()?.scrollTo(0, reloadScrollY.current)
      reloadScrollY.current = null
    }
  }, [loading])

  function startEdit(e) {
    savedScrollY.current = getMain()?.scrollTop ?? 0
    setEditEntry(e)
    setEditForm(toForm(e))
  }

  function cancelEdit() {
    savedScrollY.current = getMain()?.scrollTop ?? 0
    setEditEntry(null)
  }

  function setField(key, value) {
    setEditForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'num_pags_inicio' || key === 'num_pags_fim') {
        const ini = Number(key === 'num_pags_inicio' ? value : f.num_pags_inicio)
        const fim = Number(key === 'num_pags_fim' ? value : f.num_pags_fim)
        if (ini > 0 && fim >= ini) next.qtd_pags_estudadas = fim - ini + 1
      }
      if (key === 'num_exercicios' || key === 'num_acertos') {
        const ex = Number(key === 'num_exercicios' ? value : f.num_exercicios)
        const ac = Number(key === 'num_acertos' ? value : f.num_acertos)
        if (ex > 0 && ac >= 0) next.percentual_acerto = Math.round((ac / ex) * 1000) / 10
      }
      return next
    })
  }

  async function handleSaveEdit() {
    if (!editEntry) return
    reloadScrollY.current = getMain()?.scrollTop ?? 0
    setSaving(true)
    try {
      const payload = {
        ...editForm,
        subject_id: Number(editForm.subject_id),
        num_pags_inicio: editForm.num_pags_inicio !== '' ? Number(editForm.num_pags_inicio) : null,
        num_pags_fim: editForm.num_pags_fim !== '' ? Number(editForm.num_pags_fim) : null,
        qtd_pags_estudadas: editForm.qtd_pags_estudadas !== '' ? Number(editForm.qtd_pags_estudadas) : null,
        total_aulas: editForm.total_aulas !== '' ? Number(editForm.total_aulas) : null,
        num_exercicios: editForm.num_exercicios !== '' ? Number(editForm.num_exercicios) : 0,
        num_acertos: editForm.num_acertos !== '' ? Number(editForm.num_acertos) : 0,
        percentual_acerto: editForm.percentual_acerto !== '' ? Number(editForm.percentual_acerto) : null,
      }
      await api.updateEntry(editEntry.id, payload)
      setEditEntry(null)
      reload()
      toast('Registro atualizado!', 'success')
    } catch {
      toast('Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSaveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  // ── Ações ─────────────────────────────────────────────────────────────────
  function handleAdded() {
    setShowAddForm(false)
    setAddFormDia(null)
    reload()
    toast('Registro adicionado!', 'success')
  }

  function openAddForDia(dia) {
    setAddFormDia(prev => prev === dia ? null : dia)
    setShowAddForm(false)
    setEditEntry(null)
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este registro?')) return
    reloadScrollY.current = getMain()?.scrollTop ?? 0
    await api.deleteEntry(id)
    toast('Registro excluído', 'success')
    reload()
  }

  // ── Duplicar dia ──────────────────────────────────────────────────────────
  function openDuplicate(dia) {
    setDuplicateSource(dia)
    setDuplicateTargets([])
    setEditEntry(null)
  }

  function toggleDuplicateTarget(dia) {
    setDuplicateTargets(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  async function handleDuplicate() {
    if (!duplicateSource || duplicateTargets.length === 0) return
    const sourceEntries = getOrderedEntries(duplicateSource, grouped[duplicateSource] || [])
    setSaving(true)
    try {
      for (const target of duplicateTargets) {
        for (const entry of sourceEntries) {
          await api.createEntry(selectedWeekId, {
            subject_id: entry.subject_id,
            dia: target,
            estudado: entry.estudado,
            total_aulas: entry.total_aulas ?? weekSubjects.find(ws => ws.id === entry.subject_id)?.ws_total_aulas ?? null,
            aula_estudada: entry.aula_estudada,
            num_pags_inicio: entry.num_pags_inicio,
            num_pags_fim: entry.num_pags_fim,
            qtd_pags_estudadas: entry.qtd_pags_estudadas,
            num_exercicios: entry.num_exercicios ?? 0,
            num_acertos: entry.num_acertos ?? 0,
            percentual_acerto: entry.percentual_acerto,
            dificuldade: entry.dificuldade,
          })
        }
      }
      const sourceOrder = localStorage.getItem(`study-order-${selectedWeekId}-${duplicateSource}`)
      if (sourceOrder) {
        const parsedOrder = JSON.parse(sourceOrder)
        const newCustomOrder = { ...customOrder }
        for (const target of duplicateTargets) {
          localStorage.setItem(`study-order-${selectedWeekId}-${target}`, sourceOrder)
          newCustomOrder[target] = parsedOrder
          api.saveWeekDayOrder(selectedWeekId, target, parsedOrder).catch(console.error)
        }
        setCustomOrder(newCustomOrder)
      }
      const label = duplicateTargets.join(', ')
      toast(`${duplicateSource} duplicado para: ${label}`, 'success')
      setDuplicateSource(null)
      setDuplicateTargets([])
      reload()
    } catch {
      toast('Erro ao duplicar', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!printRef.current) return
    setExporting(true)
    try {
      const el = printRef.current
      el.classList.add('printing')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      el.classList.remove('printing')

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'b4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW - 20
      const imgH = imgW / (canvas.width / canvas.height)

      let y = 10
      let remainH = imgH
      while (remainH > 0) {
        const sliceH = Math.min(remainH, pageH - 20)
        const srcY = (imgH - remainH) / imgH * canvas.height
        const srcH = sliceH / imgH * canvas.height
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = srcH
        sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, y, imgW, sliceH)
        remainH -= sliceH
        if (remainH > 0) { pdf.addPage(); y = 10 }
      }

      const filename = selectedWeek ? `${selectedWeek.name.replace(/\s+/g, '-')}.pdf` : 'visao-semanal.pdf'
      pdf.save(filename)
      toast('PDF exportado com sucesso!', 'success')
    } catch (err) {
      console.error(err)
      toast('Erro ao exportar PDF', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!selectedWeekId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-lg font-medium">Nenhuma semana selecionada</p>
      </div>
    )
  }

  const grouped = DIAS.reduce((acc, d) => {
    acc[d] = entries.filter(e => e.dia === d)
    return acc
  }, {})

  const totalPages = entries.reduce((s, e) => s + (e.qtd_pags_estudadas || 0), 0)
  const totalExercices = entries.reduce((s, e) => s + (e.num_exercicios || 0), 0)
  const totalAcertos = entries.reduce((s, e) => s + (e.num_acertos || 0), 0)

  // Estilo base para inputs inline
  const ci = 'w-full bg-white border border-blue-200 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:border-blue-400'

  return (
    <div className="p-8" ref={printRef}>
      <style>{`.printing .no-print { display: none !important; }`}</style>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Visão Semanal</h1>
          {selectedWeek && (
            <p className="text-sm text-gray-500 mt-1">
              {selectedWeek.name}
              {selectedWeek.context && <span className="text-gray-400"> · {selectedWeek.context}</span>}
            </p>
          )}
          {selectedWeek?.date_start && selectedWeek?.date_end && (
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(selectedWeek.date_start + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' – '}
              {new Date(selectedWeek.date_end + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex items-start gap-6">
          <div className="no-print flex gap-2">
            <button
              onClick={() => { setShowAddForm(v => !v); setEditEntry(null); setAddFormDia(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                ${showAddForm
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
            >
              {showAddForm ? '✕ Cancelar' : '+ Novo registro'}
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting || entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? '⏳ Exportando...' : '⬇ Exportar PDF'}
            </button>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{entries.length}</p>
              <p className="text-xs text-gray-400">registros</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalPages}</p>
              <p className="text-xs text-gray-400">páginas</p>
            </div>
            {totalExercices > 0 && (
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round((totalAcertos / totalExercices) * 100)}%
                </p>
                <p className="text-xs text-gray-400">acerto</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulário de novo registro */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-6 py-5 no-print">
          <h2 className="text-sm font-semibold text-blue-700 mb-4">Novo registro</h2>
          <EntryForm
            weekId={selectedWeekId}
            weekSubjects={weekSubjects}
            onSaved={handleAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Nenhum registro nesta semana ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {DIAS.map(dia => {
            const dayEntries = grouped[dia]
            if (dayEntries.length === 0) return null
            const ordered = getOrderedEntries(dia, dayEntries)
            return (
              <div key={dia} onDragEnter={() => setDragOverDia(dia)} onDragOver={e => e.preventDefault()}>
                <div className="mb-2 flex items-center gap-3 flex-wrap">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <span>{dia}</span>
                    <span className="text-xs font-normal text-gray-400">
                      ({dayEntries.filter(e => e.estudado).length}/{dayEntries.length} estudadas)
                    </span>
                  </h2>
                  {duplicateSource === dia ? (
                    <div className="no-print flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">Duplicar para:</span>
                      {DIAS.filter(d => d !== dia).map(d => (
                        <button key={d}
                          onClick={() => toggleDuplicateTarget(d)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${duplicateTargets.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                          {d}
                        </button>
                      ))}
                      <button onClick={handleDuplicate}
                        disabled={duplicateTargets.length === 0 || saving}
                        className="text-xs px-2.5 py-0.5 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        {saving ? '…' : 'Confirmar'}
                      </button>
                      <button onClick={() => setDuplicateSource(null)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="no-print flex items-center gap-3">
                      <button onClick={() => openDuplicate(dia)}
                        className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                        title={`Duplicar ${dia} para outro dia`}>
                        ⧉ Duplicar
                      </button>
                      <button onClick={() => openAddForDia(dia)}
                        className={`text-xs font-medium transition-colors ${addFormDia === dia ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-blue-600'}`}
                        title={`Novo registro para ${dia}`}>
                        + Novo
                      </button>
                    </div>
                  )}
                </div>
                <div className={`overflow-x-auto rounded-xl border transition-colors ${dragOverDia === dia && dragSourceDia && dragSourceDia !== dia ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'}`}>
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col className="no-print" style={{ width: '32px' }} />
                      <col style={{ width: '28px' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: 'auto' }} />
                      <col className="no-print" style={{ width: '56px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-300 text-sm font-medium text-gray-600">
                        <th className="px-2 py-2.5 no-print"></th>
                        <th className="px-2 py-2.5"></th>
                        <th className="text-left px-4 py-2.5">Disciplina</th>
                        <th className="text-center px-3 py-2.5">Total Aulas</th>
                        <th className="text-left px-4 py-2.5">Aula / Conteúdo</th>
                        <th className="text-center px-3 py-2.5">Páginas</th>
                        <th className="text-center px-3 py-2.5">Exercícios</th>
                        <th className="text-center px-3 py-2.5">% Acerto</th>
                        <th className="text-left px-4 py-2.5">Dificuldade</th>
                        <th className="px-3 py-2.5 no-print"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {ordered.map((e, idx) => {
                        const isDragTarget = dragOverIdx === `${dia}-${idx}`
                        const isEditing = editEntry?.id === e.id
                        return (
                          <tr
                            key={e.id}
                            draggable={!isEditing}
                            onDragStart={() => !isEditing && handleDragStart(dia, idx)}
                            onDragEnter={() => handleDragEnter(dia, idx)}
                            onDragEnd={() => handleDragEnd(dia, ordered)}
                            onDragOver={ev => ev.preventDefault()}
                            onKeyDown={isEditing ? handleKeyDown : undefined}
                            className={`group transition-colors ${!e.estudado && !isEditing ? 'opacity-50' : ''} ${isDragTarget ? 'bg-blue-50 border-t-2 border-blue-300' : isEditing ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                          >
                            {/* Drag handle */}
                            <td className="px-2 py-2 no-print text-gray-300 hover:text-gray-500 text-center select-none">
                              {!isEditing && <span className="cursor-grab active:cursor-grabbing">⠿</span>}
                            </td>

                            {/* Estudado */}
                            <td className="px-2 py-2 text-center">
                              {isEditing
                                ? <input type="checkbox" checked={editForm.estudado}
                                    onChange={ev => setField('estudado', ev.target.checked)}
                                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                : <span className={`w-2 h-2 rounded-full inline-block ${e.estudado ? 'bg-green-500' : 'bg-gray-300'}`} />
                              }
                            </td>

                            {/* Disciplina */}
                            <td className="px-2 py-2 font-medium text-gray-800">
                              {isEditing
                                ? <select value={editForm.subject_id}
                                    onChange={ev => setField('subject_id', ev.target.value)}
                                    className={ci}>
                                    {weekSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                : e.subject_name
                              }
                            </td>

                            {/* Total Aulas */}
                            <td className="px-2 py-2 text-center text-gray-600">
                              {isEditing
                                ? <input type="number" min="0" value={editForm.total_aulas}
                                    onChange={ev => setField('total_aulas', ev.target.value)}
                                    className={ci + ' text-center'} />
                                : e.total_aulas ?? '—'
                              }
                            </td>

                            {/* Aula / Conteúdo */}
                            <td className="px-2 py-2 text-gray-600">
                              {isEditing
                                ? <input type="text" value={editForm.aula_estudada}
                                    onChange={ev => setField('aula_estudada', ev.target.value)}
                                    className={ci} />
                                : <span className="whitespace-normal break-words">{e.aula_estudada || '—'}</span>
                              }
                            </td>

                            {/* Págs */}
                            <td className="px-2 py-2 text-center text-gray-600">
                              {isEditing
                                ? <div className="flex flex-col gap-1">
                                    <div className="flex gap-1">
                                      <input type="number" min="0" value={editForm.num_pags_inicio}
                                        onChange={ev => setField('num_pags_inicio', ev.target.value)}
                                        placeholder="ini" className={ci + ' text-center'} />
                                      <input type="number" min="0" value={editForm.num_pags_fim}
                                        onChange={ev => setField('num_pags_fim', ev.target.value)}
                                        placeholder="fim" className={ci + ' text-center'} />
                                    </div>
                                    <input type="number" min="0" value={editForm.qtd_pags_estudadas}
                                      onChange={ev => setField('qtd_pags_estudadas', ev.target.value)}
                                      placeholder="qty" className={ci + ' text-center'} />
                                  </div>
                                : e.num_pags_inicio
                                  ? <span>{e.num_pags_inicio}–{e.num_pags_fim}<br /><span className="text-xs text-gray-400">({e.qtd_pags_estudadas})</span></span>
                                  : e.qtd_pags_estudadas || '—'
                              }
                            </td>

                            {/* Exercícios */}
                            <td className="px-2 py-2 text-center text-gray-600">
                              {isEditing
                                ? <div className="flex flex-col gap-1">
                                    <input type="number" min="0" value={editForm.num_exercicios}
                                      onChange={ev => setField('num_exercicios', ev.target.value)}
                                      placeholder="feitos" className={ci + ' text-center'}/>
                                    <input type="number" min="0" value={editForm.num_acertos}
                                      onChange={ev => setField('num_acertos', ev.target.value)}
                                      placeholder="acertos" className={ci + ' text-center'} />
                                  </div>
                                : e.num_exercicios > 0 ? `${e.num_acertos}/${e.num_exercicios}` : '—'
                              }
                            </td>

                            {/* % Acerto */}
                            <td className="px-2 py-2 text-center">
                              {isEditing
                                ? <input type="number" min="0" max="100" step="0.1"
                                    value={editForm.percentual_acerto}
                                    onChange={ev => setField('percentual_acerto', ev.target.value)}
                                    placeholder="%" className={ci + ' text-center'} />
                                : e.percentual_acerto != null
                                  ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.percentual_acerto >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {e.percentual_acerto}%
                                    </span>
                                  : '—'
                              }
                            </td>

                            {/* Dificuldade */}
                            <td className="px-2 py-2 text-gray-500 text-xs">
                              {isEditing
                                ? <input type="text" value={editForm.dificuldade}
                                    onChange={ev => setField('dificuldade', ev.target.value)}
                                    className={ci} />
                                : <span className="whitespace-normal break-words">{e.dificuldade || '—'}</span>
                              }
                            </td>

                            {/* Ações */}
                            <td className="px-2 py-2 no-print">
                              {isEditing
                                ? <div className="flex gap-2 items-center">
                                    <button onClick={handleSaveEdit} disabled={saving}
                                      className="text-green-600 hover:text-green-700 text-base font-bold transition-colors disabled:opacity-50"
                                      title="Salvar (Enter)">
                                      {saving ? '…' : '✓'}
                                    </button>
                                    <button onClick={cancelEdit}
                                      className="text-gray-400 hover:text-red-500 text-xs transition-colors"
                                      title="Cancelar (Esc)">
                                      ✕
                                    </button>
                                  </div>
                                : <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(e)}
                                      className="text-gray-400 hover:text-blue-600 text-xs transition-colors">✏️</button>
                                    <button onClick={() => handleDelete(e.id)}
                                      className="text-gray-400 hover:text-red-600 text-xs transition-colors">✕</button>
                                  </div>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {addFormDia === dia && (
                  <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-6 py-5 no-print">
                    <h2 className="text-sm font-semibold text-blue-700 mb-4">Novo registro — {dia}</h2>
                    <EntryForm
                      weekId={selectedWeekId}
                      weekSubjects={weekSubjects}
                      defaultDia={dia}
                      onSaved={handleAdded}
                      onCancel={() => setAddFormDia(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
